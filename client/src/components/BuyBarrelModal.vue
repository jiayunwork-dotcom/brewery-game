<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card" style="width: 500px; max-width: 95vw;">
      <div class="card-header">
        <span>🛢 购买橡木桶</span>
        <button class="btn btn-small" @click="$emit('close')" style="background: transparent; border: none; color: #999;">✕</button>
      </div>

      <div class="mb-2 text-sm" style="color: #f1c40f;">💰 当前金币: {{ coins.toLocaleString() }}</div>

      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="b in barrels"
          :key="b.type"
          class="barrel-card p-3 rounded cursor-pointer transition-all"
          style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
          :class="{ '!border-[#8b4513]': selected === b.type, 'opacity-50': coins < b.cost }"
          @click="selected = b.type"
        >
          <div class="font-bold text-sm mb-1" style="color: #d4a574;">{{ b.icon }} {{ b.name }}</div>
          <div class="text-xs mb-2" style="color: #c9b896; line-height: 1.5;">
            容量: {{ b.capacity }}L · 寿命: {{ b.maxUses }}次
          </div>
          <div class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="(val, key) in b.modifier"
              :key="key"
              class="flavor-tag text-xs px-1 rounded"
              style="background: rgba(139, 69, 19, 0.3); color: #c9b896;"
            >
              {{ flavorLabel(key as string) }}:+{{ val }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span style="color: #f1c40f;">¥{{ b.cost }}</span>
            <span v-if="selected === b.type" style="color: #8b4513;" class="text-xs">✓ 已选</span>
          </div>
        </div>
      </div>

      <div class="mt-3 p-2 rounded text-xs" style="background: rgba(26,15,10,0.4); color: #999; line-height: 1.6;">
        💡 提示：新桶效果最强，每次使用后效果递减20%。法国橡木优雅，美国橡木浓郁，雪莉桶增加干果风味，波本桶增加焦糖太妃风味。
      </div>

      <div class="flex gap-3 justify-end mt-4">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!selected || coins < (barrels.find(b => b.type === selected)?.cost || 0)"
          @click="handleBuy"
        >确认购买</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FLAVOR_LABELS } from '@/types';
import type { BarrelType } from '@/types';

const props = defineProps<{ coins: number }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'buy', type: string): void;
}>();

const selected = ref<BarrelType | null>(null);

const barrels = [
  { type: 'french_oak' as BarrelType, name: '法国橡木桶', icon: '🇫🇷', capacity: 100, maxUses: 5, cost: 500,
    modifier: { floral: 8, woody: 10, finish: 5, acidity: 2 } },
  { type: 'american_oak' as BarrelType, name: '美国橡木桶', icon: '🇺🇸', capacity: 100, maxUses: 5, cost: 400,
    modifier: { sweetness: 10, woody: 12, body: 5 } },
  { type: 'sherry' as BarrelType, name: '雪莉桶', icon: '🍯', capacity: 100, maxUses: 4, cost: 600,
    modifier: { fruitiness: 12, sweetness: 10, bitterness: 5, finish: 8 } },
  { type: 'bourbon' as BarrelType, name: '波本桶', icon: '🥃', capacity: 100, maxUses: 4, cost: 550,
    modifier: { sweetness: 15, body: 10, woody: 8, finish: 6 } }
];

function flavorLabel(key: string) {
  return (FLAVOR_LABELS as any)[key] || key;
}

function handleBuy() {
  if (!selected.value) return;
  emit('buy', selected.value);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
</style>
