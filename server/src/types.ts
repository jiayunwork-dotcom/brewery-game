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
  type: 'accident' | 'harvest' | 'celebrity' | 'market_boom' | 'market_crash';
  message: string;
  affectedPlayerIds?: string[];
  effect: Record<string, unknown>;
}

export interface CompetitionResult {
  round: number;
  entries: { playerId: string; wineId: string; score: number; judgeScores: number[] }[];
  winners: { playerId: string; rank: number; reputationReward: number; coinReward: number }[];
}

export interface Judge {
  id: string;
  name: string;
  type: 'balanced' | 'intense' | 'complex';
  weights: Partial<FlavorProfile>;
}

export type WebSocketMessage =
  | { type: 'CREATE_ROOM'; playerName: string; roomName: string; maxPlayers: number }
  | { type: 'JOIN_ROOM'; playerName: string; roomId: string }
  | { type: 'LEAVE_ROOM'; roomId: string; playerId: string }
  | { type: 'START_GAME'; roomId: string; playerId: string }
  | { type: 'CHAT'; roomId: string; playerId: string; content: string }
  | { type: 'SUBMIT_BID'; roomId: string; playerId: string; bids: { ingredientId: string; bid: number; quantity: number }[] }
  | { type: 'BREWING_ACTION'; roomId: string; playerId: string; action: string; data: Record<string, unknown> }
  | { type: 'LIST_FOR_SALE'; roomId: string; playerId: string; listings: { wineId: string; tier: MarketTier; price: number }[] }
  | { type: 'ENTER_COMPETITION'; roomId: string; playerId: string; wineId: string }
  | { type: 'PHASE_TIMEOUT'; roomId: string; playerId: string }
  | { type: 'REQUEST_STATE'; roomId: string; playerId: string };

export type ServerMessage =
  | { type: 'ROOM_CREATED'; room: RoomState; playerId: string }
  | { type: 'ROOM_JOINED'; room: RoomState; playerId: string }
  | { type: 'PLAYER_JOINED'; room: RoomState }
  | { type: 'PLAYER_LEFT'; room: RoomState }
  | { type: 'GAME_STARTED'; room: RoomState }
  | { type: 'GAME_ENDED'; room: RoomState }
  | { type: 'PHASE_CHANGED'; room: RoomState }
  | { type: 'STATE_UPDATED'; room: RoomState }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'ERROR'; message: string }
  | { type: 'COMPETITION_RESULT'; result: CompetitionResult; room: RoomState }
  | { type: 'AUCTION_RESULT'; room: RoomState; purchases: { playerId: string; ingredientId: string; quantity: number; cost: number }[] }
  | { type: 'SALES_RESULT'; room: RoomState; sales: { playerId: string; wineId: string; quantity: number; revenue: number }[] };
