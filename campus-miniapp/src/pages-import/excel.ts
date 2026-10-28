import { read, utils, set_cptable, type WorkBook, type WorkSheet, type Range } from 'xlsx'
import * as cptable from 'xlsx/dist/cpexcel.full.mjs'
import { deduplicate, type Course, type ImportResult } from '../domain/schedule'
import { normalize, parseDay, parseSections, parseWeeks } from '../domain/numbers'

set_cptable(cptable)
export const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_CELLS = 40000
export interface SheetResult { name: string; result: ImportResult }

function isUtf8(bytes: Uint8Array): boolean {
  // 不依赖 TextDecoder（部分小程序运行时没有），只判断编码，不改变内容。
  for(let i=0;i<bytes.length;) {
    const first=bytes[i++]
    if(first<0x80)continue
    const count=first>=0xc2&&first<=0xdf?1:first>=0xe0&&first<=0xef?2:first>=0xf0&&first<=0xf4?3:-1
    if(count<0||i+count>bytes.length)return false
    for(let j=0;j<count;j++)if((bytes[i++]&0xc0)!==0x80)return false
  }
  return true
}

function binaryString(bytes: Uint8Array): string {
  // 使用二进制字符串，避免文件 API 返回其他 JS 上下文的 ArrayBuffer。
  // 分块避免超出 iOS 函数参数数量限制。
  const chunks: string[]=[]
  for(let offset=0;offset<bytes.length;offset+=8192) chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+8192)))
  return chunks.join('')
}

function cellText(sheet: WorkSheet, r: number, c: number, formatted = false): string {
  const cell=sheet[utils.encode_cell({r,c})]
  return normalize(formatted ? (cell?.w ?? cell?.v) : cell?.v)
}
export function expandedRows(sheet: WorkSheet, range: Range, formatted = false): string[][] {
  const rows: string[][]=[]
  for(let r=0;r<=range.e.r;r++) {
    rows[r]=[]
    for(let c=0;c<=range.e.c;c++) rows[r][c]=cellText(sheet,r,c,formatted)
  }
  for(const m of sheet['!merges']??[]) {
    if(m.e.r>range.e.r||m.e.c>range.e.c) continue
    const value=rows[m.s.r]?.[m.s.c]??''
    for(let r=m.s.r;r<=m.e.r;r++) for(let c=m.s.c;c<=m.e.c;c++) if(!rows[r][c]) rows[r][c]=value
  }
  return rows
}
function detectTerm(rows: string[][]): string {
  const text=rows.slice(0,12).flat().join(' ')
  return text.match(/20\d{2}\s*[-—–]\s*20\d{2}\s*[-—–]\s*[12]/)?.[0].replace(/\s/g,'') ?? text.match(/20\d{2}[-—–]20\d{2}学年\s*第?[一二12]学期/)?.[0] ?? ''
}
function newCourse(fields: Omit<Course,'id'>, index: number): Course { return { ...fields,id:`import-${index}` } }
const isEmpty=(s:string)=>!s||/^(?:无|暂无|无课|[-—/]+)$/.test(s)

function parseBlock(text: string, day: number, fallbackSections: number[], sheet: string, index: number): Course | null {
  const lines=text.split('\n').map(normalize).filter(Boolean)
  if (!lines.length || isEmpty(text)) return null
  const name=lines[0].replace(/^课程(?:名称)?\s*[:：]\s*/,'').trim()
  const weekLine=lines.find(l=>/(?:\d.*周|周次[:：])/.test(l))??''
  const sectionLine=lines.find(l=>/\d.*节/.test(l))??''
  const explicitTeacher=lines.find(l=>/^(?:教师|老师|任课教师)\s*[:：]/.test(l))
  const explicitRoom=lines.find(l=>/^(?:教室|地点|上课地点)\s*[:：]/.test(l))
  const others=lines.slice(1).filter(l=>l!==weekLine&&l!==sectionLine&&!/^(?:课程代码|课程编号|学分|学时|班级)[:：]/.test(l))
  const looksRoom=(l:string)=>/楼|教室|机房|实验室|体育场|操场|[A-Za-z]区|教\d|[A-Za-z]\d|\d[A-Za-z]\d|^\d{3,}$/.test(l)
  const teacher=(explicitTeacher??others.find(l=>!looksRoom(l)&&l!==explicitRoom)??'').replace(/^(?:教师|老师|任课教师)\s*[:：]\s*/,'')
  const room=(explicitRoom??others.find(l=>looksRoom(l))??'').replace(/^(?:教室|地点|上课地点)\s*[:：]\s*/,'')
  return newCourse({name,teacher,room,day,sections:parseSections(sectionLine).length?parseSections(sectionLine):fallbackSections,weeks:parseWeeks(weekLine),raw:text,sourceSheet:sheet},index)
}

