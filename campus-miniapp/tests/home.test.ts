import { describe, expect, it } from 'vitest'
import { courseClock, todayAgenda } from '../src/domain/home'
import type { Course, Timetable } from '../src/domain/schedule'
const course: Course = { id: 'math', name: '高等数学', teacher: '', room: 'A101', day: 1, sections: [1, 2], weeks: [1, 3], raw: '', sourceSheet: '' }
const timetable: Timetable = { version: 1, term: '测试学期', startDate: '2026-08-31', totalWeeks: 3, courses: [course, { ...course, id: 'later', sections: [5, 6] }, { ...course, id: 'sunday', day: 7 }], fileNames: [], importedAt: '' }
describe('首页的真实今日课表', () => {
  it('按当天星期、教学周筛选，并按节次排序', () => {
    expect(todayAgenda(timetable, new Date(2026, 7, 31)).map(c => c.id)).toEqual(['math', 'later'])
    expect(todayAgenda(timetable, new Date(2026, 8, 7))).toEqual([])
    expect(todayAgenda(timetable, new Date(2026, 8, 14)).map(c => c.id)).toEqual(['math', 'later'])
    expect(todayAgenda(timetable, new Date(2026, 8, 6)).map(c => c.id)).toEqual(['sunday'])
  })
  it('未导入、开学前、学期结束都不冒出课程', () => {
    expect(todayAgenda(null, new Date(2026, 7, 31))).toEqual([])
    expect(todayAgenda(timetable, new Date(2026, 7, 24))).toEqual([])
    expect(todayAgenda(timetable, new Date(2026, 8, 21))).toEqual([])
  })
  it('大节使用已知时间，单节、离散节次和未知高节次不猜测时间', () => {
    expect(courseClock(course)).toEqual({ start: '08:10', end: '09:50', known: true })
    expect(courseClock({ ...course, sections: [5, 6, 7, 8] })).toEqual({ start: '14:00', end: '17:40', known: true })
    for (const sections of [[1], [1, 2, 5, 6], [11, 12]]) expect(courseClock({ ...course, sections }).known).toBe(false)
  })
})
