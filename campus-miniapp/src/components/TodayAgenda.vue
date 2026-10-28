<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { courseClock } from '../domain/home'
import type { Course } from '../domain/schedule'
const props = defineProps<{ courses: Course[]; emptyTitle: string; emptyHint: string }>()
const emit = defineEmits<{ select: [course: Course]; all: [] }>()
const expanded = shallowRef(false)
const active = shallowRef(0)
const items = computed(() => props.courses.map(course => ({ course, clock: courseClock(course) })))
const progress = computed(() => items.value.length ? (active.value + 1) / items.value.length * 100 : 0)
watch(() => props.courses.map(course => course.id).join('|'), () => {
  active.value = 0
  expanded.value = false
})
function changeCard(event: { detail: { current: number } }) { active.value = event.detail.current }
</script>

<template>
  <view class="agenda">
    <view class="section-heading">
      <view class="agenda-title"><view class="section-dot" aria-hidden="true"/><text class="editorial-title">今日课表</text></view>
      <button class="text-link" hover-class="pressed" @click="emit('all')">查看全部 <text class="chevron">›</text></button>
    </view>
    <view v-if="!courses.length" class="agenda-empty">
      <view class="empty-lines" aria-hidden="true"><view/><view/><view/></view>
      <text class="empty-title">{{ emptyTitle }}</text><text class="empty-hint">{{ emptyHint }}</text>
    </view>
    <template v-else>
      <view v-if="!expanded" class="deck-area">
        <view class="agenda-deck" :class="{ 'has-stack': items.length > 1 }">
          <view v-if="items.length > 1" class="stack-plate plate-back" aria-hidden="true"/>
          <view v-if="items.length > 1" class="stack-plate plate-middle" aria-hidden="true"/>
          <swiper class="course-swiper" :current="active" :duration="260" :autoplay="false" :circular="false" @change="changeCard">
            <swiper-item v-for="(item, index) in items" :key="item.course.id">
              <button class="course-card" hover-class="pressed" :aria-label="item.course.name + '，' + (item.course.room || '教室未提供') + '，查看课程详情'" @click="emit('select', item.course)">
                <view class="card-top"><text class="card-time">{{ item.clock.start }}<text class="time-dash"> — </text>{{ item.clock.end }}</text><text class="card-order">{{ index + 1 }} / {{ items.length }}</text></view>
                <text class="course-name">{{ item.course.name }}</text>
                <view class="card-bottom"><view class="room-line"><image class="location-icon" src="/static/icons/pin.png" aria-hidden="true"/><text class="course-room">{{ item.course.room || '教室未提供' }}</text></view><text class="card-detail">详情 <text>↗</text></text></view>
              </button>
            </swiper-item>
          </swiper>
        </view>
        <view v-if="items.length > 1" class="deck-navigation">
          <text class="deck-hint">左右滑动查看今日安排</text>
          <view class="browse-track" role="progressbar" aria-label="今日课程浏览位置" :aria-valuenow="active + 1" :aria-valuemax="items.length" aria-valuemin="1"><view class="browse-fill" :style="{ width: progress + '%' }"/></view>
        </view>
      </view>
      <view v-else id="today-course-list" class="timeline">
        <button v-for="(item, index) in items" :key="item.course.id" class="agenda-course" :style="{ animationDelay: Math.min(index * 35, 175) + 'ms' }" hover-class="pressed" :aria-label="item.course.name + '，查看课程详情'" @click="emit('select', item.course)">
          <view class="time-column" :class="{ 'unknown-time': !item.clock.known }"><text class="start">{{ item.clock.start }}</text><text class="end">{{ item.clock.end }}</text></view>
          <view class="course-info"><text class="course-name">{{ item.course.name }}</text><view class="room-line"><image class="location-icon" src="/static/icons/pin.png" aria-hidden="true"/><text class="course-room">{{ item.course.room || '教室未提供' }}</text></view></view><text class="chevron">›</text>
        </button>
      </view>
      <button class="agenda-toggle" hover-class="pressed" :aria-expanded="expanded" @click="expanded = !expanded"><text>{{ expanded ? '收起今日安排' : '展开今日安排 · ' + courses.length + ' 条排课' }}</text><text class="toggle-symbol" :class="{ expanded }" aria-hidden="true">＋</text></button>
    </template>
  </view>
</template>

