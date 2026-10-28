const { BusinessError } = require('./service')
const COLLECTIONS = { visitors: 'campus_visitors', days: 'campus_daily_visitors', feedback: 'campus_feedback', quotas: 'campus_feedback_quotas' }
async function optionalDoc(reference) {
  try { return (await reference.get()).data || null }
  catch (error) {
    // 仅文档不存在可以当空值；权限、集合缺失和网络错误必须向上抛出。
    if (/document\s+(?:with\s+_id\s+\S+\s+)?(?:does\s+not\s+exist|not\s+found)|DOCUMENT_NOT_FOUND/i.test(error.errMsg || error.message || '')) return null
    throw error
  }
}
function createRepository(db) {
  async function quota(transaction, userId, day, time) {
    const reference = transaction.collection(COLLECTIONS.quotas).doc(userId)
    const old = await optionalDoc(reference)
    if (old && time - old.lastAt < 60000) throw new BusinessError('RATE_LIMITED', '留言已提交，请至少间隔 1 分钟再发')
    const count = old?.day === day ? old.count : 0
    if (count >= 5) throw new BusinessError('RATE_LIMITED', '今天已提交 5 条留言，请明天再来')
    return { reference, count }
  }
  return {
    async recordVisit(userId, day) {
      // 固定文档 ID：同一用户并发打开、多次重试均不会增加去重人数。
      await Promise.all([
        db.collection(COLLECTIONS.visitors).doc(userId).set({ data: { lastSeenDay: day } }),
        db.collection(COLLECTIONS.days).doc(`${day}_${userId}`).set({ data: { day } })
      ])
    },
    findFeedback: id => optionalDoc(db.collection(COLLECTIONS.feedback).doc(id)),
    async checkQuota(userId, day, time) { await quota(db, userId, day, time) },
    async saveFeedback(record, day) {
      await db.runTransaction(async transaction => {
        const target = transaction.collection(COLLECTIONS.feedback).doc(record._id)
        const existing = await optionalDoc(target)
        if (existing) {
          if (existing.content !== record.content || existing.type !== record.type || existing.contact !== record.contact) throw new BusinessError('CONFLICT', '内容已修改，请重新提交')
          return
        }
        const { reference, count } = await quota(transaction, record.userId, day, record.createdAt)
        const { _id, ...data } = record
        await target.set({ data })
        await reference.set({ data: { day, count: count + 1, lastAt: record.createdAt } })
      })
    },
    async listFeedback({ userId, status, before, limit }) {
      const where = {}
      if (userId) where.userId = userId
      if (status !== 'all') where.status = status
      if (before !== null) where.sortKey = db.command.lt(before)
      return (await db.collection(COLLECTIONS.feedback).where(where).orderBy('sortKey', 'desc').limit(limit).get()).data
    },
    async countUsers() { return (await db.collection(COLLECTIONS.visitors).count()).total },
    async countDay(day) { return (await db.collection(COLLECTIONS.days).where({ day }).count()).total },
    async countPending() { return (await db.collection(COLLECTIONS.feedback).where({ status: 'pending' }).count()).total },
    updateFeedback: (id, data) => db.collection(COLLECTIONS.feedback).doc(id).update({ data })
  }
}
module.exports = { createRepository, COLLECTIONS }
