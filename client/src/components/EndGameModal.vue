<template>
  <div class="modal-overlay">
    <div class="modal-content card" style="width: 560px; max-width: 95vw;">
      <div class="text-center mb-4">
        <div class="text-5xl mb-2">🏆</div>
        <h2 class="text-2xl font-bold" style="color: #f39c12;">游戏结束！</h2>
        <div v-if="winner" class="mt-2">
          <div class="text-lg" style="color: #d4a574;">
            🥇 冠军: <span class="font-bold">{{ winner.name }}</span>
          </div>
          <div class="text-sm mt-1" style="color: #c9b896;">
            最终得分: <span class="font-bold text-xl" style="color: #27ae60;">{{ finalScores[0]?.score || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <div class="text-sm font-bold mb-2" style="color: #d4a574;">📊 最终排名</div>
        <div class="space-y-2">
          <div
            v-for="(item, idx) in finalScores"
            :key="item.player.id"
            class="p-3 rounded flex items-center gap-3"
            :style="{ background: idx === 0 ? 'rgba(241, 196, 15, 0.1)' : 'rgba(26,15,10,0.5)', border: idx === 0 ? '1px solid #f39c12' : '1px solid #5a3a24' }"
          >
            <div class="text-2xl font-bold w-10" :style="{ color: rankColor(idx) }">
              {{ ['🥇', '🥈', '🥉', '4', '5', '6'][idx] }}
            </div>
            <div class="flex-1">
              <div class="font-medium" style="color: #d4a574;">
                {{ item.player.name }}
              </div>
              <div class="text-xs" style="color: #999;">
                ⭐声望 {{ item.player.reputation }} ·
                💰金币 {{ item.player.coins.toLocaleString() }} ·
                🏆冠军 {{ item.player.competitionWins }}次
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-lg" style="color: #27ae60;">{{ item.score }}</div>
              <div class="text-xs" style="color: #888;">最终分</div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 rounded" style="background: rgba(26,15,10,0.4); border: 1px dashed #5a3a24;">
        <div class="text-xs font-bold mb-1" style="color: #d4a574;">💡 评分规则</div>
        <div class="text-xs" style="color: #c9b896; line-height: 1.7;">
          最终得分 = 声望值 × 50% + 总资产 × 30% + 夺冠次数 × 20%
          <br /><span style="color: #888;">· 总资产包括金币、设备、橡木桶和库存酒的估值</span>
        </div>
      </div>

      <div class="flex gap-3 justify-center mt-4">
        <button class="btn btn-primary btn-large" @click="$emit('close')">
          🔄 返回大厅再来一局
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RoomState, Player } from '@/types';

const props = defineProps<{ room: RoomState }>();
defineEmits<{ (e: 'close'): void }>();

const winner = computed(() => props.room.winner);

const finalScores = computed(() => {
  return props.room.players
    .map(p => ({ player: p, score: calculateScore(p) }))
    .sort((a, b) => b.score - a.score);
});

function calculateScore(p: Player): number {
  return Math.floor(p.reputation * 0.5 + p.totalAssets * 0.3 + p.competitionWins * 100 * 0.2);
}

function rankColor(idx: number) {
  if (idx === 0) return '#f1c40f';
  if (idx === 1) return '#bdc3c7';
  if (idx === 2) return '#cd7f32';
  return '#888';
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  animation: popIn 0.4s ease;
}
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
