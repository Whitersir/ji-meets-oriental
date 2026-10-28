<script setup lang="ts">
import { useTabBar } from '../../composables/useTabBar'
useTabBar(1)
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import WeekGrid from '../../components/WeekGrid.vue'
import SchoolCalendarPreset from '../../components/SchoolCalendarPreset.vue'
import type { AcademicTerm } from '../../domain/academic-calendar'
import { DAY_NAMES, currentWeek, dateAt, formatWeeks, type Course, type Timetable } from '../../domain/schedule'
import { loadTimetable, saveTimetable, STORAGE_KEY } from '../../services/storage'
const timetable=shallowRef<Timetable|null>(null)
const week=shallowRef(1)
const selectedDay=shallowRef((new Date().getDay()+6)%7)
const mode=shallowRef<'grid'|'list'>('grid')
const error=shallowRef('')
const settings=shallowRef(false)
const startDraft=shallowRef('')
const totalDraft=shallowRef('20')
const actualWeek=computed(()=>timetable.value?currentWeek(timetable.value.startDate):0)
const withinTerm=computed(()=>!!timetable.value&&actualWeek.value>=1&&actualWeek.value<=timetable.value.totalWeeks)
const weekOptions=computed(()=>Array.from({length:timetable.value?.totalWeeks??20},(_,i)=>`第 ${i+1} 周`))
const dateLabel=computed(()=>{if(!timetable.value)return '';const start=dateAt(timetable.value.startDate,(week.value-1)*7);const end=dateAt(timetable.value.startDate,week.value*7-1);return `${start.getMonth()+1}月${start.getDate()}日 — ${end.getMonth()+1}月${end.getDate()}日`})
const weekCourses=computed(()=>timetable.value?.courses.filter(c=>c.weeks.includes(week.value))??[])
const dayCourses=computed(()=>weekCourses.value.filter(c=>c.day===selectedDay.value+1).sort((a,b)=>a.sections[0]-b.sections[0]))
const importedLabel=computed(()=>timetable.value?new Date(timetable.value.importedAt).toLocaleString('zh-CN',{hour12:false}):'')
onShow(()=>{
  try{const next=loadTimetable();if(next?.importedAt!==timetable.value?.importedAt){timetable.value=next;week.value=next?Math.max(1,Math.min(next.totalWeeks,currentWeek(next.startDate))):1}error.value=''}catch{error.value='本地课表读取失败。原有数据已保留，可重新导入恢复。'}
})
function goImport(){uni.navigateTo({url:'/pages-import/index'})}
function details(c:Course){uni.showModal({title:c.name,content:`${DAY_NAMES[c.day-1]} · 第 ${c.sections.join('、')} 节\n${formatWeeks(c.weeks)}\n教师：${c.teacher||'文件未提供'}\n教室：${c.room||'文件未提供'}`,showCancel:false,confirmText:'知道了'})}
function openSettings(){if(!timetable.value)return;startDraft.value=timetable.value.startDate;totalDraft.value=String(timetable.value.totalWeeks);settings.value=!settings.value}
function applyCalendar(preset: AcademicTerm){startDraft.value=preset.startDate;totalDraft.value=String(Math.max(preset.totalWeeks,...(timetable.value?.courses.flatMap(c=>c.weeks)??[])))}
function saveSettings(){
  if(!timetable.value)return
  try{const next={...timetable.value,startDate:startDraft.value,totalWeeks:Number(totalDraft.value)};saveTimetable(next);timetable.value=next;week.value=Math.min(week.value,next.totalWeeks);settings.value=false;error.value='';uni.showToast({title:'学期设置已保存',icon:'success'})}catch(e){error.value=e instanceof Error?e.message:'保存失败，请重试'}
}
function clear(){uni.showModal({title:'清除本地课表？',content:'只清除这台设备中的课表，原始 Excel 不受影响。',confirmText:'清除',confirmColor:'#9a352d',success:res=>{if(res.confirm){try{uni.removeStorageSync(STORAGE_KEY);timetable.value=null;settings.value=false}catch{error.value='清除失败，请重试'}}}})}
</script>
<template>
  <view class="page tab-page">
    <view class="row"><text class="eyebrow">冀遇东方 / CAMPUS</text><text class="badge">本地课表</text></view>
    <view class="heading"><view><text class="title">这一周，去哪上课</text><text class="subtitle">{{ timetable?.term || '把一学期的安排，放进口袋。' }}</text></view><button v-if="timetable" class="secondary import-small" hover-class="pressed" @click="goImport">重新导入</button></view>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <view v-if="!timetable" class="empty-state">
      <view class="paper-illustration" aria-hidden="true"><view class="mini-line"/><view class="mini-grid"><view v-for="i in 15" :key="i" :class="{filled:[2,4,7,8,13].includes(i)}"/></view></view>
      <text class="empty-title">从一份课表开始</text>
      <text class="empty-copy">导入教务系统导出的 Excel，整学期的课就都在这里。翻周、查教室，离线也能看。</text>
      <button class="primary full" hover-class="pressed" @click="goImport">导入我的课表</button>
      <text class="hint centered">无需保持教务登录 · 文件不上传</text>
    </view>
    <template v-else>
      <view class="week-bar">
        <button class="arrow" :disabled="week<=1" aria-label="上一周" hover-class="pressed" @click="week--">‹</button>
        <picker class="week-picker" :range="weekOptions" :value="week-1" @change="week=Number($event.detail.value)+1"><view><text class="week-number">第 {{ week }} 周⌄</text><text class="hint">{{ dateLabel }}</text></view></picker>
        <button class="arrow" :disabled="week>=timetable.totalWeeks" aria-label="下一周" hover-class="pressed" @click="week++">›</button>
      </view>
      <view class="row view-controls"><view class="view-segments" :class="{ 'is-list': mode === 'list' }"><view class="segment-thumb" aria-hidden="true"/><button class="view-tab" :class="{active:mode==='grid'}" :aria-pressed="mode==='grid'" hover-class="pressed" @click="mode='grid'">周课表</button><button class="view-tab" :class="{active:mode==='list'}" :aria-pressed="mode==='list'" hover-class="pressed" @click="mode='list'">按天看</button></view><button v-if="withinTerm" class="quiet" :disabled="week===actualWeek" hover-class="pressed" @click="week=actualWeek">回到本周</button><text v-else class="hint">{{ actualWeek<1?'学期尚未开始':'当前已在学期外' }}</text></view>
      <WeekGrid v-if="mode==='grid'" :courses="timetable.courses" :week="week" :start-date="timetable.startDate" @select="details" />
      <view v-else>
        <view class="day-tabs"><button v-for="(day,i) in DAY_NAMES" :key="day" class="day-tab" :class="{active:selectedDay===i}" :aria-pressed="selectedDay===i" hover-class="pressed" @click="selectedDay=i">{{ day }}</button></view>
        <view v-if="!dayCourses.length" class="panel centered muted">{{ DAY_NAMES[selectedDay] }}没有已导入的课程</view>
        <button v-for="course in dayCourses" :key="course.id" class="list-course" hover-class="pressed" @click="details(course)"><text class="list-time">{{ course.sections.join('、') }} 节</text><view><text class="list-name">{{ course.name }}</text><text class="hint">{{ course.room||'教室未提供' }} · {{ course.teacher||'教师未提供' }}</text></view><text class="detail-arrow">›</text></button>
      </view>
      <view class="row spaced row-wrap"><text class="hint">本周 {{ weekCourses.length }} 条排课 · 点击课程查看详情</text><button class="quiet" hover-class="pressed" @click="openSettings">学期设置</button></view>
      <view v-if="settings" class="panel spaced"><text class="section-title">学期设置</text><view class="field"><text class="label">第一教学周的周一</text><picker mode="date" :value="startDraft" @change="startDraft=$event.detail.value"><view class="picker">{{ startDraft }}</view></picker><text class="hint">需要选择周一；修改后会重新计算当前周。</text></view><SchoolCalendarPreset :term="timetable.term" @apply="applyCalendar"/><label class="field"><text class="label">学期总周数（1–30）</text><input v-model="totalDraft" class="input" type="number" maxlength="2" /></label><button class="primary full" hover-class="pressed" @click="saveSettings">保存学期设置</button><button class="quiet full spaced" hover-class="pressed" @click="clear">清除本地课表</button></view>
      <view class="sync-note"><text>上次导入 {{ importedLabel }}</text><text>调课后请重新导出并导入；以学校教务安排为准。</text></view>
    </template>
    <text class="footer">河北东方学院非官方校园助手</text>
  </view>