<style scoped>
.agenda{background:var(--surface);border:1px solid var(--line);border-radius:28rpx;padding:10rpx 28rpx 0;box-shadow:var(--shadow-card)}
.agenda-title{display:flex;align-items:center;gap:13rpx}.section-dot{width:10rpx;height:10rpx;background:var(--primary);border-radius:50%;flex-shrink:0}.agenda .editorial-title{font-size:34rpx}
.deck-area{padding:8rpx 0 0}.agenda-deck{position:relative;padding-bottom:6rpx}.has-stack{padding-bottom:24rpx}.stack-plate{position:absolute;inset:18rpx 14rpx 4rpx;background:var(--soft);border:1px solid var(--line);border-radius:20rpx}.plate-back{inset:30rpx 28rpx 0;transform:rotate(1deg)}.plate-middle{transform:rotate(-1deg)}
.course-swiper{height:272rpx;position:relative;z-index:1}.course-card{display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;width:100%;height:100%;box-sizing:border-box;text-align:left;padding:26rpx 28rpx;background:var(--surface);border:1px solid #e0c7c5;border-radius:20rpx;overflow:hidden}.card-top,.card-bottom{display:flex;align-items:center;justify-content:space-between;gap:14rpx}.card-time{color:var(--primary);font-size:28rpx;font-variant-numeric:tabular-nums;font-weight:600}.time-dash{color:#b69d99;font-weight:400}.card-order{font-size:23rpx;color:var(--muted);font-family:Georgia,serif;white-space:nowrap}.course-name{display:block;font-weight:650;font-size:34rpx;line-height:1.45;overflow-wrap:anywhere}.course-card>.course-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.card-detail{font-size:23rpx;color:var(--primary);flex-shrink:0}.card-detail text{font-size:30rpx;margin-left:4rpx}.room-line{display:flex;align-items:flex-start;gap:8rpx;min-width:0}.location-icon{width:28rpx;height:28rpx;flex-shrink:0;margin-top:3rpx}.course-room{color:var(--muted);font-size:25rpx;line-height:1.5;overflow-wrap:anywhere}.card-bottom .course-room{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.deck-navigation{display:flex;align-items:center;gap:20rpx;justify-content:space-between;padding:18rpx 4rpx 8rpx}.deck-hint{color:var(--muted);font-size:22rpx}.browse-track{height:4rpx;width:94rpx;overflow:hidden;background:var(--line);border-radius:8rpx}.browse-fill{height:100%;background:var(--primary);border-radius:8rpx;transition:width var(--motion-base) var(--ease-out)}
.agenda-toggle{display:flex;justify-content:space-between;width:100%;min-height:88rpx;margin-top:10rpx;padding:12rpx 2rpx;font-size:24rpx;color:var(--primary);background:transparent;border-radius:0;border-top:1px solid var(--line)}.toggle-symbol{font-size:32rpx;transition:transform var(--motion-base) var(--ease-spring)}.toggle-symbol.expanded{transform:rotate(45deg)}
.timeline{padding-left:12rpx}.agenda-course{position:relative;display:flex;align-items:center;gap:22rpx;width:100%;border-radius:0;padding:28rpx 0 28rpx 24rpx;text-align:left;border-bottom:1px solid var(--line);background:transparent;animation:agenda-unfold 280ms var(--ease-out) both}.agenda-course:last-child{border-bottom:0}.agenda-course::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;background:#d7a3a5;transform-origin:top;animation:line-draw 380ms var(--ease-out) both}.agenda-course:first-child::before{top:40rpx}.agenda-course:last-child::before{bottom:calc(100% - 44rpx)}.time-column::before{content:"";position:absolute;left:-7rpx;top:40rpx;width:16rpx;height:16rpx;background:var(--primary);border:3rpx solid var(--surface);border-radius:50%}.time-column{flex:0 0 136rpx;color:var(--primary);border-right:1px solid #e1bfc0;line-height:1.25}.start,.end{display:block;font-family:Georgia,"Times New Roman",serif;font-variant-numeric:tabular-nums}.start{font-size:40rpx;font-weight:700}.end{font-size:34rpx;margin-top:8rpx}.unknown-time .start{font-size:26rpx;font-family:inherit}.unknown-time .end{font-size:22rpx;font-family:inherit}.course-info{flex:1;min-width:0}.course-info .course-name{font-size:30rpx}.course-info .room-line{margin-top:10rpx}.agenda-empty{padding:24rpx 8rpx 42rpx}.empty-lines{display:flex;gap:6rpx;margin:10rpx 0 20rpx}.empty-lines view{width:32rpx;height:5rpx;background:var(--line);border-radius:4rpx}.empty-lines view:first-child{background:var(--primary)}.empty-title{display:block;font-family:"Songti SC",SimSun,serif;font-size:36rpx;font-weight:600}.empty-hint{display:block;color:var(--muted);font-size:26rpx;margin-top:12rpx;line-height:1.8}
@keyframes agenda-unfold{from{opacity:0;transform:translateY(14rpx)}to{opacity:1;transform:translateY(0)}}@keyframes line-draw{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@media(prefers-reduced-motion:reduce){.agenda-course,.agenda-course::before{animation:none}.browse-fill,.toggle-symbol{transition:none}}
</style>
