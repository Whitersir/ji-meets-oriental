import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../src/custom-tab-bar/index.js', import.meta.url), 'utf8')

function createBar(route = 'pages/home/index') {
  let definition: any
  const wx = { switchTab: vi.fn(), showToast: vi.fn() }
  const pages = [{ route }]
  runInNewContext(source, { Component: (value: any) => { definition = value }, wx, getCurrentPages: () => pages })
  const bar: any = {
    ...definition.methods,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(value: object) { Object.assign(this.data, value) },
    createSelectorQuery() {
      const query: any = { select: () => query, boundingClientRect: (cb: Function) => { cb({ left: 20, width: 360 }); return query }, exec() {} }
      return query
    },
  }
  definition.lifetimes.attached.call(bar)
  definition.lifetimes.ready.call(bar)
  const touch = (x: number, y = 700) => ({ touches: [{ clientX: x, clientY: y }] })
  return { bar, wx, pages, definition, touch }
}

describe('微信悬浮底栏导航与手势', () => {
  it('页面显示时按真实路由同步，包括代码触发的 switchTab', () => {
    const { bar, pages, definition } = createBar('pages/schedule/index')
    expect(bar.data.selected).toBe(1)
    pages[0].route = 'pages/profile/index'
    definition.pageLifetimes.show.call(bar)
    expect(bar.data.selected).toBe(3)
    expect(bar.data.position).toBe(3)
  })
  it('点击同页不重复跳转；连续点选在第一次完成前只发一次跳转', () => {
    const { bar, wx } = createBar()
    bar.onTap({ currentTarget: { dataset: { index: 0 } } })
    expect(wx.switchTab).not.toHaveBeenCalled()
    bar.onTap({ currentTarget: { dataset: { index: 1 } } })
    bar.onTap({ currentTarget: { dataset: { index: 3 } } })
    expect(wx.switchTab).toHaveBeenCalledTimes(1)
    expect(wx.switchTab.mock.calls[0][0].url).toBe('/pages/schedule/index')
  })
  it('拖动期间只更新预览，松手才切页，合成 tap 不跳回原页', () => {
    const { bar, wx, touch } = createBar()
    bar.onTouchStart(touch(65))
    bar.onTouchMove(touch(285))
    expect(bar.data.position).toBeCloseTo(2.444, 2)
    expect(wx.switchTab).not.toHaveBeenCalled()
    bar.onTouchEnd()
    expect(wx.switchTab.mock.calls[0][0].url).toBe('/pages/campus/index')
    wx.switchTab.mock.calls[0][0].complete()
    bar.onTap({ currentTarget: { dataset: { index: 0 } } })
    expect(wx.switchTab).toHaveBeenCalledTimes(1)
  })
  it('拖出两侧仍限定在四个入口内', () => {
    const { bar, touch } = createBar()
    bar.onTouchStart(touch(65))
    bar.onTouchMove(touch(900))
    expect(bar.data.position).toBe(3)
    bar.onTouchMove(touch(-900))
    expect(bar.data.position).toBe(0)
  })
  it.each(['vertical', 'cancel', 'multitouch'])('%s 取消手势并恢复当前选中项', kind => {
    const { bar, wx, touch } = createBar('pages/schedule/index')
    bar.onTouchStart(touch(155))
    if (kind === 'vertical') bar.onTouchMove(touch(156, 740))
    else {
      bar.onTouchMove(touch(330))
      if (kind === 'cancel') bar.onTouchCancel()
      else bar.onTouchMove({ touches: [{ clientX: 330, clientY: 700 }, { clientX: 340, clientY: 700 }] })
    }
    bar.onTouchEnd()
    expect(wx.switchTab).not.toHaveBeenCalled()
    expect(bar.data.position).toBe(1)
    expect(bar.data.dragging).toBe(false)
  })
  it('导航失败恢复真实路由并允许重试', () => {
    const { bar, wx } = createBar()
    bar.selectTab(3)
    const request = wx.switchTab.mock.calls[0][0]
    request.fail()
    request.complete()
    expect(bar.data.selected).toBe(0)
    expect(bar.data.position).toBe(0)
    expect(wx.showToast).toHaveBeenCalledTimes(1)
    bar.selectTab(1)
    expect(wx.switchTab).toHaveBeenCalledTimes(2)
  })
})
