import { GrapeVariety, MaltVariety, HopVariety, YeastStrain, BarrelType, FlavorProfile, QualityGrade, Ingredient, Barrel, Equipment, Judge } from './types';

export const GRAPE_DATA: Record<GrapeVariety, { name: string; baseFlavor: Partial<FlavorProfile>; basePrice: number }> = {
  cabernet: { name: '赤霞珠', baseFlavor: { fruitiness: 45, body: 50, acidity: 40, bitterness: 20 }, basePrice: 50 },
  pinot_noir: { name: '黑皮诺', baseFlavor: { fruitiness: 55, floral: 30, acidity: 50, body: 35 }, basePrice: 60 },
  riesling: { name: '雷司令', baseFlavor: { floral: 45, acidity: 60, sweetness: 40, fruitiness: 35 }, basePrice: 45 },
  chardonnay: { name: '霞多丽', baseFlavor: { fruitiness: 40, body: 45, sweetness: 30, finish: 35 }, basePrice: 55 }
};

export const MALT_DATA: Record<MaltVariety, { name: string; baseFlavor: Partial<FlavorProfile>; basePrice: number }> = {
  pale: { name: '浅色麦芽', baseFlavor: { sweetness: 40, body: 35, finish: 25 }, basePrice: 30 },
  caramel: { name: '焦糖麦芽', baseFlavor: { sweetness: 60, body: 45, finish: 30 }, basePrice: 45 },
  chocolate: { name: '巧克力麦芽', baseFlavor: { bitterness: 35, body: 55, finish: 40, woody: 15 }, basePrice: 55 },
  smoked: { name: '烟熏麦芽', baseFlavor: { bitterness: 25, woody: 45, finish: 50, body: 40 }, basePrice: 50 }
};

export const HOP_DATA: Record<HopVariety, { name: string; baseFlavor: Partial<FlavorProfile>; basePrice: number }> = {
  cascade: { name: '卡斯卡特', baseFlavor: { bitterness: 55, floral: 30, fruitiness: 25 }, basePrice: 40 },
  citra: { name: '西楚', baseFlavor: { bitterness: 50, fruitiness: 55, floral: 20 }, basePrice: 55 },
  saaz: { name: '萨兹', baseFlavor: { bitterness: 40, floral: 45, woody: 15 }, basePrice: 35 }
};

export const YEAST_DATA: Record<YeastStrain, { name: string; baseFlavor: Partial<FlavorProfile>; basePrice: number }> = {
  wine_standard: { name: '标准葡萄酒酵母', baseFlavor: { acidity: 15, fruitiness: 10, finish: 15 }, basePrice: 20 },
  wine_aromatic: { name: '芳香葡萄酒酵母', baseFlavor: { floral: 25, fruitiness: 20, sweetness: 10 }, basePrice: 35 },
  beer_ale: { name: '艾尔啤酒酵母', baseFlavor: { fruitiness: 20, sweetness: 15, body: 10 }, basePrice: 18 },
  beer_lager: { name: '拉格啤酒酵母', baseFlavor: { body: 20, sweetness: 10, finish: 15 }, basePrice: 20 },
  whiskey_distillers: { name: '威士忌蒸馏酵母', baseFlavor: { body: 25, finish: 25, woody: 10 }, basePrice: 25 }
};

export const BARLEY_DATA = {
  name: '大麦',
  baseFlavor: { sweetness: 35, body: 30, finish: 20 } as Partial<FlavorProfile>,
  basePrice: 25
};

export const BARREL_DATA: Record<BarrelType, { name: string; capacity: number; maxUses: number; cost: number; flavorModifier: Partial<FlavorProfile> }> = {
  french_oak: {
    name: '法国橡木桶',
    capacity: 100,
    maxUses: 5,
    cost: 500,
    flavorModifier: { floral: 8, woody: 10, finish: 5, acidity: 2 }
  },
  american_oak: {
    name: '美国橡木桶',
    capacity: 100,
    maxUses: 5,
    cost: 400,
    flavorModifier: { sweetness: 10, woody: 12, vanilla: undefined, body: 5 } as Partial<FlavorProfile>
  },
  sherry: {
    name: '雪莉桶',
    capacity: 100,
    maxUses: 4,
    cost: 600,
    flavorModifier: { fruitiness: 12, sweetness: 10, bitterness: 5, finish: 8 }
  },
  bourbon: {
    name: '波本桶',
    capacity: 100,
    maxUses: 4,
    cost: 550,
    flavorModifier: { sweetness: 15, body: 10, woody: 8, finish: 6 }
  }
};

export const EQUIPMENT_DATA: { type: Equipment['type']; name: string; cost: number; effect: string }[] = [
  { type: 'fermenter_basic', name: '基础发酵罐', cost: 0, effect: '标准发酵能力' },
  { type: 'fermenter_stainless', name: '不锈钢温控发酵罐', cost: 800, effect: '精确控温±0.5度，风味更稳定' },
  { type: 'fermenter_oak', name: '橡木开放式发酵桶', cost: 1200, effect: '自然发酵增加复杂度但风险高' },
  { type: 'still_copper', name: '铜制壶式蒸馏器', cost: 2000, effect: '提升威士忌纯度' },
  { type: 'cellar', name: '大型酒窖', cost: 1500, effect: '增加桶位，加速陈酿' },
  { type: 'lab', name: '风味实验室', cost: 1800, effect: '解锁酵母培养/风味分析工具' }
];

