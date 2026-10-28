<script setup lang="ts">
import { computed } from 'vue'
import { termForName, type AcademicTerm } from '../domain/academic-calendar'
const props = defineProps<{ term: string }>()
defineEmits<{ apply: [term: AcademicTerm] }>()
const preset = computed(() => termForName(props.term))
function openCalendar() { uni.navigateTo({ url: '/pages/calendar/index' }) }
</script>
<template>
  <view class="school-preset">
    <button v-if="preset" class="quiet full" hover-class="pressed" @click="$emit('apply', preset)">采用学校校历：{{ preset.startDate }} 起 · {{ preset.totalWeeks }} 周</button>
    <button class="quiet full" hover-class="pressed" @click="openCalendar">查看学校校历（暂行） ›</button>
    <text v-if="preset" class="hint">点击采用后仍需保存。学校周次统一起算，新生开课日期请另行核对。</text>
  </view>
</template>
<style scoped>.school-preset{margin:20rpx 0;border:1px solid var(--line);border-radius:12rpx;padding:12rpx}.school-preset .quiet{font-size:24rpx;text-align:center}.school-preset .hint{padding:0 12rpx 12rpx}</style>
