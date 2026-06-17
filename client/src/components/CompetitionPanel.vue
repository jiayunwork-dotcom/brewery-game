<template>
  <div class="competition-panel p-2">
    <div class="mb-3 text-sm" style="color: #c9b896;">
      🏆 品酒大赛：每5回合举办，当前第 {{ currentRound }} 回合
      <span v-if="isCompetitionRound" style="color: #f39c12;" class="ml-2 font-bold">· 本轮比赛！</span>
    </div>

    <div v-if="phase === 'competition' && isCompetitionRound" class="mb-4 p-3 rounded"
         style="background: rgba(243, 156, 18, 0.1); border: 1px solid #f39c12;">
      <div class="font-bold mb-2" style="color: #f39c12;">🎯 请选择一款酒参赛：</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3" style="max-height: 200px; overflow-y: auto;">
        <div
          v-for="wine in sortedInventory"
          :key="wine.id"
          class="p-2 rounded cursor-pointer transition-all"
          style="background: rgba(26, 15, 10, 0.5); border: 1px solid #5a3a24;"
          :class="{ '!border-[#f39c12] bg-[rgba(243,156,18,0.1)]': selectedId === wine.id }"
          @click="selectedId = wine.id"
        >
          <div class="flex justify-between">
            <span class="font-medium text-sm" style="color: #d4a574;">{{ wine.name }}</span>
            <span class="font-bold text-sm" :style="{ color: scoreColor(wine.score) }">{{ wine.score }}分</span>
          </div>
          <div class="text-xs" style="color: #999;">
            x{{ wine.quantity }} · {{ wine.ageRounds }}回合陈酿
          </div>
        </div>
        <div v-if="inventory.length === 0" class="col-span-2 text-center p-4 text-sm" style="color: #666;">
          没有可参赛的酒
        </div>
      </div>
      <button
        class="btn btn-primary w-full"
        :disabled="!selectedId"
        @click="handleEnter"
      >🏅 提交参赛</button>
    </div>

    <div v-if="lastResult" class="mb-4 p-3 rounded"
         style="background: rgba(139, 69, 19, 0.15); border: 1px solid #8b4513;">
      <div class="font-bold mb-2" style="color: #d4a574;">📋 第 {{ lastResult.round }} 回合比赛结果</div>
      <div class="mb-3">
        <div class="text-sm mb-2" style="color: #c9b896;">参赛作品 ({{ lastResult.entries.length }}款):</div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div
            v-for="(e, idx) in sortedEntries(lastResult.entries)"
            :key="e.wineId"
            class="p-2 rounded text-center"
            :style="{ background: idx === 0 ? 'rgba(241, 196, 15, 0.15)' : 'rgba(26,15,10,0.6)' }"
          >
            <div class="font-bold" :style="{ color: idx === 0 ? '#f1c40f' : idx === 1 ? '#bdc3c7' : idx === 2 ? '#cd7f32' : '#999' }">
              #{{ idx + 1 }} {{ getWineName(e.wineId, lastResult.entries) }}
            </div>
            <div style="color: #c9b896;">{{ e.score }}分</div>
          </div>
        </div>
      </div>
      <div>
        <div class="text-sm mb-2" style="color: #c9b896;">获奖玩家:</div>
        <div v-for="w in lastResult.winners" :key="w.playerId"
             class="flex justify-between items-center p-2 mb-1 rounded text-sm"
             style="background: rgba(26, 15, 10, 0.5);">
          <span>
            <span :style="{ color: w.rank === 1 ? '#f1c40f' : w.rank === 2 ? '#bdc3c7' : '#cd7f32' }" class="font-bold">
              {{ ['🥇', '🥈', '🥉'][w.rank - 1] }} 第{{ w.rank }}名
            </span>
            {{ getPlayerName(w.playerId) }}
          </span>
          <span style="color: #999;">
            +{{ w.reputationReward }}⭐ · +{{ w.coinReward }}💰
          </span>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <div class="font-bold mb-2 text-sm" style="color: #d4a574;">📜 历史比赛 ({{ history.length }}届)</div>
      <div v-if="history.length === 0" class="text-center p-4 text-sm" style="color: #666;">
        还没有举办过比赛
      </div>
      <div class="space-y-2 overflow-y-auto" style="max-height: 180px;">
        <div
          v-for="h in [...history].reverse()"
          :key="h.round"
          class="p-2 rounded"
          style="background: rgba(26, 15, 10, 0.5);"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="text-sm font-bold" style="color: #c9b896;">第 {{ h.round }} 回合</span>
            <span class="text-xs" style="color: #888;">{{ h.entries.length }}款参赛</span>
          </div>
          <div class="flex gap-2 text-xs" v-if="h.winners.length > 0">
            <span v-for="w in h.winners" :key="w.playerId">
              {{ ['🥇', '🥈', '🥉'][w.rank - 1] }}{{ getPlayerName(w.playerId) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="p-3 rounded" style="background: rgba(26, 15, 10, 0.4); border: 1px dashed #5a3a24;">
      <div class="font-bold mb-2 text-sm" style="color: #d4a574;">👨‍⚖️ 评委规则</div>
      <div class="space-y-1 text-xs" style="color: #c9b896; line-height: 1.7;">
        <div><b style="color: #3498db;">品酒师A - 平衡大师</b>：各维度标准差低加分，偏爱均衡酒款</div>
        <div><b style="color: #e67e22;">品酒师B - 极端爱好者</b>：某维度超过85分高额加分，追求极致</div>
        <div><b style="color: #9b59b6;">品酒师C - 复杂品鉴家</b>：8个维度都超过40分获得高额复杂度加分</div>
        <div style="color: #888; margin-top: 8px;">
          计分：基础加权分 + 复杂度奖励 + 平衡度奖励 - 缺陷扣分（维度>95或<5）
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { BottledWine, PhaseType, CompetitionResult, Player } from '@/types';

const props = defineProps<{
  history: CompetitionResult[];
  currentRound: number;
  phase: PhaseType;
  inventory: BottledWine[];
  lastResult: CompetitionResult | null;
}>();

const emit = defineEmits<{
  (e: 'enter', wineId: string): void;
}>();

const selectedId = ref<string | null>(null);
const allPlayers = ref<Player[]>([]);

const isCompetitionRound = computed(() => props.currentRound % 5 === 0);

const sortedInventory = computed(() => {
  return [...props.inventory].sort((a, b) => b.score - a.score);
});

watch(() => props.phase, (p) => {
  if (p !== 'competition') {
    selectedId.value = null;
  }
});

function sortedEntries(entries: any[]) {
  return [...entries].sort((a, b) => b.score - a.score);
}

function scoreColor(score: number) {
  if (score >= 85) return '#27ae60';
  if (score >= 65) return '#3498db';
  if (score >= 45) return '#f39c12';
  return '#e74c3c';
}

function getPlayerName(id: string) {
  return `玩家${id.slice(0, 4)}`;
}

function getWineName(wineId: string, _entries: any[]) {
  const inv = props.inventory.find(i => i.id === wineId);
  return inv ? inv.name : '未知酒款';
}

function handleEnter() {
  if (!selectedId.value) return;
  emit('enter', selectedId.value);
  selectedId.value = null;
}
</script>
