export interface CampusWaterEntry {
  id: 'card-bag' | 'portal'
  title: string
  description: string
  url?: string
}

// 公开版不附带作者的共享服务参数；确认公开权限后配置自己的入口。
export const CAMPUS_WATER_ENTRIES: CampusWaterEntry[] = [
  { id: 'card-bag', title: '校园卡卡包', description: '注册、领取自己的校园卡，按原服务提示用水', url: undefined },
  { id: 'portal', title: '校园服务门户', description: '从学校原有门户查找校园卡相关服务', url: undefined },
]

export function isCampusWaterUrl(value: string): boolean {
  // 微信逻辑层无浏览器 URL 全局；限制 HTTPS、精确域名与已知路径。
  return /^https:\/\/wx\.weiweixiao\.net\/(?:newid1\/|index\.php\/Wap\/ModMenhu\/index)\?[^#\s]+$/.test(value)
    && !/[\u0000-\u001f\\]/.test(value)
}
