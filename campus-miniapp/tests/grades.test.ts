import { describe, expect, it } from 'vitest'
import { utils, write } from 'xlsx'
import * as cptable from 'xlsx/dist/cpexcel.full.mjs'
import { parseGradeExcel, parseGradeSheet } from '../src/pages-import/grades-excel'
import { appendGradeSnapshot, listedCredits, type GradeSnapshot } from '../src/domain/grades'
import { GRADES_STORAGE_KEY, loadGrades, saveGrades } from '../src/services/grades'
import type { StorageAdapter } from '../src/services/storage'

const header = ['序号', '开课学期', '课程编号', '课程名称', '成绩', '成绩标识', '学分', '总学时', '绩点', '补重学期', '考核方式', '考试性质', '课程属性', '课程性质', '通选课类别']
const row = [1, '2026-2027-1', 'DEMO001', '测试课程甲', 0, '', 2, 32, 0, '', '考试', '正常考试', '必修', '公共基础', '']
function workbook(rows: unknown[][], bookType: 'xlsx' | 'biff8' = 'xlsx'): ArrayBuffer {
  const book = utils.book_new(); utils.book_append_sheet(book, utils.aoa_to_sheet(rows), '成绩')
  return write(book, { type: 'array', bookType })
}
function entries() { return parseGradeSheet(utils.aoa_to_sheet([header, row]), '成绩').entries }
function adapter(initial: GradeSnapshot[] = []) {
  const data = new Map<string, unknown>()
  if (initial.length) data.set(GRADES_STORAGE_KEY, { version: 1, snapshots: structuredClone(initial) })
  const storage: StorageAdapter = { getStorageSync: key => data.get(key), setStorageSync: (key, value) => { data.set(key, structuredClone(value)) }, removeStorageSync: key => { data.delete(key) } }
  return { storage, data }
}

describe('成绩导出文件适配', () => {
  it.each(['xlsx', 'biff8'] as const)('读取 %s，保留 0 分、0 绩点和学校原文字段', format => {
    const parsed = parseGradeExcel(workbook([['测试学校成绩单（合成数据）'], header, row], format))[0]
    expect(parsed.entries[0]).toMatchObject({ name: '测试课程甲', term: '2026-2027-1', score: '0', credits: '2', gradePoint: '0', examNature: '正常考试' })
  })
  it.each([65001, 936])('识别网页式 xls 的编码 %s，不执行其中脚本', codepage => {
    const html = `<html><meta charset="${codepage === 936 ? 'gb2312' : 'utf-8'}"><table><tr>${header.map(value => `<th>${value}</th>`).join('')}</tr><tr>${row.map(value => `<td>${value}</td>`).join('')}</tr></table><script>globalThis.gradeScriptRan=true</script></html>`
    const data = new Uint8Array(cptable.utils.encode(codepage, html)).buffer
    expect(parseGradeExcel(data)[0].entries[0].name).toBe('测试课程甲')
    expect((globalThis as Record<string, unknown>).gradeScriptRan).toBeUndefined()
  })
  it('保留等级制、缺考标识与未公布成绩，不擅自换算或填 0', () => {
    const parsed = parseGradeSheet(utils.aoa_to_sheet([header, row, [2, '2026-2027-1', 'DEMO002', '测试课程乙', '优秀', '', 1], [3, '2026-2027-1', 'DEMO003', '测试课程丙', '', '缓考', 1]]), '成绩')
    expect(parsed.entries.map(entry => entry.score)).toEqual(['0', '优秀', ''])
    expect(parsed.entries[2].scoreStatus).toBe('缓考')
    expect(parsed.warnings.join()).toContain('不记为 0 分')
    expect(listedCredits(parsed.entries)).toBe('4')
  })
  it('按学期与考试性质保留补考和重修，不按同名课覆盖', () => {
    const retake = [...row]; retake[4] = 80; retake[11] = '补考'
    const nextTerm = [...row]; nextTerm[1] = '2026-2027-2'
    expect(parseGradeSheet(utils.aoa_to_sheet([header, row, row, retake, nextTerm]), '成绩').entries).toHaveLength(3)
  })
  it('总评成绩优先于平时成绩，学期标题可填补缺少的学期列', () => {
    const parsed = parseGradeSheet(utils.aoa_to_sheet([['2026-2027-1 成绩单'], ['课程名称', '成绩', '总评成绩'], ['测试课程', '30', '86']]), '成绩')
    expect(parsed.entries[0]).toMatchObject({ score: '86', term: '2026-2027-1' })
  })
  it('保留 Excel 显示文本中的编号前导零和成绩格式', () => {
    const sheet = utils.aoa_to_sheet([header, row]); sheet['C2'] = { t: 'n', v: 1, w: '0001' }; sheet['E2'] = { t: 'n', v: 0.86, w: '86%' }
    expect(parseGradeSheet(sheet, '成绩').entries[0]).toMatchObject({ courseCode: '0001', score: '86%' })
  })
  it('多个工作表不混合；空表、全未出分和课表文件不能当作成绩保存', () => {
    const book = utils.book_new(); utils.book_append_sheet(book, utils.aoa_to_sheet([header]), '空表'); utils.book_append_sheet(book, utils.aoa_to_sheet([header, row]), '成绩')
    expect(parseGradeExcel(write(book, { type: 'array', bookType: 'xlsx' })).map(sheet => sheet.entries.length)).toEqual([0, 1])
    for (const rows of [[header], ...['--', '未出成绩', '暂无成绩'].map(score => [header, [1, '2026-2027-1', 'x', '测试课程', score]]), [['课程名称', '星期', '周次'], ['测试', '周一', '1-16']]]) expect(() => parseGradeExcel(workbook(rows))).toThrow('已有留档未修改')
  })
  it('限制巨大范围、损坏文件和超大文件', () => {
    const sheet = utils.aoa_to_sheet([header, row]); sheet['!ref'] = 'A1:XFD1048576'
    expect(() => parseGradeSheet(sheet, '错误范围')).toThrow('范围过大')
    expect(() => parseGradeExcel(new ArrayBuffer(0))).toThrow('为空')
    expect(() => parseGradeExcel(new ArrayBuffer(5 * 1024 * 1024 + 1))).toThrow('5 MB')
    expect(() => parseGradeExcel(new Uint8Array([1, 2, 3]).buffer)).toThrow('无法读取')
  })
})

