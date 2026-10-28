export const CLOUD_ENV = 'YOUR_CLOUDBASE_ENV_ID'
// 现有环境为 PostgreSQL，微信工具的传统环境导入尚未通过。
// 完成真实环境适配和部署验证后才能打开，避免向未部署的服务上报。
export const COMMUNITY_READY = false
export const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug 反馈' },
  { value: 'suggestion', label: '使用建议' },
  { value: 'idea', label: '功能灵感' }
] as const
export type FeedbackType = typeof FEEDBACK_TYPES[number]['value']
export type FeedbackStatus = 'pending' | 'processing' | 'resolved'
export const STATUS_LABELS: Record<FeedbackStatus, string> = { pending: '待查看', processing: '处理中', resolved: '已处理' }
export interface Feedback { id: string; type: FeedbackType; content: string; contact?: string; status: FeedbackStatus; reply: string; createdAt: number; updatedAt: number }
export interface FeedbackPage { items: Feedback[]; next: string | null }
export interface Dashboard { totalUsers: number; todayUsers: number; pending: number; trend: { day: string; users: number }[]; updatedAt: number }
let initialized = false
class CommunityError extends Error {}
export function initCommunity() {
  // #ifdef MP-WEIXIN
  if (COMMUNITY_READY && !initialized && wx.cloud) {
    try {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: false })
      initialized = true
    } catch { /* 云端不可用时，本地课表等功能仍可使用。 */ }
  }
  // #endif
}
export async function communityCall<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  // #ifdef MP-WEIXIN
  try {
    if (!COMMUNITY_READY) throw new CommunityError('留言服务正在配置中，暂未开放提交；内容尚未发送，请保留后稍后再试')
    initCommunity()
    if (!initialized) throw new CommunityError('云服务暂不可用，请更新微信后重试')
    const response = await wx.cloud.callFunction({ name: 'campusBackend', data: { action, data }, config: { env: CLOUD_ENV } })
    const result = response.result as { ok: boolean; data?: T; message?: string }
    if (!result || typeof result.ok !== 'boolean') throw new CommunityError('云服务响应异常，请稍后重试')
    if (!result.ok) throw new CommunityError(result.message || '操作未完成，请稍后重试')
    return result.data as T
  } catch (error) {
    // 平台原始错误不直接展示，避免认证信息出现在界面。
    if (error instanceof CommunityError) throw error
    throw new Error('暂时无法连接留言服务，请稍后重试；未收到成功提示前请保留内容')
  }
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('请在微信小程序中提交和查看留言；网页预览不会发送内容或计入人数')
  // #endif
}
let tracking: Promise<void> | null = null
let recordedDay = ''
export async function trackVisit(): Promise<void> {
  // #ifdef MP-WEIXIN
  if (!COMMUNITY_READY || uni.getSystemInfoSync().platform === 'devtools') return
  const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
  if (recordedDay === day) return
  if (tracking) return tracking
  tracking = communityCall('track').then(() => { recordedDay = day }).catch(() => {
    // 统计故障不阻塞本地课表；下次进入前台可重试。
  }).finally(() => { tracking = null })
  await tracking
  // #endif
}
export function feedbackTypeLabel(type: FeedbackType) { return FEEDBACK_TYPES.find(item => item.value === type)?.label || '留言' }
export function messageTime(time: number) {
  const value = new Date(time + 8 * 3600000).toISOString()
  return `${value.slice(0, 10)} ${value.slice(11, 16)}`
}
export function newRequestId() { return `feedback_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` }
