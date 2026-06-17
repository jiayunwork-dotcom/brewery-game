import {
  FlavorProfile, Batch, WineRoute, Ingredient, Player, RoomState,
  Barrel, BarrelType, BottledWine, Judge, CompetitionResult, GameEvent, QualityGrade, Guild
} from './types';
import { QUALITY_MULTIPLIER, JUDGES, BARREL_DATA, createBarrel, getInitialMarket } from './data';
import { v4 as uuidv4 } from 'uuid';

const FLAVOR_KEYS: (keyof FlavorProfile)[] = ['acidity', 'sweetness', 'bitterness', 'fruitiness', 'floral', 'woody', 'body', 'finish'];

export const GUILD_LEVEL_EXPERIENCE: Record<number, number> = {
  1: 0,
  2: 50,
  3: 100,
  4: 200,
  5: 400
};

export const GUILD_MAX_LEVEL = 5;

export const GUILD_BASE_BARREL_CAPACITY = 6;
export const GUILD_BASE_MEMBER_CAPACITY = 3;

export function getGuildMaxBarrels(level: number): number {
  return GUILD_BASE_BARREL_CAPACITY + (level - 1) * 2;
}

export function getGuildMaxMembers(level: number): number {
  return GUILD_BASE_MEMBER_CAPACITY + (level - 1) * 1;
}

export function getExperienceForNextLevel(currentLevel: number): number {
  return GUILD_LEVEL_EXPERIENCE[currentLevel + 1] || 0;
}

export function checkGuildLevelUp(guild: Guild): { leveledUp: boolean; newLevel: number } {
  let leveledUp = false;
  let currentLevel = guild.level;

  while (currentLevel < GUILD_MAX_LEVEL) {
    const nextExp = GUILD_LEVEL_EXPERIENCE[currentLevel + 1];
    if (nextExp && guild.experience >= nextExp) {
      currentLevel++;
      leveledUp = true;
    } else {
      break;
    }
  }

  return { leveledUp, newLevel: currentLevel };
}

