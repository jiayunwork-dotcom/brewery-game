import {
  RoomState, Player, WebSocketMessage, ServerMessage,
  PhaseType, MarketTier, Ingredient, Batch, BottledWine, Equipment
} from './types';
import { getInitialMarket, createBarrel, BARREL_DATA } from './data';
import {
  createBatch, advanceBatchStage, bottleBatch, runAuction,
  updateAging, runCompetition, generateRandomEvent,
  calculateTotalAssets, calculateFinalScore, checkBankruptcy,
  checkMasterVictory, uuidv4
} from './gameEngine';

const PHASE_DURATION = 30000;
const MAX_ROUNDS = 30;
const COMPETITION_INTERVAL = 5;

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private phaseTimers: Map<string, NodeJS.Timeout> = new Map();
  private broadcast: (roomId: string, msg: ServerMessage) => void;

  constructor(broadcastFn: (roomId: string, msg: ServerMessage) => void) {
    this.broadcast = broadcastFn;
  }

  createRoom(hostName: string, roomName: string, maxPlayers: number): { room: RoomState; playerId: string } {
    const roomId = uuidv4();
    const playerId = uuidv4();

    const player: Player = this.createInitialPlayer(playerId, hostName, roomId);

    const room: RoomState = {
      id: roomId,
      name: roomName,
      hostId: playerId,
      players: [player],
      maxPlayers: Math.min(Math.max(maxPlayers, 4), 6),
      currentRound: 0,
      maxRounds: MAX_ROUNDS,
      currentPhase: 'idle',
      phaseTimer: PHASE_DURATION,
      phaseDeadline: 0,
      market: getInitialMarket(),
      marketTrend: {},
      events: [],
      competitionHistory: [],
      auctionBids: [],
      gameStarted: false,
      gameEnded: false,
      chatMessages: []
    };

    this.rooms.set(roomId, room);
    return { room, playerId };
  }

  joinRoom(playerName: string, roomId: string): { room: RoomState; playerId: string } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: '房间不存在' };
    if (room.players.length >= room.maxPlayers) return { error: '房间已满' };
    if (room.gameStarted) return { error: '游戏已开始' };

    const playerId = uuidv4();
    const player = this.createInitialPlayer(playerId, playerName, roomId);
    room.players.push(player);
    return { room, playerId };
  }

  leaveRoom(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.clearPhaseTimer(roomId);
    }
  }

  startGame(roomId: string, playerId: string): RoomState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.hostId !== playerId) return null;
    if (room.players.length < 2) return null;
    if (room.gameStarted) return null;

    room.gameStarted = true;
    room.currentRound = 1;
    this.nextPhase(room, 'market_auction');
    return room;
  }

  addChatMessage(roomId: string, playerId: string, content: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    const msg = {
      id: uuidv4(),
      playerId,
      playerName: player.name,
      content: content.substring(0, 200),
      timestamp: Date.now()
    };
    room.chatMessages.push(msg);
    if (room.chatMessages.length > 100) room.chatMessages.shift();
    this.broadcast(roomId, { type: 'CHAT_MESSAGE', message: msg });
  }

  submitBids(roomId: string, playerId: string, bids: { ingredientId: string; bid: number; quantity: number }[]) {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'market_auction') return;
    bids.forEach(b => {
      room.auctionBids = room.auctionBids.filter(x => !(x.playerId === playerId && x.ingredientId === b.ingredientId));
      room.auctionBids.push({ playerId, ...b });
    });
  }

  performBrewingAction(roomId: string, playerId: string, action: string, data: Record<string, any>) {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'brewing') return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    switch (action) {
      case 'start_batch':
        this.handleStartBatch(player, room, data);
        break;
      case 'advance_stage':
        this.handleAdvanceStage(player, data);
        break;
      case 'bottle_batch':
        this.handleBottleBatch(player, data);
        break;
      case 'buy_barrel':
        this.handleBuyBarrel(player, data);
        break;
      case 'buy_equipment':
        this.handleBuyEquipment(player, data);
        break;
      case 'assign_barrel':
        this.handleAssignBarrel(player, data);
        break;
    }

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
  }

  private handleStartBatch(player: Player, room: RoomState, data: Record<string, any>) {
    const { route, name, ingredientIds, params, quantity } = data;
    const ingredients: Ingredient[] = [];

    ingredientIds.forEach((id: string) => {
      const pi = player.ingredients.find(x => x.ingredientId === id);
      const mi = room.market.find(x => x.id === id);
      if (pi && mi && pi.quantity > 0) {
        const useQty = Math.min(pi.quantity, 20);
        pi.quantity -= useQty;
        ingredients.push({ ...mi, purchased: useQty });
      }
    });

    if (ingredients.length === 0) return;

    const batch = createBatch(player.id, route, name || '新品', ingredients, params || {}, quantity || 50);
    player.batches.push(batch);
  }

  private handleAdvanceStage(player: Player, data: Record<string, any>) {
    const { batchId, barrelId } = data;
    const batch = player.batches.find(b => b.id === batchId);
    if (!batch) return;
    const updated = advanceBatchStage(batch, player, barrelId);
    const idx = player.batches.findIndex(b => b.id === batchId);
    if (idx >= 0) player.batches[idx] = updated;
  }

  private handleBottleBatch(player: Player, data: Record<string, any>) {
    const { batchId } = data;
    const idx = player.batches.findIndex(b => b.id === batchId);
    if (idx < 0) return;
    const batch = player.batches[idx];

    const isReady = (batch.route === 'wine' && batch.currentStage === 'bottle' && batch.stageProgress >= 80)
      || (batch.route === 'beer' && batch.currentStage === 'package' && batch.stageProgress >= 80)
      || (batch.route === 'whiskey' && batch.currentStage === 'bottle' && batch.barrelRounds >= 8);

    if (!isReady) return;

    if (batch.barrelId) {
      const barrel = player.barrels.find(b => b.id === batch.barrelId);
      if (barrel) barrel.usedTimes += 1;
    }

    const bottled = bottleBatch(batch);
    player.inventory.push(bottled);
    player.batches.splice(idx, 1);
  }

  private handleBuyBarrel(player: Player, data: Record<string, any>) {
    const { barrelType } = data;
    const cost = BARREL_DATA[barrelType as keyof typeof BARREL_DATA]?.cost;
    if (!cost || player.coins < cost) return;
    player.coins -= cost;
    player.barrels.push(createBarrel(barrelType));
  }

  private handleBuyEquipment(player: Player, data: Record<string, any>) {
    const costs: Record<string, number> = {
      fermenter_stainless: 800, fermenter_oak: 1200, still_copper: 2000, cellar: 1500, lab: 1800
    };
    const type = data.equipmentType as Equipment['type'];
    const cost = costs[type];
    if (!cost || player.coins < cost) return;
    if (player.equipment.some(e => e.type === type)) return;

    const names: Record<string, string> = {
      fermenter_stainless: '不锈钢温控发酵罐', fermenter_oak: '橡木开放式发酵桶',
      still_copper: '铜制壶式蒸馏器', cellar: '大型酒窖', lab: '风味实验室'
    };
    const effects: Record<string, string> = {
      fermenter_stainless: '精确控温±0.5度', fermenter_oak: '自然发酵',
      still_copper: '提升威士忌纯度', cellar: '增加桶位', lab: '风味分析'
    };

    player.coins -= cost;
    player.equipment.push({
      id: uuidv4(),
      type,
      name: names[type],
      level: 1,
      effect: effects[type]
    });
  }

  private handleAssignBarrel(player: Player, data: Record<string, any>) {
    const { batchId, barrelId } = data;
    const batch = player.batches.find(b => b.id === batchId);
    const barrel = player.barrels.find(b => b.id === barrelId);
    if (!batch || !barrel) return;
    if (barrel.usedTimes >= barrel.maxUses) return;
    batch.barrelId = barrelId;
  }

  processSales(roomId: string, playerId: string, listings: { wineId: string; tier: MarketTier; price: number }[]) {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'sales') return;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    const sales: { playerId: string; wineId: string; quantity: number; revenue: number }[] = [];

    listings.forEach(listing => {
      const wine = player.inventory.find(w => w.id === listing.wineId);
      if (!wine) return;

      const thresholds = { mass: 40, premium: 60, luxury: 80 };
      if (wine.score < thresholds[listing.tier]) return;
      if (listing.tier === 'luxury' && player.reputation < 100) return;

      let qty = 0;
      let priceMult = 1;
      switch (listing.tier) {
        case 'mass': qty = Math.min(wine.quantity, Math.floor(20 + Math.random() * 15)); priceMult = 1; break;
        case 'premium': qty = Math.min(wine.quantity, Math.floor(5 + Math.random() * 8)); priceMult = 2.5; break;
        case 'luxury': qty = Math.min(wine.quantity, 1 + Math.floor(Math.random() * 2)); priceMult = 8; break;
      }

      Object.entries(room.marketTrend).forEach(([key, threshold]) => {
        if ((wine.flavor as any)[key] >= (threshold as number)) {
          priceMult *= 2;
        }
      });

      priceMult *= (1 + player.reputation / 1000);
      const revenue = Math.floor(qty * listing.price * priceMult);
      player.coins += revenue;
      wine.quantity -= qty;
      sales.push({ playerId, wineId: listing.wineId, quantity: qty, revenue });
    });

    player.inventory = player.inventory.filter(w => w.quantity > 0);
    this.updateAssets(room);
    return sales;
  }

  private processCompetitionPhase(room: RoomState) {
    const entries: { playerId: string; wineId: string }[] = [];
    (room as any).competitionEntries?.forEach((e: any) => entries.push(e));
    (room as any).competitionEntries = [];

    if (entries.length >= 2) {
      const result = runCompetition(room, entries);
      room.competitionHistory.push(result);
      this.broadcast(room.id, { type: 'COMPETITION_RESULT', result, room });
    }
  }

  enterCompetition(roomId: string, playerId: string, wineId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'competition') return;
    if (!(room as any).competitionEntries) (room as any).competitionEntries = [];
    (room as any).competitionEntries = (room as any).competitionEntries.filter((e: any) => e.playerId !== playerId);
    (room as any).competitionEntries.push({ playerId, wineId });
  }

  phaseTimeout(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.advancePhase(room);
  }

  private nextPhase(room: RoomState, phase: PhaseType) {
    room.currentPhase = phase;
    room.phaseDeadline = Date.now() + PHASE_DURATION;
    room.phaseTimer = PHASE_DURATION;

    switch (phase) {
      case 'market_auction':
        room.market = getInitialMarket();
        room.auctionBids = [];
        break;
      case 'brewing':
        const purchases = runAuction(room);
        if (purchases.length > 0) {
          purchases.forEach(p => {
            const player = room.players.find(pl => pl.id === p.playerId);
            const ing = room.market.find(i => i.id === p.ingredientId);
            if (player && ing) {
              const ev = {
                id: uuidv4(),
                round: room.currentRound,
                playerId: p.playerId,
                message: `[拍卖] ${player.name} 购入 ${ing.name} x${p.quantity}，花费 ¥${p.cost}`
              };
              room.events.push(ev as any);
            }
          });
        }
        room.auctionBids = [];
        this.broadcast(room.id, { type: 'AUCTION_RESULT', room, purchases });
        break;
      case 'aging':
        updateAging(room);
        break;
      case 'sales':
        break;
      case 'competition':
        this.processCompetitionPhase(room);
        break;
      case 'events':
        const event = generateRandomEvent(room);
        room.events.push(event);
        break;
    }

    this.updateAssets(room);
    this.broadcast(room.id, { type: 'PHASE_CHANGED', room });

    this.clearPhaseTimer(room.id);
    const timer = setTimeout(() => this.advancePhase(room), PHASE_DURATION);
    this.phaseTimers.set(room.id, timer);
  }

  private advancePhase(room: RoomState) {
    if (room.gameEnded) return;

    const phaseOrder: PhaseType[] = ['market_auction', 'brewing', 'aging', 'sales', 'events'];
    let idx = phaseOrder.indexOf(room.currentPhase);

    if (room.currentRound % COMPETITION_INTERVAL === 0 && room.currentPhase === 'events') {
      this.nextPhase(room, 'competition');
      return;
    }

    if (idx === -1 || idx === phaseOrder.length - 1) {
      this.endRound(room);
      return;
    }

    this.nextPhase(room, phaseOrder[idx + 1]);
  }

  private endRound(room: RoomState) {
    room.currentRound += 1;
    room.marketTrend = {};

    room.players.forEach(p => {
      p.totalAssets = calculateTotalAssets(p);
      if (checkBankruptcy(p)) {
        p.bankruptcyRounds += 1;
      } else {
        p.bankruptcyRounds = 0;
      }
    });

    room.players = room.players.filter(p => p.bankruptcyRounds < 5);

    if (room.currentRound > room.maxRounds || room.players.length <= 1) {
      this.endGame(room);
      return;
    }

    const master = checkMasterVictory(room);
    if (master) {
      room.winner = master;
      this.endGame(room);
      return;
    }

    this.nextPhase(room, 'market_auction');
  }

  private endGame(room: RoomState) {
    room.gameEnded = true;
    room.currentPhase = 'idle';
    this.clearPhaseTimer(room.id);

    if (!room.winner) {
      room.players.sort((a, b) => calculateFinalScore(b) - calculateFinalScore(a));
      room.winner = room.players[0];
    }

    this.broadcast(room.id, { type: 'GAME_ENDED', room });
  }

  private updateAssets(room: RoomState) {
    room.players.forEach(p => {
      p.totalAssets = calculateTotalAssets(p);
    });
  }

  private clearPhaseTimer(roomId: string) {
    const t = this.phaseTimers.get(roomId);
    if (t) {
      clearTimeout(t);
      this.phaseTimers.delete(roomId);
    }
  }

  private createInitialPlayer(id: string, name: string, roomId: string): Player {
    return {
      id,
      name,
      roomId,
      coins: 2000,
      reputation: 0,
      bankruptcyRounds: 0,
      ingredients: [],
      barrels: [],
      batches: [],
      inventory: [],
      equipment: [
        { id: uuidv4(), type: 'fermenter_basic', name: '基础发酵罐', level: 1, effect: '标准发酵能力' }
      ],
      competitionWins: 0,
      totalAssets: 2000
    };
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  getPlayerRoomIds(): { roomId: string; playerId: string; name: string }[] {
    const result: { roomId: string; playerId: string; name: string }[] = [];
    this.rooms.forEach(room => {
      room.players.forEach(p => {
        result.push({ roomId: room.id, playerId: p.id, name: p.name });
      });
    });
    return result;
  }

  cleanup() {
    this.phaseTimers.forEach(t => clearTimeout(t));
    this.phaseTimers.clear();
  }
}
