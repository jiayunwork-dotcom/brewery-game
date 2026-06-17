<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card guild-panel" style="width: 720px; max-width: 95vw; max-height: 90vh; overflow-y: auto;">
      <div class="card-header">
        <span>🏰 酿酒协会</span>
        <button class="btn btn-small" @click="$emit('close')" style="background: transparent; border: none; color: #999;">✕</button>
      </div>

      <div v-if="!myGuild">
        <div class="mb-3 p-3 rounded" style="background: rgba(139, 69, 19, 0.1); border: 1px solid #5a3a24;">
          <div class="font-bold mb-2" style="color: #d4a574;">➕ 创建协会</div>
          <div class="text-xs mb-2" style="color: #999;">花费 500 金币创建协会，自动成为会长</div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="text-xs block mb-1" style="color: #999;">协会名称</label>
              <input v-model="createForm.name" maxlength="20" placeholder="输入协会名称..."
                style="width: 100%; padding: 6px 10px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 6px; color: #e8d8c4; outline: none; font-size: 13px;" />
            </div>
            <div>
              <label class="text-xs block mb-1" style="color: #999;">协会口号</label>
              <input v-model="createForm.motto" maxlength="30" placeholder="输入协会口号..."
                style="width: 100%; padding: 6px 10px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 6px; color: #e8d8c4; outline: none; font-size: 13px;" />
            </div>
          </div>
          <button class="btn btn-primary w-full" :disabled="coins < 500 || !createForm.name.trim()" @click="handleCreateGuild">
            💰 创建协会 (500金币)
          </button>
          <div v-if="coins < 500" class="text-xs mt-1 text-center" style="color: #e74c3c;">金币不足</div>
        </div>

        <div>
          <div class="font-bold mb-2" style="color: #d4a574;">📜 房间内协会列表</div>
          <div v-if="guilds.length === 0" class="text-center p-4 text-sm rounded"
               style="background: rgba(26, 15, 10, 0.4); color: #666;">
            还没有任何协会
          </div>
          <div v-for="guild in guilds" :key="guild.id"
               class="p-3 mb-2 rounded"
               style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium" style="color: #d4a574;">🏰 {{ guild.name }}</div>
                <div class="text-xs" style="color: #999;">「{{ guild.motto }}」</div>
                <div class="text-xs mt-1" style="color: #c9b896;">
                  会长: {{ getPlayerName(guild.leaderId) }} · 成员: {{ guild.memberIds.length }}/3 · 桶: {{ guild.barrels.length }}/6
                </div>
              </div>
              <button
                class="btn btn-small btn-primary"
                :disabled="guild.memberIds.length >= 3"
                @click="handleApplyGuild(guild.id)"
              >申请加入</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="guild-info mb-3 p-3 rounded" style="background: rgba(139, 69, 19, 0.15); border: 1px solid #8b4513;">
          <div class="flex justify-between items-center mb-2">
            <div>
              <span class="text-lg font-bold" style="color: #d4a574;">🏰 {{ myGuild.name }}</span>
              <span class="ml-2 text-xs" style="color: #999;">「{{ myGuild.motto }}」</span>
            </div>
            <div class="flex gap-2">
              <button v-if="!isLeader" class="btn btn-small btn-danger" @click="handleLeaveGuild">退出协会</button>
              <button v-if="isLeader && myGuild.memberIds.length > 1" class="btn btn-small btn-secondary" disabled
                style="opacity: 0.5; cursor: not-allowed;" title="转让会长后可退出">会长不可退出</button>
            </div>
          </div>
          <div class="text-xs" style="color: #c9b896;">
            会长: {{ getPlayerName(myGuild.leaderId) }}
            <span v-if="isLeader" class="badge badge-premium ml-1" style="font-size: 9px;">我</span>
            · 成员: {{ myGuild.memberIds.length }}/3
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="p-3 rounded" style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;">
            <div class="card-header" style="padding-bottom: 6px; margin-bottom: 8px;">
              <span class="text-sm">👥 成员列表</span>
            </div>
            <div v-for="mid in myGuild.memberIds" :key="mid"
                 class="flex justify-between items-center p-2 mb-1 rounded"
                 style="background: rgba(26, 15, 10, 0.5);">
              <div>
                <span class="text-sm" style="color: #d4a574;">{{ getPlayerName(mid) }}</span>
                <span v-if="mid === myGuild.leaderId" class="badge badge-top ml-1" style="font-size: 9px;">会长</span>
                <span v-if="mid === playerId" class="badge badge-premium ml-1" style="font-size: 9px;">我</span>
              </div>
              <button v-if="isLeader && mid !== playerId" class="btn btn-small btn-danger" @click="handleKickMember(mid)">踢出</button>
            </div>
          </div>

          <div class="p-3 rounded" style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;">
            <div class="card-header" style="padding-bottom: 6px; margin-bottom: 8px;">
              <span class="text-sm">🛢 共享桶库 ({{ myGuild.barrels.length }}/6)</span>
            </div>
            <div v-if="myGuild.barrels.length === 0" class="text-center p-2 text-xs" style="color: #666;">
              桶库为空
            </div>
            <div v-for="barrel in myGuild.barrels" :key="barrel.id"
                 class="p-2 mb-1 rounded"
                 style="background: rgba(26, 15, 10, 0.5);">
              <div class="flex justify-between items-center">
                <span class="text-sm" style="color: #c9b896;">{{ BARREL_NAMES[barrel.type] }}</span>
                <span class="text-xs" style="color: #999;">{{ barrel.usedTimes }}/{{ barrel.maxUses }}</span>
              </div>
            </div>
            <div v-if="isLeader" class="mt-2">
              <div class="text-xs mb-1" style="color: #999;">从个人桶库捐赠：</div>
              <div v-if="donatableBarrels.length === 0" class="text-xs text-center" style="color: #666;">没有可捐赠的桶</div>
              <div v-for="barrel in donatableBarrels" :key="barrel.id"
                   class="flex justify-between items-center p-1 mb-1 rounded"
                   style="background: rgba(26, 15, 10, 0.3);">
                <span class="text-xs" style="color: #c9b896;">{{ BARREL_NAMES[barrel.type] }} ({{ barrel.usedTimes }}/{{ barrel.maxUses }})</span>
                <button class="btn btn-small btn-success" style="padding: 2px 8px; font-size: 10px;"
                  :disabled="myGuild.barrels.length >= 6"
                  @click="handleDonateBarrel(barrel.id)">捐赠</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLeader && pendingApplications.length > 0" class="mb-3 p-3 rounded"
             style="background: rgba(243, 156, 18, 0.1); border: 1px solid #f39c12;">
          <div class="card-header" style="padding-bottom: 6px; margin-bottom: 8px;">
            <span class="text-sm">📋 入会审批 ({{ pendingApplications.length }})</span>
          </div>
          <div v-for="app in pendingApplications" :key="app.playerId"
               class="flex justify-between items-center p-2 mb-1 rounded"
               style="background: rgba(26, 15, 10, 0.5);">
            <span class="text-sm" style="color: #c9b896;">{{ app.playerName }}</span>
            <div class="flex gap-2">
              <button class="btn btn-small btn-success" @click="handleApproveApplication(app.playerId)">通过</button>
            </div>
          </div>
        </div>

        <div class="mb-3 p-3 rounded" style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;">
          <div class="card-header" style="padding-bottom: 6px; margin-bottom: 8px;">
            <span class="text-sm">📝 委托酿造</span>
            <button v-if="canCreateCommission" class="btn btn-small btn-primary" @click="showCreateCommission = true">+ 新委托</button>
          </div>

          <div v-if="activeCommissions.length === 0" class="text-center p-2 text-xs" style="color: #666;">
            暂无委托
          </div>

          <div v-for="comm in activeCommissions" :key="comm.id"
               class="p-2 mb-2 rounded"
               style="background: rgba(26, 15, 10, 0.5); border: 1px solid #5a3a24;">
            <div class="flex justify-between items-center mb-1">
              <div>
                <span class="text-sm font-medium" style="color: #d4a574;">{{ comm.name }}</span>
                <span class="badge ml-1" :class="commissionBadgeClass(comm.status)" style="font-size: 10px;">
                  {{ COMMISSION_STATUS_NAMES[comm.status] }}
                </span>
              </div>
              <div class="flex gap-2">
                <button v-if="comm.brewerId === playerId && comm.status === 'pending'" class="btn btn-small btn-success"
                  @click="handleAcceptCommission(comm.id)">接受</button>
                <button v-if="comm.requesterId === playerId && (comm.status === 'pending' || comm.status === 'accepted')"
                  class="btn btn-small btn-danger" @click="handleCancelCommission(comm.id)">取消</button>
              </div>
            </div>
            <div class="text-xs" style="color: #999;">
              委托方: {{ comm.requesterName }}
              <span v-if="comm.requesterId === playerId" class="badge badge-premium ml-1" style="font-size: 9px;">我</span>
              · 酿造方: {{ comm.brewerName }}
              <span v-if="comm.brewerId === playerId" class="badge badge-premium ml-1" style="font-size: 9px;">我</span>
              · 路线: {{ ROUTE_NAMES[comm.route] }}
            </div>
            <div class="text-xs" style="color: #888;">
              原料: {{ commissionIngredientSummary(comm) }} · 数量: {{ comm.quantity }}单位
              <span v-if="comm.status === 'accepted' && comm.roundsSinceLastProgress > 0" style="color: #f39c12;">
                · ⏳ {{ comm.roundsSinceLastProgress }}/3回合未推进
              </span>
            </div>
          </div>
        </div>

        <div class="p-3 rounded" style="background: rgba(26, 15, 10, 0.4); border: 1px dashed #5a3a24;">
          <div class="font-bold mb-2 text-sm" style="color: #d4a574;">🏆 协会品酒加成</div>
          <div class="text-xs" style="color: #c9b896; line-height: 1.7;">
            品酒大赛中，若同一协会<b>2名以上成员</b>同时参赛，且每人参赛酒评分都超过<b>50分</b>，则协会内所有参赛成员的最终得分额外<b>+5%</b>作为"团队协作奖励"。
          </div>
        </div>
      </div>

      <CreateCommissionModal
        v-if="showCreateCommission && myGuild"
        :guild="myGuild"
        :player-id="playerId"
        :players="players"
        :player-ingredients="playerIngredients"
        :market="market"
        @close="showCreateCommission = false"
        @create="handleCreateCommission"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import {
  BARREL_NAMES, ROUTE_NAMES, COMMISSION_STATUS_NAMES
} from '@/types';
import type {
  Guild, Commission, CommissionStatus, Player, Ingredient, WineRoute
} from '@/types';
import CreateCommissionModal from './CreateCommissionModal.vue';

