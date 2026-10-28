<script setup lang="ts">
import CopyLinkButton from '../components/CopyLinkButton.vue'
import { computed, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import GradeEntries from '../components/GradeEntries.vue'
import { appendGradeSnapshot, gradeTerms, hasPublishedScore, listedCredits, type GradeEntry, type GradeSnapshot } from '../domain/grades'
import { loadGrades, saveGrades } from '../services/grades'
import { parseGradeExcel, type GradeSheetResult } from './grades-excel'
import { selectExcel } from './files'

const snapshots = shallowRef<GradeSnapshot[]>([])
const selectedId = shallowRef('')
const sheetIndex = shallowRef(0)
const sheets = shallowRef<GradeSheetResult[]>([])
const fileName = shallowRef('')
const fallbackTerm = shallowRef('')
const filterTerm = shallowRef('全部学期')
const search = shallowRef('')
const error = shallowRef('')
const busy = shallowRef(false)
const acknowledged = shallowRef(false)
const storageReadable = shallowRef(true)
const selected = computed(() => snapshots.value.find(snapshot => snapshot.id === selectedId.value) ?? snapshots.value[0])
const preview = computed(() => sheets.value[sheetIndex.value])
const draft = computed<GradeEntry[]>(() => (preview.value?.entries ?? []).map(entry => ({ ...entry, term: entry.term || fallbackTerm.value.trim() })))
const needsTerm = computed(() => !!preview.value?.entries.some(entry => !entry.term))
const snapshotLabels = computed(() => snapshots.value.map(snapshot => `${gradeTerms(snapshot.entries).join(' / ')} · ${snapshot.entries.length} 门 · ${dateLabel(snapshot.savedAt)}`))
const selectedSnapshotIndex = computed(() => Math.max(0, snapshots.value.findIndex(item => item.id === selected.value?.id)))
const sheetLabels = computed(() => sheets.value.map(sheet => `${sheet.name} · ${sheet.entries.length} 门`))
const terms = computed(() => ['全部学期', ...gradeTerms(selected.value?.entries ?? [])])
const displayed = computed(() => (selected.value?.entries ?? []).filter(entry => (filterTerm.value === '全部学期' || entry.term === filterTerm.value) && (!search.value.trim() || `${entry.name} ${entry.courseCode}`.includes(search.value.trim()))))
const canSave = computed(() => storageReadable.value && !busy.value && draft.value.length > 0 && draft.value.every(entry => !!entry.term) && draft.value.some(entry => hasPublishedScore(entry.score)) && (!preview.value?.warnings.length || acknowledged.value))

onLoad(() => { try { snapshots.value = loadGrades() } catch (cause) { storageReadable.value = false; error.value = cause instanceof Error ? cause.message : '旧成绩无法读取，原有数据未修改。' } })
function dateLabel(value: string) { return value.slice(0, 10) }
function confirmDiscard(): Promise<boolean> {
  return new Promise(resolve => { if (!sheets.value.length) { resolve(true); return }; uni.showModal({ title: '放弃本次预览？', content: '已保存的成绩留档不会改变。', confirmText: '放弃预览', success: result => resolve(result.confirm), fail: () => resolve(false) }) })
}
async function choose() {
  if (busy.value || !await confirmDiscard()) return
  busy.value = true; error.value = ''
  try {
    const file = await selectExcel()
    if (!file) return
    uni.showLoading({ title: '正在读取成绩', mask: true })
    await new Promise(resolve => setTimeout(resolve, 40))
    const parsed = parseGradeExcel(file.data)
    sheets.value = parsed; fileName.value = file.name; fallbackTerm.value = ''; acknowledged.value = false
    sheetIndex.value = parsed.findIndex(sheet => sheet.entries.some(entry => hasPublishedScore(entry.score)))
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '读取失败，请重新选择成绩 Excel。' }
  finally { uni.hideLoading(); busy.value = false }
}
function changeSheet(event: { detail: { value: string } }) { sheetIndex.value = Number(event.detail.value); fallbackTerm.value = ''; acknowledged.value = false }
async function cancelPreview() { if (await confirmDiscard()) { sheets.value = []; fileName.value = ''; fallbackTerm.value = ''; acknowledged.value = false } }
function changeSnapshot(event: { detail: { value: string } }) { selectedId.value = snapshots.value[Number(event.detail.value)]?.id ?? ''; filterTerm.value = '全部学期'; search.value = '' }
function changeTerm(event: { detail: { value: string } }) { filterTerm.value = terms.value[Number(event.detail.value)] ?? '全部学期' }
function save() {
  if (!canSave.value) return
  error.value = ''; busy.value = true
  try {
    const next = appendGradeSnapshot(snapshots.value, draft.value, fileName.value)
    saveGrades(next)
    snapshots.value = next; selectedId.value = next[0].id; filterTerm.value = '全部学期'; search.value = ''; sheets.value = []; fileName.value = ''; acknowledged.value = false
    uni.showToast({ title: '成绩已保存在本机', icon: 'success' })
  } catch (cause) { error.value = `保存未完成：${cause instanceof Error ? cause.message : '存储空间可能不足。'} 预览和旧留档均已保留。` }
  finally { busy.value = false }
}
function removeSelected() {
  const snapshot = selected.value
  if (!snapshot || !storageReadable.value) return
  uni.showModal({ title: '删除这份成绩留档？', content: '仅删除当前这次留档，其他留档及原始 Excel 不受影响。', confirmText: '删除留档', confirmColor: '#8D2F38', success: result => {
    if (!result.confirm) return
    try { const next = snapshots.value.filter(item => item.id !== snapshot.id); saveGrades(next); snapshots.value = next; selectedId.value = ''; filterTerm.value = '全部学期'; search.value = '' }
    catch { error.value = '删除未完成，旧留档仍保留，请重试。' }
  } })
}
</script>

<template>
  <view class="page grades-page">
    <view class="row"><text class="eyebrow">冀遇东方 / ACADEMIC RECORD</text><text class="badge">本机留档</text></view>
    <text class="title editorial-title">成绩查询</text><text class="subtitle">把努力的结果，留在自己手里。</text>
    <view class="panel import-panel"><text class="section-title">趁成绩开放，留一份记录</text><text class="body-copy">在教务系统查询成绩后点击「导出」，将 Excel 发到微信文件传输助手，再选择文件。核对后保存，学校关闭查询后也能查看这份留档。</text><button class="primary full spaced" :loading="busy" :disabled="busy || !storageReadable" hover-class="pressed" @click="choose">选择成绩 Excel</button><view class="spaced"><CopyLinkButton url="http://219.148.95.56:10000/jsxsd/" label="复制学校教务网址" instruction="在浏览器自行登录，进入「学籍成绩 → 我的成绩 → 课程成绩查询」，选择学期、查询后点击「导出」。请在学校开放查询且有成绩时导出。"/></view><text class="hint">支持 .xls / .xlsx，最大 5 MB；在本机读取，不需要提供教务密码。</text></view>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <view v-if="preview" class="panel preview-panel"><view class="row"><text class="section-title">导入预览</text><text class="badge">尚未保存</text></view><text class="filename">{{ fileName }}</text><label v-if="sheets.length > 1" class="field"><text class="label">选择工作表</text><picker :range="sheetLabels" :value="sheetIndex" @change="changeSheet"><view class="picker">{{ sheetLabels[sheetIndex] }} ▾</view></picker></label><label v-if="needsTerm" class="field"><text class="label">补填缺失的学期</text><input v-model="fallbackTerm" class="input" maxlength="40" placeholder="例如 2026-2027-1"/><text class="hint">仅补充文件中没有学期的课程，请先确认所选工作表属于同一学期。</text></label><text class="hint">识别 {{ draft.length }} 门课程，成绩按文件原文显示。每次保存会新增留档，保留旧记录。</text><view v-if="preview.warnings.length" class="notice"><text v-for="(warning, index) in preview.warnings" :key="index" class="warning-line">{{ warning }}</text><checkbox-group @change="acknowledged = $event.detail.value.includes('checked')"><label class="acknowledgement"><checkbox value="checked" :checked="acknowledged" color="#8D2F38"/><text>我已核对上述提示与原始 Excel</text></label></checkbox-group></view><GradeEntries :entries="draft"/><button class="primary full spaced" :disabled="!canSave" :loading="busy" hover-class="pressed" @click="save">确认并保存这次成绩</button><button class="quiet full" :disabled="busy" hover-class="pressed" @click="cancelPreview">取消本次导入</button></view>
    <view v-if="selected" class="panel saved-panel"><view class="row"><text class="section-title">已保存的成绩</text><text class="badge">{{ snapshots.length }} 份留档</text></view><label class="field"><text class="label">选择保存记录</text><picker :range="snapshotLabels" :value="selectedSnapshotIndex" @change="changeSnapshot"><view class="picker">{{ snapshotLabels[selectedSnapshotIndex] }} ▾</view></picker></label><text class="filename">来源：{{ selected.fileName }}</text><text class="hint">保存于 {{ new Date(selected.savedAt).toLocaleString('zh-CN') }} · 保存后可离线查看</text><label v-if="terms.length > 2" class="field"><text class="label">按学期筛选</text><picker :range="terms" :value="Math.max(0, terms.indexOf(filterTerm))" @change="changeTerm"><view class="picker">{{ filterTerm }} ▾</view></picker></label><label class="field"><text class="label">搜索课程</text><input v-model="search" class="input" maxlength="200" placeholder="课程名称或课程编号"/></label><view class="summary"><text>{{ displayed.length }} 门课程</text><text>明细学分合计 {{ listedCredits(displayed) }}</text></view><text class="hint">学分按当前明细相加，含重复修读，不代表已获得学分。</text><GradeEntries :entries="displayed"/><text v-if="!displayed.length" class="hint">没有匹配的课程，请调整搜索或学期。</text><button class="quiet full spaced" hover-class="pressed" @click="removeSelected">删除当前这份留档</button></view>
    <view v-else-if="!preview" class="panel empty-panel"><text class="section-title">还没有保存的成绩</text><text class="body-copy">学校通常只在每学期指定的几天开放成绩查询。现在没有成绩时，请等开放后导出并导入；这里不会从空页面恢复未保存过的成绩。</text></view>
    <text class="hint footnote">这里显示你确认保存的历史成绩，不会自动同步教务变动；成绩以学校为准。请保留原始 Excel，更换设备、卸载或清除小程序数据可能丢失本机留档。</text>
  </view>
</template>

<style scoped>
.grades-page{max-width:680px}.grades-page>.title{font-size:50rpx;margin-top:24rpx}.import-panel{border-top:3px solid var(--primary)}.body-copy{display:block;font-size:27rpx;line-height:1.8;color:var(--muted)}.filename{display:block;color:var(--muted);font-size:24rpx;overflow-wrap:anywhere}.preview-panel{border-color:var(--primary)}.section-title{margin-bottom:12rpx}.summary{display:flex;justify-content:space-between;gap:16rpx;flex-wrap:wrap;background:var(--soft);padding:20rpx;border-radius:10rpx;color:var(--primary);font-size:25rpx}.warning-line{display:block;margin-bottom:8rpx}.acknowledgement{display:flex;align-items:flex-start;gap:12rpx;margin-top:20rpx;font-size:26rpx}.picker{overflow-wrap:anywhere;white-space:normal}.footnote{line-height:1.8}.empty-panel{padding:36rpx 28rpx}
</style>
