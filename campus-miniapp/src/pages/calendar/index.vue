<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AcademicMonth from '../../components/AcademicMonth.vue'
import { ACADEMIC_TERMS, calendarTermAt, calendarWeek, eventsOn, eventRange, isoDate, termMonths, type AcademicTerm } from '../../domain/academic-calendar'
const today = shallowRef(isoDate(new Date()))
const term = shallowRef(calendarTermAt(today.value) || ACADEMIC_TERMS[0])
const month = shallowRef(calendarTermAt(today.value)?.id === term.value.id ? today.value.slice(0, 7) : term.value.firstMonth)
const selected = shallowRef(calendarTermAt(today.value)?.id === term.value.id ? today.value : term.value.startDate)
const months = computed(() => termMonths(term.value))
const monthIndex = computed(() => months.value.indexOf(month.value))
const monthLabel = computed(() => `${month.value.slice(0, 4)}年 ${Number(month.value.slice(5))}月`)
const selectedWeek = computed(() => calendarWeek(term.value, selected.value))
const selectedLabel = computed(() => selected.value.replace(/-/g, '.'))
const selectedEvents = computed(() => eventsOn(term.value, selected.value))
const todayTerm = computed(() => calendarTermAt(today.value))
const termStatus = computed(() => {
  const week = calendarWeek(term.value, today.value)
  if (week) return `今天是第 ${week} 周`
  const holiday = eventsOn(term.value, today.value).find(event => event.kind === 'holiday')
  if (holiday) return `当前为${holiday.title}`
  return today.value < term.value.startDate ? '本学期尚未开始' : '本学期教学周已结束'
})
onShow(() => { today.value = isoDate(new Date()) })
function changeTerm(next: AcademicTerm) {
  term.value = next
  selected.value = calendarTermAt(today.value)?.id === next.id ? today.value : next.startDate
  month.value = selected.value.slice(0, 7)
}
function changeMonth(offset: number) {
  const next = months.value[monthIndex.value + offset]
  if (next) { month.value = next; selected.value = `${next}-01` }
}
function returnToday() { if (todayTerm.value) changeTerm(todayTerm.value) }
</script>

<template>
  <view class="page calendar-page">
    <view class="row"><text class="eyebrow">冀遇东方 / CALENDAR</text><text class="badge">暂行</text></view>
    <text class="title editorial-title">把日子，排进学期</text>
    <text class="subtitle">河北东方学院 · 2026—2027 学年度</text>
    <view class="term-tabs"><button v-for="item in ACADEMIC_TERMS" :key="item.id" class="term-tab" :class="{ active: term.id === item.id }" :aria-pressed="term.id === item.id" hover-class="pressed" @click="changeTerm(item)">{{ item.label }}</button></view>
    <view class="term-summary"><text class="term-status">{{ termStatus }}</text><text class="hint">{{ term.startDate }} 起 · 共 19 周 · 第 18–19 周复习考试</text></view>
    <view class="panel calendar-panel">
      <view class="month-nav"><button class="month-arrow" :disabled="monthIndex === 0" aria-label="上个月" hover-class="pressed" @click="changeMonth(-1)">‹</button><text class="month-title">{{ monthLabel }}</text><button class="month-arrow" :disabled="monthIndex === months.length - 1" aria-label="下个月" hover-class="pressed" @click="changeMonth(1)">›</button></view>
      <AcademicMonth :term="term" :month="month" :selected="selected" :today="today" @select="selected = $event"/>
      <view class="legend"><text>红点 · 假期</text><text>金点 · 考试</text><text>灰点 · 校内安排 / 节日</text></view>
      <button v-if="todayTerm" class="quiet full" hover-class="pressed" @click="returnToday">回到今天</button>
    </view>
    <view class="panel selected-detail" aria-live="polite"><text class="section-title">{{ selectedLabel }} <text class="date-week">{{ selectedWeek ? `第 ${selectedWeek} 周` : '教学周外' }}</text></text><text v-if="!selectedEvents.length" class="muted">这一天校历未列出特别安排。</text><view v-for="event in selectedEvents" :key="event.title" class="selected-event"><text class="event-title">{{ event.title }}</text><text v-if="event.note" class="hint">{{ event.note }}</text></view></view>
    <view class="section-heading"><text class="editorial-title">学期重要安排</text><text class="badge">{{ term.label }}</text></view>
    <view class="panel agenda-panel"><view v-for="event in term.events" :key="event.title" class="agenda-item"><text class="event-range">{{ eventRange(event) }}</text><text class="event-title">{{ event.title }}</text><text v-if="event.note" class="hint">{{ event.note }}</text></view></view>
    <view class="source-note"><text class="source-title">关于这份校历</text><text>依据你提供的《河北东方学院2026-2027学年度校历（暂行）》整理。</text><text v-for="note in term.notes" :key="note">{{ note }}</text><text>校历仅作安排参考，具体放假、调休及课程调整以学校最新通知为准。课表按导入文件显示。</text></view>
  </view>
</template>

<style scoped>
.calendar-page{max-width:540px}.calendar-page>.title{font-size:46rpx;margin-top:28rpx}.term-tabs{display:flex;padding:6rpx;background:var(--soft);border-radius:14rpx;gap:8rpx}.page .term-tab{flex:1;background:transparent;color:var(--primary);font-size:28rpx}.page .term-tab.active{background:var(--primary);color:white}.term-summary{padding:28rpx 4rpx}.term-status{font-size:34rpx;font-family:"Songti SC",SimSun,serif;color:var(--primary);font-weight:700}.term-summary .hint{margin-top:4rpx}.calendar-panel{padding:12rpx 16rpx}.month-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12rpx}.page .month-arrow{background:transparent;min-height:44px;min-width:44px;padding:0;font-size:36px;color:var(--primary)}.month-title{font-family:Georgia,"Songti SC",serif;font-size:36rpx;font-weight:600}.legend{display:flex;flex-wrap:wrap;gap:8rpx 18rpx;justify-content:center;font-size:22rpx;color:var(--muted);border-top:1px solid var(--line);padding-top:20rpx;margin:20rpx 4rpx 0}.calendar-panel .quiet{font-size:25rpx}.date-week{font-family:inherit;font-size:24rpx;font-weight:400;color:var(--primary);margin-left:12rpx}.selected-detail .section-title{margin-bottom:12rpx}.selected-event+.selected-event{border-top:1px solid var(--line);padding-top:16rpx;margin-top:16rpx}.event-title{display:block;font-size:29rpx;font-weight:600}.agenda-panel{padding:0 28rpx}.agenda-item{padding:26rpx 0;border-bottom:1px solid var(--line)}.agenda-item:last-child{border-bottom:0}.event-range{display:block;font-size:24rpx;color:var(--primary);font-family:Georgia,"Songti SC",serif;margin-bottom:8rpx}.agenda-item .hint{margin-top:6rpx}.source-note{padding:8rpx 4rpx;font-size:24rpx;color:var(--muted);line-height:1.8}.source-note text{display:block;margin-bottom:16rpx}.source-title{color:var(--ink);font-weight:600}.event-title,.source-note{overflow-wrap:anywhere}
</style>
