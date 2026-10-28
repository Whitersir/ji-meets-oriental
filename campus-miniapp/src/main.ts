import { createSSRApp } from 'vue'
import App from './App.vue'
export function createApp() {
  const app = createSSRApp(App)
  // 仅在本次运行中记录；等首个页面就绪后显示，兼容从分享页直接打开。
  let launchNoticeShown = false
  app.mixin({
    onReady() {
      if (launchNoticeShown) return
      launchNoticeShown = true
      uni.showModal({
        title: '使用说明',
        content: '该软件是本校学生自制软件非学校正式软件，目的就是把在学校中所用的功能综合在一个地方，节约时间提高效率，部分功能因找不到某些接口而搁置，大家有哪些想法可以在<我的-给作者留言中>提交，也可以给作者发邮件kaelnb666@gmail.com发邮件',
        showCancel: false,
        confirmText: '知道了',
        fail: () => { launchNoticeShown = false }
      })
    }
  })
  return { app }
}
