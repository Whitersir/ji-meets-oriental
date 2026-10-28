<script setup lang="ts">
import CopyLinkButton from '../../components/CopyLinkButton.vue'
import { CAMPUS_TAKEOUT_URL } from '../../domain/campus-takeout'

</script>

<template>
  <view class="page takeout-page">
    <text class="eyebrow">冀遇东方 / CAMPUS</text>
    <view class="takeout-heading"><view><text class="title editorial-title">校园外卖</text><text class="subtitle">今天吃什么，去这里看看。</text></view><image class="takeout-icon" src="/static/icons/takeout.png" aria-hidden="true" /></view>
    <view class="panel entry-panel">
      <text class="section-title">前往校园外卖点餐</text>
      <text class="body-copy">请在手机微信中打开点餐页面，按原页面提示选择学校、登录和下单。</text>
      <!-- #ifdef H5 -->
      <a class="primary full web-open" :href="CAMPUS_TAKEOUT_URL">打开校园外卖 ↗</a>
      <!-- #endif -->
      <view class="spaced"><CopyLinkButton :url="CAMPUS_TAKEOUT_URL" label="复制点餐链接" instruction="在微信聊天（例如文件传输助手）中粘贴并发送，再点击链接进入校园外卖。"/></view>
    </view>
    <view class="panel steps-panel"><text class="section-title">在微信里打开</text><view class="step"><text class="step-number">1</text><text>点击「复制点餐链接」。</text></view><view class="step"><text class="step-number">2</text><text>发到微信文件传输助手或自己的聊天中。</text></view><view class="step"><text class="step-number">3</text><text>点击发送的链接，在外卖页面继续点餐。</text></view></view>
    <text class="hint">当前小程序需要复制链接后打开。请使用手机微信，电脑浏览器可能无法正常进入。订单、支付和售后由外卖平台提供。</text>
  </view>
</template>

<style scoped>
.takeout-page{max-width:540px}.takeout-heading{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:28rpx 0 8rpx}.takeout-heading .title{font-size:50rpx}.takeout-heading .subtitle{margin-bottom:24rpx}.takeout-icon{width:92rpx;height:92rpx;flex-shrink:0}.entry-panel{border-top:3px solid var(--primary)}.body-copy{display:block;font-size:28rpx;line-height:1.8;color:var(--muted)}.web-open{display:flex;align-items:center;justify-content:center;min-height:48px;text-decoration:none;box-sizing:border-box;margin-top:24rpx}.step{display:flex;align-items:flex-start;gap:18rpx;margin-top:20rpx;font-size:27rpx;line-height:1.8}.step-number{width:36rpx;min-width:36rpx;text-align:center;background:var(--soft);color:var(--primary);font-weight:600;border-radius:6rpx}.manual-link{display:block;padding:20rpx;border:1px solid var(--line);border-radius:12rpx;font-size:25rpx;overflow-wrap:anywhere;user-select:text}.copy-fallback{margin-top:24rpx}.hint,.body-copy,.step{overflow-wrap:anywhere}
</style>
