<template>
  <div class="app-container">
    <router-view />
    <div v-if="gameStore.errorMsg" class="error-toast">
      {{ gameStore.errorMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/game';
const gameStore = useGameStore();
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #1a0f0a 100%);
}

.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #c0392b;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
