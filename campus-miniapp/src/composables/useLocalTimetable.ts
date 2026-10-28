import { onUnmounted, shallowRef } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import type { Timetable } from '../domain/schedule'
import { loadTimetable } from '../services/storage'

// 每个可见页面自行刷新本地快照，导入返回、切换标签和跨午夜都能更新。
export function useLocalTimetable() {
  const timetable = shallowRef<Timetable | null>(null)
  const now = shallowRef(new Date())
  const error = shallowRef('')
  let timer: ReturnType<typeof setInterval> | undefined
  function refresh() {
    now.value = new Date()
    try { timetable.value = loadTimetable(); error.value = '' }
    catch { timetable.value = null; error.value = '本地课表暂时无法读取，原有数据已保留。请重新导入恢复。' }
  }
  function stop() { if (timer !== undefined) clearInterval(timer); timer = undefined }
  onShow(() => { stop(); refresh(); timer = setInterval(refresh, 60000) })
  onHide(stop)
  onUnmounted(stop)
  return { timetable, now, error }
}
