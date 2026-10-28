<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import FeedbackCard from '../../components/FeedbackCard.vue'
import { communityCall, messageTime, STATUS_LABELS, type Dashboard, type Feedback, type FeedbackPage, type FeedbackStatus } from '../../services/community'
const authorized = shallowRef<boolean | null>(null)
const identity = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
const dashboard = shallowRef<Dashboard | null>(null)
const items = shallowRef<Feedback[]>([])
const next = shallowRef<string | null>(null)
const filter = shallowRef('all')
const listLoading = shallowRef(false)
const listError = shallowRef('')
const editing = shallowRef('')
const reply = shallowRef('')
const status = shallowRef<FeedbackStatus>('processing')
const saving = shallowRef(false)
const saveError = shallowRef('')
const filters = [{ value: 'all', label: '全部留言' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]
const statuses: FeedbackStatus[] = ['pending', 'processing', 'resolved']
const maxUsers = computed(() => Math.max(1, ...dashboard.value?.trend.map(item => item.users) || []))
async function loadList(more = false) {
  if (listLoading.value) return
  listLoading.value = true; listError.value = ''
  try {
    const result = await communityCall<FeedbackPage>('adminFeedback', { status: filter.value, ...(more && next.value !== null ? { before: next.value } : {}) })
    items.value = more ? [...items.value, ...result.items] : result.items
    next.value = result.next
  } catch (cause) { listError.value = (cause as Error).message }
  finally { listLoading.value = false }
}
async function load() {
  if (loading.value || saving.value) return
  loading.value = true; error.value = ''
  try {
    const result = await communityCall<{ isAdmin: boolean; openid: string }>('identity')
    authorized.value = result.isAdmin; identity.value = result.openid
    if (!result.isAdmin) { dashboard.value = null; items.value = []; return }
    dashboard.value = await communityCall<Dashboard>('dashboard')
    await loadList()
  } catch (cause) { error.value = (cause as Error).message }
  finally { loading.value = false }
}
async function selectFilter(value: string) {
  if (listLoading.value || saving.value) return
  filter.value = value; items.value = []; next.value = null; editing.value = ''
  await loadList()
}
function edit(item: Feedback) { editing.value = item.id; reply.value = item.reply; status.value = item.status; saveError.value = '' }
async function save() {
  if (saving.value) return
  saving.value = true; saveError.value = ''
  try {
    await communityCall('replyFeedback', { id: editing.value, reply: reply.value, status: status.value })
    editing.value = ''
    uni.showToast({ title: '已保存回复', icon: 'success' })
    await loadList()
    dashboard.value = await communityCall<Dashboard>('dashboard')
  } catch (cause) { saveError.value = (cause as Error).message }
  finally { saving.value = false }
}
function copyIdentity() { uni.setClipboardData({ data: identity.value }) }
onShow(() => { void load() })
</script>
<template>
  <view class="page admin-page">
    <text class="eyebrow">冀遇东方 / AUTHOR DESK</text><text class="title editorial-title">作者工作台</text><text class="subtitle">每一个想法，都值得被听见。</text>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <button class="secondary full spaced" :disabled="loading || saving" @click="load()">{{ loading ? '正在读取…' : '刷新后台' }}</button>
    <view v-if="authorized === false" class="panel denied"><text class="section-title">此页面仅对作者开放</text><text class="muted">当前微信账号没有管理权限，无法查看他人的留言和使用数据。</text><button class="quiet full spaced" @click="copyIdentity">复制当前账号标识</button></view>
    <template v-if="authorized">
      <view v-if="dashboard" class="stats">
        <view class="panel metric"><text>累计使用人数</text><text class="number">{{ dashboard.totalUsers }}</text></view><view class="panel metric"><text>今日使用人数</text><text class="number">{{ dashboard.todayUsers }}</text></view><view class="panel metric pending"><text>待查看留言</text><text class="number">{{ dashboard.pending }}</text></view>
      </view>
      <view v-if="dashboard" class="panel trend"><text class="section-title">最近 7 天</text><view v-for="item in dashboard.trend" :key="item.day" class="trend-row"><text>{{ item.day.slice(5) }}</text><view class="track"><view class="bar" :style="{ width: `${item.users / maxUsers * 100}%` }"/></view><text>{{ item.users }} 人</text></view><text class="hint">北京时间 · 同一微信用户每日去重，从接入后开始累计。网页预览和开发者工具不计入，手机体验版计入。</text><text class="hint">更新于 {{ messageTime(dashboard.updatedAt) }}</text></view>
      <view class="section-heading"><text class="editorial-title">收到的留言</text></view>
      <view class="filters"><button v-for="option in filters" :key="option.value" :class="{ selected: filter === option.value }" :disabled="listLoading || saving" @click="selectFilter(option.value)">{{ option.label }}</button></view>
      <text v-if="listError" class="error" role="alert">{{ listError }}</text>
      <text v-if="saveError" class="error" role="alert">{{ saveError }}</text>
      <text v-if="listLoading" class="hint">正在加载留言…</text>
      <view v-else-if="!listError && !items.length" class="panel muted">这个分类暂时没有留言。</view>
      <FeedbackCard v-for="item in items" :key="item.id" :item="item" admin>
        <template v-if="editing === item.id"><label class="field"><text class="label">回复给同学</text><textarea v-model="reply" class="reply-input" :disabled="saving" maxlength="1000" :show-confirm-bar="false" placeholder="回复仅留言本人可见"/></label><picker :range="statuses.map(value => STATUS_LABELS[value])" :value="statuses.indexOf(status)" :disabled="saving" @change="status = statuses[Number($event.detail.value)]"><view class="picker">处理状态：{{ STATUS_LABELS[status] }} ›</view></picker><view class="actions"><button class="secondary" :disabled="saving" @click="editing = ''">取消</button><button class="primary" :disabled="saving" :loading="saving" @click="save">保存</button></view></template>
        <button v-else class="quiet full spaced" :disabled="saving" @click="edit(item)">回复 / 更新状态</button>
      </FeedbackCard>
      <button v-if="next !== null" class="secondary full" :disabled="listLoading || saving" @click="loadList(true)">查看更多留言</button>
    </template>
  </view>
</template>
<style scoped>
.admin-page{max-width:620px}.admin-page .title{font-size:48rpx}.stats{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-top:24rpx}.metric{margin:0;min-width:0}.metric>text:first-child{font-size:25rpx;color:var(--muted)}.number{display:block;font:64rpx Georgia,serif;color:var(--primary);margin-top:16rpx;overflow-wrap:anywhere}.pending{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between}.pending .number{font-size:44rpx;margin:0}.trend{margin-top:24rpx}.trend-row{display:flex;gap:20rpx;align-items:center;font-size:24rpx;margin:18rpx 0}.trend-row>text:first-child{width:76rpx}.trend-row>text:last-child{min-width:64rpx;text-align:right}.track{height:16rpx;background:var(--soft);border-radius:8rpx;flex:1;overflow:hidden}.bar{height:100%;background:var(--primary);border-radius:8rpx}.filters{display:flex;flex-wrap:wrap;gap:12rpx;margin-bottom:24rpx}.page .filters button{padding:16rpx 18rpx;font-size:24rpx;border:1px solid var(--line)}.page .filters .selected{background:var(--soft);color:var(--primary);border-color:var(--primary)}.reply-input{width:100%;height:220rpx;border:1px solid #b6c2b6;border-radius:10rpx;padding:20rpx;box-sizing:border-box;font:inherit}.actions{display:flex;gap:16rpx;margin-top:20rpx}.actions button{flex:1}.denied{margin-top:24rpx}
</style>
