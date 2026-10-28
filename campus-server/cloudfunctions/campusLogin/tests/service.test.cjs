const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createLoginHandler } = require('../service')
const code = 'valid_test_code_123456789'
const openid = 'verified_wechat_user_12345678'
const parse = result => JSON.parse(result.body)
test('身份只来自微信校验，伪造身份及管理员字段不参与签名', async () => {
  let signed
  const handler = createLoginHandler({ exchangeCode: async value => { assert.equal(value, code); return { openid, session_key: 'hidden_session_key', unionid: 'hidden_unionid' } }, signTicket: async value => { signed = value; return 'test-ticket' } })
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ code, openid: 'attacker', admin: true }) })
  assert.equal(result.statusCode, 200)
  assert.equal(signed, openid)
  assert.deepEqual(parse(result), { ticket: 'test-ticket' })
  assert.equal(result.headers['Cache-Control'], 'no-store')
})
test('缺失/非法登录码、非 POST、过大正文均不调用微信或签名', async () => {
  const handler = createLoginHandler({ exchangeCode: async () => assert.fail('Must not call'), signTicket: async () => assert.fail('Must not sign') })
  for (const event of [{}, { code: 123 }, { code: 'bad' }, { code: 'a'.repeat(129) }, { httpMethod: 'POST', body: '{' }]) assert.equal((await handler(event)).statusCode, 400)
  assert.equal((await handler({ httpMethod: 'GET', code })).statusCode, 405)
  assert.equal((await handler({ body: 'a'.repeat(4097) })).statusCode, 413)
})
test('失效或已使用的微信 code 不签发凭据，也不返回微信原始异常', async () => {
  const handler = createLoginHandler({ exchangeCode: async () => ({ errcode: 40029, errmsg: 'sensitive debug', session_key: 'secret' }), signTicket: async () => assert.fail('Must not sign') })
  const result = await handler({ code })
  assert.equal(result.statusCode, 401)
  assert.deepEqual(parse(result), { error: 'WECHAT_CODE_REJECTED' })
})
test('微信响应缺失/非法身份时不能签名', async () => {
  for (const session of [null, {}, { openid: 'bad' }, { openid: 'a'.repeat(33) }]) {
    const handler = createLoginHandler({ exchangeCode: async () => session, signTicket: async () => assert.fail('Must not sign') })
    assert.equal((await handler({ code })).statusCode, 401)
  }
})
test('上游网络异常及签名异常不泄露密钥、登录码或部分凭据', async () => {
  for (const failure of ['exchange', 'sign']) {
    const handler = createLoginHandler({ exchangeCode: async () => { if (failure === 'exchange') throw new Error('secret-app-key'); return { openid } }, signTicket: async () => { throw new Error('private-ticket-data') } })
    const result = await handler({ code })
    assert.equal(result.statusCode, 503)
    assert.doesNotMatch(result.body, /secret-app-key|private-ticket-data|valid_test_code/)
  }
})
test('HTTP base64 正文可解析，返回空 ticket 时拒绝假成功', async () => {
  const handler = createLoginHandler({ exchangeCode: async () => ({ openid }), signTicket: async () => '' })
  const result = await handler({ httpMethod: 'POST', isBase64Encoded: true, body: Buffer.from(JSON.stringify({ code })).toString('base64') })
  assert.equal(result.statusCode, 503)
})
test('尚未提供服务端凭据时入口关闭，不尝试读取调用方身份', async () => {
  const result = await require('../index').main({ code, openid: 'attacker' })
  assert.equal(result.statusCode, 503)
  assert.equal(parse(result).error, 'LOGIN_NOT_CONFIGURED')
})
