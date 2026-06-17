<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card" style="width: 550px; max-width: 95vw; max-height: 85vh; overflow-y: auto;">
      <div class="card-header">
        <span>📝 创建委托酿造</span>
        <button class="btn btn-small" @click="$emit('close')" style="background: transparent; border: none; color: #999;">✕</button>
      </div>

      <div class="input-group">
        <label>选择酿造方（协会成员）</label>
        <select v-model="form.brewerId"
          style="width: 100%; padding: 8px 12px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 6px; color: #e8d8c4; font-size: 14px; outline: none;">
          <option value="">-- 请选择 --</option>
          <option v-for="m in otherMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <div class="input-group">
        <label>选择酿造路线</label>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="r in routes" :key="r.key" class="btn"
            :class="form.route === r.key ? 'btn-primary' : 'btn-secondary'" @click="form.route = r.key">
            <div class="text-lg">{{ r.icon }}</div>
            <div class="text-sm">{{ r.name }}</div>
          </button>
        </div>
      </div>

      <div class="input-group">
        <label>批次名称</label>
        <input v-model="form.name" placeholder="给委托的酒起个名字..." maxlength="20"
          style="width: 100%; padding: 8px 12px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 6px; color: #e8d8c4; font-size: 14px; outline: none;" />
      </div>

      <div class="input-group">
        <label>选择原料（从你的库存中）</label>
        <div v-if="routeIngredients.length === 0" class="text-sm p-3 text-center rounded"
             style="background: rgba(0,0,0,0.2); color: #999;">
          库存中没有对应原料
        </div>
        <div v-else class="space-y-1 max-h-40 overflow-y-auto">
          <div v-for="item in routeIngredients" :key="item.ingredient.id"
               class="flex items-center justify-between p-2 rounded" style="background: rgba(26,15,10,0.5);">
            <div class="flex items-center gap-2">
              <input type="checkbox" :id="'comm-ing-' + item.ingredient.id" v-model="selectedIngredients[item.ingredient.id]" />
              <label :for="'comm-ing-' + item.ingredient.id" class="text-sm" style="color: #c9b896;">
                {{ item.ingredient.name }}
                <span class="badge ml-1" :class="'badge-' + item.ingredient.quality">{{ qLabel(item.ingredient.quality) }}</span>
              </label>
            </div>
            <div class="flex items-center gap-2">
              <input type="number" v-model.number="selectedQuantities[item.ingredient.id]" :min="1" :max="item.quantity"
                style="width: 50px; padding: 2px 6px; background: #2d1810; border: 1px solid #5a3a24; border-radius: 4px; color: #e8d8c4; font-size: 12px; text-align: center;" />
              <span class="text-xs" style="color: #999;">/ {{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="input-group" v-if="form.route === 'wine'">
        <label>发酵温度 ({{ form.params.temperature }}°C)</label>
        <input type="range" v-model.number="form.params.temperature" min="8" max="32" step="1" />
      </div>

      <div class="input-group" v-if="form.route === 'wine'">
        <label>压榨压力 ({{ form.params.pressure }})</label>
        <input type="range" v-model.number="form.params.pressure" min="1" max="5" step="1" />
      </div>

      <div class="input-group" v-if="form.route === 'beer'">
        <label>啤酒类型: {{ form.params.lagerType ? '拉格(低温)' : '艾尔(常温)' }}</label>
        <div class="flex gap-2">
          <button class="btn btn-small" :class="!form.params.lagerType ? 'btn-primary' : 'btn-secondary'" @click="form.params.lagerType = false">艾尔</button>
          <button class="btn btn-small" :class="form.params.lagerType ? 'btn-primary' : 'btn-secondary'" @click="form.params.lagerType = true">拉格</button>
        </div>
      </div>

      <div class="input-group" v-if="form.route === 'beer'">
        <label>糖化温度 ({{ form.params.mashTemp }}°C)</label>
        <input type="range" v-model.number="form.params.mashTemp" min="60" max="78" step="1" />
      </div>

      <div class="input-group" v-if="form.route === 'beer'">
        <label>酒花投放 (第{{ form.params.hopAddTime }}分钟)</label>
        <input type="range" v-model.number="form.params.hopAddTime" min="5" max="60" step="5" />
      </div>

      <div class="input-group" v-if="form.route === 'whiskey'">
        <label>蒸馏切割 ({{ (form.params.cutRatio * 100).toFixed(0) }}%)</label>
        <input type="range" v-model.number="form.params.cutRatio" min="0.4" max="0.95" step="0.05" />
      </div>

      <div class="input-group" v-if="form.route === 'whiskey'">
        <label>糖化温度 ({{ form.params.mashTemp }}°C)</label>
        <input type="range" v-model.number="form.params.mashTemp" min="60" max="78" step="1" />
      </div>

      <div class="input-group">
        <label>生产数量 ({{ form.quantity }} 单位)</label>
        <input type="range" v-model.number="form.quantity" min="20" max="200" step="10" />
      </div>

      <div class="flex gap-3 justify-end mt-4">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="!canSubmit" @click="handleSubmit">📝 发起委托</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue';
import type { Guild, Player, Ingredient, QualityGrade, WineRoute } from '@/types';

const props = defineProps<{
  guild: Guild;
  playerId: string;
  players: Player[];
  playerIngredients: { ingredientId: string; quantity: number }[];
  market: Ingredient[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', data: {
    brewerId: string;
    ingredients: { ingredientId: string; quantity: number }[];
    route: WineRoute;
    name: string;
    params: Record<string, number>;
    quantity: number;
  }): void;
}>();

const routes = [
  { key: 'wine' as WineRoute, name: '葡萄酒', icon: '🍷' },
  { key: 'beer' as WineRoute, name: '精酿啤酒', icon: '🍺' },
  { key: 'whiskey' as WineRoute, name: '威士忌', icon: '🥃' }
];

const selectedIngredients = reactive<Record<string, boolean>>({});
const selectedQuantities = reactive<Record<string, number>>({});

const defaultParams = {
  temperature: 16,
  pressure: 2,
  mashTemp: 65,
  hopAddTime: 30,
  cutRatio: 0.7,
  lagerType: false,
  fermentDuration: 7
};

const form = reactive({
  brewerId: '',
  route: 'wine' as WineRoute,
  name: '',
  params: { ...defaultParams },
  quantity: 50
});

watch(() => form.route, () => {
  Object.keys(selectedIngredients).forEach(k => delete selectedIngredients[k]);
  Object.keys(selectedQuantities).forEach(k => delete selectedQuantities[k]);
  Object.assign(form.params, defaultParams);
});

const otherMembers = computed(() => {
  return props.guild.memberIds
    .filter(id => id !== props.playerId)
    .map(id => props.players.find(p => p.id === id))
    .filter((p): p is Player => !!p);
});

const routeIngredients = computed(() => {
  const needed: Ingredient['type'][] =
    form.route === 'wine' ? ['grape', 'yeast'] :
    form.route === 'beer' ? ['malt', 'hop', 'yeast'] :
    ['barley', 'yeast'];
  const result: { ingredient: Ingredient; quantity: number }[] = [];
  props.playerIngredients.forEach(pi => {
    const mi = props.market.find(m => m.id === pi.ingredientId);
    if (mi && needed.includes(mi.type) && pi.quantity > 0) {
      result.push({ ingredient: mi, quantity: pi.quantity });
      if (selectedQuantities[pi.ingredientId] === undefined) {
        selectedQuantities[pi.ingredientId] = pi.quantity;
      }
    }
  });
  return result;
});

const canSubmit = computed(() => {
  if (!form.brewerId) return false;
  if (!form.name.trim()) return false;
  const selectedIds = Object.entries(selectedIngredients)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return selectedIds.length > 0;
});

function qLabel(q: QualityGrade) {
  const map: Record<QualityGrade, string> = { normal: '普通', premium: '优质', top: '顶级' };
  return map[q];
}

function handleSubmit() {
  if (!canSubmit.value) return;

  const ingredients: { ingredientId: string; quantity: number }[] = [];
  Object.entries(selectedIngredients).forEach(([id, selected]) => {
    if (selected) {
      const qty = Math.min(selectedQuantities[id] || 1, props.playerIngredients.find(pi => pi.ingredientId === id)?.quantity || 1);
      ingredients.push({ ingredientId: id, quantity: qty });
    }
  });

  if (ingredients.length === 0) return;

  const paramsNumber: Record<string, number> = {};
  Object.entries(form.params).forEach(([k, v]) => {
    paramsNumber[k] = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v);
  });

  emit('create', {
    brewerId: form.brewerId,
    ingredients,
    route: form.route,
    name: form.name.trim(),
    params: paramsNumber,
    quantity: form.quantity
  });
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

.space-y-1 > * + * {
  margin-top: 4px;
}
</style>
