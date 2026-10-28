import { getCurrentInstance, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'

/** WeChat creates a separate native tabBar for each tab page. */
export function useTabBar(index: number) {
  // #ifdef MP-WEIXIN
  const page = getCurrentInstance()
  onShow(() => {
    void nextTick(() => {
      const scope = (page?.proxy as unknown as {
        $scope?: { getTabBar?: () => { setSelected?: (index: number) => void } }
      } | null)?.$scope
      const pages = getCurrentPages()
      const current = pages[pages.length - 1] as unknown as typeof scope
      const bar = current?.getTabBar?.() || scope?.getTabBar?.()
      bar?.setSelected?.(index)
    })
  })
  // #endif
}
