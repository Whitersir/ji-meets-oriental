import { describe, expect, it } from 'vitest'
import expectedWeeks from './fixtures/calendar-weeks.json'
import { ACADEMIC_TERMS, calendarWeek, eventsOn, monthRows, termForName, termMonths, isoDate } from '../src/domain/academic-calendar'
import { dateAt } from '../src/domain/schedule'

describe('用户提供的暂行校历', () => {
  const [autumn, spring] = ACADEMIC_TERMS
  it('公开日期回归样例覆盖两个学期的全部教学周，不依赖原始附件', () => {
    for (const term of ACADEMIC_TERMS) {
      const weeks = expectedWeeks[term.id as keyof typeof expectedWeeks]
      expect(weeks).toHaveLength(term.totalWeeks)
      for (const [index, monday] of weeks.entries()) {
        expect(isoDate(dateAt(term.startDate, index * 7))).toBe(monday)
        expect(dateAt(monday, 0).getDay()).toBe(1)
        for (let day = 0; day < 7; day++) {
          const current = dateAt(monday, day)
          expect(current.getDay()).toBe((day + 1) % 7)
          expect(calendarWeek(term, isoDate(current))).toBe(index + 1)
        }
      }
    }
  })
  it('跨年、教学周终点、假期和新生开课不重置学校周次', () => {
    expect(calendarWeek(autumn, '2026-08-30')).toBeNull()
    expect(calendarWeek(autumn, '2026-08-31')).toBe(1)
    expect(calendarWeek(autumn, '2026-09-28')).toBe(5)
    expect(calendarWeek(autumn, '2027-01-01')).toBe(18)
    expect(calendarWeek(autumn, '2027-01-10')).toBe(19)
    expect(calendarWeek(autumn, '2027-01-11')).toBeNull()
    expect(calendarWeek(spring, '2027-03-01')).toBe(1)
    expect(calendarWeek(spring, '2027-07-11')).toBe(19)
    expect(calendarWeek(spring, '2027-07-12')).toBeNull()
  })
  it('假期包含首尾日，不将邻近日期推定为假期', () => {
    for (const date of ['2026-09-25', '2026-09-27']) expect(eventsOn(autumn, date).some(e => e.title === '中秋节假期')).toBe(true)
    expect(eventsOn(autumn, '2026-09-28').some(e => e.kind === 'holiday')).toBe(false)
    expect(eventsOn(autumn, '2027-02-26').some(e => e.title === '寒假')).toBe(true)
    expect(eventsOn(autumn, '2027-02-27')).toEqual([])
    expect(eventsOn(spring, '2027-08-27').some(e => e.title === '暑假')).toBe(true)
    expect(eventsOn(spring, '2027-08-28')).toEqual([])
    expect(eventsOn(spring, '2027-04-05').every(e => e.kind !== 'holiday')).toBe(true)
  })
  it('月份从周一排起，跨月日期不重复算作本月，二月无越界', () => {
    const february = monthRows(autumn, '2027-02')
    expect(february).toHaveLength(4)
    expect(february.flatMap(row => row.days).filter(d => d.inMonth)).toHaveLength(28)
    const september = monthRows(autumn, '2026-09')
    expect(september[0].monday).toBe('2026-08-31')
    expect(september[0].week).toBe(1)
    expect(september[0].days[0].inMonth).toBe(false)
    expect(september.flatMap(row => row.days).filter(d => d.inMonth)).toHaveLength(30)
    expect(termMonths(autumn)).toHaveLength(7)
    expect(termMonths(spring).at(-1)).toBe('2027-08')
  })
  it('仅为明确匹配的学期提供预设，日期使用本地日历而非 UTC', () => {
    expect(termForName('2026-2027-1')).toBe(autumn)
    expect(termForName('2026—2027学年度第二学期')).toBe(spring)
    for (const name of ['2025-2026-1', '2026-2027-11', '第一学期', '测试学期']) expect(termForName(name)).toBeUndefined()
    expect(isoDate(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01')
  })
})
