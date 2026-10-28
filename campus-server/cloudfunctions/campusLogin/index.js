const https = require('node:https')
const { createLoginHandler } = require('./service')
let handler
function configure() {
  const appid = process.env.WX_APPID
  const secret = process.env.WX_APP_SECRET
  const envId = process.env.CLOUDBASE_ENV_ID
  if (!/^wx[0-9a-f]{16}$/.test(appid || '') || !envId || envId === 'YOUR_CLOUDBASE_ENV_ID' || !secret) throw new Error('Configuration missing')
  const credentials = JSON.parse(process.env.TCB_CUSTOM_LOGIN_CREDENTIALS || '{}')
  if (credentials.env_id !== envId || !credentials.private_key_id || !credentials.private_key) throw new Error('Credentials missing')
  const cloudbase = require('@cloudbase/js-sdk')
  const app = cloudbase.init({ env: envId, credentials })
  return createLoginHandler({
    exchangeCode: code => new Promise((resolve, reject) => {
      const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
      url.search = new URLSearchParams({ appid, secret, js_code: code, grant_type: 'authorization_code' }).toString()
      // 当前体验环境普通函数执行上限3秒，预留签名和响应时间。
      const request = https.get(url, { timeout: 1500 }, response => {
        if (response.statusCode !== 200) { response.resume(); reject(new Error('WeChat unavailable')); return }
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          body += chunk
          if (Buffer.byteLength(body) > 65536) response.destroy(new Error('Response too large'))
        })
        response.on('error', () => reject(new Error('WeChat unavailable')))
        response.on('end', () => { try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid response')) } })
      })
      request.on('timeout', () => request.destroy(new Error('WeChat timeout')))
      request.on('error', () => reject(new Error('WeChat unavailable')))
    }),
    // 使用官方 SDK 进行 RS256 签名；会话上限一天，Ticket 本身有效期由 SDK 控制。
    signTicket: openid => app.auth.createTicket(openid, { refresh: 3600000, expire: Date.now() + 86400000 })
  })
}
// 依赖与签名器优先在冷启动初始化阶段载入，避免占用3秒请求执行预算。
try { handler = configure() } catch { /* 配置不完整时 main 继续返回明确的未配置结果。 */ }
exports.main = async event => {
  try { handler ||= configure(); return await handler(event) }
  catch {
    return { statusCode: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'LOGIN_NOT_CONFIGURED', message: '登录服务尚未配置' }) }
  }
}
