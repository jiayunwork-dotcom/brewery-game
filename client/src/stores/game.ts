import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  RoomState, Player, MarketTier, ChatMessage,
  CompetitionResult, TradeItemType, WineRoute, BarrelType
} from '@/types';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;

export const useGameStore = defineStore('game', () => {
  const room = ref<RoomState | null>(null);
  const playerId = ref<string | null>(null);
  const ws = ref<WebSocket | null>(null);
  const connected = ref(false);
  const errorMsg = ref<string | null>(null);
  const lastCompetition = ref<CompetitionResult | null>(null);

  const currentPlayer = computed<Player | null>(() => {
    if (!room.value || !playerId.value) return null;
    return room.value.players.find(p => p.id === playerId.value) || null;
  });

  const isHost = computed(() => {
    return room.value && playerId.value && room.value.hostId === playerId.value;
  });

  const phaseTimeLeft = computed(() => {
    if (!room.value) return 0;
    const left = Math.max(0, Math.floor((room.value.phaseDeadline - Date.now()) / 1000));
    return left;
  });

  async function connect() {
    if (ws.value) return;
    return new Promise<void>((resolve, reject) => {
      try {
        const socket = new WebSocket(WS_URL);
        socket.onopen = () => {
          connected.value = true;
          ws.value = socket;
          resolve();
        };
        socket.onmessage = handleMessage;
        socket.onerror = () => {
          errorMsg.value = 'WebSocket连接失败';
          reject(new Error('连接失败'));
        };
        socket.onclose = () => {
          connected.value = false;
          ws.value = null;
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    room.value = null;
    playerId.value = null;
    connected.value = false;
  }

  function handleMessage(event: MessageEvent) {
    try {
      const msg: any = JSON.parse(event.data);
      const deepClone = (obj: any) => obj ? JSON.parse(JSON.stringify(obj)) : obj;
      switch (msg.type) {
        case 'ROOM_CREATED':
        case 'ROOM_JOINED':
          room.value = deepClone(msg.room);
          playerId.value = msg.playerId;
          break;
        case 'PLAYER_JOINED':
        case 'PLAYER_LEFT':
        case 'GAME_STARTED':
        case 'GAME_ENDED':
        case 'PHASE_CHANGED':
        case 'STATE_UPDATED':
        case 'AUCTION_RESULT':
        case 'SALES_RESULT':
          room.value = deepClone(msg.room);
          break;
        case 'CHAT_MESSAGE':
          if (room.value) {
            room.value.chatMessages.push(msg.message);
            if (room.value.chatMessages.length > 100) room.value.chatMessages.shift();
          }
          break;
        case 'COMPETITION_RESULT':
          room.value = deepClone(msg.room);
          lastCompetition.value = deepClone(msg.result);
          break;
        case 'ERROR':
          errorMsg.value = msg.message;
          setTimeout(() => { errorMsg.value = null; }, 3000);
          break;
      }
    } catch (e) {
      console.error('消息解析失败:', e);
    }
  }

  function send(data: Record<string, unknown>) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      throw new Error('未连接到服务器');
    }
    ws.value.send(JSON.stringify(data));
  }

  async function createRoom(playerName: string, roomName: string, maxPlayers: number) {
    await connect();
    send({ type: 'CREATE_ROOM', playerName, roomName, maxPlayers });
  }

  async function joinRoom(playerName: string, roomId: string) {
    await connect();
    send({ type: 'JOIN_ROOM', playerName, roomId });
  }

  function leaveRoom() {
    if (room.value && playerId.value) {
      send({ type: 'LEAVE_ROOM', roomId: room.value.id, playerId: playerId.value });
    }
    disconnect();
  }

  function startGame() {
    if (!room.value || !playerId.value) return;
    send({ type: 'START_GAME', roomId: room.value.id, playerId: playerId.value });
  }

  function sendChat(content: string) {
    if (!room.value || !playerId.value || !content.trim()) return;
    send({ type: 'CHAT', roomId: room.value.id, playerId: playerId.value, content: content.trim() });
  }

  function submitBids(bids: { ingredientId: string; bid: number; quantity: number }[]) {
    if (!room.value || !playerId.value) return;
    send({ type: 'SUBMIT_BID', roomId: room.value.id, playerId: playerId.value, bids });
  }

  function brewingAction(action: string, data: Record<string, unknown>) {
    if (!room.value || !playerId.value) return;
    send({ type: 'BREWING_ACTION', roomId: room.value.id, playerId: playerId.value, action, data });
  }

  function listForSale(listings: { wineId: string; tier: MarketTier; price: number }[]) {
    if (!room.value || !playerId.value) return;
    send({ type: 'LIST_FOR_SALE', roomId: room.value.id, playerId: playerId.value, listings });
  }

  function enterCompetition(wineId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'ENTER_COMPETITION', roomId: room.value.id, playerId: playerId.value, wineId });
  }

  function createTradeListing(itemType: TradeItemType, itemId: string, quantity: number, unitPrice: number) {
    if (!room.value || !playerId.value) return;
    send({ type: 'CREATE_TRADE_LISTING', roomId: room.value.id, playerId: playerId.value, itemType, itemId, quantity, unitPrice });
  }

  function cancelTradeListing(listingId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'CANCEL_TRADE_LISTING', roomId: room.value.id, playerId: playerId.value, listingId });
  }

  function buyTradeListing(listingId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'BUY_TRADE_LISTING', roomId: room.value.id, playerId: playerId.value, listingId });
  }

  function createGuild(name: string, motto: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'CREATE_GUILD', roomId: room.value.id, playerId: playerId.value, name, motto });
  }

  function applyGuild(guildId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'APPLY_GUILD', roomId: room.value.id, playerId: playerId.value, guildId });
  }

  function approveGuildApplication(guildId: string, applicantId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'APPROVE_GUILD_APPLICATION', roomId: room.value.id, playerId: playerId.value, guildId, applicantId });
  }

  function kickGuildMember(memberId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'KICK_GUILD_MEMBER', roomId: room.value.id, playerId: playerId.value, memberId });
  }

  function leaveGuild() {
    if (!room.value || !playerId.value) return;
    send({ type: 'LEAVE_GUILD', roomId: room.value.id, playerId: playerId.value });
  }

  function donateBarrelToGuild(barrelId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'DONATE_BARREL_TO_GUILD', roomId: room.value.id, playerId: playerId.value, barrelId });
  }

  function createCommission(brewerId: string, ingredients: { ingredientId: string; quantity: number }[], route: WineRoute, name: string, params: Record<string, number>, quantity: number) {
    if (!room.value || !playerId.value) return;
    send({ type: 'CREATE_COMMISSION', roomId: room.value.id, playerId: playerId.value, brewerId, ingredients, route, name, params, quantity });
  }

  function acceptCommission(commissionId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'ACCEPT_COMMISSION', roomId: room.value.id, playerId: playerId.value, commissionId });
  }

  function cancelCommission(commissionId: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'CANCEL_COMMISSION', roomId: room.value.id, playerId: playerId.value, commissionId });
  }

  function donateFundsToGuild(amount: number) {
    if (!room.value || !playerId.value) return;
    send({ type: 'DONATE_FUNDS_TO_GUILD', roomId: room.value.id, playerId: playerId.value, amount });
  }

  function buyGuildBarrel(barrelType: BarrelType) {
    if (!room.value || !playerId.value) return;
    send({ type: 'BUY_GUILD_BARREL', roomId: room.value.id, playerId: playerId.value, barrelType });
  }

  function speedUpGuildLevel() {
    if (!room.value || !playerId.value) return;
    send({ type: 'SPEED_UP_GUILD_LEVEL', roomId: room.value.id, playerId: playerId.value });
  }

  function rateCommission(commissionId: string, rating: number) {
    if (!room.value || !playerId.value) return;
    send({ type: 'RATE_COMMISSION', roomId: room.value.id, playerId: playerId.value, commissionId, rating });
  }

  function createGuildAnnouncement(content: string) {
    if (!room.value || !playerId.value) return;
    send({ type: 'CREATE_GUILD_ANNOUNCEMENT', roomId: room.value.id, playerId: playerId.value, content });
  }

  function requestState() {
    if (!room.value || !playerId.value) return;
    send({ type: 'REQUEST_STATE', roomId: room.value.id, playerId: playerId.value });
  }

  async function getRoomList() {
    try {
      const res = await fetch(`${API_URL}/api/rooms`);
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  return {
    room,
    playerId,
    connected,
    errorMsg,
    lastCompetition,
    currentPlayer,
    isHost,
    phaseTimeLeft,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    sendChat,
    submitBids,
    brewingAction,
    listForSale,
    enterCompetition,
    createTradeListing,
    cancelTradeListing,
    buyTradeListing,
    createGuild,
    applyGuild,
    approveGuildApplication,
    kickGuildMember,
    leaveGuild,
    donateBarrelToGuild,
    createCommission,
    acceptCommission,
    cancelCommission,
    donateFundsToGuild,
    buyGuildBarrel,
    speedUpGuildLevel,
    rateCommission,
    createGuildAnnouncement,
    requestState,
    getRoomList
  };
});