</template>
<style scoped>
.view-segments{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:6rpx;background:var(--soft);border:1px solid var(--line);border-radius:18rpx;isolation:isolate}.segment-thumb{position:absolute;z-index:-1;left:6rpx;top:6rpx;bottom:6rpx;width:calc(50% - 6rpx);background:var(--surface);border-radius:12rpx;box-shadow:0 3rpx 10rpx rgba(69,38,35,.08);transition:transform var(--motion-base) var(--ease-spring)}.is-list .segment-thumb{transform:translateX(100%)}.view-segments .view-tab{font-size:25rpx;min-height:80rpx;padding:12rpx 22rpx}.view-segments .view-tab.active{background:transparent;color:var(--primary);font-weight:650}.week-picker{border-radius:16rpx}.week-bar .arrow{border-radius:50%;background:var(--surface);border:1px solid var(--line);box-shadow:0 3rpx 8rpx rgba(69,38,35,.03)}.list-course{animation:page-arrive 220ms var(--ease-out) both}.day-tab{transition:background var(--motion-base),color var(--motion-fast)}
.heading{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin-top:24rpx}.title{font-size:48rpx}.import-small{white-space:nowrap;font-size:26rpx;padding:16rpx}.empty-state{max-width:520px;margin:64rpx auto 0;padding:52rpx 32rpx;background:white;border:1px solid var(--line);border-radius:20rpx}.empty-title{font-size:40rpx;font-weight:650;display:block;margin-top:36rpx}.empty-copy{display:block;color:var(--muted);margin:20rpx 0 40rpx;line-height:1.9}.paper-illustration{width:220rpx;border:2px solid #b4c5b5;border-radius:8rpx;padding:20rpx;transform:rotate(-4deg);background:var(--paper)}.mini-line{height:8rpx;background:#456a55;width:70rpx;margin-bottom:20rpx}.mini-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6rpx}.mini-grid view{height:24rpx;background:#e4e9e0}.mini-grid .filled{background:#8eab90}.centered{text-align:center}.week-bar{display:flex;align-items:center;justify-content:space-between;background:white;border:1px solid var(--line);border-radius:14rpx;padding:12rpx}.week-picker{flex:1;text-align:center}.week-number{font-size:38rpx;font-weight:650}.arrow{background:transparent;font-size:48rpx;width:96rpx;height:96rpx;padding:0}.view-controls{margin:20rpx 0}.view-tab{background:transparent;color:var(--muted);font-size:26rpx;padding:16rpx 20rpx}.view-tab.active{background:var(--primary);color:white}.day-tabs{display:grid;grid-template-columns:repeat(7,1fr);gap:4rpx;margin-bottom:20rpx}.day-tab{font-size:24rpx;padding:12rpx 2rpx;background:transparent}.day-tab.active{background:var(--primary);color:white}.list-course{display:flex;justify-content:flex-start;gap:24rpx;background:white;border:1px solid var(--line);padding:28rpx;width:100%;margin-bottom:16rpx;text-align:left}.list-name{display:block;font-weight:600;overflow-wrap:anywhere}.list-time{font-size:26rpx;color:var(--primary);min-width:70rpx}.detail-arrow{margin-left:auto;font-size:40rpx}.sync-note{text-align:center;color:var(--muted);font-size:24rpx;margin-top:30rpx}.sync-note text{display:block}.footer{display:block;text-align:center;font-size:22rpx;color:var(--muted);margin-top:48rpx}
@media(max-width:380px){.title{font-size:42rpx}.heading{align-items:flex-start}.import-small{padding:12rpx;font-size:24rpx}.page{padding-left:16rpx;padding-right:16rpx}}
</style>
