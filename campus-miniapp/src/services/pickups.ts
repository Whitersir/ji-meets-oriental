import { assertPickupItems, type PickupItem } from '../domain/pickups'
import type { StorageAdapter } from './storage'

export const PICKUPS_STORAGE_KEY = 'ji-oriental:pickups:v1'
export function loadPickups(storage: StorageAdapter = uni): PickupItem[] {
  const saved = storage.getStorageSync(PICKUPS_STORAGE_KEY)
  if (saved === '' || saved === undefined || saved === null) return []
  const snapshot = saved as { version?: unknown; items?: unknown }
  if (typeof saved !== 'object' || snapshot.version !== 1) throw new Error('取件记录版本无法读取，原有数据未修改。')
  assertPickupItems(snapshot.items)
  return snapshot.items
}
export function savePickups(items: PickupItem[], storage: StorageAdapter = uni): void {
  assertPickupItems(items)
  // Persist parsed fields only. Raw SMS/clipboard text is never saved.
  const snapshot = items.map(item => ({ id: item.id, code: item.code, courier: item.courier, location: item.location, note: item.note, createdAt: item.createdAt, pickedAt: item.pickedAt }))
  storage.setStorageSync(PICKUPS_STORAGE_KEY, { version: 1, items: snapshot })
}
