<template>
  <div class="radar-chart">
    <v-chart :option="option" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { FlavorProfile } from '@/types';
import { FLAVOR_NAMES, FLAVOR_LABELS } from '@/types';

use([RadarChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps<{
  flavor: FlavorProfile;
  secondFlavor?: FlavorProfile | null;
  title?: string;
  firstLabel?: string;
  secondLabel?: string;
}>();

const flavorLabels = FLAVOR_NAMES.map(k => FLAVOR_LABELS[k]);

const option = computed(() => {
  const seriesData: any[] = [{
    name: props.firstLabel || '当前风味',
    value: FLAVOR_NAMES.map(k => props.flavor?.[k] || 0),
    areaStyle: {
      color: 'rgba(212, 165, 116, 0.3)'
    },
    lineStyle: {
      color: '#d4a574',
      width: 2
    },
    itemStyle: {
      color: '#d4a574'
    }
  }];

  if (props.secondFlavor) {
    seriesData.push({
      name: props.secondLabel || '对比',
      value: FLAVOR_NAMES.map(k => props.secondFlavor?.[k] || 0),
      areaStyle: {
        color: 'rgba(139, 69, 19, 0.2)'
      },
      lineStyle: {
        color: '#8b4513',
        width: 2,
        type: 'dashed'
      },
      itemStyle: {
        color: '#8b4513'
      }
    });
  }

  return {
    title: {
      text: props.title || '八维风味雷达图',
      left: 'center',
      top: 10,
      textStyle: {
        color: '#d4a574',
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(45, 24, 16, 0.95)',
      borderColor: '#5a3a24',
      textStyle: {
        color: '#e8d8c4'
      }
    },
    legend: {
      bottom: 5,
      textStyle: {
        color: '#c9b896'
      },
      data: props.secondFlavor
        ? [props.firstLabel || '当前风味', props.secondLabel || '对比']
        : [props.firstLabel || '当前风味']
    },
    radar: {
      indicator: flavorLabels.map(l => ({
        name: l,
        max: 100
      })),
      center: ['50%', '52%'],
      radius: '65%',
      axisName: {
        color: '#c9b896',
        fontSize: 11
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(139, 69, 19, 0.05)', 'rgba(139, 69, 19, 0.1)']
        }
      },
      axisLine: {
        lineStyle: {
          color: '#5a3a24'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#5a3a24'
        }
      }
    },
    series: [{
      type: 'radar',
      data: seriesData
    }]
  };
});
</script>

<style scoped>
.radar-chart {
  width: 100%;
  height: 320px;
}
</style>
