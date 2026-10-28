const cloud = require('wx-server-sdk')
const { createService } = require('./service')
const { createRepository } = require('./repository')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const context = cloud.getWXContext()
  const service = createService({
    repository: createRepository(cloud.database()),
    adminOpenids: (process.env.ADMIN_OPENIDS || '').split(',').map(value => value.trim()).filter(Boolean),
    moderate: async (content, openid) => {
      const result = await cloud.openapi.security.msgSecCheck({ content, openid, version: 2, scene: 2 })
      return (result.errCode === 0 || result.errcode === 0) && result.result?.suggest === 'pass'
    }
  })
  // 身份只来自微信服务端上下文，不接受 event 中传入的 openid / 管理员标志。
  return service(event, { openid: context.OPENID, appid: context.APPID })
}
