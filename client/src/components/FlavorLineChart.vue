<template>
  <div class="flavor-line-chart">
    <v-chart :option="option" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { FlavorProfile } from '@/types';
import { FLAVOR_NAMES, FLAVOR_LABELS } from '@/types';

use([LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const props = defineProps<{
  history: FlavorProfile[];
  title?: string;
}>();

const flavorColors: Record<string, string> = {
  acidity: '#e74c3c',
  sweetness: '#f1c40f',
  bitterness: '#2c3e50',
  fruitiness: '#e67e22',
  floral: '#9b59b6',
  woody: '#8b4513',
  body: '#2980b9',
  finish: '#27ae60'
};

const option = computed(() => {
  const xAxisData = props.history.map((_, i) => i === 0 ? '初始' : `步骤${i}`);

  const series = FLAVOR_NAMES.map(key => ({
    name: FLAVOR_LABELS[key],
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 5,
    lineStyle: {
      width: 2,
      color: flavorColors[key]
    },
    itemStyle: {
      color: flavorColors[key]
    },
    data: props.history.map(h => h[key])
  }));

  return {
    title: {
      text: props.title || '风味演变曲线',
      left: 'center',
      top: 10,
      textStyle: {
        color: '#d4a574',
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(45, 24, 16, 0.95)',
      borderColor: '#5a3a24',
      textStyle: {
        color: '#e8d8c4'
      }
    },
    legend: {
      type: 'scroll',
      bottom: 5,
      textStyle: {
        color: '#c9b896',
        fontSize: 10
      },
      data: FLAVOR_NAMES.map(k => FLAVOR_LABELS[k])
    },
    grid: {
      left: 50,
      right: 20,
      top: 50,
      bottom: 50
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLine: {
        lineStyle: {
          color: '#5a3a24'
        }
      },
      axisLabel: {
        color: '#999',
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: {
        lineStyle: {
          color: '#5a3a24'
        }
      },
      axisLabel: {
        color: '#999'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(90, 58, 36, 0.3)'
        }
      }
    },
    series
  };
});
</script>

<style scoped>
.flavor-line-chart {
  width: 100%;
  height: 320px;
}
</style>
