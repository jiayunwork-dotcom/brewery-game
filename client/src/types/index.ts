export type WineRoute = 'wine' | 'beer' | 'whiskey';

export type GrapeVariety = 'cabernet' | 'pinot_noir' | 'riesling' | 'chardonnay';
export type MaltVariety = 'pale' | 'caramel' | 'chocolate' | 'smoked';
export type HopVariety = 'cascade' | 'citra' | 'saaz';
export type YeastStrain = 'wine_standard' | 'wine_aromatic' | 'beer_ale' | 'beer_lager' | 'whiskey_distillers';
export type BarrelType = 'french_oak' | 'american_oak' | 'sherry' | 'bourbon';
export type QualityGrade = 'normal' | 'premium' | 'top';
export type MarketTier = 'mass' | 'premium' | 'luxury';

export interface FlavorProfile {
  acidity: number;
  sweetness: number;
  bitterness: number;
  fruitiness: number;
  floral: number;
  woody: number;
  body: number;
  finish: number;
}

export interface Ingredient {
  id: string;
  name: string;
  type: 'grape' | 'malt' | 'hop' | 'yeast' | 'barley';
  variety?: GrapeVariety | MaltVariety | HopVariety | YeastStrain;
  quality: QualityGrade;
  baseFlavor: Partial<FlavorProfile>;
  basePrice: number;
  currentPrice: number;
  quantity: number;
  purchased: number;
}

export interface Barrel {
  id: string;
  type: BarrelType;
  capacity: number;
  usedTimes: number;
  maxUses: number;
  cost: number;
  flavorModifier: Partial<FlavorProfile>;
}

export interface Batch {
  id: string;
  ownerId: string;
  route: WineRoute;
  name: string;
  currentStage: string;
  stageProgress: number;
  totalStages: number;
  ingredients: string[];
  barrelId?: string;
  barrelRounds: number;
  flavorHistory: FlavorProfile[];
  currentFlavor: FlavorProfile;
  params: Record<string, number>;
  quantity: number;
  createdAt: number;
  isBottled: boolean;
  score?: number;
  commissionId?: string;
}

export interface Equipment {
  id: string;
  type: 'fermenter_basic' | 'fermenter_stainless' | 'fermenter_oak' | 'still_copper' | 'cellar' | 'lab';
  name: string;
  level: number;
  effect: string;
}

export interface BottledWine {
  id: string;
  batchId: string;
  route: WineRoute;
  name: string;
  flavor: FlavorProfile;
  score: number;
  quantity: number;
  ageRounds: number;
}

export interface Player {
  id: string;
  name: string;
  roomId: string;
  coins: number;
  reputation: number;
  bankruptcyRounds: number;
  ingredients: { ingredientId: string; quantity: number }[];
  barrels: Barrel[];
  batches: Batch[];
  inventory: BottledWine[];
  equipment: Equipment[];
  competitionWins: number;
  totalAssets: number;
  commissionRatings: number[];
  totalCommissionsAccepted: number;
}

export type PhaseType = 'market_auction' | 'brewing' | 'aging' | 'sales' | 'competition' | 'events' | 'idle';

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  currentRound: number;
  maxRounds: number;
  currentPhase: PhaseType;
  phaseTimer: number;
  phaseDeadline: number;
  market: Ingredient[];
  marketTrend: Partial<FlavorProfile>;
  events: GameEvent[];
  competitionHistory: CompetitionResult[];
  auctionBids: { playerId: string; ingredientId: string; bid: number; quantity: number }[];
  gameStarted: boolean;
  gameEnded: boolean;
  winner?: Player;
  chatMessages: ChatMessage[];
  tradeListings: TradeListing[];
  competitionWineIds: string[];
  guilds: Guild[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
}

export interface GameEvent {
  id: string;
  round: number;
  type: 'accident' | 'harvest' | 'celebrity' | 'market_boom' | 'market_crash' | 'trade';
  message: string;
  affectedPlayerIds?: string[];
  effect: Record<string, unknown>;
}

export interface CompetitionResult {
  round: number;
  entries: { playerId: string; wineId: string; score: number; judgeScores: number[] }[];
  winners: { playerId: string; rank: number; reputationReward: number; coinReward: number }[];
}

