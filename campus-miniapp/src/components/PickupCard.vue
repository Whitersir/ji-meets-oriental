<script setup lang="ts">
import type { PickupItem } from '../domain/pickups'
defineProps<{ item: PickupItem }>()
const emit = defineEmits<{ show: []; mark: []; edit: []; remove: [] }>()
</script>
<template>
  <view class="pickup-card panel" :class="{ collected: item.pickedAt !== null }">
    <view class="row"><text class="courier-tag">{{ item.courier || '快递公司未填写' }}</text><text class="record-status">{{ item.pickedAt === null ? '待取件' : '已取件' }}</text></view>
    <button class="code-button" hover-class="pressed" :aria-label="`大字出示取件码${item.code}`" @click="emit('show')"><text class="pickup-code">{{ item.code }}</text><text class="code-hint">大字出示 ›</text></button>
    <view class="pickup-location"><image class="location-icon" src="/static/icons/pin-muted.png" aria-hidden="true"/><text>{{ item.location || '取件地点未填写' }}</text></view>
    <text v-if="item.note" class="record-note">{{ item.note }}</text>
    <view class="card-actions"><button class="status-button" hover-class="pressed" @click="emit('mark')">{{ item.pickedAt === null ? '标记已取' : '恢复待取' }}</button><button class="quiet" hover-class="pressed" @click="emit('edit')">编辑</button><button class="quiet delete-button" hover-class="pressed" @click="emit('remove')">删除</button></view>
  </view>
</template>
<style scoped>
.card-actions .status-button,.card-actions .quiet{min-height:44px}
.pickup-card{padding:28rpx 28rpx 12rpx}.courier-tag{font-size:25rpx;font-weight:600;color:var(--primary);background:var(--soft);padding:6rpx 16rpx;border-radius:7rpx;max-width:75%;overflow-wrap:anywhere}.record-status{font-size:23rpx;color:var(--muted);flex-shrink:0}.pickup-card .code-button{width:100%;background:transparent;padding:18rpx 0;justify-content:space-between;gap:14rpx;text-align:left;min-height:112rpx}.pickup-code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:48rpx;font-weight:700;letter-spacing:1rpx;overflow-wrap:anywhere;word-break:break-all;line-height:1.35;min-width:0}.code-hint{font-size:23rpx;color:var(--muted);flex-shrink:0}.pickup-location{display:flex;align-items:flex-start;gap:10rpx;font-size:26rpx;overflow-wrap:anywhere}.location-icon{width:30rpx;height:30rpx;margin-top:5rpx;flex-shrink:0}.record-note{display:block;color:var(--muted);font-size:24rpx;margin:10rpx 0 0 40rpx;overflow-wrap:anywhere}.card-actions{border-top:1px solid var(--line);margin-top:26rpx;padding-top:10rpx;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:12rpx}.pickup-card .status-button{background:transparent;color:var(--primary);font-weight:600;padding:16rpx 4rpx;font-size:26rpx}.pickup-card .quiet{font-size:25rpx;padding:16rpx 4rpx}.collected .pickup-code{color:var(--muted)}.collected .courier-tag{background:var(--line);color:var(--muted)}
</style>
