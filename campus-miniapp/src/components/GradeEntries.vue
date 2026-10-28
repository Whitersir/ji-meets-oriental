<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { GradeEntry } from '../domain/grades'
const props = defineProps<{ entries: GradeEntry[] }>()
const visibleCount = shallowRef(30)
const visible = computed(() => props.entries.slice(0, visibleCount.value))
watch(() => props.entries, () => { visibleCount.value = 30 })
function details(entry: GradeEntry) {
  const fields = [['学期', entry.term], ['课程编号', entry.courseCode], ['成绩', entry.score || '文件未提供'], ['成绩标识', entry.scoreStatus], ['学分', entry.credits], ['绩点', entry.gradePoint], ['总学时', entry.hours], ['补重学期', entry.retakeTerm], ['考核方式', entry.examMethod], ['考试性质', entry.examNature], ['课程属性', entry.attribute], ['课程性质', entry.nature], ['通选课类别', entry.category]]
  uni.showModal({ title: entry.name, content: fields.filter(([, value]) => value).map(([label, value]) => `${label}：${value}`).join('\n'), showCancel: false, confirmText: '知道了' })
}
</script>
<template>
  <view class="grade-list">
    <button v-for="(entry, index) in visible" :key="index" class="grade-row" hover-class="pressed" @click="details(entry)"><view class="course-copy"><text class="course-name">{{ entry.name }}</text><text class="course-meta">{{ entry.term || '学期待补填' }}<template v-if="entry.credits"> · {{ entry.credits }} 学分</template></text><text v-if="entry.examNature || entry.scoreStatus" class="course-meta">{{ [entry.examNature, entry.scoreStatus].filter(Boolean).join(' · ') }}</text></view><text class="grade-score">{{ entry.score || '未提供' }}</text></button>
    <button v-if="visibleCount < entries.length" class="quiet full" hover-class="pressed" @click="visibleCount += 30">再显示 {{ Math.min(30, entries.length - visibleCount) }} 门</button>
  </view>
</template>
<style scoped>
.page .grade-row{width:100%;justify-content:space-between;text-align:left;padding:24rpx 0;border-radius:0;border-bottom:1px solid var(--line);gap:20rpx;min-height:112rpx;background:transparent}.grade-row:last-child{border-bottom:0}.course-copy{min-width:0;flex:1}.course-name{display:block;font-size:29rpx;font-weight:600;overflow-wrap:anywhere}.course-meta{display:block;font-size:24rpx;color:var(--muted);margin-top:6rpx;overflow-wrap:anywhere}.grade-score{font-size:36rpx;font-weight:650;color:var(--primary);max-width:38%;overflow-wrap:anywhere;flex-shrink:0}
</style>
