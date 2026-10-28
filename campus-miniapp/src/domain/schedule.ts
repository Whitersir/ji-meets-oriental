// 课表的统一数据结构。Excel 的行列布局只在导入模块处理，页面不依赖文件格式。
export interface Course {
  id: string
  name: string
  teacher: string
  room: string
  day: number
  sections: number[]
  weeks: number[]
  raw: string
  sourceSheet: string
}
export interface Timetable {
  version: 1
  term: string
  startDate: string
  totalWeeks: number
  courses: Course[]
  importedAt: string
  fileNames: string[]
}
export interface ImportResult {
  courses: Course[]
  warnings: string[]
  term: string
  sheets: string[]
  skipped: number
}
export const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
// 时间来自用户提供的教务首页截图；单节时间未确认，因此以大节显示。
export const PERIODS = [
  { name: '第一大节', sections: [1, 2], time: '08:10–09:50' },
  { name: '第二大节', sections: [3, 4], time: '10:10–11:50' },
  { name: '第三大节', sections: [5, 6], time: '14:00–15:40' },
  { name: '第四大节', sections: [7, 8], time: '16:00–17:40' },
  { name: '第五大节', sections: [9, 10], time: '19:00–20:40' },
]
export function courseKey(c: Omit<Course, 'id'> | Course) {
  return JSON.stringify([c.name.trim(), c.teacher.trim(), c.room.trim(), c.day, [...c.sections].sort((a,b)=>a-b), [...c.weeks].sort((a,b)=>a-b)])
}
export function deduplicate(courses: Course[]): Course[] {
  return [...new Map(courses.map(c => [courseKey(c), c])).values()]
}
export function dateAt(date: string, offset: number): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d + offset, 12)
}
export function validMonday(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = dateAt(date, 0)
  const [year, month, day] = date.split('-').map(Number)
  return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day && d.getDay() === 1
}
export function currentWeek(startDate: string, today = new Date()): number {
  // 按日历日计算，避免夏令时造成一周少/多一小时的误差。
  const [y,m,d] = startDate.split('-').map(Number)
  return Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(y,m-1,d)) / 604800000) + 1
}
export function formatWeeks(weeks: readonly number[]): string {
  if (!weeks.length) return '周次未确认'
  const sorted = [...new Set(weeks)].sort((a,b)=>a-b)
  const parts: string[] = []
  let start = sorted[0], end = start
  for (const n of sorted.slice(1)) {
    if (n === end + 1) end = n
    else { parts.push(start === end ? `${start}` : `${start}–${end}`); start = end = n }
  }
  parts.push(start === end ? `${start}` : `${start}–${end}`)
  return `${parts.join('、')} 周`
}
export function conflicts(courses: readonly Course[]): number {
  const pairs = new Set<string>()
  courses.forEach((a,i) => courses.slice(i+1).forEach(b => {
    if (a.day === b.day && a.sections.some(s=>b.sections.includes(s)) && a.weeks.some(w=>b.weeks.includes(w))) pairs.add([a.id,b.id].sort().join('|'))
  }))
  return pairs.size
}
export function assertTimetable(value: unknown): asserts value is Timetable {
  const t = value as Timetable
  if (!t || t.version !== 1 || typeof t.term !== 'string' || !validMonday(t.startDate) || !Number.isInteger(t.totalWeeks) || t.totalWeeks < 1 || t.totalWeeks > 30 || !Array.isArray(t.courses) || !t.courses.length || t.courses.length > 500 || !Array.isArray(t.fileNames) || !t.fileNames.every(s=>typeof s==='string') || typeof t.importedAt !== 'string') throw new Error('课表数据不完整，请重新导入')
  for (const c of t.courses) {
    if (!c || typeof c.name !== 'string' || !c.name.trim() || typeof c.id !== 'string' || typeof c.teacher !== 'string' || typeof c.room !== 'string' || typeof c.raw !== 'string' || typeof c.sourceSheet !== 'string' || !Number.isInteger(c.day) || c.day<1 || c.day>7 || !Array.isArray(c.sections) || !c.sections.length || !c.sections.every(s=>Number.isInteger(s)&&s>=1&&s<=14) || !Array.isArray(c.weeks) || !c.weeks.length || !c.weeks.every(w=>Number.isInteger(w)&&w>=1&&w<=t.totalWeeks)) throw new Error('课程的星期、节次或周次不完整，请在预览中修正')
  }
}
