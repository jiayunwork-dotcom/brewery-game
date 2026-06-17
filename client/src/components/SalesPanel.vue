<template>
  <div class="sales-panel p-2">
    <div class="mb-3 text-sm" style="color: #c9b896;">
      {{ phase === 'sales' ? '💸 销售阶段：选择酒款上架销售' : '📊 销售预览（销售阶段可上架）' }}
    </div>

    <div v-if="Object.keys(marketTrend).length > 0" class="mb-3 p-2 rounded"
         style="background: rgba(39, 174, 96, 0.1); border: 1px solid #27ae60;">
      <div class="text-sm mb-1" style="color: #27ae60;">📈 热销趋势：以下属性酒款售价翻倍</div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span v-for="(val, key) in marketTrend" :key="key" class="badge badge-premium">
          {{ flavorLabel(key as string) }} > {{ val }}
        </span>
      </div>
    </div>

    <div v-if="inventory.length === 0" class="text-center p-8" style="color: #666;">
      <div class="text-3xl mb-2">🍾</div>
      <div>还没有可销售的成品酒</div>
      <div class="text-sm mt-1">先酿造并装瓶吧！</div>
    </div>

    <div v-else class="grid grid-cols-1 gap-2 overflow-y-auto" style="max-height: 340px;">
      <div
        v-for="wine in inventory"
        :key="wine.id"
        class="wine-item p-3 rounded"
        style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-medium" style="color: #d4a574;">
              {{ wine.name }}
              <span class="badge ml-1" :class="'badge-' + wine.route" style="font-size: 10px;">
                {{ routeLabel(wine.route) }}
              </span>
            </div>
            <div class="text-xs" style="color: #999;">
              评分: <span :style="{ color: scoreColor(wine.score) }" class="font-bold">{{ wine.score }}分</span>
              · 库存: <span class="font-bold">{{ wine.quantity }}</span>
              · 陈酿: {{ wine.ageRounds }}回合
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="market-tier">
            <div class="flex items-center gap-1 mb-1">
              <input type="radio" :id="'mass-' + wine.id" :value="'mass'" v-model="ensureSel(wine.id).tier"
                     :disabled="phase !== 'sales' || wine.score < 40" />
              <label :for="'mass-' + wine.id" :style="{ color: wine.score >= 40 ? '#c9b896' : '#666' }">
                大众市场
              </label>
            </div>
            <div style="color: #888;">>40分 · 量大价低</div>
          </div>
          <div class="market-tier">
            <div class="flex items-center gap-1 mb-1">
              <input type="radio" :id="'premium-' + wine.id" :value="'premium'" v-model="ensureSel(wine.id).tier"
                     :disabled="phase !== 'sales' || wine.score < 60" />
              <label :for="'premium-' + wine.id" :style="{ color: wine.score >= 60 ? '#3498db' : '#666' }">
                精品市场
              </label>
            </div>
            <div style="color: #888;">>60分 · 量少价中</div>
          </div>
          <div class="market-tier">
            <div class="flex items-center gap-1 mb-1">
              <input type="radio" :id="'luxury-' + wine.id" :value="'luxury'" v-model="ensureSel(wine.id).tier"
                     :disabled="phase !== 'sales' || wine.score < 80 || reputation < 100" />
              <label :for="'luxury-' + wine.id" :style="{ color: wine.score >= 80 && reputation >= 100 ? '#f39c12' : '#666' }">
                高端收藏
              </label>
            </div>
            <div style="color: #888;">>80分+声望100</div>
          </div>
        </div>

        <div class="mt-2 flex items-center gap-3">
          <div class="flex-1">
            <label class="text-xs mr-2" style="color: #999;">单价: </label>
            <input
              type="number"
              v-model.number="ensureSel(wine.id).price"
              :disabled="phase !== 'sales' || !ensureSel(wine.id).tier"
              :min="suggestedPrice(wine)"
              class="p-1 text-sm w-24"
              style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
            />
            <span class="text-xs ml-2" style="color: #666;">建议: ¥{{ suggestedPrice(wine) }}</span>
          </div>
          <button
            v-if="ensureSel(wine.id).tier"
            class="btn btn-small btn-success"
            :disabled="phase !== 'sales' || !ensureSel(wine.id).price"
            @click="removeSelection(wine.id)"
          >取消</button>
        </div>
      </div>
    </div>

    <div v-if="inventory.length > 0" class="mt-4 flex justify-between items-center">
      <div class="text-sm" style="color: #c9b896;">
        已选择 <span class="font-bold" style="color: #d4a574;">{{ selectedCount }}</span> 款上架
      </div>
      <button
        class="btn btn-primary"
        :disabled="phase !== 'sales' || selectedCount === 0"
        @click="submitListings"
      >确认上架</button>
    </div>
  </div>
</template>

<script setup lang="ts">import { reactive, computed, watch } from 'vue';
import type { BottledWine, MarketTier, PhaseType, WineRoute, FlavorProfile } from '@/types';
import { FLAVOR_LABELS, ROUTE_NAMES } from '@/types';
const props = defineProps<{
 inventory: BottledWine[];
 phase: PhaseType;
 reputation: number;
 marketTrend: Partial<FlavorProfile>;
}>();
const emit = defineEmits<{
 (e: 'list', listings: {
 wineId: string;
 tier: MarketTier;
 price: number;
 }[]): void;
}>();
const selections = reactive<Record<string, {
 tier?: MarketTier;
 price: number;
}>>({});

function ensureSel(id: string) {
  if (!selections[id]) {
    selections[id] = { tier: undefined, price: 0 };
  }
  return selections[id];
}

watch(() => props.inventory, (inv) => {
 inv.forEach(w => {
 ensureSel(w.id);
 });
}, { immediate: true, deep: true });
const selectedCount = computed(() => {
 return Object.values(selections).filter(s => s.tier && s.price > 0).length;
});
function routeLabel(r: WineRoute) {
 return ROUTE_NAMES[r];
}
function flavorLabel(key: string) {
 return (FLAVOR_LABELS as any)[key] || key;
}
function scoreColor(score: number) {
 if (score >= 85)
 return '#27ae60';
 if (score >= 65)
 return '#3498db';
 if (score >= 45)
 return '#f39c12';
 return '#e74c3c';
}
function suggestedPrice(wine: BottledWine): number {
 if (wine.score >= 85)
 return Math.floor(500 + (wine.score - 85) * 30);
 if (wine.score >= 70)
 return Math.floor(200 + (wine.score - 70) * 15);
 if (wine.score >= 55)
 return Math.floor(80 + (wine.score - 55) * 8);
 return Math.floor(30 + wine.score * 1.5);
}
function removeSelection(id: string) {
 selections[id] = { tier: undefined, price: 0 };
}
function submitListings() {
 const result: {
 wineId: string;
 tier: MarketTier;
 price: number;
 }[] = [];
 Object.entries(selections).forEach(([wineId, sel]) => {
 if (sel.tier && sel.price > 0) {
 result.push({ wineId, tier: sel.tier, price: sel.price });
 }
 });
 emit('list', result);
 Object.keys(selections).forEach(k => {
 selections[k] = { tier: undefined, price: 0 };
 });
}
</script>
