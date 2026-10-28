<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FeedbackCard from '../../components/FeedbackCard.vue'
import { communityCall, FEEDBACK_TYPES, newRequestId, type Feedback, type FeedbackPage, type FeedbackType } from '../../services/community'
const type = shallowRef<FeedbackType>('bug')
const content = shallowRef('')
const contact = shallowRef('')
const consent = shallowRef(false)
const submitting = shallowRef(false)
const error = shallowRef('')
const success = shallowRef('')
const items = shallowRef<Feedback[]>([])
const next = shallowRef<string | null>(null)
const loading = shallowRef(false)
const listError = shallowRef('')
const loaded = shallowRef(false)
const valid = computed(() => content.value.trim().length >= 5 && content.value.trim().length <= 1000 && consent.value)
let requestId = ''
let lastPayload = ''
async function load(more = false) {
  if (loading.value) return
  loading.value = true
  listError.value = ''
  try {
    const result = await communityCall<FeedbackPage>('myFeedback', more && next.value !== null ? { before: next.value } : {})
    items.value = more ? [...items.value, ...result.items] : result.items
    next.value = result.next
    loaded.value = true
  } catch (cause) { listError.value = (cause as Error).message }
  finally { loading.value = false }
}
async function submit() {
  if (submitting.value) return
  error.value = ''; success.value = ''
  if (!valid.value) { error.value = '请填写至少 5 字的留言，并确认留言说明。'; return }
  const payload = { type: type.value, content: content.value.trim(), contact: contact.value.trim(), consent: true }
  const signature = JSON.stringify(payload)
  if (lastPayload !== signature) { requestId = newRequestId(); lastPayload = signature }
  submitting.value = true
  try {
    await communityCall('submitFeedback', { ...payload, requestId })
    content.value = ''; contact.value = ''; consent.value = false; requestId = ''; lastPayload = ''
    success.value = '留言已送达作者，感谢你一起把它做好。回复会显示在下方。'
    await load()
  } catch (cause) { error.value = (cause as Error).message }
  finally { submitting.value = false }
}
onShow(() => { void load() })
</script>
<template>
  <view class="page feedback-page">
    <text class="eyebrow">冀遇东方 / LETTER TO AUTHOR</text>
    <text class="title editorial-title">一起，把它做好</text>
    <text class="subtitle">遇到的问题、期待的功能，都可以在这里说。</text>
    <view class="panel">
      <text class="label">留言类型</text>
      <view class="types"><button v-for="option in FEEDBACK_TYPES" :key="option.value" :class="['type-button', { selected: type === option.value }]" :aria-pressed="type === option.value" :disabled="submitting" @click="type = option.value">{{ option.label }}</button></view>
      <label class="field"><text class="label">想对作者说的话</text><textarea v-model="content" class="message-input" maxlength="1000" :disabled="submitting" :show-confirm-bar="false" placeholder="例如：在课表页切换到第 3 周后，周二的课程没有显示……"/><text class="counter">{{ content.length }} / 1000 · 至少 5 字</text></label>
      <label class="field"><text class="label">联系方式（选填）</text><input v-model="contact" class="input" maxlength="100" :disabled="submitting" placeholder="邮箱或微信号，方便进一步沟通"/></label>
      <checkbox-group @change="consent = $event.detail.value.includes('agree')"><label class="consent"><checkbox value="agree" :checked="consent" :disabled="submitting" color="#8d2f38"/><text>我知道留言和选填联系方式会保存在云端，仅本人和作者可查看。请勿填写密码、验证码等敏感信息。</text></label></checkbox-group>
      <text v-if="error" class="error" role="alert">{{ error }}</text>
      <text v-if="success" class="success" role="status">{{ success }}</text>
      <button class="primary full spaced" :loading="submitting" :disabled="submitting || !valid" @click="submit">{{ submitting ? '正在送出…' : '提交给作者' }}</button>
      <text class="hint">每天最多 5 条，间隔至少 1 分钟。提交失败会保留你填写的内容。</text>
    </view>
    <view class="section-heading"><text class="editorial-title">我的留言</text><button class="text-link" :disabled="loading || submitting" @click="load()">{{ loading ? '加载中…' : '刷新' }}</button></view>
    <text class="hint history-note">仅当前微信账号可查看自己的留言，作者回复后可在这里查看。</text>
    <text v-if="listError" class="error" role="alert">{{ listError }}</text>
    <view v-if="loaded && !items.length" class="panel muted">还没有留言，第一条想法就从这里开始。</view>
    <FeedbackCard v-for="item in items" :key="item.id" :item="item"/>
    <button v-if="next !== null" class="secondary full" :disabled="loading" @click="load(true)">{{ loading ? '加载中…' : '查看更多留言' }}</button>
  </view>
</template>
<style scoped>
.feedback-page{max-width:540px}.feedback-page .title{font-size:48rpx}.types{display:flex;gap:12rpx;flex-wrap:wrap}.page .type-button{flex:1;min-width:150rpx;border:1px solid var(--line);font-size:25rpx;padding:18rpx 12rpx}.page .type-button.selected{background:var(--soft);border-color:var(--primary);color:var(--primary)}.message-input{width:100%;height:300rpx;padding:20rpx;background:white;border:1px solid #b6c2b6;border-radius:10rpx;font:inherit;box-sizing:border-box}.counter{display:block;text-align:right;font-size:23rpx;color:var(--muted);margin-top:8rpx}.consent{display:flex;align-items:flex-start;gap:10rpx;font-size:24rpx;line-height:1.8;color:var(--muted);padding:12rpx 0}.consent checkbox{flex-shrink:0}.success{display:block;padding:20rpx;background:#edf4ed;color:#315137;margin-top:20rpx;border-radius:10rpx}.history-note{margin:0 0 24rpx}
</style>
