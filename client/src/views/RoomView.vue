<template>
  <div class="room-view min-h-screen p-6" v-if="gameStore.room">
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold" style="color: #d4a574;">
            🏠 {{ gameStore.room.name }}
          </h1>
          <div class="text-sm" style="color: #999;">
            房间ID: {{ gameStore.room.id }}
            <button
              class="btn btn-small ml-2"
              style="background: #3d2817; color: #d4a574;"
              @click="copyRoomId"
            >复制</button>
          </div>
        </div>
        <button class="btn btn-danger" @click="leaveRoom">
          🚪 离开房间
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2">
          <div class="card mb-6">
            <div class="card-header">
              <span>👥 玩家列表 ({{ gameStore.room.players.length }}/{{ gameStore.room.maxPlayers }})</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                v-for="(player, idx) in gameStore.room.players"
                :key="player.id"
                class="player-card p-4 rounded-lg text-center"
                style="background: rgba(26, 15, 10, 0.7); border: 1px solid #5a3a24;"
                :class="{ 'host-border': player.id === gameStore.room.hostId }"
              >
                <div class="text-3xl mb-2">{{ avatars[idx] }}</div>
                <div class="font-bold mb-1" style="color: #d4a574;">
                  {{ player.name }}
                </div>
                <div v-if="player.id === gameStore.room.hostId" class="badge badge-top mb-1">
                  👑 房主
                </div>
                <div v-if="player.id === gameStore.playerId" class="badge badge-premium">
                  ✓ 你
                </div>
              </div>
              <div
                v-for="i in (gameStore.room.maxPlayers - gameStore.room.players.length)"
                :key="'empty-' + i"
                class="player-card p-4 rounded-lg text-center opacity-40"
                style="background: rgba(0, 0, 0, 0.3); border: 1px dashed #555;"
              >
                <div class="text-3xl mb-2">👤</div>
                <div class="font-bold mb-1">等待加入...</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span>🎮 游戏规则</span>
            </div>
            <div class="text-sm" style="color: #c9b896; line-height: 1.8;">
              <p class="mb-2">🍷 <b>目标</b>：在30回合中积累最高的声望值和资产，成为酿酒大师！</p>
              <p class="mb-2">📊 <b>三大路线</b>：葡萄酒（6工序）/ 精酿啤酒（6工序）/ 威士忌（5工序，需8回合桶陈）</p>
              <p class="mb-2">🫐 <b>每回合流程</b>：原料市场拍卖 → 酿造操作 → 陈酿推进 → 销售阶段 → 随机事件</p>
              <p class="mb-2">🏆 <b>品酒大赛</b>：每5回合举办，前三名获得声望和金币奖励</p>
              <p class="mb-2">💸 <b>破产</b>：连续5回合资不抵债则退出游戏</p>
              <p>👑 <b>提前胜利</b>：声望超过其他所有人总和，立即成为酿酒大师！</p>
            </div>
          </div>
        </div>

        <div>
          <div class="card mb-6">
            <div class="card-header">
              <span>💬 房间聊天</span>
            </div>
            <div class="chat-messages mb-3 overflow-y-auto" style="height: 300px;">
              <div
                v-for="msg in gameStore.room.chatMessages"
                :key="msg.id"
                class="chat-msg mb-2 p-2 rounded"
                :class="msg.playerId === gameStore.playerId ? 'bg-my' : 'bg-other'"
              >
                <div class="text-xs font-bold mb-1"
                  :style="{ color: msg.playerId === gameStore.playerId ? '#8b4513' : '#5a8a9e' }">
                  {{ msg.playerName }}
                  <span class="text-xs ml-2" style="color: #666;">
                    {{ formatTime(msg.timestamp) }}
                  </span>
                </div>
                <div class="text-sm">{{ msg.content }}</div>
              </div>
              <div v-if="gameStore.room.chatMessages.length === 0"
                   class="text-center text-sm p-4" style="color: #666;">
                还没有消息，说点什么吧...
              </div>
            </div>
            <div class="flex gap-2">
              <input
                v-model="chatInput"
                class="flex-1"
                placeholder="发送消息..."
                @keyup.enter="sendChat"
                maxlength="200"
                style="padding: 8px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 6px; color: #e8d8c4;"
              />
              <button class="btn btn-primary btn-small" @click="sendChat">发送</button>
            </div>
          </div>

          <div v-if="gameStore.isHost" class="card">
            <div class="card-header">
              <span>⚙️ 房主操作</span>
            </div>
            <button
              class="btn btn-success btn-large w-full"
              :disabled="gameStore.room.players.length < 2"
              @click="startGame"
            >
              🚀 开始游戏 ({{ gameStore.room.players.length }}人)
            </button>
            <p v-if="gameStore.room.players.length < 2" class="text-sm mt-2 text-center" style="color: #999;">
              至少需要2名玩家才能开始
            </p>
          </div>

          <div v-else class="card">
            <div class="card-header">
              <span>⏳ 等待中</span>
            </div>
            <div class="text-center p-4" style="color: #c9b896;">
              等待房主开始游戏...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="min-h-screen flex items-center justify-center">
    <div class="text-center" style="color: #999;">
      <div class="text-4xl mb-4">⏳</div>
      <div>正在进入房间...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';

const router = useRouter();
const gameStore = useGameStore();

const avatars = ['🧑‍🍳', '👨‍🌾', '👩‍🔬', '🧔', '👨‍💼', '👩‍🎨'];
const chatInput = ref('');

function copyRoomId() {
  if (gameStore.room) {
    navigator.clipboard.writeText(gameStore.room.id);
    alert('房间ID已复制！');
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function sendChat() {
  if (!chatInput.value.trim()) return;
  gameStore.sendChat(chatInput.value);
  chatInput.value = '';
}

function leaveRoom() {
  gameStore.leaveRoom();
  router.push('/');
}

function startGame() {
  gameStore.startGame();
}

watch(() => gameStore.room, (r) => {
  if (!r) {
    router.push('/');
    return;
  }
  if (r.gameStarted) {
    router.push(`/game/${r.id}`);
  }
}, { deep: true });

onMounted(() => {
  if (!gameStore.room || !gameStore.playerId) {
    router.push('/');
  }
});
</script>

<style scoped>
.host-border {
  border-color: #f39c12 !important;
}
.bg-my {
  background: rgba(139, 69, 19, 0.2);
  margin-left: 10%;
}
.bg-other {
  background: rgba(0, 0, 0, 0.3);
  margin-right: 10%;
}
</style>
