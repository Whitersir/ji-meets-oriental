import { currentWeek, dateAt } from './schedule'

// 唯一数据源：用户提供的《河北东方学院2026-2027学年度校历（暂行）》Sheet1。
// 节假日没有给出补课映射，不据此移动、删除任何导入课程。
export interface CalendarEvent {
  title: string
  start: string
  end: string
  kind: 'holiday' | 'exam' | 'school' | 'festival'
  note?: string
}
export interface AcademicTerm {
  id: string
  label: string
  startDate: string
  totalWeeks: number
  firstMonth: string
  lastMonth: string
  events: CalendarEvent[]
  notes: string[]
}
export const ACADEMIC_TERMS: AcademicTerm[] = [
  {
    id: '2026-2027-1', label: '第一学期', startDate: '2026-08-31', totalWeeks: 19,
    firstMonth: '2026-08', lastMonth: '2027-02',
    events: [
      { title: '专升本新生报到', start: '2026-08-30', end: '2026-08-30', kind: 'school' },
      { title: '在校生、专升本新生开课', start: '2026-08-31', end: '2026-08-31', kind: 'school' },
      { title: '本科新生报到', start: '2026-09-07', end: '2026-09-08', kind: 'school' },
      { title: '本科新生入学教育、军训', start: '2026-09-09', end: '2026-09-24', kind: 'school' },
      { title: '中秋节假期', start: '2026-09-25', end: '2026-09-27', kind: 'holiday' },
      { title: '本科新生开课', start: '2026-09-28', end: '2026-09-28', kind: 'school', note: '学校校历为第 5 周；新生课程周次以教务导出为准。' },
      { title: '国庆节假期', start: '2026-10-01', end: '2026-10-07', kind: 'holiday' },
      { title: '2023级本科期末考试', start: '2026-11-02', end: '2026-11-08', kind: 'exam', note: '校历第 10 周，仅适用 2023 级本科。' },
      { title: '2023级本科开始毕业实习', start: '2026-11-09', end: '2026-11-09', kind: 'school', note: '校历第 11 周起。' },
      { title: '复习考试', start: '2026-12-28', end: '2027-01-10', kind: 'exam', note: '第 18–19 周；具体科目、时间以教务通知为准。' },
      { title: '元旦（校历标注）', start: '2027-01-01', end: '2027-01-01', kind: 'festival', note: '文件未列出元旦放假、调休日期。' },
      { title: '寒假', start: '2027-01-11', end: '2027-02-26', kind: 'holiday' },
    ],
    notes: ['学校教学周从 8 月 31 日统一起算。本科新生 9 月 28 日开课，并不将学校校历重置为第 1 周。'],
  },
  {
    id: '2026-2027-2', label: '第二学期', startDate: '2027-03-01', totalWeeks: 19,
    firstMonth: '2027-03', lastMonth: '2027-08',
    events: [
      { title: '开课', start: '2027-03-01', end: '2027-03-01', kind: 'school' },
      { title: '清明（校历标注）', start: '2027-04-05', end: '2027-04-05', kind: 'festival' },
      { title: '运动会', start: '2027-04-29', end: '2027-04-30', kind: 'school' },
      { title: '劳动节（校历标注）', start: '2027-05-01', end: '2027-05-01', kind: 'festival' },
      { title: '毕业论文（设计）答辩', start: '2027-05-17', end: '2027-05-30', kind: 'school', note: '第 12–13 周。' },
      { title: '端午（校历标注）', start: '2027-06-09', end: '2027-06-09', kind: 'festival' },
      { title: '毕业典礼', start: '2027-06-19', end: '2027-06-20', kind: 'school' },
      { title: '复习考试', start: '2027-06-28', end: '2027-07-11', kind: 'exam', note: '第 18–19 周；具体科目、时间以教务通知为准。' },
      { title: '暑假', start: '2027-07-12', end: '2027-08-27', kind: 'holiday' },
    ],
    notes: ['清明节、劳动节、端午节按照国家法定假日执行；此处仅标注原校历给出的节日日期，未补充推测的假期或调休。'],
  },
]

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function calendarWeek(term: AcademicTerm, date: string): number | null {
  const week = currentWeek(term.startDate, dateAt(date, 0))
  return week >= 1 && week <= term.totalWeeks ? week : null
}
export function eventsOn(term: AcademicTerm, date: string): CalendarEvent[] {
  return term.events.filter(event => event.start <= date && date <= event.end)
}
export function termForName(name: string): AcademicTerm | undefined {
  const normalized = name.trim().replace(/[－—–/]/g, '-').replace(/\s+/g, '')
  return ACADEMIC_TERMS.find(term => normalized === term.id || normalized === `2026-2027学年${term.label}` || normalized === `2026-2027学年度${term.label}`)
}
export function calendarTermAt(date: string): AcademicTerm | undefined {
  return ACADEMIC_TERMS.find(term => date.slice(0, 7) >= term.firstMonth && date.slice(0, 7) <= term.lastMonth)
}
export function termMonths(term: AcademicTerm): string[] {
  const months: string[] = []
  let date = dateAt(`${term.firstMonth}-01`, 0)
  while (isoDate(date).slice(0, 7) <= term.lastMonth) {
    months.push(isoDate(date).slice(0, 7))
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1, 12)
  }
  return months
}
export function monthRows(term: AcademicTerm, month: string) {
  const first = dateAt(`${month}-01`, 0)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + days) / 7) }, (_, row) => {
    const monday = isoDate(dateAt(`${month}-01`, row * 7 - offset))
    return {
      monday, week: calendarWeek(term, monday),
      days: Array.from({ length: 7 }, (_, col) => {
        const date = dateAt(monday, col)
        const key = isoDate(date)
        const events = eventsOn(term, key)
        return { key, day: date.getDate(), inMonth: key.startsWith(month), events,
          holiday: events.some(e => e.kind === 'holiday'), exam: events.some(e => e.kind === 'exam'),
          description: events.map(e => e.title).join('、') }
      }),
    }
  })
}
export function eventRange(event: CalendarEvent): string {
  return event.start === event.end ? event.start.replace(/-/g, '.') : `${event.start.replace(/-/g, '.')} — ${event.end.replace(/-/g, '.')}`
}
