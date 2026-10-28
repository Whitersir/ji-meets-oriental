// 2026-10-26：学习通运行页学校参数，用户在 iPhone Safari 登录后确认本校列表。
// 只保留学校路由，不携带个人认证票据。
export const LIBRARY_SEAT_URL = 'https://office.chaoxing.com/front/apps/seat/index?fidEnc=ac5a8b9d21d69115'

export function copyLibrarySeatLink(onFailure: () => void, onCopied?: () => void) {
  uni.setClipboardData({
    data: LIBRARY_SEAT_URL,
    success: () => onCopied ? onCopied() : uni.showModal({
      title: '预约链接已复制',
      content: '请打开手机浏览器（iPhone 用 Safari），将链接粘贴到地址栏。按超星官方页面提示自行登录，即可进入本校预约列表。',
      showCancel: false,
      confirmText: '知道了',
    }),
    fail: onFailure,
  })
}
