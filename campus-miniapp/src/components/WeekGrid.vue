<script setup lang="ts">
import { computed } from 'vue'
import { DAY_NAMES, PERIODS, dateAt, type Course } from '../domain/schedule'
const props=defineProps<{courses:Course[];week:number;startDate:string}>()
const emit=defineEmits<{select:[course:Course]}>()
const colors=['mint','sand','lavender','blue','rose']
function color(name:string){return colors[Array.from(name).reduce((sum,c)=>sum+c.charCodeAt(0),0)%colors.length]}
const days=computed(()=>DAY_NAMES.map((name,i)=>{const d=dateAt(props.startDate,(props.week-1)*7+i);return {name,date:`${d.getMonth()+1}.${d.getDate()}`,today:d.toDateString()===new Date().toDateString()}}))
const rows=computed(()=>{
  const max=Math.max(10,...props.courses.flatMap(c=>c.sections))
  const periods=[...PERIODS]
  for(let i=5;i<Math.ceil(max/2);i++)periods.push({name:`第${i+1}大节`,sections:[i*2+1,i*2+2],time:'时间待确认'})
  return periods.map(period=>({...period,days:DAY_NAMES.map((_,i)=>({day:i+1,courses:props.courses.filter(c=>c.day===i+1&&c.weeks.includes(props.week)&&c.sections.some(s=>period.sections.includes(s))).map(c=>({...c,color:color(c.name)}))}))}))
})
</script>
<template>
  <view class="timetable">
    <view class="grid-header"><view class="corner">节次</view><view v-for="day in days" :key="day.name" class="day" :class="{today:day.today}"><text>{{ day.name }}</text><text class="date">{{ day.date }}</text><text v-if="day.today" class="today-label">今天</text></view></view>
    <view v-for="row in rows" :key="row.name" class="grid-row">
      <view class="period"><text>{{ row.sections.join('–') }}</text><view class="time"><text v-for="part in row.time.split('–')" :key="part" class="time-part">{{ part }}</text></view></view>
      <view v-for="day in row.days" :key="day.day" class="cell">
        <button v-for="course in day.courses" :key="course.id" class="course" :class="course.color" hover-class="pressed" :aria-label="`${course.name}，${course.room||'教室未提供'}，点击查看详情`" @click="emit('select',course)"><text class="name">{{ course.name }}</text><text v-if="course.room" class="room">{{ course.room }}</text></button>
      </view>
    </view>
  </view>
</template>
<style scoped>
.timetable { border:1px solid var(--line); border-radius:14rpx; background:white; overflow:hidden; }
.grid-header,.grid-row { display:grid; grid-template-columns:80rpx repeat(7,minmax(0,1fr)); }
.grid-header { background:var(--paper); }
.corner { font-size:22rpx; align-self:center; text-align:center; color:var(--muted); }
.day { text-align:center; font-size:24rpx; padding:18rpx 0; position:relative; }
.date { display:block; font-size:22rpx; color:var(--muted); }
.today { background:var(--primary); color:white; }.today .date { color:white; }.today-label{font-size:18rpx;display:block;}
.grid-row { min-height:210rpx; border-top:1px solid var(--line); }
.period { padding:18rpx 2rpx; font-size:24rpx; text-align:center; color:var(--muted); }
.time { display:block; font-size:20rpx; line-height:1.5; margin-top:12rpx; }.time-part{display:block;white-space:nowrap;}
.cell { border-left:1px solid #edf0e9; padding:4rpx; min-width:0; }
.course { display:block; width:100%; padding:12rpx 5rpx; border-radius:8rpx; margin-bottom:6rpx; min-height:112rpx; text-align:left; color:#263b33; }
.name { display:block; font-size:24rpx; line-height:1.5; font-weight:600; overflow-wrap:anywhere; }
.room { display:block; font-size:22rpx; line-height:1.5; margin-top:10rpx; overflow-wrap:anywhere; }
.mint{background:#deebe1}.sand{background:#f1e8cf}.lavender{background:#e8e2f0}.blue{background:#dfebf3}.rose{background:#f1e1df}
@media(min-width:700px){.grid-row{min-height:145px}.course{padding:12px}.name{font-size:15px}.room{font-size:13px}.time{font-size:11px}.grid-header,.grid-row{grid-template-columns:60px repeat(7,minmax(0,1fr))}}
</style>
