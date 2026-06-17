<template>
  <div class="market-panel">
    <div class="mb-3 flex justify-between items-center">
      <div class="text-sm" style="color: #c9b896;">
        {{ phase === 'market_auction' ? '💰 拍卖阶段：提交出价，价高者得！' : '📊 市场预览（拍卖阶段可出价）' }}
      </div>
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.key"
          class="btn btn-small"
          :class="activeFilter === f.key ? 'btn-primary' : 'btn-secondary'"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <div v-if="phase === 'market_auction'" class="mb-3 p-2 rounded text-xs flex justify-between items-center"
         style="background: rgba(139, 69, 19, 0.2); border: 1px solid #5a3a24;">
      <span style="color: #c9b896;">
        已选 {{ totalBidsCount }} 种原料 · 预估总价
        <span :style="{ color: totalAllCost <= coins ? '#27ae60' : '#e74c3c' }">¥{{ totalAllCost }}</span>
      </span>
      <button
        class="btn btn-small btn-primary"
        @click="submitAllBids"
        :disabled="totalBidsCount === 0 || totalAllCost > coins"
      >
        ✓ 确认提交所有出价
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto" style="max-height: 380px;">
      <div
        v-for="ing in mergedIngredients"
        :key="ing.displayKey"
        class="ingredient-card p-3 rounded-lg"
        style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-medium" style="color: #d4a574;">{{ ing.name }}</div>
            <div class="text-xs" style="color: #999;">
              {{ typeLabel(ing.type) }}
              <span class="ml-1 badge" :class="'badge-' + ing.quality">{{ qualityLabel(ing.quality) }}</span>
              <span v-if="ing.count > 1" class="ml-1 text-xs" style="color: #666;">({{ ing.count }}批)</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-bold" :style="{ color: ing.currentPrice > ing.basePrice ? '#e74c3c' : ing.currentPrice < ing.basePrice ? '#27ae60' : '#c9b896' }">
              ¥{{ ing.currentPrice }}
              <span v-if="ing.currentPrice !== ing.basePrice" class="text-xs">
                ({{ ing.currentPrice > ing.basePrice ? '↑' : '↓' }})
              </span>
            </div>
            <div class="text-xs" style="color: #888;">总库存: {{ ing.totalQuantity }}</div>
          </div>
        </div>

        <div class="flavor-tags mb-2 flex flex-wrap gap-1">
          <span
            v-for="(val, key) in ing.baseFlavor"
            :key="key"
            class="flavor-tag text-xs px-1 rounded"
            style="background: rgba(139, 69, 19, 0.3); color: #c9b896;"
          >
            {{ flavorLabel(key as string) }}:+{{ val }}
          </span>
        </div>

        <div v-if="phase === 'market_auction'" class="bid-section mt-2 pt-2" style="border-top: 1px solid #5a3a24;">
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label style="color: #999;">单价出价</label>
              <input
                type="number"
                v-model.number="ensureBid(ing.displayKey, ing.currentPrice).bid"
                @input="markDirty"
                :min="ing.currentPrice"
                class="w-full p-1 text-sm"
                style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
              />
            </div>
            <div>
              <label style="color: #999;">购买数量</label>
              <input
                type="number"
                v-model.number="ensureBid(ing.displayKey, ing.currentPrice).quantity"
                @input="markDirty"
                :max="ing.totalQuantity"
                min="0"
                class="w-full p-1 text-sm"
                style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
              />
            </div>
            <div class="flex items-end">
              <span
                class="text-xs"
                :style="{ color: totalCost(ing.displayKey) <= coins ? '#27ae60' : '#e74c3c' }"
              >
                小计¥{{ totalCost(ing.displayKey) }}
              </span>
            </div>
          </div>
          <div class="mt-2 text-xs" style="color: #888;" v-if="getOwned(ing) > 0">
            我已拥有: {{ getOwned(ing) }} 单位
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { Ingredient, PhaseType, QualityGrade } from '@/types';
import { FLAVOR_LABELS } from '@/types';

const props = defineProps<{
  ingredients: Ingredient[];
  phase: PhaseType;
  coins: number;
  playerIngredients: { ingredientId: string; quantity: number }[];
  myBids: { ingredientId: string; bid: number; quantity: number }[];
}>();

const emit = defineEmits<{
  (e: 'update-bids', bids: { ingredientId: string; bid: number; quantity: number }[]): void;
}>();