export type TradeItemType = 'ingredient' | 'wine';

export interface GuildApplication {
  playerId: string;
  playerName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export type CommissionStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'timed_out';

export interface Commission {
  id: string;
  requesterId: string;
  requesterName: string;
  brewerId: string;
  brewerName: string;
  ingredients: { ingredientId: string; quantity: number }[];
  route: WineRoute;
  name: string;
  params: Record<string, number>;
  quantity: number;
  batchId?: string;
  status: CommissionStatus;
  roundsSinceLastProgress: number;
  lastBatchStage: string;
  createdAt: number;
  rating?: number;
  ratedByRequester?: boolean;
}

export interface GuildFundRecord {
  id: string;
  playerId: string;
  playerName: string;
  type: 'donate' | 'spend_barrel' | 'spend_upgrade';
  amount: number;
  description: string;
  timestamp: number;
}

export interface GuildAnnouncement {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  timestamp: number;
}

export interface Guild {
  id: string;
  name: string;
  motto: string;
  leaderId: string;
  memberIds: string[];
  barrels: Barrel[];
  applications: GuildApplication[];
  commissions: Commission[];
  level: number;
  experience: number;
  funds: number;
  fundRecords: GuildFundRecord[];
  announcements: GuildAnnouncement[];
}

export interface TradeListing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemType: TradeItemType;
  itemId: string;
  itemName: string;
  itemRoute?: WineRoute;
  itemScore?: number;
  quality?: QualityGrade;
  quantity: number;
  unitPrice: number;
  status: 'pending' | 'sold' | 'cancelled';
  createdAt: number;
  wineFlavor?: FlavorProfile;
  wineBatchId?: string;
  wineAgeRounds?: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  gameStarted: boolean;
  hostName: string;
}

export const PHASE_NAMES: Record<PhaseType, string> = {
  idle: '等待中',
  market_auction: '原料市场拍卖',
  brewing: '酿造操作',
  aging: '陈酿推进',
  sales: '销售阶段',
  competition: '品酒大赛',
  events: '随机事件'
};

export const ROUTE_NAMES: Record<WineRoute, string> = {
  wine: '葡萄酒',
  beer: '精酿啤酒',
  whiskey: '威士忌'
};

export const QUALITY_NAMES: Record<QualityGrade, string> = {
  normal: '普通',
  premium: '优质',
  top: '顶级'
};

export const MARKET_TIER_NAMES: Record<MarketTier, string> = {
  mass: '大众市场',
  premium: '精品市场',
  luxury: '高端收藏市场'
};

export const FLAVOR_NAMES: (keyof FlavorProfile)[] = [
  'acidity', 'sweetness', 'bitterness', 'fruitiness', 'floral', 'woody', 'body', 'finish'
];

export const FLAVOR_LABELS: Record<keyof FlavorProfile, string> = {
  acidity: '酸度',
  sweetness: '甜度',
  bitterness: '苦味',
  fruitiness: '果香',
  floral: '花香',
  woody: '木质',
  body: '酒体',
  finish: '余韵'
};

export const BARREL_NAMES: Record<BarrelType, string> = {
  french_oak: '法国橡木桶',
  american_oak: '美国橡木桶',
  sherry: '雪莉桶',
  bourbon: '波本桶'
};

export const COMMISSION_STATUS_NAMES: Record<CommissionStatus, string> = {
  pending: '待接受',
  accepted: '酿造中',
  completed: '已完成',
  cancelled: '已取消',
  timed_out: '已超时'
};

export const STAGE_NAMES: Record<string, Record<string, string>> = {
  wine: {
    harvest: '采摘',
    press: '压榨',
    ferment: '发酵',
    age: '桶陈',
    blend: '调配',
    bottle: '装瓶'
  },
  beer: {
    malt_select: '选料',
    mash: '糖化',
    boil: '煮沸',
    ferment: '发酵',
    mature: '熟化',
    package: '灌装'
  },
  whiskey: {
    barley_select: '选大麦',
    mash: '糖化',
    distill: '蒸馏',
    barrel_age: '桶陈',
    bottle: '装瓶'
  }
};
