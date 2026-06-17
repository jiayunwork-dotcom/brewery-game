<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card" style="width: 450px; max-width: 95vw;">
      <div class="card-header">
        <span>🛢 为「{{ batch.name }}」分配橡木桶</span>
        <button class="btn btn-small" @click="$emit('close')" style="background: transparent; border: none; color: #999;">✕</button>
      </div>

      <div class="mb-3 text-sm" style="color: #c9b896;">
        当前阶段: {{ stageLabel(batch.currentStage) }}
      </div>

      <div v-if="barrels.length === 0" class="text-center p-6 rounded"
           style="background: rgba(0,0,0,0.3); color: #999;">
        你还没有可用的橡木桶
        <br />先去设备商店购买吧！
      </div>

      <div v-else class="space-y-2 max-h-80 overflow-y-auto">
        <div
          v-for="b in availableBarrels"
          :key="b.id"
          class="barrel-item p-3 rounded cursor-pointer transition-all"
          style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
          :class="{ 'barrel-selected': selected === b.id, 'opacity-50': b.usedTimes >= b.maxUses }"
          @click="b.usedTimes < b.maxUses && (selected = b.id)"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="font-medium text-sm" style="color: #d4a574;">{{ barrelName(b.type) }}</span>
            <span class="text-xs" :style="{ color: b.usedTimes < b.maxUses ? '#c9b896' : '#e74c3c' }">
              寿命: {{ b.maxUses - b.usedTimes }}/{{ b.maxUses }}
            </span>
          </div>
          <div class="text-xs mt-1 flex flex-wrap gap-1">
            <span
              v-for="(val, key) in b.flavorModifier"
              :key="key"
              class="flavor-tag text-xs px-1 rounded"
              style="background: rgba(139, 69, 19, 0.3); color: #c9b896;"
            >
              {{ flavorLabel(key as string) }}:+{{ val }}
            </span>
          </div>
          <div class="text-xs mt-1" style="color: #e74c3c;" v-if="b.usedTimes >= b.maxUses">
            ⚠️ 已达最大使用次数
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-end mt-4">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!selected"
          @click="handleAssign"
        >确认分配</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Batch, Barrel, BarrelType } from '@/types';
import { BARREL_NAMES, STAGE_NAMES, FLAVOR_LABELS } from '@/types';

const props = defineProps<{
  batch: Batch;
  barrels: Barrel[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'assign', batchId: string, barrelId: string): void;
}>();

const selected = ref<string | null>(null);

const availableBarrels = computed(() => {
  return props.barrels.filter(b => !b.id || b.id);
});

function stageLabel(stage: string) {
  const stages = STAGE_NAMES[props.batch.route];
  return stages?.[stage] || stage;
}

function barrelName(type: BarrelType) {
  return BARREL_NAMES[type];
}

function flavorLabel(key: string) {
  return (FLAVOR_LABELS as any)[key] || key;
}

function handleAssign() {
  if (!selected.value) return;
  emit('assign', props.batch.id, selected.value);
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
.barrel-selected {
  border-color: #8b4513 !important;
  background: rgba(139, 69, 19, 0.15) !important;
}
</style>
