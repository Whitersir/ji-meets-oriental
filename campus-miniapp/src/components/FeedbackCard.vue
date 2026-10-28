<script setup lang="ts">
import { feedbackTypeLabel, messageTime, STATUS_LABELS, type Feedback } from '../services/community'
defineProps<{ item: Feedback; admin?: boolean }>()
</script>
<template>
  <view class="panel feedback-card">
    <view class="row row-wrap"><text class="badge">{{ feedbackTypeLabel(item.type) }}</text><text class="status">{{ STATUS_LABELS[item.status] }}</text></view>
    <text class="message-time">{{ messageTime(item.createdAt) }}</text>
    <text class="message-body" user-select>{{ item.content }}</text>
    <text v-if="admin && item.contact" class="contact" user-select>联系方式：{{ item.contact }}</text>
    <view v-if="item.reply" class="reply"><text class="reply-title">作者回复</text><text class="message-body" user-select>{{ item.reply }}</text></view>
    <slot/>
  </view>
</template>
<style scoped>
.status{color:var(--primary);font-size:24rpx}.message-time{display:block;color:var(--muted);font-size:23rpx;margin:14rpx 0}.message-body{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-size:28rpx;line-height:1.8}.contact{display:block;overflow-wrap:anywhere;font-size:24rpx;color:var(--muted);margin-top:20rpx}.reply{background:var(--soft);border-radius:10rpx;padding:20rpx;margin-top:24rpx}.reply-title{display:block;color:var(--primary);font-weight:600;font-size:24rpx;margin-bottom:10rpx}
</style>
