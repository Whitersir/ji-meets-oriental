<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { cleanPickupDraft, type PickupDraft } from '../domain/pickups'
const props = defineProps<{ initial?: PickupDraft; editing?: boolean }>()
const emit = defineEmits<{ save: [draft: PickupDraft]; cancel: [] }>()
const draft = reactive<PickupDraft>({ code: props.initial?.code || '', courier: props.initial?.courier || '', location: props.initial?.location || '', note: props.initial?.note || '' })
const error = shallowRef('')
function submit() {
  try { const cleaned = cleanPickupDraft(draft); error.value = ''; emit('save', cleaned) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '请检查填写内容。' }
}
</script>
<template>
  <view class="panel pickup-editor">
    <text class="section-title">{{ editing ? '编辑取件信息' : '添加一份待取快递' }}</text>
    <view class="field"><text class="label">取件码 · 必填</text><input v-model="draft.code" class="input" aria-label="取件码" maxlength="32" placeholder="例如 A-03-0062" :focus="true"/></view>
    <view class="field"><text class="label">快递公司</text><input v-model="draft.courier" class="input" aria-label="快递公司" maxlength="24" placeholder="例如中通、圆通、极兔"/></view>
    <view class="field"><text class="label">取件地点</text><input v-model="draft.location" class="input" aria-label="取件地点" maxlength="80" placeholder="例如文泰楼驿站"/></view>
    <view class="field"><text class="label">备注</text><input v-model="draft.note" class="input" aria-label="备注" maxlength="80" placeholder="可选，例如帮舍友代取"/></view>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <view class="editor-actions"><button class="secondary" hover-class="pressed" @click="emit('cancel')">取消</button><button class="primary" hover-class="pressed" @click="submit">保存取件码</button></view>
  </view>
</template>
<style scoped>
.pickup-editor{margin-top:24rpx}.editor-actions{display:grid;grid-template-columns:1fr 2fr;gap:16rpx}.editor-actions .primary,.editor-actions .secondary{min-height:44px}.pickup-editor .input{border-color:var(--line);min-height:44px}
</style>
