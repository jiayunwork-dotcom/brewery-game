<template>
  <div class="game-view min-h-screen p-3" v-if="gameStore.room && gameStore.currentPlayer">
    <transition name="fade">
      <div v-if="showPhaseBanner" class="phase-banner">
        <div class="phase-banner-content">
          <div class="phase-banner-round">第 {{ gameStore.room.currentRound }} 回合</div>
          <div class="phase-banner-name">{{ PHASE_NAMES[currentBannerPhase] }}</div>
          <div class="phase-banner-desc">{{ PHASE_DESCRIPTIONS[currentBannerPhase] }}</div>
        </div>
      </div>
    </transition>

    <div class="game-header mb-3 flex justify-between items-center card" style="padding: 12px 20px;">
      <div class="flex items-center gap-4">
        <div>
          <span class="text-xl font-bold" style="color: #d4a574;">
            🍷 {{ gameStore.room.name }}
          </span>
          <span class="ml-3 badge badge-normal">
            第 {{ gameStore.room.currentRound }} / {{ gameStore.room.maxRounds }} 回合
          </span>
        </div>
        <div>
          <span class="badge" :class="phaseBadgeClass" style="font-size: 13px; padding: 4px 12px;">
            {{ PHASE_NAMES[gameStore.room.currentPhase] }}
          </span>
          <span v-if="gameStore.room.currentPhase !== 'idle'" class="ml-2" style="color: #c9b896;">
            ⏱ {{ formatTime(gameStore.phaseTimeLeft) }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="player-stats">
          <div class="text-sm" style="color: #c9b896;">
            💰 金币: <span class="font-bold" style="color: #f1c40f;">{{ gameStore.currentPlayer.coins.toLocaleString() }}</span>
          </div>
          <div class="text-sm" style="color: #c9b896;">
            ⭐ 声望: <span class="font-bold" style="color: #3498db;">{{ gameStore.currentPlayer.reputation }}</span>
          </div>
          <div class="text-sm" style="color: #c9b896;">
            🏆 冠军: <span class="font-bold" style="color: #e67e22;">{{ gameStore.currentPlayer.competitionWins }}</span>
          </div>
        </div>
        <button class="btn btn-danger btn-small" @click="leaveGame">
          退出
        </button>
      </div>
    </div>

    <div class="game-body grid grid-cols-12 gap-3">
      <div class="col-span-3 flex flex-col gap-3">
        <div class="card flex-1 overflow-hidden flex flex-col" style="min-height: 0;">
          <div class="card-header">
            <span>🏭 我的产线</span>
            <button
              class="btn btn-small btn-primary"
              :disabled="gameStore.room.currentPhase !== 'brewing'"
              @click="showCreateBatch = true"
            >+ 新批次</button>
          </div>
          <div class="overflow-y-auto flex-1" style="max-height: 280px;">
            <div v-if="gameStore.currentPlayer.batches.length === 0"
                 class="text-center p-4 text-sm" style="color: #666;">
              暂无生产批次
            </div>
            <div v-for="batch in gameStore.currentPlayer.batches"
                 :key="batch.id"
                 class="batch-item p-2 mb-2 rounded cursor-pointer"
                 style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
                 :class="{ 'batch-selected': selectedBatch?.id === batch.id }"
                 @click="selectedBatch = batch"
            >
              <div class="flex justify-between items-center mb-1">
                <span class="font-medium text-sm" style="color: #d4a574;">{{ batch.name }}</span>
                <span class="badge" :class="'badge-' + batch.route">{{ ROUTE_NAMES[batch.route] }}</span>
              </div>
              <div class="text-xs mb-1" style="color: #c9b896;">
                阶段: {{ getStageName(batch) }}
                <span v-if="batch.barrelRounds > 0">
                  · 桶陈{{ batch.barrelRounds }}回合
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: batch.stageProgress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>🛢 桶库 ({{ gameStore.currentPlayer.barrels.length }})</span>
            <button
              class="btn btn-small btn-success"
              :disabled="gameStore.room.currentPhase !== 'brewing'"
              @click="showBuyBarrel = true"
            >+ 买桶</button>
          </div>
          <div class="overflow-y-auto" style="max-height: 140px;">
            <div v-if="gameStore.currentPlayer.barrels.length === 0"
                 class="text-center p-3 text-sm" style="color: #666;">
              还没有橡木桶
            </div>
            <div v-for="barrel in gameStore.currentPlayer.barrels"
                 :key="barrel.id"
                 class="p-2 mb-1 text-sm rounded"
                 style="background: rgba(26, 15, 10, 0.5);">
              <div class="flex justify-between">
                <span style="color: #c9b896;">{{ BARREL_NAMES[barrel.type] }}</span>
                <span style="color: #999;">{{ barrel.usedTimes }}/{{ barrel.maxUses }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>🍾 成品库存 ({{ gameStore.currentPlayer.inventory.length }})</span>
          </div>
          <div class="overflow-y-auto" style="max-height: 140px;">
            <div v-if="gameStore.currentPlayer.inventory.length === 0"
                 class="text-center p-3 text-sm" style="color: #666;">
              暂无成品酒
            </div>
            <div v-for="wine in gameStore.currentPlayer.inventory"
                 :key="wine.id"
                 class="p-2 mb-1 rounded cursor-pointer"
                 style="background: rgba(26, 15, 10, 0.5); border: 1px solid transparent;"
                 :class="{ '!border-[#8b4513]': selectedWine?.id === wine.id }"
                 @click="selectedWine = wine; showWineDetail = true"
            >
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-medium text-sm" style="color: #d4a574;">{{ wine.name }}</span>
                  <span class="ml-1 badge" :class="'badge-' + wine.route" style="font-size: 9px;">
                    {{ ROUTE_NAMES[wine.route].slice(0, 1) }}
                  </span>
                </div>
                <div class="text-right">
                  <div class="text-xs font-bold" :style="{ color: scoreColor(wine.score) }">
                    {{ wine.score }}分
                  </div>
                  <div class="text-xs" style="color: #888;">x{{ wine.quantity }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-span-6 flex flex-col gap-3">
        <div class="card">
          <div class="card-header">
            <span class="flex gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="btn btn-small"
                :class="activeTab === tab.key ? 'btn-primary' : 'btn-secondary'"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </span>
          </div>

          <div v-if="activeTab === 'market'">
            <MarketAuctionPanel
              :ingredients="gameStore.room.market"
              :phase="gameStore.room.currentPhase"
              :coins="gameStore.currentPlayer.coins"
              :playerIngredients="gameStore.currentPlayer.ingredients"
              :myBids="myBids"
              @update-bids="myBids = $event; submitBids()"
            />
          </div>

          <div v-else-if="activeTab === 'brewing'" class="brewing-panel p-2" style="min-height: 380px;">
            <div v-if="selectedBatch" class="grid grid-cols-2 gap-3">
              <div>
                <h4 class="font-bold mb-2" style="color: #d4a574;">
                  📊 {{ selectedBatch.name }} - 详情
                </h4>
                <div class="text-xs mb-2" style="color: #c9b896; line-height: 1.6;">
                  <div>路线: {{ ROUTE_NAMES[selectedBatch.route] }}</div>
                  <div>当前阶段: {{ getStageName(selectedBatch) }}</div>
                  <div>进度: {{ Math.floor(selectedBatch.stageProgress) }}%</div>
                  <div>数量: {{ selectedBatch.quantity }}单位</div>
                  <div v-if="selectedBatch.barrelId">
                    桶: {{ getBarrelName(selectedBatch.barrelId) }} · {{ selectedBatch.barrelRounds }}回合
                  </div>
                </div>

                <div v-if="gameStore.room.currentPhase === 'brewing'" class="flex flex-col gap-2 mt-3">
                  <button
                    class="btn btn-primary"
                    :disabled="!canAdvanceStage(selectedBatch)"
                    @click="advanceStage(selectedBatch)"
                  >
                    ➡ 推进到下一阶段
                  </button>
                  <button
                    v-if="canBottle(selectedBatch)"
                    class="btn btn-success"
                    @click="bottleBatch(selectedBatch)"
                  >
                    🍾 装瓶入库
                  </button>
                  <button
                    v-if="canAssignBarrel(selectedBatch)"
                    class="btn btn-secondary"
                    @click="showAssignBarrel = true"
                  >
                    🛢 分配橡木桶
                  </button>
                </div>
              </div>
              <div>
                <FlavorRadar
                  :flavor="selectedBatch.currentFlavor"
                  title=""
                  :first-label="'当前风味'"
                />
              </div>
            </div>

            <div v-if="selectedBatch && selectedBatch.flavorHistory.length > 1" class="mt-3">
              <FlavorLineChart :history="selectedBatch.flavorHistory" />
            </div>

            <div v-if="!selectedBatch" class="text-center py-12" style="color: #666;">
              <div class="text-4xl mb-3">🍺</div>
              <div>点击左侧批次查看详情</div>
              <div class="text-sm mt-2">或点击「+ 新批次」开始酿造</div>
            </div>
          </div>

          <div v-else-if="activeTab === 'sales'">
            <div class="flex gap-2 p-2 pb-0">
              <button
                class="btn btn-small"
                :class="salesSubTab === 'npc' ? 'btn-primary' : 'btn-secondary'"
                @click="salesSubTab = 'npc'"
              >💰 NPC 市场</button>
              <button
                class="btn btn-small"
                :class="salesSubTab === 'trade' ? 'btn-primary' : 'btn-secondary'"
                @click="salesSubTab = 'trade'"
              >🤝 玩家交易</button>
            </div>
            <SalesPanel
              v-show="salesSubTab === 'npc'"
              :inventory="gameStore.currentPlayer.inventory"
              :phase="gameStore.room.currentPhase"
              :reputation="gameStore.currentPlayer.reputation"
              :market-trend="gameStore.room.marketTrend"
              @list="handleListSale"
            />
            <TradePanel
              v-show="salesSubTab === 'trade'"
              :phase="gameStore.room.currentPhase"
              :coins="gameStore.currentPlayer.coins"
              :player-id="gameStore.playerId ?? undefined"
              :trade-listings="gameStore.room.tradeListings"
              :player-ingredients="gameStore.currentPlayer.ingredients"
              :player-inventory="gameStore.currentPlayer.inventory"
              :market-ingredients="gameStore.room.market"
              :competition-wine-ids="gameStore.room.competitionWineIds"
              @create="handleCreateTrade"
              @cancel="handleCancelTrade"
              @buy="handleBuyTrade"
            />
          </div>

          <div v-else-if="activeTab === 'competition'">
            <CompetitionPanel
              :history="gameStore.room.competitionHistory"
              :current-round="gameStore.room.currentRound"
              :phase="gameStore.room.currentPhase"
              :inventory="gameStore.currentPlayer.inventory"
              :last-result="gameStore.lastCompetition"
              @enter="gameStore.enterCompetition"
            />
          </div>

          <div v-else-if="activeTab === 'shop'">
            <EquipmentShop
              :coins="gameStore.currentPlayer.coins"
              :equipment="gameStore.currentPlayer.equipment"
              :phase="gameStore.room.currentPhase"
              @buy="buyEquipment"
            />
          </div>
        </div>

        <div class="card flex-1" style="min-height: 200px;">
          <div class="card-header">
            <span>📜 事件日志</span>
          </div>
          <div class="overflow-y-auto" style="max-height: 180px;">
            <div v-if="gameStore.room.events.length === 0"
                 class="text-center p-4 text-sm" style="color: #666;">
              暂无事件
            </div>
            <div
              v-for="evt in [...gameStore.room.events].reverse()"
              :key="evt.id"
              class="p-2 mb-2 text-sm rounded"
              style="background: rgba(26, 15, 10, 0.5);"
            >
              <div class="flex items-start gap-2">
                <span class="badge badge-normal">R{{ evt.round }}</span>
                <span style="color: #c9b896;">{{ evt.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-span-3 flex flex-col gap-3">
        <div class="card">
          <div class="card-header">
            <span>🏆 排行榜</span>
          </div>
          <div class="rankings">
            <div
              v-for="(player, idx) in sortedPlayers"
              :key="player.id"
              class="ranking-item p-2 mb-2 rounded flex items-center gap-3"
              :class="{ 'ranking-me': player.id === gameStore.playerId }"
            >
              <div class="rank-num text-lg font-bold"
                   :style="{ color: idx === 0 ? '#f1c40f' : idx === 1 ? '#bdc3c7' : idx === 2 ? '#cd7f32' : '#888' }">
                {{ idx + 1 }}
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm" style="color: #d4a574;">
                  {{ player.name }}
                  <span v-if="player.id === gameStore.playerId" class="badge badge-premium ml-1" style="font-size: 9px;">我</span>
                </div>
                <div class="text-xs" style="color: #999;">
                  ⭐{{ player.reputation }} · 💰{{ player.coins }} · 🏆{{ player.competitionWins }}
                </div>
              </div>
              <div class="text-xs font-bold" style="color: #3498db;">
                {{ calculateRankScore(player) }}
              </div>
            </div>
          </div>
        </div>

        <div class="card flex-1 flex flex-col overflow-hidden">
          <div class="card-header">
            <span>💬 房间聊天</span>
          </div>
          <div class="chat-box flex-1 overflow-y-auto mb-2 p-2" style="max-height: 300px;">
            <div
              v-for="msg in gameStore.room.chatMessages"
              :key="msg.id"
              class="chat-item mb-2 p-2 rounded text-sm"
              :class="msg.playerId === gameStore.playerId ? 'my-msg' : 'other-msg'"
            >
              <div class="text-xs font-bold mb-1"
                   :style="{ color: msg.playerId === gameStore.playerId ? '#d4a574' : '#5a8a9e' }">
                {{ msg.playerName }}
              </div>
              <div>{{ msg.content }}</div>
            </div>
            <div v-if="gameStore.room.chatMessages.length === 0"
                 class="text-center p-4 text-xs" style="color: #666;">
              还没有消息
            </div>
          </div>
          <div class="flex gap-2">
            <input
              v-model="chatInput"
              @keyup.enter="sendChat"
              placeholder="说点什么..."
              maxlength="200"
              class="flex-1 text-sm"
              style="padding: 6px 10px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 6px; color: #e8d8c4; outline: none;"
            />
            <button class="btn btn-primary btn-small" @click="sendChat">发送</button>
          </div>
        </div>

        <div class="card" v-if="gameStore.room.marketTrend && Object.keys(gameStore.room.marketTrend).length > 0">
          <div class="card-header">
            <span>📈 市场行情</span>
          </div>
          <div class="p-2 text-sm" style="color: #c9b896;">
            <div v-for="(val, key) in gameStore.room.marketTrend" :key="key" class="flex justify-between mb-1">
              <span>{{ FLAVOR_LABELS[key as keyof typeof FLAVOR_LABELS] }}</span>
              <span style="color: #27ae60;">热销 (> {{ val }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateBatchModal
      v-if="showCreateBatch"
      :ingredients="availableIngredients"
      :market="gameStore.room.market"
      @close="showCreateBatch = false"
      @create="createBatch"
    />

    <BuyBarrelModal
      v-if="showBuyBarrel"
      :coins="gameStore.currentPlayer.coins"
      @close="showBuyBarrel = false"
      @buy="buyBarrel"
    />

    <AssignBarrelModal
      v-if="showAssignBarrel && selectedBatch"
      :batch="selectedBatch"
      :barrels="gameStore.currentPlayer.barrels"
      @close="showAssignBarrel = false"
      @assign="assignBarrel"
    />

    <WineDetailModal
      v-if="showWineDetail && selectedWine"
      :wine="selectedWine"
      @close="selectedWine = null; showWineDetail = false"
    />

    <EndGameModal
      v-if="gameStore.room.gameEnded && gameStore.room.winner"
      :room="gameStore.room"
      @close="leaveGame"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import {
  PHASE_NAMES, ROUTE_NAMES, STAGE_NAMES, BARREL_NAMES,
  FLAVOR_LABELS, PhaseType, MarketTier, WineRoute, Ingredient
} from '@/types';
import type { Player, Batch, Barrel, BottledWine, FlavorProfile } from '@/types';
import FlavorRadar from '@/components/FlavorRadar.vue';
import FlavorLineChart from '@/components/FlavorLineChart.vue';
import MarketAuctionPanel from '@/components/MarketAuctionPanel.vue';
import SalesPanel from '@/components/SalesPanel.vue';
import CompetitionPanel from '@/components/CompetitionPanel.vue';
import EquipmentShop from '@/components/EquipmentShop.vue';
import TradePanel from '@/components/TradePanel.vue';
import CreateBatchModal from '@/components/CreateBatchModal.vue';
import BuyBarrelModal from '@/components/BuyBarrelModal.vue';
import AssignBarrelModal from '@/components/AssignBarrelModal.vue';
import WineDetailModal from '@/components/WineDetailModal.vue';
import EndGameModal from '@/components/EndGameModal.vue';

const PHASE_DESCRIPTIONS: Record<PhaseType, string> = {
  idle: '等待游戏开始',
  market_auction: '原料市场开放，提交出价竞价抢购！',
  brewing: '管理产线，推进酿造各阶段',
  aging: '橡木桶中陈酿，风味静静演变',
  sales: '成品上架销售，赚取金币与声望',
  competition: '品酒大赛，拿出你最好的酒！',
  events: '随机事件即将揭晓'
};

const router = useRouter();
const gameStore = useGameStore();

const tabs = [
  { key: 'market', label: '🛒 原料市场' },
  { key: 'brewing', label: '🍺 酿造操作' },
  { key: 'sales', label: '💸 销售市场' },
  { key: 'competition', label: '🏆 品酒大赛' },
  { key: 'shop', label: '⚙️ 设备升级' }
];

const activeTab = ref<typeof tabs[number]['key']>('market');
const salesSubTab = ref<'npc' | 'trade'>('npc');
const selectedBatch = ref<Batch | null>(null);
const selectedWine = ref<BottledWine | null>(null);
const myBids = ref<{ ingredientId: string; bid: number; quantity: number }[]>([]);
const chatInput = ref('');
const showCreateBatch = ref(false);
const showBuyBarrel = ref(false);
const showAssignBarrel = ref(false);
const showWineDetail = ref(false);
const showPhaseBanner = ref(false);
const currentBannerPhase = ref<PhaseType>('idle');

let timerInterval: number | null = null;
let bannerTimer: number | null = null;

const sortedPlayers = computed(() => {
  if (!gameStore.room) return [];
  return [...gameStore.room.players].sort((a, b) => {
    const sa = calculateRankScore(a);
    const sb = calculateRankScore(b);
    return sb - sa;
  });
});

const availableIngredients = computed(() => {
  if (!gameStore.currentPlayer || !gameStore.room) return [];
  const result: { ingredient: Ingredient; quantity: number }[] = [];
  gameStore.currentPlayer.ingredients.forEach(pi => {
    const ing = gameStore.room!.market.find(m => m.id === pi.ingredientId);
    if (ing && pi.quantity > 0) {
      result.push({ ingredient: ing, quantity: pi.quantity });
    }
  });
  return result;
});

const phaseBadgeClass = computed(() => {
  const phase = gameStore.room?.currentPhase;
  const map: Record<PhaseType, string> = {
    idle: 'badge-normal',
    market_auction: 'badge-premium',
    brewing: 'badge-top',
    aging: 'badge-normal',
    sales: 'badge-premium',
    competition: 'badge-top',
    events: 'badge-normal'
  };
  return map[phase as PhaseType] || 'badge-normal';
});

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getStageName(batch: Batch) {
  const stages = STAGE_NAMES[batch.route];
  return stages?.[batch.currentStage] || batch.currentStage;
}

function getBarrelName(id: string) {
  const b = gameStore.currentPlayer?.barrels.find(x => x.id === id);
  return b ? BARREL_NAMES[b.type] : '未知';
}

function scoreColor(score: number) {
  if (score >= 85) return '#27ae60';
  if (score >= 65) return '#3498db';
  if (score >= 45) return '#f39c12';
  return '#e74c3c';
}

function calculateRankScore(p: Player) {
  return Math.floor(p.reputation * 0.5 + p.totalAssets * 0.3 + p.competitionWins * 100 * 0.2);
}

function canAdvanceStage(batch: Batch): boolean {
  if (gameStore.room?.currentPhase !== 'brewing') return false;
  const stages = Object.keys(STAGE_NAMES[batch.route]);
  const idx = stages.indexOf(batch.currentStage);
  return idx < stages.length - 1 && batch.stageProgress >= (idx + 1) * (100 / stages.length) - 5;
}

function canBottle(batch: Batch): boolean {
  if (gameStore.room?.currentPhase !== 'brewing') return false;
  if (batch.route === 'whiskey' && batch.barrelRounds < 8) return false;
  const stages = Object.keys(STAGE_NAMES[batch.route]);
  return batch.currentStage === stages[stages.length - 1] && batch.stageProgress >= 85;
}

function canAssignBarrel(batch: Batch): boolean {
  if (gameStore.room?.currentPhase !== 'brewing') return false;
  const agingStages = ['age', 'barrel_age', 'mature'];
  return agingStages.includes(batch.currentStage) && !batch.barrelId;
}

function submitBids() {
  gameStore.submitBids(myBids.value.filter(b => b.quantity > 0));
}

function advanceStage(batch: Batch) {
  gameStore.brewingAction('advance_stage', { batchId: batch.id });
}

function bottleBatch(batch: Batch) {
  gameStore.brewingAction('bottle_batch', { batchId: batch.id });
  selectedBatch.value = null;
}

function buyBarrel(type: string) {
  gameStore.brewingAction('buy_barrel', { barrelType: type });
  showBuyBarrel.value = false;
}

function buyEquipment(type: string) {
  gameStore.brewingAction('buy_equipment', { equipmentType: type });
}

function assignBarrel(batchId: string, barrelId: string) {
  gameStore.brewingAction('assign_barrel', { batchId, barrelId });
  showAssignBarrel.value = false;
}

function createBatch(data: { route: WineRoute; name: string; ingredientIds: string[]; params: Record<string, number>; quantity: number }) {
  gameStore.brewingAction('start_batch', data);
  showCreateBatch.value = false;
}

function handleListSale(listings: { wineId: string; tier: MarketTier; price: number }[]) {
  gameStore.listForSale(listings);
}

function handleCreateTrade(itemType: any, itemId: string, quantity: number, unitPrice: number) {
  gameStore.createTradeListing(itemType, itemId, quantity, unitPrice);
}

function handleCancelTrade(listingId: string) {
  gameStore.cancelTradeListing(listingId);
}

function handleBuyTrade(listingId: string) {
  gameStore.buyTradeListing(listingId);
}

function sendChat() {
  if (!chatInput.value.trim()) return;
  gameStore.sendChat(chatInput.value);
  chatInput.value = '';
}

function leaveGame() {
  gameStore.leaveRoom();
  router.push('/');
}

watch(() => gameStore.room?.currentPhase, (newPhase, oldPhase) => {
  if (newPhase && newPhase !== oldPhase) {
    currentBannerPhase.value = newPhase;
    showPhaseBanner.value = false;
    nextTick(() => {
      showPhaseBanner.value = true;
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => {
        showPhaseBanner.value = false;
      }, 2500);
    });
  }
  if (newPhase === 'market_auction') {
    activeTab.value = 'market';
    myBids.value = [];
  } else if (newPhase === 'brewing') {
    activeTab.value = 'brewing';
  } else if (newPhase === 'sales') {
    activeTab.value = 'sales';
  } else if (newPhase === 'competition') {
    activeTab.value = 'competition';
  }
});

onMounted(() => {
  if (!gameStore.room || !gameStore.playerId) {
    router.push('/');
    return;
  }
  timerInterval = window.setInterval(() => {
    gameStore.requestState();
  }, 10000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.phase-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  pointer-events: none;
}

.phase-banner-content {
  text-align: center;
  padding: 50px 80px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.95), rgba(80, 40, 15, 0.95));
  border: 2px solid #d4a574;
  box-shadow: 0 0 60px rgba(212, 165, 116, 0.4);
}

.phase-banner-round {
  font-size: 16px;
  color: #888;
  margin-bottom: 12px;
  letter-spacing: 3px;
}

.phase-banner-name {
  font-size: 48px;
  font-weight: bold;
  color: #d4a574;
  margin-bottom: 16px;
  text-shadow: 0 0 20px rgba(212, 165, 116, 0.5);
}

.phase-banner-desc {
  font-size: 18px;
  color: #c9b896;
  letter-spacing: 1px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.batch-selected {
  border-color: #8b4513 !important;
  background: rgba(139, 69, 19, 0.15) !important;
}

.ranking-item {
  background: rgba(26, 15, 10, 0.5);
  border: 1px solid #5a3a24;
}

.ranking-me {
  border-color: #8b4513 !important;
  background: rgba(139, 69, 19, 0.15);
}

.my-msg {
  background: rgba(139, 69, 19, 0.2);
  margin-left: 15%;
}

.other-msg {
  background: rgba(0, 0, 0, 0.3);
  margin-right: 15%;
}
</style>