const filters = [
  { key: 'all', label: '全部' },
  { key: 'grape', label: '🍇 葡萄' },
  { key: 'malt', label: '🌾 麦芽' },
  { key: 'hop', label: '🌿 酒花' },
  { key: 'yeast', label: '🦠 酵母' },
  { key: 'barley', label: '🌱 大麦' }
];

const activeFilter = ref('all');
const bids = reactive<Record<string, { bid: number; quantity: number }>>({});
const dirty = ref(false);

interface MergedIngredient {
  displayKey: string;
  name: string;
  type: string;
  variety?: string;
  quality: QualityGrade;
  baseFlavor: Partial<import('@/types').FlavorProfile>;
  basePrice: number;
  currentPrice: number;
  totalQuantity: number;
  count: number;
  ids: string[];
}

const mergedIngredients = computed<MergedIngredient[]>(() => {
  const map = new Map<string, MergedIngredient>();
  props.ingredients.forEach(ing => {
    const key = `${ing.type}_${ing.variety || 'default'}_${ing.quality}`;
    if (map.has(key)) {
      const m = map.get(key)!;
      m.totalQuantity += ing.quantity;
      m.count += 1;
      m.ids.push(ing.id);
    } else {
      map.set(key, {
        displayKey: key,
        name: ing.name,
        type: ing.type,
        variety: ing.variety,
        quality: ing.quality as QualityGrade,
        baseFlavor: { ...ing.baseFlavor },
        basePrice: ing.basePrice,
        currentPrice: ing.currentPrice,
        totalQuantity: ing.quantity,
        count: 1,
        ids: [ing.id]
      });
    }
  });
  if (activeFilter.value === 'all') return Array.from(map.values());
  return Array.from(map.values()).filter(i => i.type === activeFilter.value);
});

const totalAllCost = computed(() => {
  return Object.values(bids).reduce((s, b) => s + (b.bid || 0) * (b.quantity || 0), 0);
});

const totalBidsCount = computed(() => {
  return Object.values(bids).filter(b => b.quantity > 0 && b.bid > 0).length;
});

function ensureBid(key: string, defaultPrice: number) {
  if (!bids[key]) {
    bids[key] = { bid: defaultPrice, quantity: 0 };
  }
  return bids[key];
}

function markDirty() {
  dirty.value = true;
}

watch([mergedIngredients, () => props.myBids], () => {
  mergedIngredients.value.forEach(ing => {
    ensureBid(ing.displayKey, ing.currentPrice);
  });
  props.myBids.forEach(b => {
    const m = mergedIngredients.value.find(x => x.ids.includes(b.ingredientId));
    if (m) {
      bids[m.displayKey] = { bid: b.bid, quantity: b.quantity };
    }
  });
}, { immediate: true, deep: true });

function typeLabel(type: string) {
  const map: Record<string, string> = {
    grape: '葡萄', malt: '麦芽', hop: '酒花', yeast: '酵母', barley: '大麦'
  };
  return map[type] || type;
}

function qualityLabel(q: QualityGrade) {
  const map: Record<QualityGrade, string> = {
    normal: '普通', premium: '优质', top: '顶级'
  };
  return map[q];
}

function flavorLabel(key: string) {
  return (FLAVOR_LABELS as any)[key] || key;
}

function totalCost(key: string) {
  const b = bids[key];
  return b ? b.bid * b.quantity : 0;
}

function getOwned(ing: MergedIngredient) {
  return props.playerIngredients
    .filter(p => ing.ids.includes(p.ingredientId))
    .reduce((s, p) => s + p.quantity, 0);
}

function submitAllBids() {
  const result: { ingredientId: string; bid: number; quantity: number }[] = [];
  mergedIngredients.value.forEach(ing => {
    const b = bids[ing.displayKey];
    if (b && b.quantity > 0 && b.bid > 0) {
      const qtyPerId = Math.ceil(b.quantity / ing.ids.length);
      let remaining = b.quantity;
      ing.ids.forEach((id, idx) => {
        const qty = idx === ing.ids.length - 1 ? remaining : Math.min(qtyPerId, remaining);
        if (qty > 0) {
          result.push({ ingredientId: id, bid: b.bid, quantity: qty });
          remaining -= qty;
        }
      });
    }
  });
  emit('update-bids', result);
  dirty.value = false;
}
</script>
