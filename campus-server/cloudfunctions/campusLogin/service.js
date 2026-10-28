// 登录码由微信服务端验证；调用方不能指定身份或角色。
function createLoginHandler({ exchangeCode, signTicket }) {
  return async function login(event = {}) {
    const respond = (statusCode, body) => ({
      statusCode,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify(body)
    })
    if (event.httpMethod && event.httpMethod !== 'POST') return respond(405, { error: 'METHOD_NOT_ALLOWED' })
    let input = event
    try {
      if (typeof event.body === 'string') {
        if (Buffer.byteLength(event.body) > 4096) return respond(413, { error: 'BODY_TOO_LARGE' })
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
        if (Buffer.byteLength(body) > 1024) return respond(413, { error: 'BODY_TOO_LARGE' })
        input = JSON.parse(body)
      } else if (event.body !== undefined) input = event.body
    } catch { return respond(400, { error: 'INVALID_REQUEST' }) }
    const code = input?.code
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(code)) return respond(400, { error: 'INVALID_CODE' })
    try {
      const session = await exchangeCode(code)
      // 不返回微信原响应：其中可能包含 session_key、openid、unionid。
      if (session?.errcode || !/^[A-Za-z0-9_-]{16,32}$/.test(session?.openid || '')) return respond(401, { error: 'WECHAT_CODE_REJECTED' })
      const ticket = await signTicket(session.openid)
      if (typeof ticket !== 'string' || !ticket) throw new Error('Signing failed')
      return respond(200, { ticket })
    } catch {
      // 不序列化异常，不记录请求/密钥/登录码/签发结果。
      return respond(503, { error: 'LOGIN_UNAVAILABLE', message: '登录服务暂不可用，请稍后重试' })
    }
  }
}
module.exports = { createLoginHandler }
