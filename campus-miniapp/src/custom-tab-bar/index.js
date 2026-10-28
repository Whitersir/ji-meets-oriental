// Native WeChat component: uni-app copies this directory without Vue compilation.
const tabs = [
  { label: '首页', icon: 'home', url: '/pages/home/index' },
  { label: '课表', icon: 'calendar', url: '/pages/schedule/index' },
  { label: '校园', icon: 'campus', url: '/pages/campus/index' },
  { label: '我的', icon: 'user', url: '/pages/profile/index' },
]

Component({
  data: { tabs, selected: 0, preview: 0, position: 0, dragging: false },
  lifetimes: {
    attached() { this.syncRoute() },
    ready() { this.syncRoute(); this.measureTrack() },
  },
  pageLifetimes: {
    show() { this.syncRoute(); this.measureTrack() },
    hide() { this.onTouchCancel(); this._switching = false },
    resize() { this.measureTrack() },
  },
  methods: {
    syncRoute() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const selected = tabs.findIndex(tab => current && tab.url === '/' + current.route)
      if (selected < 0) return
      this.setSelected(selected)
    },
    setSelected(selected) {
      this._gesture = null
      this.setData({ selected, preview: selected, position: selected, dragging: false })
    },
    measureTrack() {
      this.createSelectorQuery().select('.glass-track').boundingClientRect(rect => {
        if (rect && rect.width > 0) this._track = rect
      }).exec()
    },
    onTap(event) {
      if (Date.now() < (this._ignoreTapUntil || 0)) return
      this.selectTab(Number(event.currentTarget.dataset.index))
    },
    selectTab(index) {
      if (this._switching || !Number.isInteger(index) || !tabs[index]) return
      this.setData({ preview: index, position: index, dragging: false })
      if (index === this.data.selected) return
      this._switching = true
      wx.switchTab({
        url: tabs[index].url,
        // The destination instance synchronizes against its own route on show.
        fail: () => {
          this.syncRoute()
          wx.showToast({ title: '切换失败，请重试', icon: 'none' })
        },
        complete: () => { this._switching = false },
      })
    },
    onTouchStart(event) {
      if (this._switching || event.touches.length !== 1) return
      this.measureTrack()
      const touch = event.touches[0]
      this._gesture = { x: touch.clientX, y: touch.clientY, horizontal: false }
    },
    onTouchMove(event) {
      const gesture = this._gesture
      if (!gesture) return
      if (event.touches.length !== 1) { this.onTouchCancel(); return }
      const touch = event.touches[0]
      const dx = touch.clientX - gesture.x
      const dy = touch.clientY - gesture.y
      if (!gesture.horizontal) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { this.onTouchCancel(); return }
        if (Math.abs(dx) < 6 || !this._track) return
        gesture.horizontal = true
      }
      const position = Math.max(0, Math.min(tabs.length - 1,
        (touch.clientX - this._track.left) / (this._track.width / tabs.length) - .5))
      this.setData({ position, preview: Math.round(position), dragging: true })
    },
    onTouchEnd() {
      const gesture = this._gesture
      this._gesture = null
      if (!gesture || !gesture.horizontal) return
      // Prevent the synthetic tap on the original tab from undoing a drag.
      this._ignoreTapUntil = Date.now() + 350
      this.selectTab(Math.round(this.data.position))
    },
    onTouchCancel() {
      this._gesture = null
      this._ignoreTapUntil = Date.now() + 350
      this.setData({ preview: this.data.selected, position: this.data.selected, dragging: false })
    },
  },
})
