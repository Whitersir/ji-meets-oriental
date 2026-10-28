import { assertGradeSnapshots, GRADE_FIELDS, type GradeSnapshot } from '../domain/grades'
import type { StorageAdapter } from './storage'

export const GRADES_STORAGE_KEY = 'ji-oriental:grades:v1'
export function loadGrades(storage: StorageAdapter = uni): GradeSnapshot[] {
  const data = storage.getStorageSync(GRADES_STORAGE_KEY)
  if (data === '' || data === null || data === undefined) return []
  const archive = data as { version?: unknown; snapshots?: unknown }
  if (!archive || archive.version !== 1) throw new Error('成绩留档版本无法读取，原有数据未修改。')
  assertGradeSnapshots(archive.snapshots)
  return archive.snapshots
}
export function saveGrades(snapshots: GradeSnapshot[], storage: StorageAdapter = uni): void {
  assertGradeSnapshots(snapshots)
  const clean = snapshots.map(snapshot => ({ id: snapshot.id, savedAt: snapshot.savedAt, fileName: snapshot.fileName, entries: snapshot.entries.map(entry => Object.fromEntries(GRADE_FIELDS.map(key => [key, entry[key]]))) }))
  // 单次完整写入，只存确认过的成绩字段；不存原始表格或学校登录信息。
  storage.setStorageSync(GRADES_STORAGE_KEY, { version: 1, snapshots: clean })
}
