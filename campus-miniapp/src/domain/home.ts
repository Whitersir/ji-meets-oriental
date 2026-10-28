import { currentWeek, PERIODS, type Course, type Timetable } from './schedule'
import { CAMPUS_TAKEOUT_URL } from './campus-takeout'

export function todayAgenda(timetable: Timetable | null, date: Date): Course[] {
  if (!timetable) return []
  const week = currentWeek(timetable.startDate, date)
  if (week < 1 || week > timetable.totalWeeks) return []
  const day = (date.getDay() + 6) % 7 + 1
  return timetable.courses.filter(c => c.day === day && c.weeks.includes(week))
    .sort((a, b) => a.sections[0] - b.sections[0] || a.name.localeCompare(b.name))
}

export function courseClock(course: Course): { start: string; end: string; known: boolean } {
  const sections = [...new Set(course.sections)].sort((a, b) => a - b)
  const periods = PERIODS.filter(p => p.sections.some(s => sections.includes(s)))
  const covered = periods.flatMap(p => p.sections)
  // 只展示已确认的大节时间；单节、离散节次和更高节次不推算具体时刻。
  if (covered.join(',') === sections.join(',') && sections.every((s, i) => !i || s === sections[i - 1] + 1)) {
    return { start: periods[0].time.split('–')[0], end: periods[periods.length - 1].time.split('–')[1], known: true }
  }
  return { start: `第 ${sections.join('、')} 节`, end: '时间待确认', known: false }
}

export interface CampusService { id: string; title: string; description: string; icon: string; url?: string; status?: string }
export const CAMPUS_SERVICES: CampusService[] = [
  { id: 'grades', title: '成绩查询', description: '导入成绩，保存后离线查看', icon: 'file', url: '/pages-import/grades', status: '成绩导入与留档' },
  { id: 'exams', title: '考试安排', description: '查看考试时间与地点', icon: 'calendar' },
  { id: 'rooms', title: '空教室', description: '寻找安静的自习空间', icon: 'door' },
  { id: 'library', title: '座位预约', description: '作者的预约功能开发说明', icon: 'book', url: '/pages/library/index', status: '作者有话说' },
  { id: 'pickups', title: '取件码', description: '集中查看本机保存的取件码', icon: 'parcel', url: '/pages/pickups/index' },
  { id: 'takeout', title: '校园外卖', description: '打开校园外卖点餐入口', icon: 'takeout', url: '/pages/takeout/index', status: '微信内打开点餐' },
  { id: 'water', title: '宿舍用水', description: '女生宿舍校园卡卡包', icon: 'water', url: '/pages/water/index', status: '校园卡卡包入口' },
  { id: 'calendar', title: '校历', description: '查看学校学期安排', icon: 'calendar', url: '/pages/calendar/index', status: '学期安排 · 暂行' },
]
export function openCampusService(service: CampusService) {
  if (service.id === 'library') {
    uni.showModal({
      title: '座位预约',
      content: '作者本来想在这里加一个可以直接预约座位的功能，但是在2026年10月24日凌晨2：45正式投降，用了所有能想到的办法了，如果大家有思路或者办法，恳求告诉我QAQ',
      showCancel: false,
      confirmText: '我知道了',
      success: result => {
        if (result.confirm && service.url) uni.navigateTo({ url: service.url })
      },
    })
    return
  }
  // #ifdef H5
  if (service.id === 'takeout') {
    window.location.assign(CAMPUS_TAKEOUT_URL)
    return
  }
  // #endif
  if (service.id === 'water') {
    uni.showModal({
      title: '宿舍用水',
      content: '目前只有部分女生宿舍能用，并且学校也不支持第三方查询余额，作者也没爬出来这个接口，只能先到这个注册领取界面',
      confirmText: '注册领卡',
      cancelText: '暂不前往',
      success: result => {
        if (result.confirm && service.url) uni.navigateTo({ url: service.url })
      },
    })
    return
  }
  if (service.url) uni.navigateTo({ url: service.url })
  else showPlannedService(service)
}
export function showPlannedService(service: CampusService) {
  uni.showModal({ title: `${service.title}尚未开放`, content: '这项服务正在规划中，开放后会在这里提供入口。目前可以使用课表查看和 Excel 导入。', showCancel: false, confirmText: '知道了' })
}
