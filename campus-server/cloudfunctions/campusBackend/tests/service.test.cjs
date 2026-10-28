const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createService, chinaDay } = require('../service')
const { createRepository, COLLECTIONS } = require('../repository')

// 隔离的数据库替身：执行真实 repository，不连接用户云环境。
function fixture() {
  const tables = new Map(Object.values(COLLECTIONS).map(name => [name, new Map()]))
  const db = {
    command: { lt: value => ({ lt: value }) },
    collection(name) {
      const table = tables.get(name)
      const query = (where = {}, sort = '', limit = 100) => ({
        where: value => query(value, sort, limit),
        orderBy: field => query(where, field, limit),
        limit: value => query(where, sort, value),
        async get() {
          const data = [...table.values()].filter(row => Object.entries(where).every(([key, value]) => value && typeof value === 'object' && 'lt' in value ? row[key] < value.lt : row[key] === value))
          if (sort) data.sort((a, b) => a[sort] < b[sort] ? 1 : a[sort] > b[sort] ? -1 : 0)
          return { data: structuredClone(data.slice(0, limit)) }
        },
        async count() { return { total: (await query(where).get()).data.length } },
        doc(id) { return {
          async get() { return { data: table.has(id) ? structuredClone(table.get(id)) : null } },
          async set({ data }) { table.set(id, structuredClone({ ...data, _id: id })) },
          async update({ data }) { table.set(id, { ...table.get(id), ...structuredClone(data) }) }
        } }
      })
      return query()
    }
  }
  let queue = Promise.resolve()
  db.runTransaction = callback => {
    const pending = queue.then(() => callback(db))
    queue = pending.catch(() => {})
    return pending
  }
  let time = Date.parse('2026-10-25T12:00:00+08:00')
  let moderation = 'pass'
  const repository = createRepository(db)
  const handle = createService({ repository, now: () => time, adminOpenids: ['author'], moderate: async () => {
    if (moderation === 'error') throw Error('token=private-value')
    return moderation === 'pass'
  } })
  const call = (action, data = {}, who = 'student-a') => handle({ action, data }, { openid: who, appid: 'wx0000000000000000' })
  const submit = (id = 'request_id_00000000000000001', who = 'student-a') => call('submitFeedback', { type: 'bug', content: '课表页面切换周次后显示有问题', contact: 'optional@example.com', consent: true, requestId: id }, who)
  return { tables, db, handle, call, submit, advance: amount => { time += amount }, moderate: value => { moderation = value } }
}
test('拒绝缺失或其他小程序的身份，忽略客户端伪造身份和管理员字段', async () => {
  const f = fixture()
  assert.equal((await f.handle({ action: 'dashboard', openid: 'author', isAdmin: true }, {})).code, 'UNAUTHORIZED')
  assert.equal((await f.handle({ action: 'track' }, { openid: 'student-a', appid: 'other-app' })).code, 'UNAUTHORIZED')
  for (const action of ['dashboard', 'adminFeedback', 'replyFeedback']) assert.equal((await f.call(action, { openid: 'author', isAdmin: true })).code, 'FORBIDDEN')
  assert.equal(f.tables.get(COLLECTIONS.feedback).size, 0)
})
test('留言仅作者和本人可读，普通列表不返回联系信息和用户标识', async () => {
  const f = fixture()
  assert.equal((await f.submit()).ok, true)
  const own = await f.call('myFeedback', { userId: 'forged' })
  assert.equal(own.data.items.length, 1)
  assert.equal('contact' in own.data.items[0], false)
  assert.equal('userId' in own.data.items[0], false)
  assert.equal((await f.call('myFeedback', { openid: 'student-a' }, 'student-b')).data.items.length, 0)
  assert.equal((await f.call('adminFeedback', {}, 'author')).data.items[0].contact, 'optional@example.com')
})
test('网络重试使用同一请求标识不会重复收信，修改内容不能复用旧请求', async () => {
  const f = fixture()
  const a = await f.submit()
  const b = await f.submit()
  assert.equal(a.data.id, b.data.id)
  assert.equal(f.tables.get(COLLECTIONS.feedback).size, 1)
  const conflict = await f.call('submitFeedback', { type: 'idea', content: '已经改过的另一条建议', contact: '', consent: true, requestId: 'request_id_00000000000000001' })
  assert.equal(conflict.code, 'CONFLICT')
})
test('服务端执行长度、类型、同意项校验，内容检查失败不保存或消耗留言配额', async () => {
  const f = fixture()
  for (const content of ['', '一', 'x'.repeat(1001), {}]) {
    assert.equal((await f.call('submitFeedback', { content, type: 'bug' })).code, 'INVALID_INPUT')
  }
  f.moderate('block'); assert.equal((await f.submit()).code, 'CONTENT_REJECTED')
  f.moderate('error'); const result = await f.submit()
  assert.equal(result.code, 'MODERATION_UNAVAILABLE')
  assert.equal(JSON.stringify(result).includes('private-value'), false)
  assert.equal(f.tables.get(COLLECTIONS.feedback).size, 0)
  assert.equal(f.tables.get(COLLECTIONS.quotas).size, 0)
})
test('一分钟间隔和每日 5 条在并发提交时仍然生效', async () => {
  const f = fixture()
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => f.submit(`parallel_request_000000000${i}`)))
  assert.equal(results.filter(result => result.ok).length, 1)
  assert.equal(results.filter(result => result.code === 'RATE_LIMITED').length, 7)
  for (let i = 0; i < 4; i++) { f.advance(60000); assert.equal((await f.submit(`later_request_00000000000${i}`)).ok, true) }
  f.advance(60000)
  assert.equal((await f.submit('sixth_request_0000000000000')).code, 'RATE_LIMITED')
  f.advance(86400000)
  assert.equal((await f.submit('next_day_request_000000000')).ok, true)
})
test('按北京时间跨日去重，多次或并发访问不增加累计人数', async () => {
  const f = fixture()
  assert.equal(chinaDay(Date.parse('2026-10-25T16:00:00Z')), '2026-10-26')
  await Promise.all(Array.from({ length: 10 }, () => f.call('track')))
  await f.call('track', {}, 'student-b')
  let stats = (await f.call('dashboard', {}, 'author')).data
  assert.equal(stats.totalUsers, 2); assert.equal(stats.todayUsers, 2)
  f.advance(86400000); await f.call('track')
  stats = (await f.call('dashboard', {}, 'author')).data
  assert.equal(stats.totalUsers, 2); assert.equal(stats.todayUsers, 1)
  assert.deepEqual(stats.trend.slice(-2).map(row => row.users), [2, 1])
})
test('同毫秒的大量留言分页不漏记录，拒绝无效游标', async () => {
  const f = fixture()
  for (let i = 0; i < 25; i++) await f.submit('request_id_00000000000000001', `student-${i}`)
  const first = await f.call('adminFeedback', {}, 'author')
  const second = await f.call('adminFeedback', { before: first.data.next }, 'author')
  assert.equal(first.data.items.length, 20); assert.equal(second.data.items.length, 5)
  assert.equal(new Set([...first.data.items, ...second.data.items].map(row => row.id)).size, 25)
  assert.equal((await f.call('myFeedback', { before: {} })).code, 'INVALID_INPUT')
})
test('作者回复仅回到原留言本人，状态同步，其他账号不能篡改', async () => {
  const f = fixture()
  const { data } = await f.submit()
  assert.equal((await f.call('replyFeedback', { id: data.id, reply: '伪造回复', status: 'resolved' })).code, 'FORBIDDEN')
  assert.equal((await f.call('replyFeedback', { id: data.id, reply: '已修复，下次更新生效', status: 'resolved' }, 'author')).ok, true)
  assert.equal((await f.call('myFeedback')).data.items[0].reply, '已修复，下次更新生效')
  assert.equal((await f.call('myFeedback')).data.items[0].status, 'resolved')
  assert.equal((await f.call('dashboard', {}, 'author')).data.pending, 0)
  assert.equal((await f.call('myFeedback', {}, 'student-b')).data.items.length, 0)
})
test('底层权限 / 认证错误不返回凭据，不误判为文档不存在', async () => {
  const db = { collection: () => ({ doc: () => ({ get: async () => { throw Error('permission denied token=secret') } }) }) }
  const service = createService({ repository: createRepository(db), moderate: async () => true })
  const result = await service({ action: 'submitFeedback', data: { content: '足够长的留言文字', type: 'bug', consent: true, requestId: 'request_id_00000000000000001' } }, { openid: 'student', appid: 'wx0000000000000000' })
  assert.equal(result.ok, false); assert.equal(result.code, 'SERVICE_UNAVAILABLE')
  assert.equal(JSON.stringify(result).includes('secret'), false)
})
