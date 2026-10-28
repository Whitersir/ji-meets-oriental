<script setup lang="ts">
import { shallowRef } from 'vue'
import CopyLinkButton from '../../components/CopyLinkButton.vue'
import { CAMPUS_WATER_ENTRIES, isCampusWaterUrl } from '../../domain/campus-water'
const helpExpanded = shallowRef(true)
</script>

<template>
  <view class="page water-page">
    <view class="row"><text class="eyebrow">冀遇东方 / CAMPUS</text><text class="badge">女生宿舍</text></view>
    <view class="water-heading"><view><text class="title editorial-title">宿舍用水</text><text class="subtitle">校园卡卡包，顺手找到。</text></view><image class="water-icon" src="/static/icons/water.png" aria-hidden="true"/></view>
    <view class="panel intro-panel"><text class="section-title">领取并使用自己的校园卡</text><text class="body-copy">女生宿舍用水通过校园卡卡包操作。新同学可以进入原服务，使用本人微信完成授权，再按提示注册、领卡或绑定。</text><text class="hint">这里提供入口与使用步骤，余额、充值和用水操作由原服务提供。</text></view>
    <view v-for="entry in CAMPUS_WATER_ENTRIES" :key="entry.id" class="panel entry-panel">
      <view class="row entry-heading"><text class="editorial-title entry-title">{{ entry.title }}</text><text class="entry-status">{{ entry.url ? '复制后在微信打开' : '共用链接待核对' }}</text></view>
      <text class="body-copy">{{ entry.description }}</text>
      <view class="spaced"><CopyLinkButton :url="entry.url && isCampusWaterUrl(entry.url) ? entry.url : undefined" label="复制入口链接" instruction="在微信聊天（例如文件传输助手）中粘贴并发送，再点击链接，使用本人微信授权、注册或领卡。"/></view>
      <!-- #ifdef H5 -->
      <a v-if="entry.url" class="web-open" :href="entry.url" target="_blank" rel="noopener noreferrer">打开{{ entry.title }}网页 ↗</a>
      <!-- #endif -->
    </view>
    <view class="panel guide-panel"><button class="guide-toggle" :aria-expanded="helpExpanded" hover-class="pressed" @click="helpExpanded = !helpExpanded">怎样进入和使用 <text>{{ helpExpanded ? '−' : '+' }}</text></button><view v-if="helpExpanded" class="steps"><view class="step"><text class="step-number">1</text><text>点击「复制入口链接」，在微信聊天中粘贴并发送，再点击打开。网页预览也可以点击「打开网页」。</text></view><view class="step"><text class="step-number">2</text><text>使用本人微信授权，按原页面提示注册、领取校园卡或完成绑定。</text></view><view class="step"><text class="step-number">3</text><text>在原服务里找到用水功能，并按宿舍设备和页面提示操作。</text></view></view></view>
    <view class="service-note"><text>当前版本通过复制链接在微信打开，不会直接在小程序内加载校园卡网页。电脑浏览器可能显示扫码页面，请按原页面提示在手机微信继续。</text><text>本小程序不接收校园卡密码、验证码或支付信息。用水异常、扣费及退款请联系原服务或学校管理人员。</text></view>
  </view>
</template>

<style scoped>
.web-open{display:flex;align-items:center;justify-content:center;min-height:44px;color:var(--primary);font-size:25rpx;margin-top:10rpx;text-decoration:none}.manual-link{display:block;padding:20rpx;border:1px solid var(--line);background:var(--surface);border-radius:12rpx;font-size:24rpx;overflow-wrap:anywhere;margin-bottom:24rpx;user-select:text}
.water-page{max-width:540px}.water-heading{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:28rpx 0 8rpx}.water-heading .title{font-size:50rpx}.water-heading .subtitle{margin-bottom:24rpx}.water-icon{width:92rpx;height:92rpx;flex-shrink:0}.intro-panel{border-top:3px solid var(--primary)}.body-copy{display:block;font-size:27rpx;line-height:1.8;color:var(--muted)}.entry-heading{align-items:flex-start;flex-wrap:wrap;margin-bottom:16rpx}.entry-title{font-size:34rpx}.entry-status{font-size:23rpx;color:var(--primary);background:var(--soft);border-radius:8rpx;padding:5rpx 12rpx}.guide-panel{padding:8rpx 28rpx 24rpx}.page .guide-toggle{width:100%;padding:16rpx 0;background:transparent;justify-content:space-between;font-weight:600;font-size:29rpx}.steps{border-top:1px solid var(--line);padding-top:8rpx}.step{display:flex;align-items:flex-start;gap:18rpx;margin-top:20rpx;font-size:26rpx;line-height:1.8}.step-number{width:36rpx;min-width:36rpx;text-align:center;background:var(--soft);color:var(--primary);font-weight:600;border-radius:6rpx}.service-note{font-size:24rpx;line-height:1.8;color:var(--muted);padding:4rpx}.service-note text{display:block;margin-bottom:16rpx}.body-copy,.service-note,.step{overflow-wrap:anywhere}
</style>