const props = defineProps<{
  guilds: Guild[];
  playerId: string;
  players: Player[];
  coins: number;
  playerIngredients: { ingredientId: string; quantity: number }[];
  market: Ingredient[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const gameStore = useGameStore();
const showCreateCommission = ref(false);

const createForm = reactive({
  name: '',
  motto: ''
});

const myGuild = computed(() => {
  return props.guilds.find(g => g.memberIds.includes(props.playerId));
});

const isLeader = computed(() => {
  return myGuild.value?.leaderId === props.playerId;
});

const donatableBarrels = computed(() => {
  if (!myGuild.value || !isLeader.value) return [];
  const player = props.players.find(p => p.id === props.playerId);
  if (!player) return [];
  return player.barrels.filter(b => b.usedTimes < b.maxUses);
});

const pendingApplications = computed(() => {
  if (!myGuild.value) return [];
  return myGuild.value.applications.filter(a => a.status === 'pending');
});

const canCreateCommission = computed(() => {
  if (!myGuild.value) return false;
  return myGuild.value.memberIds.length >= 2;
});

const activeCommissions = computed(() => {
  if (!myGuild.value) return [];
  return myGuild.value.commissions.filter(c =>
    c.status === 'pending' || c.status === 'accepted'
  );
});

function getPlayerName(id: string) {
  const p = props.players.find(p => p.id === id);
  return p ? p.name : `玩家${id.slice(0, 4)}`;
}

function commissionBadgeClass(status: CommissionStatus) {
  switch (status) {
    case 'pending': return 'badge-premium';
    case 'accepted': return 'badge-top';
    case 'completed': return 'badge-normal';
    case 'cancelled': return 'badge-normal';
    case 'timed_out': return 'badge-normal';
    default: return 'badge-normal';
  }
}

function commissionIngredientSummary(comm: Commission) {
  return comm.ingredients.map(i => {
    const mi = props.market.find(m => m.id === i.ingredientId);
    return mi ? `${mi.name}x${i.quantity}` : `原料x${i.quantity}`;
  }).join(', ');
}

function handleCreateGuild() {
  gameStore.createGuild(createForm.name, createForm.motto);
  createForm.name = '';
  createForm.motto = '';
}

function handleApplyGuild(guildId: string) {
  gameStore.applyGuild(guildId);
}

function handleApproveApplication(applicantId: string) {
  if (!myGuild.value) return;
  gameStore.approveGuildApplication(myGuild.value.id, applicantId);
}

function handleKickMember(memberId: string) {
  gameStore.kickGuildMember(memberId);
}

function handleLeaveGuild() {
  gameStore.leaveGuild();
}

function handleDonateBarrel(barrelId: string) {
  gameStore.donateBarrelToGuild(barrelId);
}

function handleAcceptCommission(commissionId: string) {
  gameStore.acceptCommission(commissionId);
}

function handleCancelCommission(commissionId: string) {
  gameStore.cancelCommission(commissionId);
}

function handleCreateCommission(data: {
  brewerId: string;
  ingredients: { ingredientId: string; quantity: number }[];
  route: WineRoute;
  name: string;
  params: Record<string, number>;
  quantity: number;
}) {
  gameStore.createCommission(data.brewerId, data.ingredients, data.route, data.name, data.params, data.quantity);
  showCreateCommission.value = false;
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

.modal-content {
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.guild-panel .card-header {
  padding-bottom: 8px;
  margin-bottom: 0;
}
</style>
