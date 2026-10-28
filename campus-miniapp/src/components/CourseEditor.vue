<script setup lang="ts">
import { onUnmounted, reactive, shallowRef, watch } from 'vue'
import { DAY_NAMES, formatWeeks, type Course } from '../domain/schedule'
import { numberList, parseSections } from '../domain/numbers'
const props=defineProps<{course:Course}>()
const emit=defineEmits<{update:[course:Course]; remove:[]; editing:[value:boolean]}>()
const editing=shallowRef(false)
watch(editing,value=>emit('editing',value))
onUnmounted(()=>emit('editing',false))
const error=shallowRef('')
const draft=reactive({name:'',teacher:'',room:'',day:1,sections:'',weeks:''})
watch(()=>props.course,c=>Object.assign(draft,{name:c.name,teacher:c.teacher,room:c.room,day:c.day,sections:c.sections.join(','),weeks:c.weeks.join(',')}),{immediate:true})
function toggle(){
  const c=props.course
  Object.assign(draft,{name:c.name,teacher:c.teacher,room:c.room,day:c.day,sections:c.sections.join(','),weeks:c.weeks.join(',')})
  error.value='';editing.value=!editing.value
}
function save(){
  const weeks=numberList(draft.weeks),sections=parseSections(draft.sections)
  if(!draft.name.trim()||!weeks.length||!sections.length){error.value='请填写课程名称、有效节次和周次（例如 1-16 或 1,3,5）';return}
  emit('update',{...props.course,name:draft.name.trim(),teacher:draft.teacher.trim(),room:draft.room.trim(),day:draft.day,weeks,sections})
  editing.value=false;error.value=''
}
</script>
<template>
  <view class="course-editor">
    <view class="row">
      <view class="summary">
        <text class="course-title">{{ course.name }}</text>
        <text class="hint">{{ DAY_NAMES[course.day-1] }} · {{ course.sections.length ? `第 ${course.sections.join('、')} 节` : '节次待修正' }}</text>
        <text class="hint">{{ formatWeeks(course.weeks) }} · {{ course.room || '教室未提供' }}</text>
      </view>
      <button class="quiet" hover-class="pressed" :aria-label="`${editing?'取消编辑':'编辑'}${course.name}`" @click="toggle">{{ editing ? '取消' : '编辑' }}</button>
    </view>
    <text v-if="!course.weeks.length || !course.sections.length" class="needs-fix">请确认这门课的周次与节次</text>
    <view v-if="editing" class="edit-area">
      <label class="field"><text class="label">课程名称</text><input v-model="draft.name" class="input" maxlength="120" /></label>
      <label class="field"><text class="label">教师（选填）</text><input v-model="draft.teacher" class="input" maxlength="80" /></label>
      <label class="field"><text class="label">教室（选填）</text><input v-model="draft.room" class="input" maxlength="120" /></label>
      <view class="field"><text class="label">星期</text><picker :range="DAY_NAMES" :value="draft.day-1" @change="draft.day=Number($event.detail.value)+1"><view class="picker">{{ DAY_NAMES[draft.day-1] }}</view></picker></view>
      <label class="field"><text class="label">节次</text><input v-model="draft.sections" class="input" placeholder="例如 1-2 或 3,4" maxlength="60" /></label>
      <label class="field"><text class="label">上课周次</text><input v-model="draft.weeks" class="input" placeholder="例如 1-16；单周填 1,3,5,7…" maxlength="160" /></label>
      <text class="hint">文件原文</text><text class="raw" selectable>{{ course.raw }}</text>
      <text v-if="error" class="error" role="alert">{{ error }}</text>
      <view class="row"><button class="quiet remove" hover-class="pressed" @click="emit('remove')">移除这条</button><button class="primary" hover-class="pressed" @click="save">保存修改</button></view>
    </view>
  </view>
</template>
<style scoped>
.course-editor { border-top:1px solid var(--line); padding:24rpx 0; }
.course-title { font-weight:650; display:block; overflow-wrap:anywhere; }
.summary { min-width:0; flex:1; }
.needs-fix { color:var(--danger); font-size:24rpx; display:block; margin-top:12rpx; }
.edit-area { margin-top:20rpx; }
.raw { display:block; white-space:pre-wrap; padding:20rpx; background:var(--paper); font-size:24rpx; margin-bottom:24rpx; overflow-wrap:anywhere; }
.remove { color:var(--danger); }
</style>
