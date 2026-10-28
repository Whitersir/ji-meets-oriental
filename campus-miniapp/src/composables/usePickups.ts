import { computed, readonly, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { appendPickupDrafts, editPickupItem, type PickupDraft, type PickupItem } from '../domain/pickups'
import { loadPickups, savePickups } from '../services/pickups'

export function usePickups() {
  const items = shallowRef<PickupItem[]>([])
  const error = shallowRef('')
  const ready = shallowRef(false)
  function reload() {
    try { items.value = loadPickups(); ready.value = true; error.value = '' }
    catch { ready.value = false; error.value = '暂时无法读取本机取件记录。为保护已有数据，请重试读取后再修改。' }
  }
  function persist(next: PickupItem[]): boolean {
    if (!ready.value) return false
    try { savePickups(next); items.value = next; error.value = ''; return true }
    catch { error.value = '保存没有成功，请重试。当前填写内容和原有记录均已保留。'; return false }
  }
  function add(drafts: PickupDraft[]): { added: number; skipped: number } | null {
    if (!ready.value) return null
    try {
      const result = appendPickupDrafts(items.value, drafts)
      if (!result.added) return { added: 0, skipped: result.skipped }
      return persist(result.items) ? { added: result.added, skipped: result.skipped } : null
    } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败，请检查取件信息。'; return null }
  }
  function edit(id: string, draft: PickupDraft): boolean {
    try { return persist(editPickupItem(items.value, id, draft)) }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '修改失败，请检查取件信息。'; return false }
  }
  function mark(id: string, picked: boolean): boolean {
    const next = items.value.map(item => item.id === id ? { ...item, pickedAt: picked ? Date.now() : null } : item)
    const changed = next.find(item => item.id === id)
    try { return changed ? persist(editPickupItem(next, id, changed)) : false }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '恢复失败，请检查待取件记录。'; return false }
  }
  function remove(id: string): boolean { return persist(items.value.filter(item => item.id !== id)) }
  const pendingCount = computed(() => items.value.filter(item => item.pickedAt === null).length)
  onShow(reload)
  return { items: readonly(items), error: readonly(error), ready: readonly(ready), pendingCount, reload, add, edit, mark, remove }
}
