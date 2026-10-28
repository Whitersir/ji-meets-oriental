<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { cleanPickupDraft, parsePickupMessages, type PickupDraft } from '../domain/pickups'
const emit = defineEmits<{ save: [drafts: PickupDraft[]]; cancel: [] }>()
const text = shallowRef('')
const drafts = ref<PickupDraft[]>([])
const error = shallowRef('')
const unrecognized = shallowRef(0)
function parse() {
  error.value = ''
  try {
    const result = parsePickupMessages(text.value)
    if (!result.drafts.length) { error.value = '没有识别到明确的取件码。请粘贴包含“取件码”或“凭…取件”的完整通知，也可以手动添加。'; return }
    drafts.value = result.drafts; unrecognized.value = result.unrecognized
    text.value = '' // Discard source text as soon as the user has a preview.
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '请检查通知内容。' }
}
function save() {
  try { const cleaned = drafts.value.map(cleanPickupDraft); error.value = ''; emit('save', cleaned) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '请检查取件码。' }
}
function remove(index: number) { drafts.value.splice(index, 1) }
</script>
<template>
  <view class="panel pickup-import">
    <text class="section-title">{{ drafts.length ? '确认识别的取件信息' : '从快递通知里添加' }}</text>
    <template v-if="!drafts.length">
      <text class="hint import-help">长按输入框粘贴通知，多条通知请分行填写。</text>
      <textarea v-model="text" class="message-input" aria-label="快递通知内容" maxlength="5000" :show-confirm-bar="false" placeholder="例如：【中通快递】包裹已到文泰楼驿站，取件码 A-03-0062。"/>
      <text class="hint">只保存你确认的取件信息，原始通知不会保存。</text>
    </template>
    <template v-else>
      <text class="hint import-help">识别结果可能有误，请核对后再保存。公司和地点可以补充。</text>
      <text v-if="unrecognized" class="notice">有 {{ unrecognized }} 行未识别，未加入本次导入。</text>
      <view v-for="(draft, index) in drafts" :key="index" class="preview-item">
        <view class="row"><text class="preview-number">第 {{ index + 1 }} 个取件码</text><button class="quiet" :aria-label="`移除第${index + 1}个识别结果`" @click="remove(index)">移除</button></view>
        <view class="field"><text class="label">取件码 · 必填</text><input v-model="draft.code" class="input" :aria-label="`第${index + 1}个取件码`" maxlength="32"/></view>
        <view class="field"><text class="label">快递公司</text><input v-model="draft.courier" class="input" :aria-label="`第${index + 1}个快递公司`" maxlength="24" placeholder="可选，填写快递公司"/></view>
        <view class="field"><text class="label">取件地点</text><input v-model="draft.location" class="input" :aria-label="`第${index + 1}个取件地点`" maxlength="80" placeholder="可选，填写驿站或快递柜"/></view>
      </view>
    </template>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <view class="import-actions"><button class="secondary" hover-class="pressed" @click="emit('cancel')">取消</button><button v-if="drafts.length" class="primary" hover-class="pressed" @click="save">确认保存 {{ drafts.length }} 个</button><button v-else class="primary" hover-class="pressed" :disabled="!text.trim()" @click="parse">识别并预览</button></view>
  </view>
</template>
<style scoped>
.pickup-import{margin-top:24rpx}.import-help{margin:0 0 22rpx}.message-input{width:100%;height:260rpx;background:var(--paper);border:1px solid var(--line);border-radius:12rpx;padding:22rpx;font-size:28rpx;line-height:1.7;box-sizing:border-box;color:var(--ink)}.import-actions{display:grid;grid-template-columns:1fr 2fr;gap:16rpx;margin-top:28rpx}.import-actions .primary,.import-actions .secondary,.preview-item .quiet{min-height:44px}.preview-item{border-top:1px solid var(--line);padding:8rpx 0 20rpx}.preview-number{font-size:26rpx;color:var(--primary);font-weight:600}.preview-item .input{border-color:var(--line);min-height:44px}
</style>
