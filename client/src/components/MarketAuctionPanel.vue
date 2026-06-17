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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto" style="max-height: 380px;">
      <div
        v-for="ing in filteredIngredients"
        :key="ing.id"
        class="ingredient-card p-3 rounded-lg"
        style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-medium" style="color: #d4a574;">{{ ing.name }}</div>
            <div class="text-xs" style="color: #999;">
              {{ typeLabel(ing.type) }}
              <span class="ml-1 badge" :class="'badge-' + ing.quality">{{ qualityLabel(ing.quality) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-bold" :style="{ color: ing.currentPrice > ing.basePrice ? '#e74c3c' : ing.currentPrice < ing.basePrice ? '#27ae60' : '#c9b896' }">
              ¥{{ ing.currentPrice }}
              <span v-if="ing.currentPrice !== ing.basePrice" class="text-xs">
                ({{ ing.currentPrice > ing.basePrice ? '↑' : '↓' }})
              </span>
            </div>
            <div class="text-xs" style="color: #888;">库存: {{ ing.quantity }}</div>
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
              <label style="color: #999;">出价</label>
              <input
                type="number"
                v-model.number="ensureBid(ing.id, ing.currentPrice).bid"
                @input="updateBid(ing.id)"
                :min="ing.currentPrice"
                class="w-full p-1 text-sm"
                style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
              />
            </div>
            <div>
              <label style="color: #999;">数量</label>
              <input
                type="number"
                v-model.number="ensureBid(ing.id, ing.currentPrice).quantity"
                @input="updateBid(ing.id)"
                :max="ing.quantity"
                min="0"
                class="w-full p-1 text-sm"
                style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
              />
            </div>
            <div class="flex items-end">
              <span
                class="text-xs"
                :style="{ color: totalCost(ing.id) <= coins ? '#27ae60' : '#e74c3c' }"
              >
                共¥{{ totalCost(ing.id) }}
              </span>
            </div>
          </div>
          <div class="mt-2 text-xs" style="color: #888;" v-if="getOwned(ing.id) > 0">
            我已拥有: {{ getOwned(ing.id) }} 单位
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
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

function ensureBid(id: string, defaultPrice: number) {
  if (!bids[id]) {
    bids[id] = { bid: defaultPrice, quantity: 0 };
  }
  return bids[id];
}

props.ingredients.forEach(ing => {
  ensureBid(ing.id, ing.currentPrice);
});
props.myBids.forEach(b => {
  bids[b.ingredientId] = { bid: b.bid, quantity: b.quantity };
});

const filteredIngredients = computed(() => {
  if (activeFilter.value === 'all') return props.ingredients;
  return props.ingredients.filter(i => i.type === activeFilter.value);
});

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

function totalCost(id: string) {
  const b = bids[id];
  return b ? b.bid * b.quantity : 0;
}

function getOwned(id: string) {
  return props.playerIngredients.find(p => p.ingredientId === id)?.quantity || 0;
}

function updateBid(id: string) {
  if (!bids[id]) bids[id] = { bid: 0, quantity: 0 };
  const result: { ingredientId: string; bid: number; quantity: number }[] = [];
  Object.entries(bids).forEach(([k, v]) => {
    if (v.quantity > 0 && v.bid > 0) {
      result.push({ ingredientId: k, bid: v.bid, quantity: v.quantity });
    }
  });
  emit('update-bids', result);
}
</script>
