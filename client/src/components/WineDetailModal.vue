<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card" style="width: 520px; max-width: 95vw;">
      <div class="card-header">
        <span>🍾 {{ wine.name }}</span>
        <button class="btn btn-small" @click="$emit('close')" style="background: transparent; border: none; color: #999;">✕</button>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="badge" :class="'badge-' + wine.route">{{ routeName(wine.route) }}</span>
              <span class="text-2xl font-bold" :style="{ color: scoreColor(wine.score) }">
                {{ wine.score }}
              </span>
              <span class="text-sm" style="color: #888;">分</span>
            </div>
            <div class="text-xs space-y-1" style="color: #c9b896;">
              <div>📦 库存数量: <b>{{ wine.quantity }}</b> 瓶</div>
              <div>⏳ 陈酿时长: <b>{{ wine.ageRounds }}</b> 回合</div>
              <div>📊 等级评价: <b :style="{ color: scoreColor(wine.score) }">{{ scoreLevel(wine.score) }}</b></div>
            </div>
          </div>

          <div class="mt-3 p-2 rounded" style="background: rgba(26,15,10,0.5);">
            <div class="text-xs font-bold mb-2" style="color: #d4a574;">📋 八维风味详情</div>
            <div class="space-y-1">
              <div v-for="key in flavorKeys" :key="key" class="flex items-center gap-2">
                <span class="text-xs w-12" style="color: #999;">{{ flavorLabel(key) }}</span>
                <div class="progress-bar flex-1" style="height: 6px;">
                  <div
                    class="progress-fill"
                    :style="{ width: wine.flavor[key] + '%', background: barColor(wine.flavor[key]) }"
                  ></div>
                </div>
                <span class="text-xs w-8 text-right" :style="{ color: barColor(wine.flavor[key]) }">{{ wine.flavor[key] }}</span>
              </div>
            </div>
          </div>

          <div class="mt-3 p-2 rounded" style="background: rgba(26,15,10,0.4);">
            <div class="text-xs font-bold mb-1" style="color: #d4a574;">💰 市场建议售价</div>
            <div class="text-xs space-y-1" style="color: #c9b896;">
              <div>大众市场 (>40分): <b v-if="wine.score >= 40" style="color: #c9b896;">¥{{ suggestedPrice(40) }}</b><span v-else style="color: #666;">未达到</span></div>
              <div>精品市场 (>60分): <b v-if="wine.score >= 60" style="color: #3498db;">¥{{ suggestedPrice(60) }}</b><span v-else style="color: #666;">未达到</span></div>
              <div>高端收藏 (>80分): <b v-if="wine.score >= 80" style="color: #f39c12;">¥{{ suggestedPrice(80) }}</b><span v-else style="color: #666;">未达到</span></div>
            </div>
          </div>
        </div>

        <div>
          <FlavorRadar :flavor="wine.flavor" title="当前风味雷达" />
        </div>
      </div>

      <div class="flex gap-3 justify-end mt-4">
        <button class="btn btn-primary" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BottledWine, WineRoute, FlavorProfile } from '@/types';
import { ROUTE_NAMES, FLAVOR_NAMES, FLAVOR_LABELS } from '@/types';
import FlavorRadar from './FlavorRadar.vue';

const props = defineProps<{ wine: BottledWine }>();
defineEmits<{ (e: 'close'): void }>();

const flavorKeys = FLAVOR_NAMES;

function routeName(r: WineRoute) {
  return ROUTE_NAMES[r];
}

function flavorLabel(key: keyof FlavorProfile) {
  return FLAVOR_LABELS[key];
}

function scoreColor(s: number) {
  if (s >= 85) return '#27ae60';
  if (s >= 65) return '#3498db';
  if (s >= 45) return '#f39c12';
  return '#e74c3c';
}

function scoreLevel(s: number) {
  if (s >= 90) return '极品佳酿';
  if (s >= 80) return '卓越品质';
  if (s >= 70) return '优秀';
  if (s >= 60) return '良好';
  if (s >= 40) return '普通';
  return '次品';
}

function barColor(v: number) {
  if (v >= 80) return '#27ae60';
  if (v >= 60) return '#3498db';
  if (v >= 40) return '#f39c12';
  if (v >= 20) return '#e67e22';
  return '#e74c3c';
}

function suggestedPrice(tier: number) {
  const s = props.wine.score;
  if (tier === 40) return Math.max(30, Math.floor(30 + s * 1.5));
  if (tier === 60) return Math.max(80, Math.floor(80 + (s - 60) * 8));
  return Math.max(200, Math.floor(200 + (s - 80) * 20));
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
