import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'lobby',
    component: () => import('@/views/LobbyView.vue')
  },
  {
    path: '/room/:roomId',
    name: 'room',
    component: () => import('@/views/RoomView.vue')
  },
  {
    path: '/game/:roomId',
    name: 'game',
    component: () => import('@/views/GameView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