export const JUDGES: Judge[] = [
  {
    id: 'judge_a',
    name: '品酒师A - 平衡大师',
    type: 'balanced',
    weights: { acidity: 0.125, sweetness: 0.125, bitterness: 0.125, fruitiness: 0.125, floral: 0.125, woody: 0.125, body: 0.125, finish: 0.125 }
  },
  {
    id: 'judge_b',
    name: '品酒师B - 极端爱好者',
    type: 'intense',
    weights: { acidity: 0.15, sweetness: 0.1, bitterness: 0.15, fruitiness: 0.15, floral: 0.1, woody: 0.15, body: 0.1, finish: 0.1 }
  },
  {
    id: 'judge_c',
    name: '品酒师C - 复杂品鉴家',
    type: 'complex',
    weights: { acidity: 0.125, sweetness: 0.125, bitterness: 0.125, fruitiness: 0.125, floral: 0.125, woody: 0.125, body: 0.125, finish: 0.125 }
  }
];

export const QUALITY_MULTIPLIER: Record<QualityGrade, number> = {
  normal: 1,
  premium: 1.5,
  top: 2.2
};

export const QUALITY_PRICE_MULTIPLIER: Record<QualityGrade, number> = {
  normal: 1,
  premium: 1.8,
  top: 3
};

export function getInitialMarket(): Ingredient[] {
  const ingredients: Ingredient[] = [];

  const qualities: QualityGrade[] = ['normal', 'premium', 'top'];
  const quantityByQuality: Record<QualityGrade, number> = {
    normal: 100,
    premium: 50,
    top: 20
  };

  (Object.keys(GRAPE_DATA) as GrapeVariety[]).forEach(variety => {
    qualities.forEach(quality => {
      const data = GRAPE_DATA[variety];
      ingredients.push({
        id: `grape_${variety}_${quality}`,
        name: `${data.name} (${quality === 'top' ? '顶级' : quality === 'premium' ? '优质' : '普通'})`,
        type: 'grape',
        variety,
        quality,
        baseFlavor: data.baseFlavor,
        basePrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        currentPrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        quantity: quantityByQuality[quality],
        purchased: 0
      });
    });
  });

  (Object.keys(MALT_DATA) as MaltVariety[]).forEach(variety => {
    qualities.forEach(quality => {
      const data = MALT_DATA[variety];
      ingredients.push({
        id: `malt_${variety}_${quality}`,
        name: `${data.name} (${quality === 'top' ? '顶级' : quality === 'premium' ? '优质' : '普通'})`,
        type: 'malt',
        variety,
        quality,
        baseFlavor: data.baseFlavor,
        basePrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        currentPrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        quantity: quantityByQuality[quality],
        purchased: 0
      });
    });
  });

  (Object.keys(HOP_DATA) as HopVariety[]).forEach(variety => {
    qualities.forEach(quality => {
      const data = HOP_DATA[variety];
      ingredients.push({
        id: `hop_${variety}_${quality}`,
        name: `${data.name} (${quality === 'top' ? '顶级' : quality === 'premium' ? '优质' : '普通'})`,
        type: 'hop',
        variety,
        quality,
        baseFlavor: data.baseFlavor,
        basePrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        currentPrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        quantity: quality === 'top' ? 15 : quality === 'premium' ? 40 : 80,
        purchased: 0
      });
    });
  });

  (Object.keys(YEAST_DATA) as YeastStrain[]).forEach(variety => {
    ['normal', 'premium'].forEach(q => {
      const quality = q as QualityGrade;
      const data = YEAST_DATA[variety];
      ingredients.push({
        id: `yeast_${variety}_${quality}`,
        name: `${data.name} (${quality === 'premium' ? '优质' : '普通'})`,
        type: 'yeast',
        variety,
        quality,
        baseFlavor: data.baseFlavor,
        basePrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        currentPrice: Math.floor(data.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
        quantity: quality === 'premium' ? 30 : 60,
        purchased: 0
      });
    });
  });

  qualities.forEach(quality => {
    ingredients.push({
      id: `barley_${quality}`,
      name: `大麦 (${quality === 'top' ? '顶级' : quality === 'premium' ? '优质' : '普通'})`,
      type: 'barley',
      quality,
      baseFlavor: BARLEY_DATA.baseFlavor,
      basePrice: Math.floor(BARLEY_DATA.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
      currentPrice: Math.floor(BARLEY_DATA.basePrice * QUALITY_PRICE_MULTIPLIER[quality]),
      quantity: quality === 'top' ? 30 : quality === 'premium' ? 60 : 120,
      purchased: 0
    });
  });

  return ingredients;
}

export function createBarrel(type: BarrelType): Barrel {
  const data = BARREL_DATA[type];
  return {
    id: `barrel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    capacity: data.capacity,
    usedTimes: 0,
    maxUses: data.maxUses,
    cost: data.cost,
    flavorModifier: { ...data.flavorModifier }
  };
}
