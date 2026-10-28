import { utils, type WorkSheet } from 'xlsx'
import { GRADE_FIELDS, hasPublishedScore, type GradeEntry } from '../domain/grades'
import { expandedRows, readExcelWorkbook } from './excel'

export interface GradeSheetResult { name: string; entries: GradeEntry[]; warnings: string[]; skipped: number }
const aliases: Record<keyof GradeEntry, string[]> = {
  name: ['课程名称', '课程名'], courseCode: ['课程编号', '课程代码', '课程号'], term: ['开课学期', '学年学期', '学期', '开课时间'],
  score: ['总评成绩', '最终成绩', '成绩', '总成绩'], scoreStatus: ['成绩标识', '成绩标志', '成绩状态'],
  credits: ['学分'], hours: ['总学时', '学时'], gradePoint: ['绩点', '课程绩点'], retakeTerm: ['补重学期', '补考学期', '重修学期'],
  examMethod: ['考核方式', '考试方式'], examNature: ['考试性质'], attribute: ['课程属性'], nature: ['课程性质'], category: ['通选课类别', '通识课类别'],
}
const heading = (text: string) => text.replace(/[\s\uFEFF]/g, '').replace(/[（(].*?[）)]/g, '')

export function parseGradeSheet(sheet: WorkSheet, name: string): GradeSheetResult {
  const result: GradeSheetResult = { name, entries: [], warnings: [], skipped: 0 }
  const range = utils.decode_range(sheet['!fullref'] ?? sheet['!ref'] ?? 'A1')
  if (range.e.r > 1000 || range.e.c > 100 || (range.e.r + 1) * (range.e.c + 1) > 40000 || (sheet['!merges']?.length ?? 0) > 1000) throw new Error('成绩工作表范围过大，请仅导出个人成绩后重试。')
  const rows = expandedRows(sheet, range, true)
  const headerIndex = rows.findIndex(row => row.some(cell => aliases.name.includes(heading(cell))) && row.some(cell => aliases.score.includes(heading(cell))))
  if (headerIndex < 0) { result.warnings.push('未找到课程名称和成绩表头'); return result }
  const header = rows[headerIndex].map(heading)
  const columns = Object.fromEntries(GRADE_FIELDS.map(key => [key, aliases[key].map(alias => header.indexOf(alias)).find(index => index >= 0) ?? -1])) as Record<keyof GradeEntry, number>
  const titleTerm = rows.slice(0, headerIndex).flat().join(' ').match(/20\d{2}\s*[-—–]\s*20\d{2}\s*[-—–]\s*[12]/)?.[0].replace(/\s/g, '') ?? ''
  const seen = new Set<string>()
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.every(cell => !cell) || row.some(cell => /^(?:未查询到数据|暂无数据|没有查询到数据)$/.test(cell))) continue
    const entry = Object.fromEntries(GRADE_FIELDS.map(key => [key, row[columns[key]] ?? ''])) as unknown as GradeEntry
    if (/^(?:合计|总计|备注|说明|平均学分绩点)/.test(entry.name) || aliases.name.includes(heading(entry.name))) continue
    if (!entry.name) { if (entry.score) { result.skipped++; result.warnings.push(`第 ${r + 1} 行缺少课程名称，未导入`) }; continue }
    entry.term ||= titleTerm
    const identity = JSON.stringify(entry)
    if (seen.has(identity)) { result.warnings.push(`第 ${r + 1} 行与前面完全相同，已去重`); continue }
    seen.add(identity)
    result.entries.push(entry)
  }
  const missing = result.entries.filter(entry => !hasPublishedScore(entry.score)).length
  if (missing) result.warnings.push(`${missing} 门未提供已公布成绩，按原文保留，不记为 0 分`)
  return result
}

export function parseGradeExcel(data: ArrayBuffer): GradeSheetResult[] {
  const workbook = readExcelWorkbook(data)
  const sheets = workbook.SheetNames.map(name => parseGradeSheet(workbook.Sheets[name], name))
  if (!sheets.some(sheet => sheet.entries.some(entry => hasPublishedScore(entry.score)))) throw new Error('文件中没有可识别的已公布成绩。请在学校开放查询且表中有成绩时重新导出；已有留档未修改。')
  return sheets
}
