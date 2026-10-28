<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ label: string; successLabel: string; state: 'idle' | 'working' | 'success' }>()
const emit = defineEmits<{ click: [] }>()
const currentLabel = computed(() => props.state === 'success' ? props.successLabel : props.state === 'working' ? '正在复制…' : props.label)
</script>
<template>
  <button class="primary full feedback-action" :class="'state-' + state" :disabled="state === 'working'" :aria-busy="state === 'working'" :aria-label="currentLabel" hover-class="pressed" @click="emit('click')">
    <view class="feedback-mark" :class="{ visible: state !== 'idle' }" aria-hidden="true"><view v-if="state === 'working'" class="feedback-spinner"/><view v-else-if="state === 'success'" class="feedback-check"/></view>
    <text class="feedback-text" aria-live="polite">{{ currentLabel }}</text>
    <view v-if="state === 'success'" class="feedback-sparks" aria-hidden="true"><view v-for="i in 5" :key="i" :class="'spark spark-' + i"/></view>
  </button>
</template>
<style scoped>
.feedback-action{position:relative;overflow:hidden;gap:14rpx;min-height:96rpx;transition:background var(--motion-base),transform var(--motion-fast);isolation:isolate}.feedback-action.state-success{background:#395c4b;color:#fff}.feedback-mark{position:relative;width:0;height:36rpx;opacity:0;transition:width var(--motion-base) var(--ease-spring),opacity var(--motion-fast);flex-shrink:0}.feedback-mark.visible{width:36rpx;opacity:1}.feedback-text{position:relative;z-index:1}.feedback-check{position:absolute;width:23rpx;height:13rpx;top:7rpx;left:5rpx;border-left:4rpx solid currentColor;border-bottom:4rpx solid currentColor;transform:rotate(-45deg);animation:check-arrive 240ms var(--ease-spring) both}.feedback-spinner{width:27rpx;height:27rpx;margin:3rpx;border:3rpx solid rgba(255,255,255,.35);border-top-color:currentColor;border-radius:50%;animation:feedback-spin 750ms linear infinite}.feedback-sparks{position:absolute;inset:0;pointer-events:none}.spark{position:absolute;top:50%;left:50%;width:6rpx;height:6rpx;border-radius:50%;background:#e4cda3;animation:spark-out 650ms var(--ease-out) both}.spark-1{--spark-x:-120rpx;--spark-y:-32rpx}.spark-2{--spark-x:135rpx;--spark-y:-22rpx;animation-delay:30ms}.spark-3{--spark-x:-96rpx;--spark-y:32rpx;animation-delay:50ms}.spark-4{--spark-x:110rpx;--spark-y:28rpx}.spark-5{--spark-x:0rpx;--spark-y:-38rpx;animation-delay:60ms}@keyframes feedback-spin{to{transform:rotate(360deg)}}@keyframes check-arrive{from{opacity:0;transform:rotate(-45deg) scale(.45)}to{opacity:1;transform:rotate(-45deg) scale(1)}}@keyframes spark-out{from{opacity:.9;transform:translate(0,0) scale(.4)}to{opacity:0;transform:translate(var(--spark-x),var(--spark-y)) scale(1)}}@media(prefers-reduced-motion:reduce){.feedback-action,.feedback-mark{transition:none}.feedback-check,.feedback-spinner{animation:none}.feedback-sparks{display:none}}
</style>
