<template>
  <div class="equipment-shop p-2">
    <div class="mb-3 text-sm" style="color: #c9b896;">
      {{ phase === 'brewing' ? '⚙️ 酿造阶段可购买设备升级' : '📊 设备预览（酿造阶段可购买）' }}
      <span class="ml-3" style="color: #f1c40f;">💰 {{ coins.toLocaleString() }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="eq in equipmentList"
        :key="eq.type"
        class="equipment-card p-4 rounded-lg"
        style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
        :class="{ 'opacity-50': isOwned(eq.type) }"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-bold" style="color: #d4a574;">
              {{ eq.icon }} {{ eq.name }}
            </div>
            <div class="text-xs mt-1" style="color: #c9b896;">
              {{ eq.effect }}
            </div>
          </div>
          <span v-if="isOwned(eq.type)" class="badge badge-success">已拥有</span>
        </div>

        <div class="mt-3 flex items-center justify-between">
          <div class="text-sm" style="color: #f1c40f;">
            💰 ¥{{ eq.cost.toLocaleString() }}
          </div>
          <button
            class="btn btn-small btn-primary"
            :disabled="phase !== 'brewing' || isOwned(eq.type) || coins < eq.cost"
            @click="$emit('buy', eq.type)"
          >
            {{ isOwned(eq.type) ? '已购买' : '购买升级' }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 p-3 rounded" style="background: rgba(26, 15, 10, 0.4); border: 1px dashed #5a3a24;">
      <div class="font-bold mb-2 text-sm" style="color: #d4a574;">💡 提示</div>
      <div class="text-xs" style="color: #c9b896; line-height: 1.7;">
        <p>• 不锈钢温控发酵罐：让发酵温度更精准，风味更稳定</p>
        <p>• 橡木开放式发酵桶：自然发酵增加复杂度，但有一定风险</p>
        <p>• 铜制壶式蒸馏器：威士忌玩家必备，大幅提升酒液纯度</p>
        <p>• 大型酒窖：增加桶位容量，加速陈酿进程</p>
        <p>• 风味实验室：解锁高级风味分析工具</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Equipment, PhaseType } from '@/types';

const props = defineProps<{
  coins: number;
  equipment: Equipment[];
  phase: PhaseType;
}>();

defineEmits<{
  (e: 'buy', type: string): void;
}>();

const equipmentList = [
  { type: 'fermenter_stainless', name: '不锈钢温控发酵罐', cost: 800, effect: '精确控温±0.5度，发酵风味更稳定可控', icon: '🫧' },
  { type: 'fermenter_oak', name: '橡木开放式发酵桶', cost: 1200, effect: '自然发酵增加复杂度，但有失败风险', icon: '🪵' },
  { type: 'still_copper', name: '铜制壶式蒸馏器', cost: 2000, effect: '大幅提升威士忌纯度和酒体表现', icon: '⚗️' },
  { type: 'cellar', name: '大型酒窖', cost: 1500, effect: '橡木桶使用效果提升，加速陈酿进程', icon: '🏛️' },
  { type: 'lab', name: '风味实验室', cost: 1800, effect: '解锁高级分析工具，风味预测更精准', icon: '🔬' }
];

function isOwned(type: string) {
  return props.equipment.some(e => e.type === type);
}
</script>