export function addGuildExperience(guild: Guild, exp: number): { leveledUp: boolean; newLevel: number } {
  guild.experience += exp;
  const result = checkGuildLevelUp(guild);
  if (result.leveledUp) {
    guild.level = result.newLevel;
  }
  return result;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function createEmptyFlavor(): FlavorProfile {
  return { acidity: 0, sweetness: 0, bitterness: 0, fruitiness: 0, floral: 0, woody: 0, body: 0, finish: 0 };
}

export function mergeFlavors(base: FlavorProfile, addition: Partial<FlavorProfile>, multiplier = 1): FlavorProfile {
  const result = { ...base };
  FLAVOR_KEYS.forEach(key => {
    if (addition[key] !== undefined) {
      result[key] = clamp(result[key] + (addition[key] as number) * multiplier);
    }
  });
  return result;
}

export function addRandomNoise(flavor: FlavorProfile, intensity = 3): FlavorProfile {
  const result = { ...flavor };
  FLAVOR_KEYS.forEach(key => {
    result[key] = clamp(result[key] + randomRange(-intensity, intensity));
  });
  return result;
}

export function calculateIngredientFlavor(ingredients: Ingredient[]): FlavorProfile {
  let flavor = createEmptyFlavor();
  ingredients.forEach(ing => {
    const qualityMult = QUALITY_MULTIPLIER[ing.quality as QualityGrade] || 1;
    flavor = mergeFlavors(flavor, ing.baseFlavor, qualityMult * (ing.purchased > 0 ? ing.purchased : 1) / 10);
  });
  return addRandomNoise(flavor, 2);
}

export function applyWineFermentationEffect(flavor: FlavorProfile, temp: number, duration: number): FlavorProfile {
  let result = { ...flavor };

  if (temp >= 15 && temp <= 18) {
    result.fruitiness = clamp(result.fruitiness + randomRange(5, 10));
    result.floral = clamp(result.floral + randomRange(3, 6));
    result.acidity = clamp(result.acidity + randomRange(-2, 3));
  } else if (temp < 12) {
    result.sweetness = clamp(result.sweetness - randomRange(10, 18));
    result.acidity = clamp(result.acidity + randomRange(15, 25));
    result.bitterness = clamp(result.bitterness + randomRange(5, 10));
  } else if (temp > 25) {
    result.body = clamp(result.body - randomRange(8, 15));
    result.finish = clamp(result.finish - randomRange(5, 10));
    result.bitterness = clamp(result.bitterness + randomRange(8, 14));
  } else {
    result.acidity = clamp(result.acidity + randomRange(3, 8));
    result.sweetness = clamp(result.sweetness - randomRange(5, 10));
  }

  result.finish = clamp(result.finish + duration * 0.5);
  return addRandomNoise(result, 2);
}

export function applyBeerFermentationEffect(flavor: FlavorProfile, temp: number, aleType: boolean): FlavorProfile {
  let result = { ...flavor };
  if (aleType) {
    if (temp >= 18 && temp <= 22) {
      result.fruitiness = clamp(result.fruitiness + randomRange(4, 9));
      result.body = clamp(result.body + randomRange(3, 7));
    }
  } else {
    if (temp >= 7 && temp <= 12) {
      result.body = clamp(result.body + randomRange(5, 10));
      result.finish = clamp(result.finish + randomRange(4, 8));
      result.sweetness = clamp(result.sweetness - randomRange(3, 7));
    }
  }
  result.bitterness = clamp(result.bitterness + randomRange(2, 6));
  return addRandomNoise(result, 2);
}

export function applyBarrelAging(flavor: FlavorProfile, barrel: Barrel, rounds: number): FlavorProfile {
  let result = { ...flavor };
  const effectiveness = Math.max(0.2, 1 - barrel.usedTimes * 0.2);
  const barrelMod = BARREL_DATA[barrel.type].flavorModifier;

  FLAVOR_KEYS.forEach(key => {
    if (barrelMod[key] !== undefined) {
      result[key] = clamp(result[key] + (barrelMod[key] as number) * effectiveness * Math.min(rounds, 3));
    }
  });

  result.woody = clamp(result.woody + randomRange(2, 4) * rounds * effectiveness);
  result.fruitiness = clamp(result.fruitiness - randomRange(0.5, 1.5) * rounds);

  if (result.woody > 80) {
    const overshoot = result.woody - 80;
    result.acidity = clamp(result.acidity + overshoot * 0.3);
    result.bitterness = clamp(result.bitterness + overshoot * 0.15);
  }

  result.finish = clamp(result.finish + randomRange(1, 3) * rounds * effectiveness);
  return result;
}

export function calculateWineScore(flavor: FlavorProfile, judge: Judge): number {
  let baseScore = 0;
  FLAVOR_KEYS.forEach(key => {
    baseScore += flavor[key] * (judge.weights[key] || 0);
  });

  let complexityBonus = 0;
  FLAVOR_KEYS.forEach(key => {
    if (flavor[key] > 0) complexityBonus += 2;
  });

  const nonZeroCount = FLAVOR_KEYS.filter(k => flavor[k] > 0).length;
  const allAbove40 = FLAVOR_KEYS.every(k => flavor[k] >= 40);

  const values = FLAVOR_KEYS.map(k => flavor[k]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const balanceBonus = clamp(100 - stdDev);

  let finalScore = baseScore + complexityBonus * 0.5;

  if (judge.type === 'balanced') {
    finalScore += balanceBonus * 0.4;
  } else if (judge.type === 'intense') {
    const maxDim = Math.max(...values);
    if (maxDim > 85) finalScore += 20;
    if (maxDim > 90) finalScore += 15;
  } else if (judge.type === 'complex') {
    if (nonZeroCount >= 7) finalScore += 15;
    if (allAbove40) finalScore += 25;
  }

  FLAVOR_KEYS.forEach(key => {
    if (flavor[key] > 95) finalScore -= 10;
    if (flavor[key] < 5) finalScore -= 10;
  });

  return clamp(finalScore, 0, 100);
}

export function calculateAverageScore(flavor: FlavorProfile): number {
  const scores = JUDGES.map(j => calculateWineScore(flavor, j));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getRouteStages(route: WineRoute): string[] {
  switch (route) {
    case 'wine':
      return ['harvest', 'press', 'ferment', 'age', 'blend', 'bottle'];
    case 'beer':
      return ['malt_select', 'mash', 'boil', 'ferment', 'mature', 'package'];
    case 'whiskey':
      return ['barley_select', 'mash', 'distill', 'barrel_age', 'bottle'];
  }
}

export function createBatch(
  ownerId: string,
  route: WineRoute,
  name: string,
  ingredients: Ingredient[],
  params: Record<string, number>,
  quantity: number
): Batch {
  const stages = getRouteStages(route);
  const baseFlavor = calculateIngredientFlavor(ingredients);

  return {
    id: `batch_${uuidv4()}`,
    ownerId,
    route,
    name,
    currentStage: stages[0],
    stageProgress: 0,
    totalStages: stages.length,
    ingredients: ingredients.map(i => i.id),
    barrelRounds: 0,
    flavorHistory: [baseFlavor],
    currentFlavor: { ...baseFlavor },
    params,
    quantity,
    createdAt: Date.now(),
    isBottled: false
  };
}

export function advanceBatchStage(batch: Batch, player: Player, barrelId?: string): Batch {
  const stages = getRouteStages(batch.route);
  const currentIdx = stages.indexOf(batch.currentStage);
  const newIdx = Math.min(currentIdx + 1, stages.length - 1);
  const nextStage = stages[newIdx];
  let flavor = { ...batch.currentFlavor };
  let newParams = { ...batch.params };
  let barrelRounds = batch.barrelRounds;

  switch (nextStage) {
    case 'press':
      const pressure = newParams.pressure || 2;
      flavor.body = clamp(flavor.body + pressure * randomRange(2, 4));
      flavor.fruitiness = clamp(flavor.fruitiness + randomRange(3, 7));
      flavor.acidity = clamp(flavor.acidity + randomRange(2, 5));
      break;
    case 'ferment':
      const temp = newParams.temperature || 16;
      if (batch.route === 'wine') {
        flavor = applyWineFermentationEffect(flavor, temp, newParams.fermentDuration || 7);
      } else if (batch.route === 'beer') {
        const isAle = !newParams.lagerType;
        flavor = applyBeerFermentationEffect(flavor, temp, isAle);
      } else {
        flavor.body = clamp(flavor.body + randomRange(5, 12));
        flavor.finish = clamp(flavor.finish + randomRange(4, 10));
      }
      break;
    case 'mash':
      const mashTemp = newParams.mashTemp || 65;
      if (mashTemp >= 62 && mashTemp <= 66) {
        flavor.sweetness = clamp(flavor.sweetness + randomRange(5, 10));
        flavor.body = clamp(flavor.body + randomRange(3, 7));
      } else if (mashTemp > 70) {
        flavor.body = clamp(flavor.body + randomRange(8, 14));
        flavor.sweetness = clamp(flavor.sweetness - randomRange(3, 6));
      }
      break;
    case 'boil':
      const hopTime = newParams.hopAddTime || 30;
      if (hopTime > 45) {
        flavor.bitterness = clamp(flavor.bitterness + randomRange(10, 18));
      } else if (hopTime < 15) {
        flavor.fruitiness = clamp(flavor.fruitiness + randomRange(5, 10));
        flavor.floral = clamp(flavor.floral + randomRange(3, 7));
      }
      break;
    case 'distill':
      const cutRatio = newParams.cutRatio || 0.7;
      const hasCopperStill = player.equipment.some(e => e.type === 'still_copper');
      const purityBonus = hasCopperStill ? 1.3 : 1;
      if (cutRatio >= 0.6 && cutRatio <= 0.8) {
        flavor.body = clamp(flavor.body + randomRange(8, 15) * purityBonus);
        flavor.finish = clamp(flavor.finish + randomRange(5, 12) * purityBonus);
      } else {
        flavor.bitterness = clamp(flavor.bitterness + randomRange(5, 12));
      }
      break;
    case 'age':
    case 'barrel_age':
    case 'mature':
      break;
    case 'blend':
      flavor = addRandomNoise(flavor, 5);
      flavor.finish = clamp(flavor.finish + randomRange(2, 6));
      break;
    case 'bottle':
    case 'package':
      flavor = addRandomNoise(flavor, 3);
      break;
  }

  flavor = addRandomNoise(flavor, 2);
  const history = [...batch.flavorHistory, { ...flavor }];

  return {
    ...batch,
    currentStage: nextStage,
    stageProgress: ((newIdx + 1) / stages.length) * 100,
    currentFlavor: flavor,
    flavorHistory: history,
    params: newParams,
    barrelId: barrelId || batch.barrelId,
    barrelRounds
  };
}

export function bottleBatch(batch: Batch): BottledWine {
  const score = calculateAverageScore(batch.currentFlavor);
  return {
    id: `wine_${uuidv4()}`,
    batchId: batch.id,
    route: batch.route,
    name: batch.name,
    flavor: { ...batch.currentFlavor },
    score,
    quantity: batch.quantity,
    ageRounds: batch.barrelRounds
  };
}

export function runAuction(room: RoomState) {
  const purchases: { playerId: string; ingredientId: string; quantity: number; cost: number }[] = [];
  const groupedBids = new Map<string, { playerId: string; bid: number; quantity: number }[]>();

  room.auctionBids.forEach(b => {
    if (!groupedBids.has(b.ingredientId)) {
      groupedBids.set(b.ingredientId, []);
    }
    groupedBids.get(b.ingredientId)!.push(b);
  });

  room.market.forEach(ing => {
    const bids = groupedBids.get(ing.id);
    if (!bids || bids.length === 0) return;

    bids.sort((a, b) => b.bid - a.bid);
    let remaining = ing.quantity;

    for (const bid of bids) {
      if (remaining <= 0) break;
      const qty = Math.min(bid.quantity, remaining);
      const cost = qty * bid.bid;
      const player = room.players.find(p => p.id === bid.playerId);
      if (player && player.coins >= cost) {
        player.coins -= cost;
        const existing = player.ingredients.find(x => x.ingredientId === ing.id);
        if (existing) {
          existing.quantity += qty;
        } else {
          player.ingredients.push({ ingredientId: ing.id, quantity: qty });
        }
        remaining -= qty;
        ing.purchased += qty;
        purchases.push({ playerId: bid.playerId, ingredientId: ing.id, quantity: qty, cost });
      }
    }
    ing.quantity = remaining;
  });

  room.market.forEach(ing => {
    const demand = ing.purchased;
    const total = ing.quantity + ing.purchased;
    if (total > 0) {
      const ratio = demand / total;
      if (ratio > 0.7) {
        ing.currentPrice = Math.floor(ing.basePrice * 1.4);
      } else if (ratio > 0.4) {
        ing.currentPrice = Math.floor(ing.basePrice * 1.15);
      } else if (ratio < 0.1) {
        ing.currentPrice = Math.floor(ing.basePrice * 0.75);
      } else {
        ing.currentPrice = ing.basePrice;
      }
    }
  });

  room.auctionBids = [];
  return purchases;
}

export function updateAging(room: RoomState) {
  room.players.forEach(player => {
    player.batches.forEach(batch => {
      if (batch.barrelId) {
        let barrel = player.barrels.find(b => b.id === batch.barrelId);
        if (!barrel && room.guilds) {
          for (const guild of room.guilds) {
            barrel = guild.barrels.find(b => b.id === batch.barrelId);
            if (barrel) break;
          }
        }
        if (barrel) {
          batch.barrelRounds += 1;
          batch.currentFlavor = applyBarrelAging(batch.currentFlavor, barrel, 1);
          batch.flavorHistory.push({ ...batch.currentFlavor });
        }
      }
    });
    player.inventory.forEach(wine => {
      wine.ageRounds += 1;
    });
  });
}

export function runCompetition(room: RoomState, entries: { playerId: string; wineId: string }[]): CompetitionResult {
  const judgedEntries = entries.map(entry => {
    const player = room.players.find(p => p.id === entry.playerId);
    if (!player) return null;
    const wine = player.inventory.find(w => w.id === entry.wineId);
    if (!wine) return null;

    const judgeScores = JUDGES.map(j => calculateWineScore(wine.flavor, j));
    const avgScore = Math.round(judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length);

    return {
      playerId: entry.playerId,
      wineId: entry.wineId,
      score: avgScore,
      judgeScores
    };
  }).filter((e): e is NonNullable<typeof e> => e !== null);

  if (room.guilds && room.guilds.length > 0) {
    const guildMemberMap = new Map<string, string>();
    for (const guild of room.guilds) {
      for (const mid of guild.memberIds) {
        guildMemberMap.set(mid, guild.id);
      }
    }

    const guildEntryMap = new Map<string, typeof judgedEntries>();
    for (const entry of judgedEntries) {
      const gid = guildMemberMap.get(entry.playerId);
      if (gid) {
        if (!guildEntryMap.has(gid)) guildEntryMap.set(gid, []);
        guildEntryMap.get(gid)!.push(entry);
      }
    }

    for (const [, gEntries] of guildEntryMap) {
      if (gEntries.length >= 2 && gEntries.every(e => e.score > 50)) {
        for (const e of gEntries) {
          e.score = Math.round(e.score * 1.05);
        }
      }
    }
  }

  judgedEntries.sort((a, b) => b.score - a.score);

  const winners = judgedEntries.slice(0, 3).map((e, idx) => {
    const player = room.players.find(p => p.id === e.playerId)!;
    const rank = idx + 1;
    const reputationReward = rank === 1 ? 50 : rank === 2 ? 30 : 15;
    const coinReward = rank === 1 ? 500 : rank === 2 ? 300 : 150;
    const expReward = rank === 1 ? 30 : rank === 2 ? 20 : 10;
    player.reputation += reputationReward;
    player.coins += coinReward;
    if (rank === 1) player.competitionWins += 1;

    if (room.guilds) {
      for (const guild of room.guilds) {
        if (guild.memberIds.includes(player.id)) {
          addGuildExperience(guild, expReward);
          break;
        }
      }
    }

    return { playerId: e.playerId, rank, reputationReward, coinReward, expReward };
  });

  return {
    round: room.currentRound,
    entries: judgedEntries,
    winners
  };
}

export function generateRandomEvent(room: RoomState): GameEvent {
  const types: GameEvent['type'][] = ['accident', 'harvest', 'celebrity', 'market_boom', 'market_crash'];
  const type = types[Math.floor(Math.random() * types.length)];

  const event: GameEvent = {
    id: `evt_${uuidv4()}`,
    round: room.currentRound,
    type,
    message: '',
    effect: {}
  };

  switch (type) {
    case 'accident': {
      const victimIdx = Math.floor(Math.random() * room.players.length);
      const victim = room.players[victimIdx];
      if (victim.batches.length > 0) {
        const batchIdx = Math.floor(Math.random() * victim.batches.length);
        const batch = victim.batches[batchIdx];
        FLAVOR_KEYS.forEach(key => {
          batch.currentFlavor[key] = clamp(batch.currentFlavor[key] + randomRange(-15, -5));
        });
        event.affectedPlayerIds = [victim.id];
        event.message = `⚠️ 氧化事故！${victim.name} 的批次「${batch.name}」品质骤降。`;
      } else {
        event.message = '本回合平安无事。';
      }
      break;
    }
    case 'harvest': {
      const grapes = room.market.filter(m => m.type === 'grape');
      grapes.forEach(g => {
        g.currentPrice = Math.floor(g.basePrice * 0.6);
        g.quantity = Math.floor(g.quantity * 1.5);
      });
      event.message = '🍇 丰收年！葡萄产量大增，价格暴跌！';
      break;
    }
    case 'celebrity': {
      room.marketTrend = { fruitiness: 70, woody: 60 };
      event.message = '👨‍🍳 名厨驾临！高端需求激增，高果木香的酒款售价翻倍！';
      break;
    }
    case 'market_boom': {
      const randomKey = FLAVOR_KEYS[Math.floor(Math.random() * FLAVOR_KEYS.length)];
      room.marketTrend = { [randomKey]: 70 } as Partial<FlavorProfile>;
      const names: Record<string, string> = {
        acidity: '高酸度', sweetness: '甜型', bitterness: '苦型',
        fruitiness: '果香型', floral: '花香型', woody: '木桶型',
        body: '饱满型', finish: '长余韵型'
      };
      event.message = `📈 市场热潮！${names[randomKey]}酒款大受欢迎，售价翻倍！`;
      break;
    }
    case 'market_crash': {
      room.players.forEach(p => {
        p.coins = Math.floor(p.coins * 0.95);
      });
      event.message = '📉 市场低迷！所有玩家资产缩水5%。';
      break;
    }
  }

  return event;
}

export function calculateTotalAssets(player: Player): number {
  let total = player.coins;
  player.barrels.forEach(b => {
    const dep = (b.maxUses - b.usedTimes) / b.maxUses;
    total += b.cost * dep;
  });
  player.inventory.forEach(w => {
    const basePrice = w.score > 80 ? 800 : w.score > 60 ? 300 : 80;
    total += w.quantity * basePrice * (1 + player.reputation / 500);
  });
  player.equipment.forEach(e => {
    const eq = [1500, 800, 1200, 2000, 1500, 1800];
    total += eq[['fermenter_basic', 'fermenter_stainless', 'fermenter_oak', 'still_copper', 'cellar', 'lab'].indexOf(e.type)] || 0;
  });
  return Math.floor(total);
}

export function calculateFinalScore(player: Player): number {
  const assets = calculateTotalAssets(player);
  return Math.floor(player.reputation * 0.5 + assets * 0.3 + player.competitionWins * 100 * 0.2);
}

export function checkBankruptcy(player: Player): boolean {
  return player.coins < 0 && calculateTotalAssets(player) < 0;
}

export function checkMasterVictory(room: RoomState): Player | null {
  const reps = room.players.map(p => p.reputation);
  const max = Math.max(...reps);
  const sum = reps.reduce((a, b) => a + b, 0);
  if (max > sum - max) {
    return room.players.find(p => p.reputation === max) || null;
  }
  return null;
}

export { uuidv4 };