function flatTable(rows: string[][], result: ImportResult): boolean {
  const headerIndex=rows.findIndex(row=>row.some(v=>/^课程(?:名称|名)$/.test(v))&&row.some(v=>/^(?:星期|周几)$/.test(v)))
  if(headerIndex<0) return false
  const header=rows[headerIndex]
  const find=(...names:string[])=>header.findIndex(h=>names.includes(h.replace(/\s/g,'')))
  const cols={name:find('课程名称','课程名'),day:find('星期','周几'),teacher:find('教师','教师姓名','任课教师','老师'),room:find('教室','上课地点','地点'),weeks:find('周次','上课周次'),sections:find('节次','上课节次'),start:find('开始节次','起始节次'),end:find('结束节次'),weekStart:find('开始周','起始周'),weekEnd:find('结束周'),parity:find('单双周')}
  for(let r=headerIndex+1;r<rows.length;r++) {
    const row=rows[r], at=(i:number)=>i>=0?row[i]??'':''
    const name=at(cols.name)
    if(!name||/^(合计|备注|说明)/.test(name)) continue
    const day=parseDay(at(cols.day))
    if(!day) { result.skipped++;result.warnings.push(`第 ${r+1} 行「${name}」的星期无法识别`); continue }
    const baseWeeks=at(cols.weeks)
    const weekText=baseWeeks?(at(cols.parity)?`${baseWeeks}${/周/.test(baseWeeks)?'':'周'}(${at(cols.parity)})`:baseWeeks):(at(cols.weekStart)?`${at(cols.weekStart)}-${at(cols.weekEnd)||at(cols.weekStart)}周(${at(cols.parity)})`:'')
    const sections=parseSections(at(cols.sections)||(at(cols.start)?`${at(cols.start)}-${at(cols.end)||at(cols.start)}`:''))
    result.courses.push(newCourse({name,teacher:at(cols.teacher),room:at(cols.room),day,weeks:parseWeeks(weekText),sections,raw:row.join(' | '),sourceSheet:result.sheets[0]},result.courses.length))
  }
  return true
}

