<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import FeedbackButton from './FeedbackButton.vue'

const props = defineProps<{ url?: string; label: string; instruction: string }>()
const state = shallowRef<'idle' | 'working' | 'success'>('idle')
const failed = shallowRef(false)
watch(() => props.url, () => { state.value = 'idle'; failed.value = false })

function copy() {
  if (!props.url || state.value === 'working') return
  const copiedUrl = props.url
  state.value = 'working'
  failed.value = false
  const success = () => { if (props.url === copiedUrl) state.value = 'success' }
  const fail = () => {
    if (props.url !== copiedUrl) return
    state.value = 'idle'
    failed.value = true
  }
  // #ifdef H5
  if (!navigator.clipboard?.writeText) { fail(); return }
  navigator.clipboard.writeText(copiedUrl).then(success, fail)
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: copiedUrl, success, fail })
  // #endif
}
</script>

<template>
  <view class="copy-link-control">
    <FeedbackButton v-if="url" :label="label" success-label="链接已复制" :state="state" @click="copy"/>
    <button v-else class="full" disabled>暂未启用共用链接</button>
    <text v-if="state === 'success'" class="copy-confirmation" role="status">{{ instruction }}</text>
    <text v-if="failed" class="error" role="alert">自动复制未完成，请长按下方链接手动复制。</text>
    <view v-if="url" class="copy-link-address"><text class="hint">入口链接 · 可长按复制</text><text class="copy-link-url" user-select>{{ url }}</text></view>
  </view>
</template>

<style scoped>
.copy-confirmation{display:block;padding:18rpx 22rpx;margin-top:18rpx;background:#edf3ee;border:1px solid #dbe7df;border-radius:14rpx;color:#395c4b;font-size:25rpx;line-height:1.8;overflow-wrap:anywhere}.copy-link-address{margin-top:20rpx}.copy-link-url{display:block;padding:20rpx;margin-top:8rpx;background:rgba(255,252,249,.6);border:1px solid var(--line);border-radius:12rpx;color:var(--ink);font-size:24rpx;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;user-select:text}
</style>
