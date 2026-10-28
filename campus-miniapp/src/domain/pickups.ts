export interface PickupDraft { code: string; courier: string; location: string; note: string }
export interface PickupItem extends PickupDraft { id: string; createdAt: number; pickedAt: number | null }
export const MAX_PICKUPS = 300
export const MAX_IMPORT_LENGTH = 5000

export function normalizePickupCode(value: string): string {
  return value.normalize('NFKC').trim().replace(/[‐‑‒–—−]/g, '-').replace(/[ \t]+/g, ' ')
}

export function cleanPickupDraft(value: PickupDraft): PickupDraft {
  const code = normalizePickupCode(value.code)
  if (!/^(?=.{2,32}$)(?=.*\d)[A-Za-z0-9]+(?:[- ][A-Za-z0-9]+)*$/.test(code)) {
    throw new Error('取件码请填写 2–32 位数字、字母，可包含短横线或空格。')
  }
  const draft = { code, courier: value.courier.trim(), location: value.location.trim(), note: value.note.trim() }
  for (const [label, text, max] of [['快递公司', draft.courier, 24], ['取件地点', draft.location, 80], ['备注', draft.note, 80]] as const) {
    if (text.length > max) throw new Error(`${label}最多填写 ${max} 个字。`)
  }
  return draft
}

const COURIERS = ['菜鸟速递', '中通', '圆通', '申通', '韵达', '顺丰', '京东', '极兔', '邮政', 'EMS', '德邦', '百世', '天天', '优速', '丹鸟', '宅急送']
function guessCourier(text: string): string {
  const signature = text.match(/^[【\[]([^】\]]{1,30})[】\]]/)?.[1].toUpperCase()
  const sender = signature && COURIERS.find(name => signature.includes(name))
  if (sender) return sender
  const upper = text.toUpperCase()
  return COURIERS.map(name => ({ name, position: upper.indexOf(name) })).filter(match => match.position >= 0)
    .sort((a, b) => a.position - b.position)[0]?.name || ''
}
function guessLocation(text: string): string {
  const explicit = text.match(/(?:取件地址|取货地址|取件地点|驿站地址|地址)[：:\s]+([^，,。；;\n]{2,80})/)
  if (explicit) return explicit[1].trim()
  const arrived = text.match(/(?:已到达?|已送达|存放在|请到|请前往)\s*([^，,。；;\n]{2,60}?)(?=请|凭|领取|取件码|提货码|，|,|。|；|;|$)/)
  return arrived?.[1].trim() || ''
}

// Require a pickup label or a “凭…取件” phrase. Bare numbers, phone numbers,
// order numbers and login verification messages are never inferred as codes.
export function parsePickupMessages(text: string): { drafts: PickupDraft[]; unrecognized: number } {
  if (text.length > MAX_IMPORT_LENGTH) throw new Error('每次最多粘贴 5000 个字，请分批导入。')
  const drafts: PickupDraft[] = []
  let unrecognized = 0
  const lines = text.normalize('NFKC').replace(/[‐‑‒–—−]/g, '-').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  for (const line of lines) {
    const matches = [...line.matchAll(/(?:取件码|提货码|取货码|取快递码)(?:为|是)?[：:\s【\[（(]*([A-Za-z0-9]+(?:[- ][A-Za-z0-9]+)*)/g)]
    if (!matches.length) matches.push(...line.matchAll(/凭[：:\s【\[（(]*([A-Za-z0-9]+(?:[- ][A-Za-z0-9]+)*)[】\]）)\s]*(?:取件|取货|领取)/g))
    let recognized = false
    for (const match of matches) {
      const code = normalizePickupCode(match[1])
      if (/^1[3-9]\d{9}$/.test(code) || /^\d{13,}$/.test(code)) continue
      try {
        drafts.push(cleanPickupDraft({ code, courier: guessCourier(line), location: guessLocation(line), note: '' }))
        recognized = true
      } catch { /* Ambiguous formats remain for manual input, never silently saved. */ }
    }
    if (!recognized) unrecognized++
  }
  if (drafts.length > 30) throw new Error('每次最多识别 30 个取件码，请分批导入。')
  return { drafts, unrecognized }
}

function samePending(item: PickupItem, draft: PickupDraft): boolean {
  return item.pickedAt === null && item.code === draft.code && item.courier === draft.courier && item.location === draft.location
}
let sequence = 0
export function appendPickupDrafts(current: PickupItem[], drafts: PickupDraft[], now = Date.now()): { items: PickupItem[]; added: number; skipped: number } {
  const cleaned = drafts.map(cleanPickupDraft) // Validate the entire batch before adding anything.
  const items = [...current]
  let added = 0
  let skipped = 0
  for (const draft of cleaned) {
    if (items.some(item => samePending(item, draft))) { skipped++; continue }
    items.push({ ...draft, id: `pickup-${now.toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 8)}`, createdAt: now, pickedAt: null })
    added++
  }
  if (items.length > MAX_PICKUPS) throw new Error(`本机最多保存 ${MAX_PICKUPS} 条记录，请先整理已取件记录。`)
  return { items, added, skipped }
}

export function editPickupItem(items: PickupItem[], id: string, value: PickupDraft): PickupItem[] {
  const original = items.find(item => item.id === id)
  if (!original) throw new Error('没有找到这条取件记录，请重新打开页面。')
  const draft = cleanPickupDraft(value)
  if (original.pickedAt === null && items.some(item => item.id !== id && samePending(item, draft))) throw new Error('待取件中已有相同取件码、快递公司和地点。')
  return items.map(item => item.id === id ? { ...item, ...draft } : item)
}

export function assertPickupItems(value: unknown): asserts value is PickupItem[] {
  if (!Array.isArray(value) || value.length > MAX_PICKUPS) throw new Error('取件记录格式不正确，原有数据未修改。')
  const ids = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id)
      || !['code', 'courier', 'location', 'note'].every(key => typeof item[key] === 'string')
      || !Number.isFinite(item.createdAt) || item.createdAt <= 0
      || !(item.pickedAt === null || (Number.isFinite(item.pickedAt) && item.pickedAt > 0))) {
      throw new Error('无法读取已有取件记录，原有数据未修改。')
    }
    cleanPickupDraft(item)
    ids.add(item.id)
  }
}
