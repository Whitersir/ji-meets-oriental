import { describe, expect, it } from 'vitest'
import { appendPickupDrafts, assertPickupItems, cleanPickupDraft, editPickupItem, parsePickupMessages, type PickupDraft, type PickupItem } from '../src/domain/pickups'
import { loadPickups, PICKUPS_STORAGE_KEY, savePickups } from '../src/services/pickups'
import { STORAGE_KEY, type StorageAdapter } from '../src/services/storage'

const draft: PickupDraft = { code: 'A-03-0062', courier: '中通', location: '文泰楼驿站', note: '' }
const item: PickupItem = { ...draft, id: 'test-item', createdAt: 1000, pickedAt: null }
function memoryStorage(seed: Record<string, unknown> = {}) {
  const values = new Map(Object.entries(seed))
  const storage: StorageAdapter = { getStorageSync: key => values.get(key), setStorageSync: (key, value) => { values.set(key, value) }, removeStorageSync: key => { values.delete(key) } }
  return { values, storage }
}

describe('取件通知识别', () => {
  it('识别常见快递、前导零、字母和完整地点', () => {
    const result = parsePickupMessages('【中通快递】您的包裹已到文泰楼驿站，请凭A-03-0062取件。\n【极兔速递】取件码：002891，取件地址：东门快递柜。')
    expect(result.drafts).toEqual([draft, { code: '002891', courier: '极兔', location: '东门快递柜', note: '' }])
    expect(result.unrecognized).toBe(0)
  })
  it('能识别纯数字、方括号、全角短横线与一行多个码', () => {
    const result = parsePickupMessages('【圆通】取件码【００２３】，取件码：B－01－09。')
    expect(result.drafts.map(d => d.code)).toEqual(['0023', 'B-01-09'])
  })
  it('优先使用通知签名的快递公司，不被地点里的其他公司名称干扰', () => {
    expect(parsePickupMessages('【顺丰速运】包裹已到申通路驿站，取件码：001234').drafts[0].courier).toBe('顺丰')
  })
  it('不把裸数字、手机号、运单号或登录验证码猜成取件码', () => {
    const result = parsePickupMessages('123456\n【中通】运单号777451086700381\n【登录】验证码123456\n请凭13800138000取件\n取件码：777451086700381')
    expect(result.drafts).toEqual([])
    expect(result.unrecognized).toBe(5)
  })
  it('无法识别的通知不妨碍其他通知预览，缺失信息留空', () => {
    const result = parsePickupMessages('您的快递到站了\n取件码：8-0123')
    expect(result.unrecognized).toBe(1)
    expect(result.drafts).toEqual([{ code: '8-0123', courier: '', location: '', note: '' }])
  })
  it('限制一次性导入规模，避免过量保存或卡住输入', () => {
    expect(() => parsePickupMessages('a'.repeat(5001))).toThrow('5000')
    expect(() => parsePickupMessages(Array.from({ length: 31 }, (_, i) => `取件码：${100 + i}`).join('\n'))).toThrow('30')
  })
})

describe('取件记录更新', () => {
  it('同公司同地点的待取码去重，不合并不同公司的同码', () => {
    const result = appendPickupDrafts([item], [draft, { ...draft, courier: '圆通' }, { ...draft, location: '西门驿站' }], 2000)
    expect(result.added).toBe(2)
    expect(result.skipped).toBe(1)
    expect(new Set(result.items.map(i => i.id)).size).toBe(3)
  })
  it('允许之后再次收到相同码，已取记录仍保留', () => {
    const result = appendPickupDrafts([{ ...item, pickedAt: 1500 }], [draft], 2000)
    expect(result.added).toBe(1)
    expect(result.items[0].pickedAt).toBe(1500)
    expect(result.items[1].pickedAt).toBeNull()
  })
  it('导入含错误草稿时整批失败，不修改原数组', () => {
    const current = [item]
    expect(() => appendPickupDrafts(current, [draft, { ...draft, code: '' }])).toThrow('取件码')
    expect(current).toEqual([item])
  })
  it('编辑保留创建时间和取件状态，并阻止重复待取记录', () => {
    expect(editPickupItem([item], item.id, { ...draft, note: '易碎' })[0]).toEqual({ ...item, note: '易碎' })
    expect(() => editPickupItem([item, { ...item, id: 'second', code: '9999' }], 'second', draft)).toThrow('已有相同')
  })
  it('验证必填、字段长度和保存容量', () => {
    expect(cleanPickupDraft({ ...draft, code: ' ００２３ ' }).code).toBe('0023')
    expect(() => cleanPickupDraft({ ...draft, note: '字'.repeat(81) })).toThrow('备注')
    expect(() => appendPickupDrafts(Array.from({ length: 300 }, (_, i) => ({ ...item, id: String(i), code: String(1000 + i) })), [draft])).toThrow('300')
  })
})

describe('取件码本地存储与课表隔离', () => {
  it('首次使用为空，保存后可读取，只写确认后的字段', () => {
    const { storage, values } = memoryStorage({ [STORAGE_KEY]: { existingTimetable: true } })
    expect(loadPickups(storage)).toEqual([])
    savePickups([{ ...item, rawSms: '不要保留原始通知' } as PickupItem], storage)
    expect(loadPickups(storage)).toEqual([item])
    expect(JSON.stringify(values.get(PICKUPS_STORAGE_KEY))).not.toContain('rawSms')
    expect(values.get(STORAGE_KEY)).toEqual({ existingTimetable: true })
  })
  it('存储失败抛错，已有记录保持原样', () => {
    const { storage, values } = memoryStorage({ [PICKUPS_STORAGE_KEY]: { version: 1, items: [item] } })
    storage.setStorageSync = () => { throw new Error('quota exceeded') }
    expect(() => savePickups([{ ...item, code: '0088' }], storage)).toThrow()
    expect(values.get(PICKUPS_STORAGE_KEY)).toEqual({ version: 1, items: [item] })
  })
  it('损坏与未来版本不当成空数据覆盖', () => {
    for (const saved of [{ version: 2, items: [] }, { version: 1, items: [{ ...item, pickedAt: 'wrong' }] }, { version: 1, items: [item, item] }]) {
      const { storage, values } = memoryStorage({ [PICKUPS_STORAGE_KEY]: saved })
      expect(() => loadPickups(storage)).toThrow()
      expect(values.get(PICKUPS_STORAGE_KEY)).toEqual(saved)
    }
    expect(() => assertPickupItems([{ ...item, createdAt: NaN }])).toThrow()
  })
})
