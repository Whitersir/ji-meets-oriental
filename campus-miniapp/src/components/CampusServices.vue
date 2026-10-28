<script setup lang="ts">
import { CAMPUS_SERVICES, openCampusService } from '../domain/home'
defineProps<{ showMore?: boolean }>()
function more() { uni.switchTab({ url: '/pages/campus/index' }) }
</script>

<template>
  <view class="services-grid">
    <button v-for="service in CAMPUS_SERVICES" :key="service.id" class="service-item" hover-class="pressed" :aria-label="`${service.title}，${service.status || (service.url ? '本机收纳' : '待开放')}`" @click="openCampusService(service)"><view class="service-glyph"><image class="service-icon" :src="`/static/icons/${service.icon}.png`" aria-hidden="true"/></view><view class="service-copy"><text class="service-title">{{ service.title }}</text><text class="service-status">{{ service.status || (service.url ? '本机收纳' : '待开放') }}</text></view></button>
    <button v-if="showMore" class="service-item" hover-class="pressed" @click="more"><image class="service-icon" src="/static/icons/grid.png" aria-hidden="true"/><view class="service-copy"><text class="service-title">更多服务</text><text class="service-status">校园工具与服务</text></view></button>
  </view>
</template>

<style scoped>
.service-glyph{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:72rpx;height:72rpx;background:var(--soft);border:1px solid rgba(141,47,56,.05);border-radius:20rpx;transition:background var(--motion-fast),transform var(--motion-base) var(--ease-spring)}.service-glyph .service-icon{width:48rpx;height:48rpx}.service-item.pressed .service-glyph{background:#ead7d3;transform:rotate(-5deg)}
.services-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28rpx}.service-item{min-width:0;background:transparent;border-radius:0;justify-content:flex-start;text-align:left;gap:20rpx;padding:26rpx 0;min-height:132rpx;border-bottom:1px solid var(--line)}.service-item:nth-last-child(-n+2){border-bottom:0}.service-icon{width:60rpx;height:60rpx;flex-shrink:0}.service-copy{min-width:0;flex:1}.service-title{font-size:29rpx;font-weight:600;display:block;white-space:nowrap}.service-status{display:block;font-size:23rpx;color:var(--muted);margin-top:4rpx}
</style>
