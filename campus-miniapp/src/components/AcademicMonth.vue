<script setup lang="ts">
import { computed } from 'vue'
import { monthRows, type AcademicTerm } from '../domain/academic-calendar'
const props = defineProps<{ term: AcademicTerm; month: string; selected: string; today: string }>()
defineEmits<{ select: [date: string] }>()
const rows = computed(() => monthRows(props.term, props.month))
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
</script>

<template>
  <view class="month-grid">
    <view class="calendar-row calendar-head"><text class="week-label">周次</text><text v-for="day in weekdays" :key="day" class="day-label">{{ day }}</text></view>
    <view v-for="row in rows" :key="row.monday" class="calendar-row">
      <text class="week-label">{{ row.week ? `${row.week}周` : '—' }}</text>
      <button v-for="day in row.days" :key="day.key" class="date-cell" :class="{ outside: !day.inMonth, selected: day.key === selected, today: day.key === today }" :disabled="!day.inMonth" :aria-label="`${day.key}${day.key === today ? '，今天' : ''}${day.description ? '，' + day.description : ''}`" :aria-pressed="day.key === selected" hover-class="pressed" @click="$emit('select', day.key)">
        <text>{{ day.day }}</text><view v-if="day.events.length" class="event-dot" :class="{ holiday: day.holiday, exam: day.exam }"/>
      </button>
    </view>
  </view>
</template>

<style scoped>
.calendar-row{display:grid;grid-template-columns:34px repeat(7,minmax(0,1fr));align-items:center;gap:2px}.calendar-head{margin-bottom:8px}.week-label,.day-label{text-align:center;font-size:12px;color:var(--muted)}.week-label{font-size:11px}.day-label{padding:6px 0}.page .date-cell{position:relative;min-width:0;min-height:46px;padding:5px 0 12px;border-radius:10px;font-size:16px;background:transparent}.page .date-cell.outside{background:transparent;color:var(--muted);opacity:.3}.date-cell.today{color:var(--primary);font-weight:700;box-shadow:inset 0 0 0 1px var(--primary)}.page .date-cell.selected{background:var(--primary);color:#fff}.event-dot{position:absolute;bottom:6px;width:4px;height:4px;border-radius:50%;background:var(--muted)}.event-dot.holiday{background:var(--primary)}.event-dot.exam{background:#9b6b22}.selected .event-dot{background:white}
</style>
