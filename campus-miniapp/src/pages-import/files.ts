import { MAX_FILE_BYTES } from './excel'
export interface SelectedFile { name: string; data: ArrayBuffer }
export async function selectExcel(): Promise<SelectedFile | null> {
  // #ifdef MP-WEIXIN
  return new Promise((resolve,reject)=>wx.chooseMessageFile({
    count:1,type:'file',extension:['xls','xlsx'],
    success:({tempFiles})=>{
      const file=tempFiles[0]
      if(!file) return resolve(null)
      if(!/\.xlsx?$/i.test(file.name)) return reject(new Error('请选择 .xls 或 .xlsx 文件'))
      if(file.size>MAX_FILE_BYTES) return reject(new Error('文件超过 5 MB，请仅保留需要的课表或成绩后重试'))
      wx.getFileSystemManager().readFile({filePath:file.path,success:res=>resolve({name:file.name,data:res.data as ArrayBuffer}),fail:()=>reject(new Error('文件已失效，请重新选择或重新发送到文件传输助手'))})
    },
    fail:error=>/cancel/i.test(error.errMsg)?resolve(null):reject(new Error('文件选择失败，请重试'))
  }))
  // #endif
  // #ifdef H5
  return new Promise((resolve,reject)=>{
    const input=document.createElement('input')
    input.type='file';input.accept='.xls,.xlsx';input.style.display='none'
    document.body.appendChild(input)
    let settled=false
    const cleanup=()=>{input.remove();window.removeEventListener('focus',onFocus)}
    const done=(value:SelectedFile|null)=>{if(settled)return;settled=true;cleanup();resolve(value)}
    const onFocus=()=>setTimeout(()=>{if(!input.files?.length)done(null)},500)
    input.addEventListener('cancel',()=>done(null),{once:true})
    window.addEventListener('focus',onFocus,{once:true})
    input.addEventListener('change',async()=>{
      const file=input.files?.[0]
      if(!file)return done(null)
      try {
        if(!/\.xlsx?$/i.test(file.name))throw new Error('请选择 .xls 或 .xlsx 文件')
        if(file.size>MAX_FILE_BYTES)throw new Error('文件超过 5 MB，请仅保留需要的课表或成绩后重试')
        done({name:file.name,data:await file.arrayBuffer()})
      }catch(error){settled=true;cleanup();reject(error)}
    },{once:true})
    input.click()
  })
  // #endif
  // #ifndef MP-WEIXIN
  // #ifndef H5
  throw new Error('请在微信小程序或网页版中导入 Excel')
  // #endif
  // #endif
}
