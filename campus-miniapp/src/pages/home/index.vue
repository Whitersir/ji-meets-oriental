<script setup lang="ts">
import { computed } from 'vue'
import { useTabBar } from '../../composables/useTabBar'
useTabBar(0)
import TodayAgenda from '../../components/TodayAgenda.vue'
import CampusServices from '../../components/CampusServices.vue'
import { useLocalTimetable } from '../../composables/useLocalTimetable'
import { todayAgenda } from '../../domain/home'
import { currentWeek, DAY_NAMES, formatWeeks, type Course } from '../../domain/schedule'
const { timetable, now, error } = useLocalTimetable()
const weekdays = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const dayLabel = computed(() => DAY_NAMES[(now.value.getDay() + 6) % 7])
const week = computed(() => timetable.value ? currentWeek(timetable.value.startDate, now.value) : 0)
const weekLabel = computed(() => !timetable.value ? '未导入课表' : week.value < 1 ? '学期尚未开始' : week.value > timetable.value.totalWeeks ? '本学期已结束' : `第 ${week.value} 周`)
const courses = computed(() => todayAgenda(timetable.value, now.value))
const emptyTitle = computed(() => !timetable.value ? '从一份课表开始' : week.value < 1 ? '新学期，准备就绪' : week.value > timetable.value.totalWeeks ? '这一学期，告一段落' : '今天没有已导入的课程')
const emptyHint = computed(() => !timetable.value ? '导入教务导出的 Excel，今日安排就会出现在这里。' : week.value < 1 ? '课表已保存，开学后会按教学周显示。' : week.value > timetable.value.totalWeeks ? '你可以查看原课表，或导入新学期的课表。' : '留一点时间给自己，调课安排请以教务通知为准。')
function openSchedule() { uni.switchTab({ url: '/pages/schedule/index' }) }
function openCampus() { uni.switchTab({ url: '/pages/campus/index' }) }
function importSchedule() { uni.navigateTo({ url: '/pages-import/index' }) }
function details(course: Course) { uni.showModal({ title: course.name, content: `${dayLabel.value} · 第 ${course.sections.join('、')} 节\n${formatWeeks(course.weeks)}\n教师：${course.teacher || '文件未提供'}\n教室：${course.room || '文件未提供'}`, showCancel: false, confirmText: '知道了' }) }
</script>

<template>
  <view class="page home-page tab-page">
    <view class="masthead"><text class="brand">冀遇东方</text><text class="school-name">河北东方学院 <text class="unofficial">· 非官方校园助手</text></text></view>
    <view class="date-banner"><view class="date-main"><text class="date-number">{{ now.getDate() }}</text><view class="date-copy"><text class="month">{{ months[now.getMonth()] }}</text><text class="weekday-en">{{ weekdays[now.getDay()] }}</text><text class="date-detail">{{ dayLabel }} · {{ weekLabel }}</text></view></view><view class="motto"><text>以学为本</text><text>向实而行</text><view class="motto-rule"/></view></view>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <TodayAgenda :courses="courses" :empty-title="emptyTitle" :empty-hint="emptyHint" @all="openSchedule" @select="details"/>
    <view class="services-panel"><view class="section-heading"><text class="editorial-title service-heading">常用服务</text><text class="week-ribbon">{{ weekLabel }}</text></view><CampusServices show-more/></view>
    <button class="import-entry" hover-class="pressed" @click="importSchedule"><image class="import-icon" src="/static/icons/upload.png" aria-hidden="true"/><view class="import-copy"><text class="import-title">{{ timetable ? '导入 / 更新课表' : '导入我的课表' }}</text><text class="import-subtitle">{{ timetable ? '调课后可重新导入' : '从学校教务导出 Excel 后导入' }}</text></view><text class="chevron">›</text></button>
    <button class="campus-note" hover-class="pressed" @click="openCampus">常用服务逐步开放中 <text>查看校园服务 ›</text></button>
  </view>
</template>

<style scoped>
.home-page .services-panel{box-shadow:var(--shadow-card);border-radius:28rpx}.home-page .date-banner{border-top:1px solid var(--line);padding-top:24rpx;margin-top:28rpx}.home-page .import-entry{background:var(--surface);box-shadow:0 4rpx 18rpx rgba(86,46,42,.025);border-radius:20rpx}.home-page .week-ribbon{border-radius:8rpx 8rpx 8rpx 18rpx}.home-page .masthead{position:relative;padding-left:20rpx;border-left:3px solid var(--primary)}
.home-page{max-width:540px;padding:20rpx 32rpx calc(28rpx + env(safe-area-inset-bottom))}.masthead{padding:0 4rpx}.brand{font-family:"Noto Serif SC","Songti SC",SimSun,serif;font-size:42rpx;line-height:1.4;font-weight:700;letter-spacing:2rpx;display:block}.school-name{font-size:23rpx;color:var(--muted);display:block;margin-top:4rpx}.unofficial{font-size:21rpx;color:#786c69}.date-banner{display:flex;align-items:center;justify-content:space-between;gap:16rpx;margin:36rpx 0 32rpx;padding:0 4rpx}.date-main{display:flex;align-items:center;gap:24rpx;min-width:0}.date-number{font-size:174rpx;line-height:1;font-family:Georgia,"Times New Roman",serif;color:var(--primary);font-weight:400;letter-spacing:-10rpx}.date-copy{padding-top:8rpx;min-width:0}.month{display:block;color:var(--primary);font-size:30rpx;font-family:"Noto Serif SC","Songti SC",SimSun,serif}.weekday-en{display:block;color:var(--primary);font-family:Georgia,serif;letter-spacing:2rpx;font-size:23rpx;margin:2rpx 0 8rpx}.date-detail{display:block;font-size:24rpx}.motto{flex-shrink:0;align-self:center;text-align:right;color:var(--primary);font-family:"Noto Serif SC","Songti SC",SimSun,serif;font-size:28rpx;letter-spacing:4rpx;line-height:1.8}.motto text{display:block}.motto-rule{height:2px;width:34rpx;background:var(--primary);margin:12rpx 0 0 auto}.services-panel{background:var(--surface);border:1px solid var(--line);border-radius:24rpx;margin-top:24rpx;padding:8rpx 28rpx 16rpx}.service-heading{color:var(--primary)}.week-ribbon{font-size:23rpx;color:white;background:var(--primary);padding:8rpx 22rpx 8rpx 28rpx;border-radius:2rpx 2rpx 2rpx 18rpx;max-width:240rpx}.import-entry{width:100%;margin-top:24rpx;display:flex;justify-content:flex-start;gap:24rpx;background:transparent;border:1px solid #d7acae;border-radius:14rpx;padding:22rpx 28rpx;color:var(--primary);text-align:left}.import-icon{width:52rpx;height:52rpx;flex-shrink:0}.import-copy{flex:1}.import-title{display:block;font-size:29rpx;font-weight:600}.import-subtitle{display:block;font-size:23rpx;color:var(--muted);margin-top:2rpx}.campus-note{font-size:22rpx;color:var(--muted);background:transparent;justify-content:space-between;padding:20rpx 4rpx;gap:8rpx}.campus-note text{color:var(--primary)}
</style>
