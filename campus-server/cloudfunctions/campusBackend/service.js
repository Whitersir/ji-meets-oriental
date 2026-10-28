const { createHash } = require('node:crypto')
const APPID = process.env.WX_APPID || 'wx0000000000000000'
const TYPES = ['bug', 'suggestion', 'idea']
const STATUSES = ['pending', 'processing', 'resolved']
const hash = value => createHash('sha256').update(value).digest('hex')
const chinaDay = time => new Date(time + 8 * 3600000).toISOString().slice(0, 10)
class BusinessError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
function requiredText(value, min, max, label) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new BusinessError('INVALID_INPUT', `${label}需为 ${min}—${max} 字`)
  }
  return value.trim()
}
function publicFeedback(record, admin) {
  const { _id, type, content, contact, status, reply, createdAt, updatedAt } = record
  return { id: _id, type, content, status, reply, createdAt, updatedAt, ...(admin ? { contact } : {}) }
}
function createService({ repository, adminOpenids = [], moderate, now = Date.now }) {
  return async function handle(event, identity) {
    try {
      if (!identity?.openid || identity.appid !== APPID) throw new BusinessError('UNAUTHORIZED', '请在本小程序中操作')
      const openid = identity.openid
      const userId = hash(`${APPID}:${openid}`)
      const isAdmin = adminOpenids.includes(openid)
      const time = now()
      const day = chinaDay(time)
      const action = event?.action
      const input = event?.data || {}
      let data
      if (action === 'identity') {
        data = { isAdmin, openid }
      } else if (action === 'track') {
        await repository.recordVisit(userId, day)
        data = { recorded: true }
      } else if (action === 'submitFeedback') {
        if (!TYPES.includes(input.type)) throw new BusinessError('INVALID_INPUT', '请选择留言类型')
        const content = requiredText(input.content, 5, 1000, '留言')
        const contact = typeof input.contact === 'string' ? input.contact.trim() : ''
        if (contact.length > 100) throw new BusinessError('INVALID_INPUT', '联系方式最多 100 字')
        if (input.consent !== true || !/^[a-zA-Z0-9_-]{20,80}$/.test(input.requestId || '')) throw new BusinessError('INVALID_INPUT', '请确认留言说明后重试')
        const id = hash(`${userId}:${input.requestId}`)
        const existing = await repository.findFeedback(id)
        if (existing) {
          if (existing.content !== content || existing.type !== input.type || existing.contact !== contact) throw new BusinessError('CONFLICT', '内容已修改，请重新提交')
          return { ok: true, data: { id } }
        }
        await repository.checkQuota(userId, day, time)
        let safe
        try { safe = await moderate(`${content}\n${contact}`, openid) }
        catch { throw new BusinessError('MODERATION_UNAVAILABLE', '内容检查暂不可用，请稍后重试；留言尚未提交') }
        if (!safe) throw new BusinessError('CONTENT_REJECTED', '留言未通过内容检查，请调整内容后再提交')
        await repository.saveFeedback({ _id: id, sortKey: `${time.toString().padStart(13, '0')}_${id}`, userId, type: input.type, content, contact, status: 'pending', reply: '', createdAt: time, updatedAt: time }, day)
        data = { id }
      } else if (action === 'myFeedback' || action === 'adminFeedback') {
        const admin = action === 'adminFeedback'
        if (admin && !isAdmin) throw new BusinessError('FORBIDDEN', '仅作者可以查看后台')
        const before = input.before === undefined ? null : input.before
        if (before !== null && (typeof before !== 'string' || !/^\d{13}_[a-f0-9]{64}$/.test(before))) throw new BusinessError('INVALID_INPUT', '分页参数无效')
        const status = input.status || 'all'
        if (!['all', ...STATUSES].includes(status)) throw new BusinessError('INVALID_INPUT', '状态无效')
        const records = await repository.listFeedback({ userId: admin ? null : userId, status: admin ? status : 'all', before, limit: 20 })
        data = { items: records.map(record => publicFeedback(record, admin)), next: records.length === 20 ? records[records.length - 1].sortKey : null }
      } else if (action === 'dashboard') {
        if (!isAdmin) throw new BusinessError('FORBIDDEN', '仅作者可以查看后台')
        const days = Array.from({ length: 7 }, (_, index) => chinaDay(time - (6 - index) * 86400000))
        const [totalUsers, trend, pending] = await Promise.all([
          repository.countUsers(),
          Promise.all(days.map(async date => ({ day: date, users: await repository.countDay(date) }))),
          repository.countPending()
        ])
        data = { totalUsers, todayUsers: trend[6].users, trend, pending, updatedAt: time }
      } else if (action === 'replyFeedback') {
        if (!isAdmin) throw new BusinessError('FORBIDDEN', '仅作者可以回复留言')
        if (!/^[a-f0-9]{64}$/.test(input.id || '') || !STATUSES.includes(input.status)) throw new BusinessError('INVALID_INPUT', '留言或状态无效')
        const reply = typeof input.reply === 'string' ? input.reply.trim() : ''
        if (reply.length > 1000) throw new BusinessError('INVALID_INPUT', '回复最多 1000 字')
        const existing = await repository.findFeedback(input.id)
        if (!existing) throw new BusinessError('NOT_FOUND', '该留言不存在')
        if (reply) {
          let safe
          try { safe = await moderate(reply, openid) }
          catch { throw new BusinessError('MODERATION_UNAVAILABLE', '内容检查暂不可用，回复尚未保存') }
          if (!safe) throw new BusinessError('CONTENT_REJECTED', '回复未通过内容检查')
        }
        await repository.updateFeedback(input.id, { reply, status: input.status, updatedAt: time })
        data = { saved: true }
      } else throw new BusinessError('INVALID_ACTION', '不支持的操作')
      return { ok: true, data }
    } catch (error) {
      // 不把 SDK 原始错误、认证凭据或留言内容写入日志 / 返回客户端。
      return { ok: false, code: error instanceof BusinessError ? error.code : 'SERVICE_UNAVAILABLE', message: error instanceof BusinessError ? error.message : '云服务暂不可用，请稍后重试；未确认成功的操作请勿视为已完成' }
    }
  }
}
module.exports = { createService, BusinessError, chinaDay }
