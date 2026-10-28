<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import PickupCard from '../../components/PickupCard.vue'
import PickupEditor from '../../components/PickupEditor.vue'
import PickupImport from '../../components/PickupImport.vue'
import { usePickups } from '../../composables/usePickups'
import type { PickupDraft, PickupItem } from '../../domain/pickups'
const { items, error, ready, pendingCount, reload, add, edit, mark, remove } = usePickups()
const tab = shallowRef<'pending' | 'collected'>('pending')
const query = shallowRef('')
const mode = shallowRef<'manual' | 'import' | null>(null)
const editing = shallowRef<PickupItem | null>(null)
const displayItem = shallowRef<PickupItem | null>(null)
const collectedCount = computed(() => items.value.length - pendingCount.value)
const visibleItems = computed(() => items.value.filter(item => (item.pickedAt === null) === (tab.value === 'pending'))
  .filter(item => !query.value.trim() || [item.code, item.courier, item.location, item.note].join(' ').toLowerCase().includes(query.value.trim().toLowerCase()))
  .slice().sort((a, b) => (b.pickedAt ?? b.createdAt) - (a.pickedAt ?? a.createdAt)))
function openEditor(item: PickupItem | null = null) { editing.value = item; mode.value = 'manual'; uni.pageScrollTo({ scrollTop: 0, duration: 200 }) }
function closeEditor() { mode.value = null; editing.value = null }
function saveDraft(draft: PickupDraft) {
  if (editing.value) { if (!edit(editing.value.id, draft)) return }
  else {
    const result = add([draft]); if (!result) return
    if (!result.added) { uni.showToast({ title: '待取件中已有相同记录', icon: 'none' }); return }
    tab.value = 'pending'; query.value = ''
  }
  closeEditor(); uni.showToast({ title: '已保存在本机', icon: 'success' })
}
function saveImport(drafts: PickupDraft[]) {
  const result = add(drafts); if (!result) return
  mode.value = null; tab.value = 'pending'; query.value = ''
  uni.showToast({ title: result.skipped ? `新增 ${result.added} 个，跳过 ${result.skipped} 个重复项` : `已保存 ${result.added} 个取件码`, icon: 'none', duration: 2500 })
}
function markItem(item: PickupItem) {
  if (mark(item.id, item.pickedAt === null)) uni.showToast({ title: item.pickedAt === null ? '已移到已取件' : '已恢复为待取件', icon: 'none' })
}
function deleteItem(item: PickupItem) {
  uni.showModal({ title: '删除这条取件记录？', content: '只删除当前记录，其他取件码不受影响。', confirmText: '删除', confirmColor: '#8D2F38', success: result => { if (result.confirm && remove(item.id)) uni.showToast({ title: '已删除', icon: 'none' }) } })
}
</script>
<template>
  <view class="page pickups-page">
    <text class="eyebrow">冀遇东方 / PICKUP</text>
    <view class="pickup-heading"><view><text class="title editorial-title">取件码，放在一起</text><text class="subtitle">出门取快递，少翻几条消息。</text></view><image class="heading-icon" src="/static/icons/parcel.png" aria-hidden="true"/></view>
    <view class="pickup-summary"><view><text class="summary-number">{{ pendingCount }}</text><text class="summary-unit">件待取</text></view><text class="summary-local">本机保存 · 无需登录</text></view>
    <view class="add-actions"><button class="primary" hover-class="pressed" :disabled="!ready" @click="openEditor()">手动添加</button><button class="secondary" hover-class="pressed" :disabled="!ready" @click="editing = null; mode = 'import'">粘贴通知</button></view>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <button v-if="!ready" class="secondary full spaced" @click="reload">重试读取</button>
    <PickupEditor v-if="mode === 'manual'" :key="editing?.id || 'new'" :initial="editing || undefined" :editing="!!editing" @save="saveDraft" @cancel="closeEditor"/>
    <PickupImport v-if="mode === 'import'" @save="saveImport" @cancel="mode = null"/>
    <template v-if="ready && !mode">
      <view class="pickup-tabs"><button :class="{ active: tab === 'pending' }" :aria-pressed="tab === 'pending'" @click="tab = 'pending'">待取件 {{ pendingCount }}</button><button :class="{ active: tab === 'collected' }" :aria-pressed="tab === 'collected'" @click="tab = 'collected'">已取件 {{ collectedCount }}</button></view>
      <view v-if="items.length" class="search-field"><text class="search-label">查找取件记录</text><input v-model="query" class="input" aria-label="查找取件记录" maxlength="80" placeholder="取件码、快递公司或地点"/></view>
      <PickupCard v-for="item in visibleItems" :key="item.id" :item="item" @show="displayItem = item" @mark="markItem(item)" @edit="openEditor(item)" @remove="deleteItem(item)"/>
      <view v-if="!visibleItems.length" class="pickup-empty panel"><image src="/static/icons/parcel-muted.png" class="empty-icon" aria-hidden="true"/><text class="section-title">{{ query.trim() ? '没有找到对应记录' : tab === 'pending' ? '取件码清清爽爽' : '还没有已取件记录' }}</text><text class="hint">{{ query.trim() ? '试试其他取件码、快递公司或地点。' : tab === 'pending' ? '把收到的取件码加进来，出门时集中查看。' : '取到快递后，点击「标记已取」就会移到这里。' }}</text><button v-if="!query.trim() && tab === 'pending'" class="quiet" @click="openEditor()">添加第一个取件码 ›</button></view>
    </template>
    <text class="pickup-footnote">需主动粘贴通知或手动添加，不会自动读取短信。只保存确认后的取件信息；清除小程序数据或更换设备后需重新添加。取件信息以快递通知和驿站实际核验为准。</text>
    <view v-if="displayItem" class="code-overlay" role="dialog" aria-modal="true" aria-label="出示取件码" @click="displayItem = null">
      <view class="code-sheet" @click.stop><text class="eyebrow">出示取件码</text><text class="display-courier">{{ displayItem.courier || '快递取件' }}</text><text class="display-code" selectable>{{ displayItem.code }}</text><text class="display-location">{{ displayItem.location || '取件地点未填写' }}</text><text v-if="displayItem.note" class="hint">{{ displayItem.note }}</text><button class="primary full spaced" @click="displayItem = null">关闭大字展示</button></view>
    </view>
  </view>
