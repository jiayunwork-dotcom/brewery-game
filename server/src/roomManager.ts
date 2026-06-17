import {
  RoomState, Player, WebSocketMessage, ServerMessage,
  PhaseType, MarketTier, Ingredient, Batch, BottledWine, Equipment,
  TradeListing, TradeItemType, QualityGrade, WineRoute, FlavorProfile,
  Guild, GuildApplication, Commission, CommissionStatus,
  GuildFundRecord, GuildAnnouncement, BarrelType
} from './types';
import { getInitialMarket, createBarrel, BARREL_DATA } from './data';
import {
  createBatch, advanceBatchStage, bottleBatch, runAuction,
  updateAging, runCompetition, generateRandomEvent,
  calculateTotalAssets, calculateFinalScore, checkBankruptcy,
  checkMasterVictory, uuidv4, getGuildMaxBarrels, getGuildMaxMembers,
  getExperienceForNextLevel, addGuildExperience, GUILD_MAX_LEVEL
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
      chatMessages: [],
      tradeListings: [],
      competitionWineIds: [],
      guilds: []
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
    this.handlePlayerLeaveGuild(room, playerId);
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
    const room = this.rooms.get(player.roomId);
    const idx = player.batches.findIndex(b => b.id === batchId);
    if (idx < 0) return;
    const batch = player.batches[idx];

    const isReady = (batch.route === 'wine' && batch.currentStage === 'bottle' && batch.stageProgress >= 80)
      || (batch.route === 'beer' && batch.currentStage === 'package' && batch.stageProgress >= 80)
      || (batch.route === 'whiskey' && batch.currentStage === 'bottle' && batch.barrelRounds >= 8);

    if (!isReady) return;

    if (batch.barrelId) {
      let barrel = player.barrels.find(b => b.id === batch.barrelId);
      if (!barrel && room) {
        for (const guild of room.guilds) {
          barrel = guild.barrels.find(b => b.id === batch.barrelId);
          if (barrel) {
            barrel.usedTimes += 1;
            if (barrel.usedTimes >= barrel.maxUses) {
              guild.barrels = guild.barrels.filter(b => b.id !== batch.barrelId);
            }
            break;
          }
        }
      } else if (barrel) {
        barrel.usedTimes += 1;
      }
    }

    const bottled = bottleBatch(batch);

    if (batch.commissionId && room) {
      let commission: Commission | undefined;
      let ownerGuild: Guild | undefined;
      for (const guild of room.guilds) {
        const c = guild.commissions.find(c => c.id === batch.commissionId);
        if (c) { commission = c; ownerGuild = guild; break; }
      }
      if (commission) {
        const requester = room.players.find(p => p.id === commission.requesterId);
        if (requester) {
          requester.inventory.push(bottled);
        }
        commission.status = 'completed';
        player.totalCommissionsAccepted += 1;
      }
    } else {
      player.inventory.push(bottled);
    }

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
    if (!batch) return;

    let barrel = player.barrels.find(b => b.id === barrelId);
    if (!barrel) {
      const room = this.rooms.get(player.roomId);
      if (room) {
        for (const guild of room.guilds) {
          if (!guild.memberIds.includes(player.id)) continue;
          barrel = guild.barrels.find(b => b.id === barrelId);
          if (barrel) break;
        }
      }
    }
    if (!barrel || barrel.usedTimes >= barrel.maxUses) return;

    if (barrelId !== batch.barrelId) {
      const room = this.rooms.get(player.roomId);
      if (room) {
        for (const p of room.players) {
          for (const b of p.batches) {
            if (b.barrelId === barrelId && b.id !== batchId) return;
          }
        }
      }
    }

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
    if (!room.competitionWineIds.includes(wineId)) {
      room.competitionWineIds.push(wineId);
    }
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

    this.processCommissionTimeouts(room);

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
      totalAssets: 2000,
      commissionRatings: [],
      totalCommissionsAccepted: 0
    };
  }

  createTradeListing(roomId: string, playerId: string, itemType: TradeItemType, itemId: string, quantity: number, unitPrice: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'sales') return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const pendingListings = room.tradeListings.filter(l => l.sellerId === playerId && l.status === 'pending');
    if (pendingListings.length >= 5) return false;

    if (quantity <= 0 || unitPrice <= 0) return false;

    let itemName = '';
    let itemRoute: WineRoute | undefined;
    let itemScore: number | undefined;
    let quality: QualityGrade | undefined;
    let wineFlavor: FlavorProfile | undefined;
    let wineBatchId: string | undefined;
    let wineAgeRounds: number | undefined;

    if (itemType === 'ingredient') {
      const pi = player.ingredients.find(x => x.ingredientId === itemId);
      const mi = room.market.find(x => x.id === itemId);
      if (!pi || !mi || pi.quantity < quantity) return false;
      pi.quantity -= quantity;
      itemName = mi.name;
      quality = mi.quality;
    } else if (itemType === 'wine') {
      if (room.competitionWineIds.includes(itemId)) return false;
      const wine = player.inventory.find(w => w.id === itemId);
      if (!wine || wine.quantity < quantity) return false;
      wine.quantity -= quantity;
      if (wine.quantity <= 0) {
        player.inventory = player.inventory.filter(w => w.id !== itemId);
      }
      itemName = wine.name;
      itemRoute = wine.route;
      itemScore = wine.score;
      wineFlavor = { ...wine.flavor };
      wineBatchId = wine.batchId;
      wineAgeRounds = wine.ageRounds;
    } else {
      return false;
    }

    const listing: TradeListing = {
      id: `trade_${uuidv4()}`,
      sellerId: playerId,
      sellerName: player.name,
      itemType,
      itemId,
      itemName,
      itemRoute,
      itemScore,
      quality,
      quantity,
      unitPrice,
      status: 'pending',
      createdAt: Date.now(),
      wineFlavor,
      wineBatchId,
      wineAgeRounds
    };

    room.tradeListings.push(listing);
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  cancelTradeListing(roomId: string, playerId: string, listingId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'sales') return false;
    const listing = room.tradeListings.find(l => l.id === listingId);
    if (!listing || listing.sellerId !== playerId || listing.status !== 'pending') return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    if (listing.itemType === 'ingredient') {
      const existing = player.ingredients.find(x => x.ingredientId === listing.itemId);
      if (existing) {
        existing.quantity += listing.quantity;
      } else {
        player.ingredients.push({ ingredientId: listing.itemId, quantity: listing.quantity });
      }
    } else if (listing.itemType === 'wine') {
      const existing = player.inventory.find(w => w.id === listing.itemId);
      if (existing) {
        existing.quantity += listing.quantity;
      } else {
        player.inventory.push({
          id: listing.itemId,
          batchId: listing.wineBatchId || '',
          route: listing.itemRoute || 'wine',
          name: listing.itemName,
          flavor: listing.wineFlavor
            ? { ...listing.wineFlavor }
            : { acidity: 0, sweetness: 0, bitterness: 0, fruitiness: 0, floral: 0, woody: 0, body: 0, finish: 0 },
          score: listing.itemScore || 0,
          quantity: listing.quantity,
          ageRounds: listing.wineAgeRounds || 0
        });
      }
    }

    listing.status = 'cancelled';
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  buyTradeListing(roomId: string, playerId: string, listingId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.currentPhase !== 'sales') return false;
    const listing = room.tradeListings.find(l => l.id === listingId);
    if (!listing || listing.status !== 'pending') return false;
    if (listing.sellerId === playerId) return false;

    const buyer = room.players.find(p => p.id === playerId);
    const seller = room.players.find(p => p.id === listing.sellerId);
    if (!buyer || !seller) return false;

    const totalCost = listing.quantity * listing.unitPrice;
    if (buyer.coins < totalCost) return false;

    buyer.coins -= totalCost;
    seller.coins += totalCost;

    if (listing.itemType === 'ingredient') {
      const existing = buyer.ingredients.find(x => x.ingredientId === listing.itemId);
      if (existing) {
        existing.quantity += listing.quantity;
      } else {
        buyer.ingredients.push({ ingredientId: listing.itemId, quantity: listing.quantity });
      }
    } else if (listing.itemType === 'wine') {
      const existing = buyer.inventory.find(w => w.id === listing.itemId);
      if (existing) {
        existing.quantity += listing.quantity;
      } else {
        buyer.inventory.push({
          id: listing.itemId,
          batchId: listing.wineBatchId || '',
          route: listing.itemRoute || 'wine',
          name: listing.itemName,
          flavor: listing.wineFlavor
            ? { ...listing.wineFlavor }
            : { acidity: 0, sweetness: 0, bitterness: 0, fruitiness: 0, floral: 0, woody: 0, body: 0, finish: 0 },
          score: listing.itemScore || 0,
          quantity: listing.quantity,
          ageRounds: listing.wineAgeRounds || 0
        });
      }
    }

    listing.status = 'sold';

    const tradeEvent1 = {
      id: uuidv4(),
      round: room.currentRound,
      type: 'trade' as const,
      message: `[交易] ${seller.name} 卖出「${listing.itemName}」x${listing.quantity}，获得 ¥${totalCost}`,
      affectedPlayerIds: [seller.id],
      effect: { coins: totalCost }
    };
    room.events.push(tradeEvent1 as any);

    const tradeEvent2 = {
      id: uuidv4(),
      round: room.currentRound,
      type: 'trade' as const,
      message: `[交易] ${buyer.name} 从 ${seller.name} 购入「${listing.itemName}」x${listing.quantity}，花费 ¥${totalCost}`,
      affectedPlayerIds: [buyer.id],
      effect: { coins: -totalCost }
    };
    room.events.push(tradeEvent2 as any);

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  createGuild(roomId: string, playerId: string, name: string, motto: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    if (player.coins < 500) return false;

    for (const g of room.guilds) {
      if (g.memberIds.includes(playerId)) return false;
    }

    if (!name || name.trim().length === 0 || name.trim().length > 20) return false;

    const guild: Guild = {
      id: `guild_${uuidv4()}`,
      name: name.trim(),
      motto: motto.trim() || '干杯！',
      leaderId: playerId,
      memberIds: [playerId],
      barrels: [],
      applications: [],
      commissions: [],
      level: 1,
      experience: 0,
      funds: 0,
      fundRecords: [],
      announcements: []
    };

    player.coins -= 500;
    room.guilds.push(guild);
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  applyToGuild(roomId: string, playerId: string, guildId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    for (const g of room.guilds) {
      if (g.memberIds.includes(playerId)) return false;
    }

    const guild = room.guilds.find(g => g.id === guildId);
    if (!guild) return false;
    if (guild.memberIds.length >= getGuildMaxMembers(guild.level)) return false;
    if (guild.applications.some(a => a.playerId === playerId && a.status === 'pending')) return false;

    guild.applications.push({
      playerId,
      playerName: player.name,
      status: 'pending',
      createdAt: Date.now()
    });
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  approveGuildApplication(roomId: string, playerId: string, guildId: string, applicantId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const guild = room.guilds.find(g => g.id === guildId);
    if (!guild || guild.leaderId !== playerId) return false;
    if (guild.memberIds.length >= getGuildMaxMembers(guild.level)) return false;

    const app = guild.applications.find(a => a.playerId === applicantId && a.status === 'pending');
    if (!app) return false;

    for (const g of room.guilds) {
      if (g.memberIds.includes(applicantId)) {
        app.status = 'rejected';
        this.broadcast(roomId, { type: 'STATE_UPDATED', room });
        return false;
      }
    }

    app.status = 'approved';
    guild.memberIds.push(applicantId);
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  kickGuildMember(roomId: string, playerId: string, memberId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const guild = room.guilds.find(g => g.leaderId === playerId);
    if (!guild) return false;
    if (memberId === playerId) return false;
    if (!guild.memberIds.includes(memberId)) return false;

    guild.memberIds = guild.memberIds.filter(id => id !== memberId);
    this.cleanupCommissionsForPlayer(room, guild, memberId);
    this.cleanupGuildBarrelAssignments(room, guild, memberId);
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  leaveGuild(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const guild = room.guilds.find(g => g.memberIds.includes(playerId));
    if (!guild) return false;

    if (guild.leaderId === playerId) {
      if (guild.memberIds.length === 1) {
        this.cancelAllCommissions(room, guild);
        room.guilds = room.guilds.filter(g => g.id !== guild.id);
      } else {
        guild.memberIds = guild.memberIds.filter(id => id !== playerId);
        guild.leaderId = guild.memberIds[0];
        this.cleanupCommissionsForPlayer(room, guild, playerId);
        this.cleanupGuildBarrelAssignments(room, guild, playerId);
      }
    } else {
      guild.memberIds = guild.memberIds.filter(id => id !== playerId);
      this.cleanupCommissionsForPlayer(room, guild, playerId);
      this.cleanupGuildBarrelAssignments(room, guild, playerId);
    }

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  donateBarrelToGuild(roomId: string, playerId: string, barrelId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const guild = room.guilds.find(g => g.leaderId === playerId);
    if (!guild) return false;
    if (guild.barrels.length >= getGuildMaxBarrels(guild.level)) return false;

    const barrelIdx = player.barrels.findIndex(b => b.id === barrelId);
    if (barrelIdx < 0) return false;

    const barrel = player.barrels[barrelIdx];
    for (const p of room.players) {
      for (const batch of p.batches) {
        if (batch.barrelId === barrelId) return false;
      }
    }

    player.barrels.splice(barrelIdx, 1);
    guild.barrels.push(barrel);
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  createCommission(roomId: string, playerId: string, brewerId: string, ingredients: { ingredientId: string; quantity: number }[], route: WineRoute, name: string, params: Record<string, number>, quantity: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const requester = room.players.find(p => p.id === playerId);
    if (!requester) return false;

    const guild = room.guilds.find(g => g.memberIds.includes(playerId) && g.memberIds.includes(brewerId));
    if (!guild) return false;

    if (guild.commissions.filter(c => c.status === 'pending' || c.status === 'accepted').length >= 10) return false;

    for (const ing of ingredients) {
      const pi = requester.ingredients.find(x => x.ingredientId === ing.ingredientId);
      if (!pi || pi.quantity < ing.quantity) return false;
    }

    for (const ing of ingredients) {
      const pi = requester.ingredients.find(x => x.ingredientId === ing.ingredientId);
      if (pi) pi.quantity -= ing.quantity;
    }
    requester.ingredients = requester.ingredients.filter(x => x.quantity > 0);

    const brewer = room.players.find(p => p.id === brewerId);
    const commission: Commission = {
      id: `comm_${uuidv4()}`,
      requesterId: playerId,
      requesterName: requester.name,
      brewerId,
      brewerName: brewer?.name || '未知',
      ingredients,
      route,
      name: name || '委托酿造',
      params,
      quantity: quantity || 50,
      status: 'pending',
      roundsSinceLastProgress: 0,
      lastBatchStage: '',
      createdAt: Date.now()
    };

    guild.commissions.push(commission);
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  getPlayerAverageRating(player: Player): number {
    if (player.commissionRatings.length === 0) return 0;
    const sum = player.commissionRatings.reduce((a, b) => a + b, 0);
    return Math.round((sum / player.commissionRatings.length) * 10) / 10;
  }

  acceptCommission(roomId: string, playerId: string, commissionId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const brewer = room.players.find(p => p.id === playerId);
    if (!brewer) return false;
    if (room.currentPhase !== 'brewing') return false;

    const avgRating = this.getPlayerAverageRating(brewer);
    if (brewer.commissionRatings.length > 0 && avgRating < 3) return false;

    const guild = room.guilds.find(g => g.commissions.some(c => c.id === commissionId));
    if (!guild) return false;
    const commission = guild.commissions.find(c => c.id === commissionId);
    if (!commission || commission.brewerId !== playerId || commission.status !== 'pending') return false;

    const ingredientObjs: Ingredient[] = [];
    commission.ingredients.forEach(ci => {
      const mi = room.market.find(m => m.id === ci.ingredientId);
      if (mi) {
        ingredientObjs.push({ ...mi, purchased: ci.quantity });
      }
    });

    if (ingredientObjs.length === 0) {
      this.returnCommissionIngredients(room, commission);
      commission.status = 'cancelled';
      this.broadcast(roomId, { type: 'STATE_UPDATED', room });
      return false;
    }

    const batch = createBatch(playerId, commission.route, commission.name, ingredientObjs, commission.params, commission.quantity);
    batch.commissionId = commissionId;
    commission.batchId = batch.id;
    commission.status = 'accepted';
    commission.lastBatchStage = batch.currentStage;
    brewer.batches.push(batch);

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  cancelCommission(roomId: string, playerId: string, commissionId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const guild = room.guilds.find(g => g.commissions.some(c => c.id === commissionId));
    if (!guild) return false;
    const commission = guild.commissions.find(c => c.id === commissionId);
    if (!commission) return false;
    if (commission.requesterId !== playerId) return false;
    if (commission.status !== 'pending' && commission.status !== 'accepted') return false;

    if (commission.status === 'accepted' && commission.batchId) {
      for (const p of room.players) {
        const bIdx = p.batches.findIndex(b => b.id === commission.batchId);
        if (bIdx >= 0) {
          p.batches.splice(bIdx, 1);
          break;
        }
      }
    }

    this.returnCommissionIngredients(room, commission);
    commission.status = 'cancelled';
    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  donateFundsToGuild(roomId: string, playerId: string, amount: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    if (amount < 100 || player.coins < amount) return false;

    const guild = room.guilds.find(g => g.memberIds.includes(playerId));
    if (!guild) return false;

    player.coins -= amount;
    guild.funds += amount;

    const record: GuildFundRecord = {
      id: `fund_${uuidv4()}`,
      playerId,
      playerName: player.name,
      type: 'donate',
      amount,
      description: `${player.name} 捐赠了 ¥${amount}`,
      timestamp: Date.now()
    };
    guild.fundRecords.unshift(record);
    if (guild.fundRecords.length > 50) guild.fundRecords.pop();

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  buyGuildBarrel(roomId: string, playerId: string, barrelType: BarrelType): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const guild = room.guilds.find(g => g.leaderId === playerId);
    if (!guild) return false;
    if (guild.barrels.length >= getGuildMaxBarrels(guild.level)) return false;

    const cost = BARREL_DATA[barrelType]?.cost;
    if (!cost || guild.funds < cost) return false;

    guild.funds -= cost;
    guild.barrels.push(createBarrel(barrelType));

    const record: GuildFundRecord = {
      id: `fund_${uuidv4()}`,
      playerId,
      playerName: player.name,
      type: 'spend_barrel',
      amount: cost,
      description: `购买 ${BARREL_DATA[barrelType].name}`,
      timestamp: Date.now()
    };
    guild.fundRecords.unshift(record);
    if (guild.fundRecords.length > 50) guild.fundRecords.pop();

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  speedUpGuildLevel(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const guild = room.guilds.find(g => g.leaderId === playerId);
    if (!guild) return false;
    if (guild.level >= GUILD_MAX_LEVEL) return false;

    const expNeeded = getExperienceForNextLevel(guild.level);
    if (expNeeded <= 0) return false;

    const cost = expNeeded * 10;
    if (guild.funds < cost) return false;

    guild.funds -= cost;
    const result = addGuildExperience(guild, expNeeded);

    const record: GuildFundRecord = {
      id: `fund_${uuidv4()}`,
      playerId,
      playerName: player.name,
      type: 'spend_upgrade',
      amount: cost,
      description: `加速升级到 ${result.newLevel} 级`,
      timestamp: Date.now()
    };
    guild.fundRecords.unshift(record);
    if (guild.fundRecords.length > 50) guild.fundRecords.pop();

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  rateCommission(roomId: string, playerId: string, commissionId: string, rating: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (rating < 1 || rating > 5) return false;

    const guild = room.guilds.find(g => g.commissions.some(c => c.id === commissionId));
    if (!guild) return false;

    const commission = guild.commissions.find(c => c.id === commissionId);
    if (!commission) return false;
    if (commission.requesterId !== playerId) return false;
    if (commission.status !== 'completed') return false;
    if (commission.ratedByRequester) return false;

    const brewer = room.players.find(p => p.id === commission.brewerId);
    if (!brewer) return false;

    commission.rating = rating;
    commission.ratedByRequester = true;
    brewer.commissionRatings.push(rating);

    this.updateAssets(room);
    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  createGuildAnnouncement(roomId: string, playerId: string, content: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const guild = room.guilds.find(g => g.leaderId === playerId);
    if (!guild) return false;

    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length > 50) return false;

    const announcement: GuildAnnouncement = {
      id: `ann_${uuidv4()}`,
      content: trimmedContent,
      createdBy: playerId,
      createdByName: player.name,
      timestamp: Date.now()
    };

    guild.announcements.unshift(announcement);
    if (guild.announcements.length > 3) guild.announcements.pop();

    this.broadcast(roomId, { type: 'STATE_UPDATED', room });
    return true;
  }

  private processCommissionTimeouts(room: RoomState) {
    for (const guild of room.guilds) {
      const activeCommissions = guild.commissions.filter(c => c.status === 'accepted');
      for (const commission of activeCommissions) {
        if (!commission.batchId) continue;

        let batch: Batch | undefined;
        for (const p of room.players) {
          const b = p.batches.find(b => b.id === commission.batchId);
          if (b) { batch = b; break; }
        }

        if (batch && batch.currentStage !== commission.lastBatchStage) {
          commission.roundsSinceLastProgress = 0;
          commission.lastBatchStage = batch.currentStage;
        } else {
          commission.roundsSinceLastProgress += 1;
        }

        if (commission.roundsSinceLastProgress >= 3) {
          if (batch) {
            for (const p of room.players) {
              const bIdx = p.batches.findIndex(b => b.id === commission.batchId);
              if (bIdx >= 0) {
                p.batches.splice(bIdx, 1);
                break;
              }
            }
          }
          this.returnCommissionIngredients(room, commission);
          commission.status = 'timed_out';
        }
      }
    }
  }

  private returnCommissionIngredients(room: RoomState, commission: Commission) {
    const requester = room.players.find(p => p.id === commission.requesterId);
    if (!requester) return;
    for (const ci of commission.ingredients) {
      const existing = requester.ingredients.find(x => x.ingredientId === ci.ingredientId);
      if (existing) {
        existing.quantity += ci.quantity;
      } else {
        requester.ingredients.push({ ingredientId: ci.ingredientId, quantity: ci.quantity });
      }
    }
  }

  private cancelAllCommissions(room: RoomState, guild: Guild) {
    for (const commission of guild.commissions) {
      if (commission.status === 'pending' || commission.status === 'accepted') {
        if (commission.status === 'accepted' && commission.batchId) {
          for (const p of room.players) {
            const bIdx = p.batches.findIndex(b => b.id === commission.batchId);
            if (bIdx >= 0) {
              p.batches.splice(bIdx, 1);
              break;
            }
          }
        }
        this.returnCommissionIngredients(room, commission);
        commission.status = 'cancelled';
      }
    }
  }

  private cleanupCommissionsForPlayer(room: RoomState, guild: Guild, playerId: string) {
    for (const commission of guild.commissions) {
      if (commission.status !== 'pending' && commission.status !== 'accepted') continue;
      if (commission.requesterId === playerId || commission.brewerId === playerId) {
        if (commission.status === 'accepted' && commission.batchId) {
          for (const p of room.players) {
            const bIdx = p.batches.findIndex(b => b.id === commission.batchId);
            if (bIdx >= 0) {
              p.batches.splice(bIdx, 1);
              break;
            }
          }
        }
        if (commission.requesterId === playerId) {
          this.returnCommissionIngredients(room, commission);
        }
        commission.status = 'cancelled';
      }
    }
  }

  private cleanupGuildBarrelAssignments(room: RoomState, guild: Guild, playerId: string) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    for (const batch of player.batches) {
      if (batch.barrelId && guild.barrels.some(b => b.id === batch.barrelId)) {
        batch.barrelId = undefined;
      }
    }
  }

  private handlePlayerLeaveGuild(room: RoomState, playerId: string) {
    const guild = room.guilds.find(g => g.memberIds.includes(playerId));
    if (!guild) return;

    if (guild.leaderId === playerId) {
      if (guild.memberIds.length === 1) {
        this.cancelAllCommissions(room, guild);
        room.guilds = room.guilds.filter(g => g.id !== guild.id);
      } else {
        guild.memberIds = guild.memberIds.filter(id => id !== playerId);
        guild.leaderId = guild.memberIds[0];
        this.cleanupCommissionsForPlayer(room, guild, playerId);
        this.cleanupGuildBarrelAssignments(room, guild, playerId);
      }
    } else {
      guild.memberIds = guild.memberIds.filter(id => id !== playerId);
      this.cleanupCommissionsForPlayer(room, guild, playerId);
      this.cleanupGuildBarrelAssignments(room, guild, playerId);
    }
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
