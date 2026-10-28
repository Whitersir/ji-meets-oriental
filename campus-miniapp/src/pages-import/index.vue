<script setup lang="ts">
import CopyLinkButton from '../components/CopyLinkButton.vue'
import { computed, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CourseEditor from '../components/CourseEditor.vue'
import SchoolCalendarPreset from '../components/SchoolCalendarPreset.vue'
import type { AcademicTerm } from '../domain/academic-calendar'
import { assertTimetable, conflicts, deduplicate, validMonday, type Course, type Timetable } from '../domain/schedule'
import { loadTimetable, saveTimetable } from '../services/storage'
import { parseExcel, type SheetResult } from './excel'
import { selectExcel } from './files'
const sheets=shallowRef<SheetResult[]>([])
const sheetIndex=shallowRef(0)
const draft=shallowRef<Course[]>([])
const fileName=shallowRef('')
const term=shallowRef('')
const startDate=shallowRef('')
const totalWeeks=shallowRef('20')
const mode=shallowRef<'replace'|'merge'>('replace')
const old=shallowRef<Timetable|null>(null)
const busy=shallowRef(false)
const error=shallowRef('')
const acknowledged=shallowRef(false)
const editingIds=shallowRef<string[]>([])
const selected=computed(()=>sheets.value[sheetIndex.value]?.result)
const sheetNames=computed(()=>sheets.value.map(s=>`${s.name} · ${s.result.courses.length} 条`))
const invalidCount=computed(()=>draft.value.filter(c=>!c.weeks.length||!c.sections.length).length)
const conflictCount=computed(()=>conflicts(mode.value==='merge'&&old.value?deduplicate([...old.value.courses,...draft.value]):draft.value))
const missingTeacher=computed(()=>draft.value.filter(c=>!c.teacher).length)
const missingRoom=computed(()=>draft.value.filter(c=>!c.room).length)
const validTotal=computed(()=>Number.isInteger(Number(totalWeeks.value))&&Number(totalWeeks.value)>=1&&Number(totalWeeks.value)<=30)
const canSave=computed(()=>draft.value.length>0&&!invalidCount.value&&!busy.value&&!editingIds.value.length&&validTotal.value&&validMonday(startDate.value)&&!!term.value.trim()&&(!(selected.value?.skipped)||acknowledged.value))
onLoad(()=>{try{old.value=loadTimetable();if(old.value){startDate.value=old.value.startDate;totalWeeks.value=String(old.value.totalWeeks);term.value=old.value.term}}catch{error.value='原有课表无法读取；文件仍留在本地。确认新课表后可以替换。'}})
function setSheet(index:number){
  sheetIndex.value=index
  const result=sheets.value[index].result
  draft.value=result.courses.map(c=>({...c,sections:[...c.sections],weeks:[...c.weeks]}))
  if(result.term)term.value=result.term
  acknowledged.value=false;editingIds.value=[]
  totalWeeks.value=String(Math.max(Number(totalWeeks.value)||20,...draft.value.flatMap(c=>c.weeks)))
}
function confirmDiscard():Promise<boolean>{return new Promise(resolve=>{if(!draft.value.length)return resolve(true);uni.showModal({title:'更换导入内容？',content:'当前预览中的修改会丢弃，已保存的课表不受影响。',confirmText:'继续',success:r=>resolve(r.confirm),fail:()=>resolve(false)})})}
async function choose(){
  if(busy.value||!await confirmDiscard())return
  busy.value=true;error.value=''
  try{
    const file=await selectExcel();if(!file)return
    // 等待原生 loading 反馈绘制后，再进行本地解析。
    uni.showLoading({title:'正在读取课表',mask:true})
    await new Promise(resolve=>setTimeout(resolve,40))
    const parsed=parseExcel(file.data)
    sheets.value=parsed;fileName.value=file.name
    setSheet(parsed.findIndex(s=>s.result.courses.length>0))
  }catch(e){error.value=e instanceof Error?e.message:'读取失败，请重新选择 Excel'}finally{uni.hideLoading();busy.value=false}
}
async function changeSheet(e:{detail:{value:string}}){const index=Number(e.detail.value);if(index!==sheetIndex.value&&await confirmDiscard())setSheet(index)}
function changeMode(e:{detail:{value:string}}){mode.value=e.detail.value==='merge'?'merge':'replace'}
function applyCalendar(preset: AcademicTerm) { startDate.value=preset.startDate;totalWeeks.value=String(Math.max(preset.totalWeeks,...draft.value.flatMap(c=>c.weeks))) }
function updateCourse(course:Course){draft.value=draft.value.map(c=>c.id===course.id?course:c)}
function markEditing(id:string,editing:boolean){editingIds.value=editing?[...new Set([...editingIds.value,id])]:editingIds.value.filter(v=>v!==id)}
function removeCourse(id:string){uni.showModal({title:'移除这条排课？',content:'只影响本次导入预览。',confirmText:'移除',success:r=>{if(r.confirm){draft.value=draft.value.filter(c=>c.id!==id);markEditing(id,false)}}})}
async function save(){
  error.value=''
  if(!canSave.value)return
  const previous=old.value
  if(mode.value==='merge'&&previous&&(previous.term.trim()!==term.value.trim()||previous.startDate!==startDate.value)){error.value='合并需要学期名称和第一周日期与已有课表一致，避免把不同学期混在一起。';return}
  const courses=deduplicate(mode.value==='merge'&&previous?[...previous.courses,...draft.value]:draft.value).map((c,i)=>({...c,id:`saved-${i}`}))
  const timetable:Timetable={version:1,term:term.value.trim(),startDate:startDate.value,totalWeeks:Number(totalWeeks.value),courses,importedAt:new Date().toISOString(),fileNames:mode.value==='merge'&&previous?[...new Set([...previous.fileNames,fileName.value])]:[fileName.value]}
  try{assertTimetable(timetable)}catch(e){error.value=e instanceof Error?e.message:'课表信息不完整';return}
  if(previous&&mode.value==='replace'){
    const confirmed=await new Promise<boolean>(resolve=>uni.showModal({title:'替换已有课表？',content:`将用本次的 ${courses.length} 条排课替换当前课表。原始 Excel 不受影响。`,confirmText:'确认替换',success:r=>resolve(r.confirm),fail:()=>resolve(false)}))
    if(!confirmed)return
  }
  busy.value=true
  try{saveTimetable(timetable);uni.showToast({title:'课表已保存',icon:'success'});uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/schedule/index'})})}catch{error.value='本地保存失败，可能是存储空间不足。预览已保留，请腾出空间后重试。'}finally{busy.value=false}
}
</script>
<template>
  <view class="page import-page">
    <text class="eyebrow">一学期，一次导入</text><text class="title">带上你的课表</text><text class="subtitle">从教务导出 Excel，在这里确认后保存。</text>
    <view class="panel guide"><text class="section-title">先把文件准备好</text><view class="step"><text class="step-number">1</text><text>登录学校教务，选择「进入首页」。</text></view><view class="step"><text class="step-number">2</text><text>培养管理 → 我的课表 → 学期理论课表 → 导出。</text></view><view class="step"><text class="step-number">3</text><text>把 Excel 发到微信文件传输助手，再选择文件。</text></view><view class="spaced"><CopyLinkButton url="http://219.148.95.56:10000/jsxsd/" label="复制学校教务网址" instruction="在浏览器登录后，依次进入：首页 → 培养管理 → 我的课表 → 学期理论课表 → 导出。"/></view></view>
    <button class="primary full choose-button" hover-class="pressed" :loading="busy" :disabled="busy" @click="choose">{{ fileName?'选择另一份 Excel':'选择 Excel 课表' }}</button>
    <text class="hint centered">支持 .xls / .xlsx · 最大 5 MB · 在设备本地解析</text>
    <text v-if="error" class="error" role="alert">{{ error }}</text>
    <template v-if="fileName && selected">
      <view class="panel spaced"><text class="section-title">确认导入内容</text><text class="filename">{{ fileName }}</text><view v-if="sheets.length>1" class="field"><text class="label">工作表（每次导入一张）</text><picker :range="sheetNames" :value="sheetIndex" @change="changeSheet"><view class="picker">{{ sheetNames[sheetIndex] }}</view></picker><text class="hint">理论课和实验课分在不同工作表时，可分两次导入并选择合并。</text></view><label class="field"><text class="label">学期名称</text><input v-model="term" class="input" placeholder="例如 2026-2027-1" maxlength="40" /></label><view class="field"><text class="label">第一教学周的周一</text><view class="row"><input v-model="startDate" class="input date-input" aria-label="第一教学周的周一" placeholder="例如 2026-08-31" maxlength="10" /><picker mode="date" :value="startDate" @change="startDate=$event.detail.value"><view class="picker calendar-button">日历</view></picker></view><text class="hint">用于计算当前周。请以学校校历为准，选择周一。</text><text v-if="startDate&&!validMonday(startDate)" class="needs-fix">所选日期不是周一，请重新选择。</text></view><SchoolCalendarPreset :term="term" @apply="applyCalendar"/><label class="field"><text class="label">学期总周数（1–30）</text><input v-model="totalWeeks" class="input" type="number" maxlength="2" /></label><view v-if="old" class="field"><text class="label">如何保存这次课表</text><radio-group class="save-mode" @change="changeMode"><label><radio value="replace" :checked="mode==='replace'" color="#254e42"/>替换已有课表</label><label><radio value="merge" :checked="mode==='merge'" color="#254e42"/>合并到已有课表（如实验课）</label></radio-group></view></view>
      <view class="panel"><view class="row"><text class="section-title">识别到 {{ draft.length }} 条排课</text><text class="badge">保存前可修改</text></view><text class="hint">教师缺失 {{ missingTeacher }} 条 · 教室缺失 {{ missingRoom }} 条</text><view v-if="selected.warnings.length||conflictCount" class="notice"><text v-for="warning in selected.warnings" :key="warning" class="warning-line">{{ warning }}</text><text v-if="conflictCount" class="warning-line">发现 {{ conflictCount }} 组时间重叠，请核对是否为选修课或重复记录。</text></view><text v-if="!draft.length" class="error">这张工作表没有可保存的课程，请换一张工作表。</text><CourseEditor v-for="course in draft" :key="course.id" :course="course" @update="updateCourse" @editing="markEditing(course.id,$event)" @remove="removeCourse(course.id)"/><checkbox-group v-if="selected.skipped" @change="acknowledged=$event.detail.value.includes('checked')"><label class="acknowledgement"><checkbox value="checked" :checked="acknowledged" color="#254e42"/><text>我已核对原表，确认有 {{ selected.skipped }} 个未识别内容不会导入。</text></label></checkbox-group></view>
      <text v-if="!validTotal" class="error">学期总周数需要填写 1–30 之间的整数。</text>
      <text v-if="invalidCount" class="error">还有 {{ invalidCount }} 条课程需要确认周次或节次。</text><text v-if="editingIds.length" class="hint">请先保存或取消课程编辑，再确认导入。</text>
      <button class="primary full" hover-class="pressed" :disabled="!canSave" :loading="busy" @click="save">确认并保存课表</button>
      <text class="hint centered">确认前不会修改已有课表。文件不上传，也不需要教务密码。</text>
    </template>
  </view>
</template>
<style scoped>
.import-page{max-width:780px}.date-input{flex:1;min-width:0}.calendar-button{white-space:nowrap}.guide{margin-top:28rpx}.step{display:flex;gap:20rpx;margin:24rpx 0;align-items:flex-start}.step-number{display:flex;flex-shrink:0;align-items:center;justify-content:center;width:44rpx;height:44rpx;border-radius:8rpx;background:var(--soft);font-weight:650;color:var(--primary)}.choose-button{margin-top:32rpx}.centered{text-align:center}.filename{display:block;color:var(--muted);overflow-wrap:anywhere}.warning-line{display:block;margin:8rpx 0}.needs-fix{display:block;color:var(--danger);font-size:24rpx;margin-top:12rpx}.save-mode label{display:flex;align-items:center;gap:12rpx;min-height:96rpx}.acknowledgement{display:flex;gap:14rpx;align-items:flex-start;margin-top:24rpx;font-size:26rpx}
</style>
