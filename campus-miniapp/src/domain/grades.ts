export interface GradeEntry {
  name: string; courseCode: string; term: string; score: string; scoreStatus: string
  credits: string; hours: string; gradePoint: string; retakeTerm: string
  examMethod: string; examNature: string; attribute: string; nature: string; category: string
}
export interface GradeSnapshot { id: string; savedAt: string; fileName: string; entries: GradeEntry[] }
export const GRADE_FIELDS: (keyof GradeEntry)[] = ['name', 'courseCode', 'term', 'score', 'scoreStatus', 'credits', 'hours', 'gradePoint', 'retakeTerm', 'examMethod', 'examNature', 'attribute', 'nature', 'category']
export const hasPublishedScore = (score: string) => !!score.trim() && !/^(?:[-—–/]+|未公布|暂无(?:成绩)?|未出(?:成绩)?|未录入|未发布|尚未公布|成绩未公布|未查询到数据)$/.test(score.trim())

export function cleanGradeEntries(entries: GradeEntry[], fallbackTerm = ''): GradeEntry[] {
  if (!entries.length || entries.length > 1000) throw new Error('每份记录需要包含 1–1000 条课程成绩。')
  return entries.map(entry => {
    const cleaned = Object.fromEntries(GRADE_FIELDS.map(key => [key, String(entry[key] ?? '').trim()])) as unknown as GradeEntry
    cleaned.term ||= fallbackTerm.trim()
    if (!cleaned.name || !cleaned.term) throw new Error('课程名称或学期缺失，请核对文件并补填学期。')
    if (GRADE_FIELDS.some(key => cleaned[key].length > (key === 'name' ? 200 : 100))) throw new Error('成绩字段过长，请核对导出文件。')
    return cleaned
  })
}

export function assertGradeSnapshots(value: unknown): asserts value is GradeSnapshot[] {
  if (!Array.isArray(value) || value.length > 20) throw new Error('成绩留档格式无法读取，原有记录未修改。')
  let count = 0
  const ids = new Set<string>()
  for (const snapshot of value) {
    if (!snapshot || typeof snapshot !== 'object' || typeof snapshot.id !== 'string' || !snapshot.id || ids.has(snapshot.id) || typeof snapshot.savedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.savedAt)) || typeof snapshot.fileName !== 'string' || snapshot.fileName.length > 255 || !Array.isArray(snapshot.entries)) throw new Error('成绩留档格式无法读取，原有记录未修改。')
    ids.add(snapshot.id)
    if (snapshot.entries.some((entry: unknown) => !entry || typeof entry !== 'object' || GRADE_FIELDS.some(key => typeof (entry as GradeEntry)[key] !== 'string'))) throw new Error('成绩字段无法读取，原有记录未修改。')
    cleanGradeEntries(snapshot.entries)
    if (!snapshot.entries.some((entry: GradeEntry) => hasPublishedScore(entry.score))) throw new Error('没有可保存的已公布成绩，原有记录未修改。')
    count += snapshot.entries.length
  }
  if (count > 3000) throw new Error('本机最多保留 3000 条成绩明细，请保留原 Excel 后整理旧留档。')
}

export function appendGradeSnapshot(current: GradeSnapshot[], entries: GradeEntry[], fileName: string, fallbackTerm = '', now = new Date()): GradeSnapshot[] {
  assertGradeSnapshots(current)
  const cleaned = cleanGradeEntries(entries, fallbackTerm)
  if (!cleaned.some(entry => hasPublishedScore(entry.score))) throw new Error('没有可保存的已公布成绩，原有记录未修改。')
  const snapshot: GradeSnapshot = { id: `grade-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`, savedAt: now.toISOString(), fileName, entries: cleaned }
  const next = [snapshot, ...current]
  assertGradeSnapshots(next)
  return next
}

export function gradeTerms(entries: GradeEntry[]): string[] { return [...new Set(entries.map(entry => entry.term).filter(Boolean))].sort().reverse() }
// 仅合计文件明确给出的数值，不推导学校绩点规则或等级制成绩。
export function listedCredits(entries: GradeEntry[]): string {
  if (!entries.length || entries.some(entry => !/^\d+(?:\.\d+)?$/.test(entry.credits))) return '未完整提供'
  return String(Number(entries.reduce((sum, entry) => sum + Number(entry.credits), 0).toFixed(2)))
}
