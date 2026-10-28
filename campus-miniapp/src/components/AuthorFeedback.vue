<script setup lang="ts">
import { shallowRef } from 'vue'
const expanded = shallowRef(false)
function openFeedback() { uni.navigateTo({ url: '/pages/feedback/index' }) }
</script>

<template>
  <view class="panel feedback-panel">
    <view class="feedback-heading"><text class="editorial-title">给作者留言</text><text class="feedback-label">一起把它做好</text></view>
    <text class="feedback-intro">遇到的 Bug、使用建议，或新功能的想法，都欢迎告诉我。</text>
    <view class="feedback-topics"><text class="topic">Bug 反馈</text><text class="topic">使用建议</text><text class="topic">功能灵感</text></view>
    <button class="primary full feedback-button" hover-class="pressed" @click="openFeedback">写留言给作者</button>
    <text class="feedback-note">留言仅你和作者可见，可在留言页查看处理状态和回复。</text>
    <button class="feedback-help" hover-class="pressed" :aria-expanded="expanded" @click="expanded = !expanded">怎样描述更清楚？ <text class="feedback-toggle" :class="{ expanded }">+</text></button>
    <view v-if="expanded" class="writing-tips"><text class="tip"><text class="tip-title">遇到 Bug</text>在哪个页面、做了什么、出现了什么问题；有截图会更容易定位。</text><text class="tip"><text class="tip-title">使用建议</text>哪里不顺手，希望怎样调整。</text><text class="tip"><text class="tip-title">新功能想法</text>希望增加什么，能帮你解决什么问题。</text></view>
  </view>
</template>

<style scoped>
.writing-tips{animation:page-arrive 220ms var(--ease-out) both}.feedback-toggle{transition:transform var(--motion-base) var(--ease-spring)}.feedback-toggle.expanded{transform:rotate(45deg)}
.feedback-panel{padding:28rpx}.feedback-heading{display:flex;justify-content:space-between;align-items:center;gap:16rpx}.feedback-label{font-size:23rpx;color:var(--primary);white-space:nowrap}.feedback-intro{display:block;color:var(--muted);font-size:27rpx;margin-top:14rpx;line-height:1.8}.feedback-topics{display:flex;gap:16rpx;flex-wrap:wrap;margin:22rpx 0 26rpx}.topic{font-size:23rpx;color:var(--primary);background:var(--soft);padding:7rpx 16rpx;border-radius:6rpx}.feedback-button{font-size:29rpx}.feedback-note{display:block;font-size:23rpx;line-height:1.7;color:var(--muted);margin-top:18rpx}.feedback-help{width:100%;background:transparent;color:var(--primary);justify-content:space-between;font-size:25rpx;padding:22rpx 0 0;min-height:88rpx;text-align:left}.feedback-toggle{font-size:32rpx}.writing-tips{border-top:1px solid var(--line);padding-top:8rpx}.tip{display:block;color:var(--muted);font-size:25rpx;line-height:1.8;margin-top:16rpx}.tip-title{display:block;color:var(--ink);font-weight:600}
</style>
