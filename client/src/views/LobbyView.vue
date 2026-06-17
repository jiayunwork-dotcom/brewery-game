<template>
  <div class="lobby min-h-screen p-6">
    <div class="max-w-6xl mx-auto">
      <div class="hero text-center mb-8">
        <h1 class="text-4xl font-bold mb-2" style="color: #d4a574;">
          🍷 酿酒厂大亨 🍺
        </h1>
        <p class="text-lg" style="color: #c9b896;">
          多人回合制酿酒厂经营策略游戏 · 葡萄酒 · 精酿啤酒 · 威士忌
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="card">
          <div class="card-header">➕ 创建新房间</div>
          <div class="input-group">
            <label>你的昵称</label>
            <input v-model="createForm.playerName" placeholder="输入昵称..." maxlength="12" />
          </div>
          <div class="input-group">
            <label>房间名称</label>
            <input v-model="createForm.roomName" placeholder="给房间起个名字..." maxlength="20" />
          </div>
          <div class="input-group">
            <label>最大玩家数: {{ createForm.maxPlayers }}</label>
            <input type="range" v-model.number="createForm.maxPlayers" min="4" max="6" step="1" />
            <div class="flex justify-between text-xs" style="color: #999;">
              <span>4人</span><span>5人</span><span>6人</span>
            </div>
          </div>
          <button class="btn btn-primary btn-large w-full" @click="handleCreateRoom">
            创建房间并开始
          </button>
        </div>

        <div class="card">
          <div class="card-header">🚪 加入房间</div>
          <div class="input-group">
            <label>你的昵称</label>
            <input v-model="joinForm.playerName" placeholder="输入昵称..." maxlength="12" />
          </div>
          <div class="input-group">
            <label>房间ID</label>
            <input v-model="joinForm.roomId" placeholder="输入房间ID..." />
          </div>
          <button class="btn btn-secondary btn-large w-full mb-3" @click="handleJoinRoom">
            加入指定房间
          </button>
          <div class="divider"></div>
          <button class="btn btn-success btn-small w-full" @click="refreshRooms">
            🔄 刷新房间列表
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span>🏠 当前可用房间</span>
          <span class="text-sm" style="color: #999;">共 {{ rooms.length }} 个房间</span>
        </div>
        <div v-if="rooms.length === 0" class="text-center p-8" style="color: #888;">
          暂无可用房间，创建一个开始游戏吧！
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="r in rooms"
            :key="r.id"
            class="room-card p-4 rounded-lg cursor-pointer transition-all"
            style="background: rgba(26, 15, 10, 0.6); border: 1px solid #5a3a24;"
            :class="{ 'opacity-50': r.gameStarted || r.playerCount >= r.maxPlayers }"
            @click="quickJoin(r.id)"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="font-bold text-lg" style="color: #d4a574;">{{ r.name }}</div>
              <span
                class="badge"
                :class="r.gameStarted ? 'badge-premium' : 'badge-normal'"
              >
                {{ r.gameStarted ? '游戏中' : '等待中' }}
              </span>
            </div>
            <div class="text-sm mb-2" style="color: #c9b896;">
              房主: {{ r.hostName }}
            </div>
            <div class="flex justify-between items-center">
              <div class="text-sm">
                <span style="color: #8b4513;">👥</span>
                {{ r.playerCount }} / {{ r.maxPlayers }}
              </div>
              <div class="text-xs truncate" style="color: #666; max-width: 120px;">
                ID: {{ r.id.slice(0, 8) }}...
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 text-center text-xs" style="color: #666;">
        <p>🍇 采摘原料 · 🍺 酿造工艺 · 🥃 橡木桶陈酿 · 🏆 品酒大赛 · 💰 经营致富</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import type { RoomInfo } from '@/types';
import { watch } from 'vue';

const router = useRouter();
const gameStore = useGameStore();

const rooms = ref<RoomInfo[]>([]);
const createForm = ref({
  playerName: '',
  roomName: '',
  maxPlayers: 4
});
const joinForm = ref({
  playerName: '',
  roomId: ''
});

function refreshRooms() {
  gameStore.getRoomList().then(data => {
    rooms.value = data || [];
  });
}

function handleCreateRoom() {
  if (!createForm.value.playerName.trim()) {
    alert('请输入你的昵称');
    return;
  }
  if (!createForm.value.roomName.trim()) {
    alert('请输入房间名称');
    return;
  }
  gameStore.createRoom(
    createForm.value.playerName.trim(),
    createForm.value.roomName.trim(),
    createForm.value.maxPlayers
  );
}

function handleJoinRoom() {
  if (!joinForm.value.playerName.trim()) {
    alert('请输入你的昵称');
    return;
  }
  if (!joinForm.value.roomId.trim()) {
    alert('请输入房间ID');
    return;
  }
  gameStore.joinRoom(
    joinForm.value.playerName.trim(),
    joinForm.value.roomId.trim()
  );
}

function quickJoin(roomId: string) {
  const r = rooms.value.find(x => x.id === roomId);
  if (!r) return;
  if (r.gameStarted) {
    alert('游戏已开始，无法加入');
    return;
  }
  if (r.playerCount >= r.maxPlayers) {
    alert('房间已满');
    return;
  }
  if (!joinForm.value.playerName.trim()) {
    alert('请先在左侧输入昵称');
    return;
  }
  gameStore.joinRoom(joinForm.value.playerName.trim(), roomId);
}

watch(() => gameStore.room, (newRoom) => {
  if (newRoom && gameStore.playerId) {
    if (newRoom.gameStarted) {
      router.push(`/game/${newRoom.id}`);
    } else {
      router.push(`/room/${newRoom.id}`);
    }
  }
});

onMounted(() => {
  refreshRooms();
  setInterval(refreshRooms, 5000);
});
</script>

<style scoped>
.room-card:hover {
  border-color: #8b4513 !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}
</style>
