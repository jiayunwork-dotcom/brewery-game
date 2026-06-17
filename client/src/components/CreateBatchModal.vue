<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content card" style="width: 600px; max-width: 95vw; max-height: 90vh; overflow-y: auto;">
      <div class="card-header">
        <span>🍺 创建新酿造批次</span>
        <button class="btn btn-small" @click="$emit('close')" style="background: transparent; border: none; color: #999;">✕</button>
      </div>

      <div class="input-group">
        <label>选择酿造路线</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="r in routes"
            :key="r.key"
            class="btn"
            :class="form.route === r.key ? 'btn-primary' : 'btn-secondary'"
            @click="selectRoute(r.key)"
          >
            <div class="text-lg">{{ r.icon }}</div>
            <div class="text-sm">{{ r.name }}</div>
          </button>
        </div>
      </div>

      <div class="input-group">
        <label>批次名称</label>
        <input v-model="form.name" placeholder="给你的酒起个名字..." maxlength="20" />
      </div>

      <div class="input-group">
        <label>选择原料（从你的库存中选择）</label>
        <div v-if="!routeIngredients.length" class="text-sm p-3 text-center rounded"
             style="background: rgba(0,0,0,0.2); color: #999;">
          你的库存中没有{{ form.route === 'wine' ? '葡萄和酵母' : form.route === 'beer' ? '麦芽、酒花和酵母' : '大麦和酵母' }}原料
          <br />先去原料市场购买吧！
        </div>
        <div v-else class="space-y-1 max-h-40 overflow-y-auto">
          <div
            v-for="item in routeIngredients"
            :key="item.ingredient.id"
            class="flex items-center justify-between p-2 rounded"
            style="background: rgba(26,15,10,0.5);"
          >
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                :id="'ing-' + item.ingredient.id"
                v-model="selectedIngredients[item.ingredient.id]"
              />
              <label :for="'ing-' + item.ingredient.id" class="text-sm" style="color: #c9b896;">
                {{ item.ingredient.name }}
                <span class="badge ml-1" :class="'badge-' + item.ingredient.quality">
                  {{ qLabel(item.ingredient.quality) }}
                </span>
              </label>
            </div>
            <div class="text-xs" style="color: #999;">库存: {{ item.quantity }}</div>
          </div>
        </div>
      </div>

      <div class="input-group" v-if="form.route === 'wine'">
        <label>工艺参数：发酵温度 ({{ form.params.temperature }}°C)</label>
        <input type="range" v-model.number="form.params.temperature" min="8" max="32" step="1" />
        <div class="text-xs" style="color: #888;">
          提示: 15-18°C果香最优，低于12°C或高于25°C会产生风味缺陷
        </div>
      </div>

      <div class="input-group" v-if="form.route === 'wine'">
        <label>压榨压力等级 ({{ form.params.pressure }})</label>
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
        <label>酒花投放时机 (煮沸第{{ form.params.hopAddTime }}分钟)</label>
        <input type="range" v-model.number="form.params.hopAddTime" min="5" max="60" step="5" />
        <div class="text-xs" style="color: #888;">早期投放苦度高，后期投放香气好</div>
      </div>

      <div class="input-group" v-if="form.route === 'whiskey'">
        <label>蒸馏切割比例 ({{ (form.params.cutRatio * 100).toFixed(0) }}%酒心)</label>
        <input type="range" v-model.number="form.params.cutRatio" min="0.4" max="0.95" step="0.05" />
        <div class="text-xs" style="color: #888;">60-80%风味最优，比例过高或过低会带杂味</div>
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
        <button
          class="btn btn-primary"
          :disabled="!canCreate"
          @click="handleCreate"
        >🍻 开始酿造</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue';
import type { Ingredient, QualityGrade, WineRoute } from '@/types';

const props = defineProps<{
  ingredients: { ingredient: Ingredient; quantity: number }[];
  market: Ingredient[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', data: {
    route: WineRoute;
    name: string;
    ingredientIds: string[];
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
  route: 'wine' as WineRoute,
  name: '',
  params: { ...defaultParams },
  quantity: 50
});

watch(() => form.route, () => {
  form.name = '';
  Object.keys(selectedIngredients).forEach(k => delete selectedIngredients[k]);
  Object.assign(form.params, defaultParams);
});

const routeIngredients = computed(() => {
  const needed: Ingredient['type'][] =
    form.route === 'wine' ? ['grape', 'yeast'] :
    form.route === 'beer' ? ['malt', 'hop', 'yeast'] :
    ['barley', 'yeast'];
  return props.ingredients.filter(i => needed.includes(i.ingredient.type));
});

const selectedIds = computed(() =>
  Object.entries(selectedIngredients)
    .filter(([, v]) => v)
    .map(([k]) => k)
);

const canCreate = computed(() => {
  return form.name.trim().length > 0 && selectedIds.value.length > 0;
});

function qLabel(q: QualityGrade) {
  const map: Record<QualityGrade, string> = { normal: '普通', premium: '优质', top: '顶级' };
  return map[q];
}

function selectRoute(key: WineRoute) {
  form.route = key;
}

function handleCreate() {
  const paramsNumber: Record<string, number> = {};
  Object.entries(form.params).forEach(([k, v]) => {
    paramsNumber[k] = typeof v === 'boolean' ? (v ? 1 : 0) : Number(v);
  });
  emit('create', {
    route: form.route,
    name: form.name.trim(),
    ingredientIds: selectedIds.value,
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
</style>
