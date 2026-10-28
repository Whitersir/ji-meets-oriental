import { describe,it,expect } from 'vitest'
import { runInNewContext } from 'node:vm'
import { utils,write } from 'xlsx'
import * as cptable from 'xlsx/dist/cpexcel.full.mjs'
import { parseExcel,parseSheet } from '../src/pages-import/excel'
import { parseWeeks,parseSections } from '../src/domain/numbers'
import { assertTimetable,conflicts,currentWeek,deduplicate,validMonday,type Course,type Timetable } from '../src/domain/schedule'
import { loadTimetable,saveTimetable,STORAGE_KEY,type StorageAdapter } from '../src/services/storage'
function workbookBytes(rows:unknown[][],bookType:'xlsx'|'biff8'='xlsx'){
  const wb=utils.book_new();utils.book_append_sheet(wb,utils.aoa_to_sheet(rows),'学期课表')
  return write(wb,{type:'array',bookType}) as ArrayBuffer
}
const row=['高等数学','周一','1-2','1-16','张老师','A101']
const header=['课程名称','星期','节次','周次','教师','教室']
const course:Course={id:'one',name:'高等数学',day:1,sections:[1,2],weeks:[1,2],teacher:'张老师',room:'A101',raw:'',sourceSheet:'理论课'}
const saved:Timetable={version:1,term:'2026-2027-1',startDate:'2026-08-31',totalWeeks:20,courses:[course],importedAt:'2026-10-24T08:00:00.000Z',fileNames:['课表.xlsx']}
describe('周次与节次，不猜测缺失信息',()=>{
  it('处理非连续周次、中文逗号和强智括号',()=>expect(parseWeeks('1-8，11,15-16(周)[01-02节]')).toEqual([1,2,3,4,5,6,7,8,11,15,16]))
  it('处理河北东方学院导出的嵌套周次括号',()=>expect(parseWeeks('1-5,7-17([周])[01-02节]')).toEqual([1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17]))
  it('处理每个区间自己的单双周',()=>expect(parseWeeks('1-8周(单),10-16周(双)')).toEqual([1,3,5,7,10,12,14,16]))
  it('兼容括号内的单周写法',()=>expect(parseWeeks('1-8(单周)')).toEqual([1,3,5,7]))
  it('拒绝倒序、越界和缺失的周次',()=>{expect(parseWeeks('16-1周')).toEqual([]);expect(parseWeeks('1-9999周')).toEqual([]);expect(parseWeeks('张老师')).toEqual([])})
  it('识别大节、连续多节和离散节次',()=>{expect(parseSections('第一大节')).toEqual([1,2]);expect(parseSections('[05-06-07节]')).toEqual([5,6,7]);expect(parseSections('1,3')).toEqual([1,3])})
})
describe('Excel 文件导入',()=>{
  it('读取来自另一个 JS 上下文的文件 ArrayBuffer（微信文件 API）',()=>{
    const bytes=workbookBytes([header,row])
    const foreign=runInNewContext('new Uint8Array(values).buffer',{values:Array.from(new Uint8Array(bytes))}) as ArrayBuffer
    expect(parseExcel(foreign)[0].result.courses[0]).toMatchObject({name:'高等数学',day:1,sections:[1,2]})
  })
  for(const bookType of ['xlsx','biff8'] as const)it(`读取真正的 ${bookType} 二进制`,()=>{
    const parsed=parseExcel(workbookBytes([header,row],bookType))[0].result
    expect(parsed.courses).toHaveLength(1)
    expect(parsed.courses[0]).toMatchObject({name:'高等数学',teacher:'张老师',room:'A101',day:1,sections:[1,2],weeks:Array.from({length:16},(_,i)=>i+1)})
  })
  it('读取本校 BIFF8 网格格式的周次、教师和分区教室（匿名样例）',()=>{
    const rows=[['学生个人课表'],['2026-2027-1'],['','星期一','星期二','星期三','星期四','星期五','星期六','星期日'],['第一大节\n08:10-09:50','示例课程\n张老师\n1-5,7-17([周])[01-02节]\nA区-教1-101']]
    const result=parseExcel(workbookBytes(rows,'biff8'))[0].result
    expect(result.courses).toHaveLength(1)
    expect(result.courses[0]).toMatchObject({name:'示例课程',teacher:'张老师',room:'A区-教1-101',day:1,sections:[1,2]})
    expect(result.courses[0].weeks).toEqual([1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17])
    expect(result.warnings).toEqual([])
  })
  it('网格中一格多门课，分别保留周次',()=>{
    const sheet=utils.aoa_to_sheet([['节次','星期一','星期二','星期三'],['1-2节','高等数学\n张老师\n1-8(周)[01-02节]\nA101\n---------------------\n线性代数\n李老师\n9-16(周)[01-02节]\nB202']])
    const result=parseSheet(sheet,'理论课')
    expect(result.courses).toHaveLength(2);expect(result.courses[0].weeks).toEqual([1,2,3,4,5,6,7,8]);expect(result.courses[1].weeks).toEqual([9,10,11,12,13,14,15,16])
  })
  it('合并单元格跨节次不使星期错位，也不重复导入',()=>{
    const sheet=utils.aoa_to_sheet([['节次','星期一','星期二','星期三'],['1','高数\n1-16周'],['2',null,'英语\n1-16周']])
    sheet['!merges']=[{s:{r:1,c:1},e:{r:2,c:1}}]
    const result=parseSheet(sheet,'理论课')
    expect(result.courses).toHaveLength(2);expect(result.courses[0]).toMatchObject({day:1,sections:[1,2]});expect(result.courses[1]).toMatchObject({day:2,sections:[2]})
  })
  it('缺周次时保留课程并警告，不默认整学期',()=>{const result=parseSheet(utils.aoa_to_sheet([header,['英语','周二','3-4','','','']]),'课表');expect(result.courses[0].weeks).toEqual([]);expect(result.warnings.join()).toContain('缺少')})
  it('明细表有独立单双周列时同样生效',()=>{const result=parseSheet(utils.aoa_to_sheet([['课程名称','星期','节次','周次','单双周'],['英语','周二','3-4','1-8','双周']]),'课表');expect(result.courses[0].weeks).toEqual([2,4,6,8])})
  it('跳过不能识别的星期并报告遗漏',()=>{const result=parseSheet(utils.aoa_to_sheet([header,[...row.slice(0,1),'未知',...row.slice(2)]]),'课表');expect(result.courses).toHaveLength(0);expect(result.skipped).toBe(1)})
  it('支持多个工作表，供用户明确选择，避免混合学期',()=>{
    const wb=utils.book_new();utils.book_append_sheet(wb,utils.aoa_to_sheet([header,row]),'理论课');utils.book_append_sheet(wb,utils.aoa_to_sheet([header,['实验','周三','5-6','2,4,6','','实验楼']]),'实验课')
    const parsed=parseExcel(write(wb,{bookType:'xlsx',type:'array'}));expect(parsed.map(s=>s.name)).toEqual(['理论课','实验课']);expect(parsed[1].result.courses[0].weeks).toEqual([2,4,6])
  })
  it('支持 HTML 内容伪装的 .xls（不执行脚本）',()=>{
    const html='<html><head><meta charset="utf-8"></head><table><tr>'+header.map(h=>`<th>${h}</th>`).join('')+'</tr><tr>'+row.map(v=>`<td>${v}</td>`).join('')+'</tr></table></html>'
    expect(parseExcel(new TextEncoder().encode(html).buffer)[0].result.courses[0].name).toBe('高等数学')
  })
  it('读取 GBK 编码的中文网页式 .xls',()=>{
    const html='<html><head><meta charset="gb2312"></head><table><tr>'+header.map(h=>`<th>${h}</th>`).join('')+'</tr><tr>'+row.map(v=>`<td>${v}</td>`).join('')+'</tr></table></html>'
    const bytes=new Uint8Array(cptable.utils.encode(936,html))
    expect(parseExcel(bytes.buffer)[0].result.courses[0]).toMatchObject({name:'高等数学',teacher:'张老师'})
  })
  it('拒绝空、非 Excel 和超大文件',()=>{expect(()=>parseExcel(new ArrayBuffer(0))).toThrow('为空');expect(()=>parseExcel(new ArrayBuffer(5*1024*1024+1))).toThrow('5 MB');expect(()=>parseExcel(new Uint8Array([0,1,2,3,4]).buffer)).toThrow()})
  it('限制伪造的巨大工作表范围',()=>{const sheet=utils.aoa_to_sheet([header,row]);sheet['!ref']='A1:XFD1048576';expect(()=>parseSheet(sheet,'过大')).toThrow('范围过大')})
})
describe('本地保存与周视图数据',()=>{
  it('按校历算周次，学期外不假装是第一周',()=>{expect(currentWeek('2026-08-31',new Date(2026,9,24))).toBe(8);expect(currentWeek('2026-08-31',new Date(2026,7,30))).toBe(0)})
  it('要求有效的周一，拒绝日期溢出',()=>{expect(validMonday('2026-08-31')).toBe(true);expect(validMonday('2026-09-01')).toBe(false);expect(validMonday('2026-02-30')).toBe(false)})
  it('缺周次或超出学期周数时拒绝保存',()=>{expect(()=>assertTimetable({...saved,courses:[{...course,weeks:[]}]})).toThrow();expect(()=>assertTimetable({...saved,totalWeeks:1})).toThrow()})
  it('合并时去重，并报告真实时间重叠',()=>{expect(deduplicate([course,{...course,id:'two'}])).toHaveLength(1);expect(conflicts([course,{...course,id:'two',name:'英语',weeks:[2]}])).toBe(1);expect(conflicts([course,{...course,id:'two',weeks:[3]}])).toBe(0)})
  it('存储失败时旧课表保留；重开后能读取已存快照',()=>{
    const data=new Map<string,unknown>([[STORAGE_KEY,structuredClone(saved)]])
    const storage:StorageAdapter={getStorageSync:k=>data.get(k),setStorageSync:()=>{throw new Error('quota')},removeStorageSync:k=>{data.delete(k)}}
    expect(()=>saveTimetable({...saved,term:'新课表'},storage)).toThrow('quota');expect(loadTimetable(storage)?.term).toBe(saved.term)
    storage.setStorageSync=(k,v)=>{data.set(k,v)};saveTimetable({...saved,term:'已保存'},storage);expect(loadTimetable(storage)?.term).toBe('已保存')
  })
})