export function parseSheet(sheet: WorkSheet, sheetName: string): ImportResult {
  const result: ImportResult={courses:[],warnings:[],term:'',sheets:[sheetName],skipped:0}
  const range=utils.decode_range(sheet['!fullref']??sheet['!ref']??'A1')
  if(range.e.r>1000||range.e.c>100||(range.e.r+1)*(range.e.c+1)>MAX_CELLS) throw new Error('工作表范围过大，请仅保留课表后重新导出')
  if((sheet['!merges']?.length??0)>1000) throw new Error('合并单元格过多，无法安全读取')
  const rows=expandedRows(sheet,range)
  result.term=detectTerm(rows)
  if(!flatTable(rows,result)) {
    const headerIndex=rows.findIndex(row=>row.filter(v=>/^(星期|周|礼拜)/.test(v)&&parseDay(v)).length>=3)
    if(headerIndex<0) { result.warnings.push('未找到星期列或课程明细表头'); return result }
    const days=rows[headerIndex].map((v,c)=>({c,day:/^(星期|周|礼拜)/.test(v)?parseDay(v):0})).filter(x=>x.day)
    const firstDay=Math.min(...days.map(d=>d.c))
    for(let r=headerIndex+1;r<rows.length;r++) for(const {c,day} of days) {
      const text=cellText(sheet,r,c)
      if(isEmpty(text)) continue
      if(/^(备注|说明|注[:：]|学期|总学时)/.test(text)) continue
      const merge=(sheet['!merges']??[]).find(m=>m.s.r===r&&m.s.c===c)
      if(merge&&merge.e.c>c) { result.skipped++;result.warnings.push(`${utils.encode_cell({r,c})} 跨多个星期，需人工核对`);continue }
      const sections=new Set<number>()
      for(let row=r;row<=(merge?.e.r??r);row++) {
        for(let col=0;col<firstDay;col++) parseSections(rows[row]?.[col]??'').forEach(s=>sections.add(s))
      }
      const blocks=text.split(/\n\s*[-—=]{3,}\s*\n|\n\s*\n|\n(?=课程(?:名称)?\s*[:：])/).map(normalize).filter(s=>!isEmpty(s))
      for(const block of blocks) {
        if((block.match(/\d\s*[（(]?周/g)??[]).length>1) { result.skipped++;result.warnings.push(`${utils.encode_cell({r,c})} 中有多条排课但分隔不明确，请核对原表`);continue }
        const course=parseBlock(block,day,[...sections].sort((a,b)=>a-b),sheetName,result.courses.length)
        if(course) result.courses.push(course)
      }
    }
  }
  result.courses=deduplicate(result.courses).map((c,i)=>({...c,id:`${sheetName}-${i}`}))
  if(result.courses.length>500) throw new Error('课程记录超过 500 条，请选择个人学期课表')
  const incomplete=result.courses.filter(c=>!c.weeks.length||!c.sections.length)
  if(incomplete.length) result.warnings.push(`${incomplete.length} 条课程缺少可确认的周次或节次，请点击课程修正后保存`)
  return result
}

export function readExcelWorkbook(data: ArrayBuffer): WorkBook {
  if(data.byteLength>MAX_FILE_BYTES) throw new Error('文件超过 5 MB，请仅保留需要的课表或成绩后重试')
  if(!data.byteLength) throw new Error('文件为空，请重新从教务系统导出')
  let workbook: WorkBook
  try {
    const bytes=new Uint8Array(data)
    const prefix=Array.from(bytes.slice(0,1024),b=>String.fromCharCode(b)).join('')
    // 有些教务系统把 HTML 表格命名为 .xls，按内容识别，且不执行其中任何脚本。
    const html=/<(?:!doctype\s+html|html|table)\b/i.test(prefix)
    const utf8=/utf-?8/i.test(prefix)||(!/gb2312|gbk|gb18030/i.test(prefix)&&isUtf8(bytes))
    const supported=html||(bytes[0]===0x50&&bytes[1]===0x4b)||(bytes[0]===0xd0&&bytes[1]===0xcf)||/^\s*(?:\uFEFF)?<\?xml/i.test(prefix)
    if(!supported)throw new Error('unsupported')
    workbook=html ? read(cptable.utils.decode(utf8?65001:936,bytes),{type:'string',cellFormula:false,cellHTML:false}) : read(binaryString(bytes),{type:'binary',codepage:936,cellFormula:false,cellHTML:false,sheetRows:1001})
  } catch { throw new Error('无法读取这个 Excel，请确认文件未加密，且是教务导出的 .xls 或 .xlsx') }
  if(workbook.SheetNames.length>20) throw new Error('工作表超过 20 张，请仅保留需要导入的工作表')
  return workbook
}

export function parseExcel(data: ArrayBuffer): SheetResult[] {
  const workbook=readExcelWorkbook(data)
  const parsed=workbook.SheetNames.map(name=>({name,result:parseSheet(workbook.Sheets[name],name)}))
  if(!parsed.some(s=>s.result.courses.length)) {
    throw new Error('已读取 Excel，但未识别出课程。请从「学期理论课表」重新导出，确认表内有星期、课程和周次信息。已有课表未修改。')
  }
  return parsed
}
