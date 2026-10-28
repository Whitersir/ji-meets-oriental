<script setup lang="ts">
import { useTabBar } from '../../composables/useTabBar'
useTabBar(3)
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { communityCall } from '../../services/community'
import AuthorFeedback from '../../components/AuthorFeedback.vue'
import { useLocalTimetable } from '../../composables/useLocalTimetable'
const { timetable, error } = useLocalTimetable()
const recordCount = computed(() => timetable.value?.courses.length ?? 0)
const isAuthor = shallowRef(false)
function authorDesk() { uni.navigateTo({ url: '/pages/admin/index' }) }
onShow(async () => {
  // #ifdef MP-WEIXIN
  try { isAuthor.value = (await communityCall<{ isAdmin: boolean }>('identity')).isAdmin }
  catch { isAuthor.value = false }
  // #endif
})
function importSchedule() { uni.navigateTo({ url: '/pages-import/index' }) }
function schedule() { uni.switchTab({ url: '/pages/schedule/index' }) }
function privacy() { uni.showModal({ title: '本地数据与云端留言说明', content: '课表、学期设置、确认保存的成绩和取件信息只保存在当前设备，不上传。成绩需主动导入教务导出的 Excel，不收集教务密码；取件码需主动粘贴或手动添加，不读取短信。更换设备或清除数据可能丢失本地记录，请保留原文件。\n\n你主动提交的留言、选填联系方式与作者回复保存在腾讯云，仅本人和作者可查看。提交时进行内容安全检查，请勿填写密码或验证码。\n\n为统计使用人数，云端使用微信用户标识的摘要去重，记录访问日期，不收集姓名、学号、手机号、位置或课表内容。同一微信用户每日只算一次；网页和开发者工具不计入，手机体验版计入。', showCancel: false, confirmText: '知道了' }) }
</script>
<template>
  <view class="page profile-page tab-page">
    <text class="eyebrow">冀遇东方 / MY CAMPUS</text>
    <text class="title editorial-title">自己的校园节奏</text>
    <text class="subtitle">无需登录，也能安排好每一周。</text>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <view class="panel">
      <text class="section-title">我的课表</text>
      <text class="term">{{ timetable?.term || '还没有导入课表' }}</text>
      <text class="hint">{{ timetable ? `已保存 ${recordCount} 条排课 · 本机存储` : '先从学校教务导出 Excel，再导入这里。' }}</text>
      <view v-if="timetable" class="semester-info"><text>第一教学周的周一</text><text>{{ timetable.startDate }}</text></view>
      <button class="primary full spaced" hover-class="pressed" @click="importSchedule">{{ timetable ? '导入 / 更新课表' : '导入我的课表' }}</button>
      <button v-if="timetable" class="quiet full" hover-class="pressed" @click="schedule">查看课表与学期设置 ›</button>
    </view>
    <AuthorFeedback/>
    <button v-if="isAuthor" class="quiet full spaced" @click="authorDesk">作者工作台 · 留言与使用统计 ›</button>
    <button class="privacy-entry" hover-class="pressed" @click="privacy"><view><text class="section-title">数据与隐私</text><text class="hint">了解课表、成绩、取件码保存与留言提交</text></view><text class="chevron">›</text></button>
    <view class="footer" @longpress="authorDesk"><view>河北东方学院非官方校园助手</view><view>课程变动请以学校教务安排为准</view></view>
  </view>
</template>
<style scoped>.profile-page{max-width:540px}.profile-page>.title{font-size:48rpx;margin-top:20rpx}.term{display:block;font-size:38rpx;font-family:Georgia,"Songti SC",SimSun,serif;color:var(--primary)}.semester-info{display:flex;justify-content:space-between;gap:20rpx;font-size:25rpx;color:var(--muted);padding-top:28rpx}.privacy-entry{width:100%;text-align:left;justify-content:space-between;border:1px solid var(--line);padding:24rpx 28rpx}.privacy-entry .section-title{margin-bottom:0}.footer{display:block;text-align:center;font-size:23rpx;color:var(--muted);line-height:1.8;margin-top:60rpx}</style>
