<script setup lang="ts">
import { useTabBar } from '../../composables/useTabBar'
useTabBar(2)
import CampusServices from '../../components/CampusServices.vue'
function importSchedule() { uni.navigateTo({ url: '/pages-import/index' }) }
</script>
<template>
  <view class="page utility-page tab-page"><text class="eyebrow">冀遇东方 / CAMPUS</text><text class="title editorial-title">校园里的大小事</text><text class="subtitle">把常用服务，放在顺手的地方。</text><view class="panel"><view class="section-heading"><text class="editorial-title">学习与生活</text><text class="badge">逐步开放</text></view><CampusServices/></view><view class="panel"><text class="section-title">现在可以使用</text><text class="subtitle">从教务导出课表，导入后离线查看每周安排。</text><button class="primary full" hover-class="pressed" @click="importSchedule">导入 / 更新课表</button></view><text class="hint">标注「待开放」的服务暂未接入，不会要求你绑定教务账号。</text></view>
</template>
<style scoped>.utility-page{max-width:540px}.utility-page>.title{font-size:48rpx;margin-top:20rpx}.utility-page .panel{padding:12rpx 28rpx 24rpx}.utility-page .section-title{margin-top:16rpx}</style>
