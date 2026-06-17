<template>
  <div class="trade-panel p-2" :class="{ 'panel-disabled': phase !== 'sales' }">
    <div class="mb-3 text-sm flex justify-between items-center">
      <span style="color: #c9b896;">
        {{ phase === 'sales' ? '🤝 玩家交易市场' : '🔒 交易市场（仅销售阶段开放）' }}
      </span>
      <span v-if="phase === 'sales'" class="text-xs" style="color: #888;">
        我的挂单: {{ myPendingListings.length }} / 5
      </span>
    </div>

    <div v-if="phase !== 'sales'" class="text-center p-6 rounded mb-3"
         style="background: rgba(0,0,0,0.3); border: 1px dashed #5a3a24;">
      <div class="text-2xl mb-2">🔒</div>
      <div class="text-sm" style="color: #888;">仅在销售阶段可进行交易操作</div>
    </div>

    <div class="mb-3">
      <div class="text-sm font-medium mb-2" style="color: #d4a574;">📦 我挂出的商品</div>
      <div v-if="myListings.length === 0" class="text-center p-4 text-sm rounded"
           style="background: rgba(26, 15, 10, 0.4); color: #666;">
        还没有挂出任何商品
      </div>
      <div v-else class="space-y-2 overflow-y-auto" style="max-height: 150px;">
        <div
          v-for="listing in myListings"
          :key="listing.id"
          class="p-2 rounded flex justify-between items-center"
          style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
        >
          <div class="flex-1">
            <div class="text-sm font-medium" style="color: #e8d8c4;">
              {{ listing.itemName }}
              <span v-if="listing.itemType === 'wine' && listing.itemScore" class="ml-1 text-xs"
                    :style="{ color: scoreColor(listing.itemScore) }">
                {{ listing.itemScore }}分
              </span>
              <span v-if="listing.quality" class="ml-1 badge" :class="'badge-' + listing.quality"
                    style="font-size: 10px;">
                {{ QUALITY_NAMES[listing.quality] }}
              </span>
            </div>
            <div class="text-xs mt-1" style="color: #999;">
              数量: <span class="font-bold">{{ listing.quantity }}</span>
              · 单价: <span class="font-bold" style="color: #f1c40f;">¥{{ listing.unitPrice }}</span>
              · 总价: <span style="color: #f1c40f;">¥{{ listing.quantity * listing.unitPrice }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-2">
            <span class="badge text-xs"
                  :class="listing.status === 'pending' ? 'badge-premium' : listing.status === 'sold' ? 'badge-top' : 'badge-normal'">
              {{ statusLabel(listing.status) }}
            </span>
            <button
              v-if="listing.status === 'pending'"
              class="btn btn-small btn-danger"
              :disabled="phase !== 'sales'"
              @click="handleCancel(listing.id)"
            >撤回</button>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <div class="text-sm font-medium mb-2" style="color: #d4a574;">🛒 其他玩家挂出的商品</div>
      <div v-if="otherListings.length === 0" class="text-center p-4 text-sm rounded"
           style="background: rgba(26, 15, 10, 0.4); color: #666;">
        暂无其他玩家挂出的商品
      </div>
      <div v-else class="space-y-2 overflow-y-auto" style="max-height: 150px;">
        <div
          v-for="listing in otherListings"
          :key="listing.id"
          class="p-2 rounded flex justify-between items-center"
          style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
        >
          <div class="flex-1">
            <div class="text-xs mb-1" style="color: #5a8a9e;">
              卖家: {{ listing.sellerName }}
            </div>
            <div class="text-sm font-medium" style="color: #e8d8c4;">
              {{ listing.itemName }}
              <span v-if="listing.itemType === 'wine' && listing.itemScore" class="ml-1 text-xs"
                    :style="{ color: scoreColor(listing.itemScore) }">
                {{ listing.itemScore }}分
              </span>
              <span v-if="listing.quality" class="ml-1 badge" :class="'badge-' + listing.quality"
                    style="font-size: 10px;">
                {{ QUALITY_NAMES[listing.quality] }}
              </span>
            </div>
            <div class="text-xs mt-1" style="color: #999;">
              数量: <span class="font-bold">{{ listing.quantity }}</span>
              · 单价: <span class="font-bold" style="color: #f1c40f;">¥{{ listing.unitPrice }}</span>
              · 总价: <span style="color: #f1c40f;">¥{{ listing.quantity * listing.unitPrice }}</span>
            </div>
          </div>
          <div class="ml-2">
            <button
              class="btn btn-small btn-success"
              :disabled="phase !== 'sales' || coins < listing.quantity * listing.unitPrice"
              :title="coins < listing.quantity * listing.unitPrice ? '金币不足' : ''"
              @click="handleBuy(listing.id)"
            >购买</button>
          </div>
        </div>
      </div>
    </div>

    <div class="p-3 rounded" style="background: rgba(139, 69, 19, 0.1); border: 1px solid #5a3a24;">
      <div class="text-sm font-medium mb-2" style="color: #d4a574;">➕ 挂出新商品</div>
      <div class="grid grid-cols-1 gap-2">
        <div>
          <label class="text-xs block mb-1" style="color: #999;">商品来源</label>
          <select
            v-model="newListing.itemType"
            :disabled="phase !== 'sales'"
            class="w-full p-1 text-sm"
            style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
          >
            <option value="">-- 请选择 --</option>
            <option value="ingredient">📦 原料库存</option>
            <option value="wine">🍾 成品酒库存</option>
          </select>
        </div>

        <div v-if="newListing.itemType">
          <label class="text-xs block mb-1" style="color: #999;">选择商品</label>
          <select
            v-model="newListing.itemId"
            :disabled="phase !== 'sales' || !newListing.itemType"
            class="w-full p-1 text-sm"
            style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
          >
            <option value="">-- 请选择商品 --</option>
            <template v-if="newListing.itemType === 'ingredient'">
              <option v-for="opt in ingredientOptions" :key="opt.id" :value="opt.id">
                {{ opt.name }} ({{ opt.quantity }}件) [{{ QUALITY_NAMES[opt.quality] }}]
              </option>
            </template>
            <template v-else-if="newListing.itemType === 'wine'">
              <option v-for="opt in wineOptions" :key="opt.id" :value="opt.id">
                {{ opt.name }} ({{ opt.quantity }}件) [{{ opt.score }}分]
                {{ opt.isInCompetition ? '【已参赛不可交易】' : '' }}
              </option>
            </template>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs block mb-1" style="color: #999;">数量</label>
            <input
              type="number"
              v-model.number="newListing.quantity"
              :disabled="phase !== 'sales' || !newListing.itemId || !maxQuantity"
              :min="1"
              :max="maxQuantity"
              class="w-full p-1 text-sm"
              style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
              placeholder="1 - {{ maxQuantity || 0 }}"
            />
          </div>
          <div>
            <label class="text-xs block mb-1" style="color: #999;">单价 (¥)</label>
            <input
              type="number"
              v-model.number="newListing.unitPrice"
              :disabled="phase !== 'sales' || !newListing.itemId"
              :min="1"
              class="w-full p-1 text-sm"
              style="background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4;"
              placeholder="≥1"
            />
          </div>
        </div>

        <div v-if="newListing.itemId && newListing.quantity > 0 && newListing.unitPrice > 0"
             class="text-xs text-right" style="color: #c9b896;">
          预计收入: <span class="font-bold" style="color: #f1c40f;">¥{{ newListing.quantity * newListing.unitPrice }}</span>
        </div>

        <button
          class="btn btn-primary w-full"
          :disabled="!canSubmitListing"
          @click="handleSubmitListing"
        >确认挂出</button>

        <div v-if="newListingError" class="text-xs text-center" style="color: #e74c3c;">
          {{ newListingError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { PhaseType, TradeListing, TradeItemType, Ingredient, BottledWine, QualityGrade } from '@/types';
import { QUALITY_NAMES, ROUTE_NAMES } from '@/types';

const props = defineProps<{
  phase: PhaseType;
  coins: number;
  playerId: string | undefined;
  tradeListings: TradeListing[];
  playerIngredients: { ingredientId: string; quantity: number }[];
  playerInventory: BottledWine[];
  marketIngredients: Ingredient[];
  competitionWineIds: string[];
}>();

const emit = defineEmits<{
  (e: 'create', itemType: TradeItemType, itemId: string, quantity: number, unitPrice: number): void;
  (e: 'cancel', listingId: string): void;
  (e: 'buy', listingId: string): void;
}>();

const newListing = reactive({
  itemType: '' as TradeItemType | '',
  itemId: '',
  quantity: 0,
  unitPrice: 0
});

const newListingError = ref('');

const myListings = computed(() => {
  if (!props.playerId) return [];
  return props.tradeListings
    .filter(l => l.sellerId === props.playerId)
    .sort((a, b) => b.createdAt - a.createdAt);
});

const myPendingListings = computed(() => {
  return myListings.value.filter(l => l.status === 'pending');
});

const otherListings = computed(() => {
  if (!props.playerId) return [];
  return props.tradeListings
    .filter(l => l.sellerId !== props.playerId && l.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);
});

const ingredientOptions = computed(() => {
  const result: { id: string; name: string; quantity: number; quality: QualityGrade }[] = [];
  props.playerIngredients.forEach(pi => {
    const mi = props.marketIngredients.find(m => m.id === pi.ingredientId);
    if (mi && pi.quantity > 0) {
      result.push({ id: pi.ingredientId, name: mi.name, quantity: pi.quantity, quality: mi.quality });
    }
  });
  return result;
});

const wineOptions = computed(() => {
  return props.playerInventory.map(w => ({
    id: w.id,
    name: w.name,
    quantity: w.quantity,
    score: w.score,
    route: w.route,
    isInCompetition: props.competitionWineIds.includes(w.id)
  }));
});

const selectedItemMaxQty = computed(() => {
  if (!newListing.itemType || !newListing.itemId) return 0;
  if (newListing.itemType === 'ingredient') {
    const pi = props.playerIngredients.find(x => x.ingredientId === newListing.itemId);
    return pi?.quantity || 0;
  } else if (newListing.itemType === 'wine') {
    const w = props.playerInventory.find(x => x.id === newListing.itemId);
    return w?.quantity || 0;
  }
  return 0;
});

const isSelectedWineInCompetition = computed(() => {
  if (newListing.itemType !== 'wine' || !newListing.itemId) return false;
  return props.competitionWineIds.includes(newListing.itemId);
});

const maxQuantity = computed(() => selectedItemMaxQty.value);

const canSubmitListing = computed(() => {
  if (props.phase !== 'sales') return false;
  if (!newListing.itemType || !newListing.itemId) return false;
  if (newListing.quantity <= 0 || newListing.quantity > selectedItemMaxQty.value) return false;
  if (newListing.unitPrice <= 0) return false;
  if (isSelectedWineInCompetition.value) return false;
  if (myPendingListings.value.length >= 5) return false;
  return true;
});

watch([() => props.phase, () => newListing.itemType, () => newListing.itemId], () => {
  newListingError.value = '';
  if (newListing.quantity > selectedItemMaxQty.value) {
    newListing.quantity = selectedItemMaxQty.value;
  }
});

function statusLabel(s: TradeListing['status']) {
  return s === 'pending' ? '待售' : s === 'sold' ? '已售' : '已撤回';
}

function scoreColor(score: number) {
  if (score >= 85) return '#27ae60';
  if (score >= 65) return '#3498db';
  if (score >= 45) return '#f39c12';
  return '#e74c3c';
}

function handleSubmitListing() {
  if (!canSubmitListing.value) {
    if (myPendingListings.value.length >= 5) {
      newListingError.value = '最多同时挂出5件商品';
    } else if (isSelectedWineInCompetition.value) {
      newListingError.value = '已参加品酒大赛的酒不能交易';
    }
    return;
  }
  emit('create', newListing.itemType as TradeItemType, newListing.itemId, newListing.quantity, newListing.unitPrice);
  newListing.itemType = '';
  newListing.itemId = '';
  newListing.quantity = 0;
  newListing.unitPrice = 0;
}

function handleCancel(listingId: string) {
  emit('cancel', listingId);
}

function handleBuy(listingId: string) {
  emit('buy', listingId);
}
</script>

<style scoped>
.panel-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.panel-disabled .btn,
.panel-disabled select,
.panel-disabled input {
  cursor: not-allowed;
}

.space-y-2 > * + * {
  margin-top: 8px;
}
</style>
