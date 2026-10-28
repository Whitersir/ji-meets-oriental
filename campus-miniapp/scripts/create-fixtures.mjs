import { utils, write } from 'xlsx'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const dir=fileURLToPath(new URL('../test-fixtures/',import.meta.url))
mkdirSync(dir,{recursive:true})
const rows=[
  ['2026-2027-1 学期理论课表（自造测试数据）'],
  ['节次','星期一','星期二','星期三','星期四','星期五','星期六','星期日'],
  ['1-2节','高等数学\n教师：张老师\n1-16(周)[01-02节]\n教室：A101','大学英语\n教师：李老师\n1-15周(单)\n教室：B202'],
  ['3-4节','','计算机基础\n教师：王老师\n1-8周\n教室：机房301\n---------------------\n数据结构\n教师：赵老师\n9-16周\n教室：C201'],
  ['5-6节','','','程序设计实验\n教师：周老师\n2-16周(双)\n教室：实验楼201'],
  ['7-8节'],['9-10节'],
]
const sheet=utils.aoa_to_sheet(rows)
sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:7}}]
sheet['!cols']=[{wch:14},...Array(7).fill({wch:30})]
const workbook=utils.book_new();utils.book_append_sheet(workbook,sheet,'理论课表')
for(const ext of ['xlsx','xls'])writeFileSync(`${dir}示例-学期课表.${ext}`,Buffer.from(write(workbook,{type:'array',bookType:ext==='xls'?'biff8':'xlsx'})))
const flat=utils.book_new();utils.book_append_sheet(flat,utils.aoa_to_sheet([
 ['课程名称','星期','节次','周次','教师','教室'],
 ['实验课补充','星期五','5-6','2,4,6,8','陈老师','实验楼302'],
]),'实验课');writeFileSync(`${dir}示例-实验课补充.xlsx`,Buffer.from(write(flat,{type:'array',bookType:'xlsx'})))
writeFileSync(`${dir}示例-网页表格.xls`,'<html><head><meta charset="utf-8"></head><body><table><tr><th>课程名称</th><th>星期</th><th>节次</th><th>周次</th><th>教师</th><th>教室</th></tr><tr><td>网页导出测试</td><td>周三</td><td>1-2</td><td>1-16</td><td>张老师</td><td>A101</td></tr></table></body></html>','utf8')
console.log('已生成 4 份自造测试文件，目录：'+dir)
