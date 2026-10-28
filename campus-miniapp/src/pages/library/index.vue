<script setup lang="ts">
import CopyLinkButton from '../../components/CopyLinkButton.vue'
import { LIBRARY_SEAT_URL } from '../../domain/library-seat'
</script>

<template>
  <view class="page library-page">
    <text class="eyebrow">冀遇东方 / LIBRARY</text>
    <view class="library-heading">
      <view><text class="title editorial-title">座位预约</text><text class="subtitle">河北东方学院图书馆</text></view>
      <image class="library-icon" src="/static/icons/book.png" aria-hidden="true" />
    </view>
    <view class="panel author-note">
      <text class="body-copy">目前只能这样了，感觉还不如在学习通图书馆预约了，但是个人小程序不能自己跳转网页，这是微信的规矩，就像她铁定要离开你一样</text>
    </view>
    <view class="panel entry-panel">
      <text class="section-title">前往超星官方预约页</text>
      <text class="body-copy">已定位本校预约入口。请在手机浏览器打开，由你本人登录超星并选择座位。</text>
      <!-- #ifdef H5 -->
      <a class="primary full web-open" :href="LIBRARY_SEAT_URL" rel="noreferrer">打开官方预约页 ↗</a>
      <!-- #endif -->
      <view class="spaced"><CopyLinkButton :url="LIBRARY_SEAT_URL" label="复制预约链接" instruction="打开 Safari 或手机浏览器，粘贴到地址栏后继续预约。"/></view>
    </view>
    <view class="panel">
      <text class="section-title">在手机浏览器继续</text>
      <view class="step"><text class="step-number">1</text><text>点击「复制预约链接」。</text></view>
      <view class="step"><text class="step-number">2</text><text>打开 Safari 或手机自带浏览器，在地址栏粘贴链接并前往。</text></view>
      <view class="step"><text class="step-number">3</text><text>按超星页面提示登录，进入本校列表后自行选座和预约。</text></view>
    </view>
    <text class="hint">当前版本提供官方入口，不在小程序内嵌预约页，也不会自动打开其他 App。账号密码不经过本小程序，预约结果、签到及使用规则以学校和超星页面为准。</text>
    <text class="hint">如果浏览器暂时无法进入，请使用「学习通 → 河北东方学院图书馆 → 座位预约」。</text>
  </view>
</template>

<style scoped>
.author-note{position:relative;border-left:3px solid #d9b9b6;background:#f7eeea}.author-note .body-copy{font-size:26rpx;line-height:1.9}.copy-confirmation{display:block;color:#395c4b;background:#edf3ed;padding:18rpx 20rpx;border-radius:12rpx;font-size:25rpx;margin-top:16rpx;animation:page-arrive 200ms var(--ease-out) both}
.library-page{max-width:540px}.library-heading{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:28rpx 0 8rpx}.library-heading .title{font-size:50rpx}.library-heading .subtitle{margin-bottom:24rpx}.library-icon{width:92rpx;height:92rpx;flex-shrink:0}.entry-panel{border-top:3px solid var(--primary)}.body-copy{display:block;font-size:28rpx;line-height:1.8;color:var(--muted)}.web-open{display:flex;align-items:center;justify-content:center;min-height:48px;text-decoration:none;box-sizing:border-box;margin-top:24rpx}.step{display:flex;align-items:flex-start;gap:18rpx;margin-top:20rpx;font-size:27rpx;line-height:1.8}.step-number{width:36rpx;min-width:36rpx;text-align:center;background:var(--soft);color:var(--primary);font-weight:600;border-radius:6rpx}.manual-link{display:block;padding:20rpx;border:1px solid var(--line);border-radius:12rpx;font-size:25rpx;overflow-wrap:anywhere;word-break:break-all;user-select:text}.hint,.body-copy,.step{overflow-wrap:anywhere}
</style>