</template>
<style scoped>
.add-actions .primary,.add-actions .secondary,.pickup-tabs button,.code-sheet .primary{min-height:44px}
.pickups-page{max-width:540px}.pickup-heading{display:flex;align-items:center;justify-content:space-between;gap:20rpx}.pickup-heading .title{font-size:44rpx;margin-top:20rpx}.pickup-heading .subtitle{font-size:26rpx;margin-bottom:24rpx}.heading-icon{width:84rpx;height:84rpx;flex-shrink:0}.pickup-summary{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14rpx 0 22rpx;gap:16rpx;margin-bottom:28rpx}.summary-number{font-family:Georgia,serif;font-size:100rpx;color:var(--primary);line-height:1.1}.summary-unit{font-size:27rpx;margin-left:18rpx}.summary-local{font-size:23rpx;color:var(--muted);text-align:right}.add-actions{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}.pickups-page .secondary{border-color:#d7acae;color:var(--primary)}.pickup-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--line);margin:28rpx 0 24rpx}.pickup-tabs button{border-radius:0;background:transparent;color:var(--muted);border-bottom:3px solid transparent}.pickup-tabs .active{color:var(--primary);border-bottom-color:var(--primary);font-weight:600}.search-field{margin:0 0 24rpx}.search-label{display:block;font-size:24rpx;color:var(--muted);margin-bottom:10rpx}.search-field .input{background:var(--surface);border-color:var(--line);font-size:26rpx}.pickup-empty{text-align:center;padding:42rpx 28rpx}.empty-icon{width:82rpx;height:82rpx;margin-bottom:16rpx}.pickup-empty .section-title{margin-bottom:10rpx}.pickup-empty .quiet{margin:20rpx auto 0}.pickup-footnote{display:block;margin-top:30rpx;font-size:23rpx;color:var(--muted);line-height:1.8}.code-overlay{position:fixed;inset:0;z-index:100;background:rgba(35,27,25,.55);display:flex;align-items:center;justify-content:center;padding:32rpx}.code-sheet{background:var(--surface);border-radius:24rpx;width:100%;max-width:480px;padding:40rpx 32rpx;max-height:85vh;overflow-y:auto;text-align:center;box-sizing:border-box}.display-courier{display:block;font-size:28rpx;margin-top:16rpx}.display-code{display:block;font-size:72rpx;line-height:1.4;letter-spacing:2rpx;font-weight:750;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--primary);overflow-wrap:anywhere;word-break:break-all;margin:40rpx 0}.display-location{display:block;font-size:28rpx;overflow-wrap:anywhere}
</style>
