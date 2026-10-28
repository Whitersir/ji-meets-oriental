import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAMPUS_SERVICES, openCampusService } from '../src/domain/home'
import { LIBRARY_SEAT_URL, copyLibrarySeatLink } from '../src/domain/library-seat'
afterEach(() => vi.unstubAllGlobals())
describe('图书馆官方预约入口', () => {
  it('只携带本校参数，不附加个人票据', () => {
    const url = new URL(LIBRARY_SEAT_URL)
    expect(url.origin).toBe('https://office.chaoxing.com')
    expect(url.pathname).toBe('/front/apps/seat/index')
    expect([...url.searchParams.entries()]).toEqual([['fidEnc', 'ac5a8b9d21d69115']])
    expect(url.hash).toBe('')
  })
  it('点击座位预约先显示指定原文，确认后才进入复制链接页', () => {
    const navigateTo = vi.fn(), showModal = vi.fn()
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign } })
    vi.stubGlobal('uni', { navigateTo, showModal })
    openCampusService(CAMPUS_SERVICES.find(s => s.id === 'library')!)
    expect(assign).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '座位预约',
      content: '作者本来想在这里加一个可以直接预约座位的功能，但是在2026年10月24日凌晨2：45正式投降，用了所有能想到的办法了，如果大家有思路或者办法，恳求告诉我QAQ',
      showCancel: false,
      confirmText: '我知道了',
    }))
    const modal = showModal.mock.calls[0][0]
    modal.success({ confirm: false, cancel: true })
    expect(navigateTo).not.toHaveBeenCalled()
    modal.success({ confirm: true, cancel: false })
    expect(navigateTo).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/library/index' })
    expect(assign).not.toHaveBeenCalled()
  })
  it('保留小程序引导路由，不谎称已取得官方目标小程序路径', () => {
    expect(CAMPUS_SERVICES.find(s => s.id === 'library')?.url).toBe('/pages/library/index')
  })
  it('主动点击才复制官方链接，成功后提示浏览器登录', () => {
    const showModal = vi.fn(), fail = vi.fn()
    let callbacks!: { data: string; success: () => void; fail: () => void }
    const setClipboardData = vi.fn(options => { callbacks = options })
    vi.stubGlobal('uni', { setClipboardData, showModal })
    expect(setClipboardData).not.toHaveBeenCalled()
    copyLibrarySeatLink(fail)
    expect(setClipboardData).toHaveBeenCalledTimes(1)
    expect(callbacks.data).toBe(LIBRARY_SEAT_URL)
    expect(showModal).not.toHaveBeenCalled()
    callbacks.success()
    expect(showModal.mock.calls[0][0].content).toContain('Safari')
    expect(fail).not.toHaveBeenCalled()
  })
  it('复制失败通知页面显示手动回退，不虚报成功', () => {
    const showModal = vi.fn(), fail = vi.fn()
    vi.stubGlobal('uni', { showModal, setClipboardData: (options: { fail: () => void }) => options.fail() })
    copyLibrarySeatLink(fail)
    expect(fail).toHaveBeenCalledTimes(1)
    expect(showModal).not.toHaveBeenCalled()
  })
  it('页面完成动效只由剪贴板成功回调触发，失败时不显示成功', () => {
    const copied = vi.fn(), failed = vi.fn(), showModal = vi.fn()
    let callbacks!: { success: () => void; fail: () => void }
    vi.stubGlobal('uni', { showModal, setClipboardData: (options: typeof callbacks) => { callbacks = options } })
    copyLibrarySeatLink(failed, copied)
    expect(copied).not.toHaveBeenCalled()
    callbacks.fail()
    expect(failed).toHaveBeenCalledTimes(1)
    expect(copied).not.toHaveBeenCalled()
    copyLibrarySeatLink(failed, copied)
    callbacks.success()
    expect(copied).toHaveBeenCalledTimes(1)
    expect(showModal).not.toHaveBeenCalled()
  })
})