describe('成绩留档保护', () => {
  it('按次保存，新成绩不会改写旧快照；无网络也可重开读取', () => {
    const first = appendGradeSnapshot([], entries(), '合成成绩.xlsx')
    const second = appendGradeSnapshot(first, entries().map(entry => ({ ...entry, score: '80' })), '第二次合成成绩.xlsx')
    expect(second[1].entries[0].score).toBe('0'); expect(first).toHaveLength(1)
    const { storage } = adapter(); saveGrades(second, storage)
    expect(loadGrades(storage)).toEqual(second)
  })
  it('解析和预览不写存储，失败写入后仍可读取旧留档', () => {
    const old = appendGradeSnapshot([], entries(), '旧留档.xlsx')
    const { storage, data } = adapter(old)
    parseGradeExcel(workbook([header, row]))
    expect(loadGrades(storage)).toEqual(old)
    storage.setStorageSync = () => { throw new Error('quota') }
    const next = appendGradeSnapshot(old, entries(), '新文件.xlsx')
    expect(() => saveGrades(next, storage)).toThrow('quota')
    expect(loadGrades(storage)).toEqual(old)
    expect(data.size).toBe(1)
  })
  it('缺学期必须补填；空成绩与不完整快照不得覆盖已存数据', () => {
    expect(() => appendGradeSnapshot([], entries().map(entry => ({ ...entry, term: '' })), 'x.xls')).toThrow('学期')
    expect(appendGradeSnapshot([], entries().map(entry => ({ ...entry, term: '' })), 'x.xls', '2026-2027-1')[0].entries[0].term).toBe('2026-2027-1')
    expect(() => appendGradeSnapshot([], entries().map(entry => ({ ...entry, score: '--' })), 'x.xls')).toThrow('已公布')
    const { storage } = adapter(); storage.setStorageSync(GRADES_STORAGE_KEY, { version: 1, snapshots: [{ id: 'bad' }] })
    expect(() => loadGrades(storage)).toThrow('原有记录未修改')
  })
  it('写入仅白名单字段，不保存原始表格与额外身份信息', () => {
    const snapshot = appendGradeSnapshot([], entries(), '合成成绩.xlsx')
    Object.assign(snapshot[0].entries[0], { rawHtml: '<html>PRIVATE</html>', studentId: 'SYNTHETIC' })
    const { storage, data } = adapter(); saveGrades(snapshot, storage)
    expect(JSON.stringify(data.get(GRADES_STORAGE_KEY))).not.toContain('rawHtml')
    expect(JSON.stringify(data.get(GRADES_STORAGE_KEY))).not.toContain('studentId')
    expect(listedCredits(entries().map(entry => ({ ...entry, credits: '' })))).toBe('未完整提供')
  })
})
