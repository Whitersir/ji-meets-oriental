import { assertTimetable, type Timetable } from '../domain/schedule'
export const STORAGE_KEY = 'ji-oriental:timetable:v1'
export interface StorageAdapter { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void }
export function loadTimetable(storage: StorageAdapter = uni): Timetable | null {
  const data = storage.getStorageSync(STORAGE_KEY)
  if (!data) return null
  assertTimetable(data)
  return data
}
export function saveTimetable(data: Timetable, storage: StorageAdapter = uni) {
  assertTimetable(data)
  // 一份完整快照、一次写入。抛错时页面保留草稿，并且不会跳回课表。
  storage.setStorageSync(STORAGE_KEY, JSON.parse(JSON.stringify(data)))
}
