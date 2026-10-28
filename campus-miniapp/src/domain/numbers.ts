export function normalize(value: unknown): string {
  return String(value ?? '').replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296)).replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').trim()
}
export function numberList(text: string, max = 30): number[] {
  const value = normalize(text).replace(/[～~—–至]/g,'-').replace(/[，、]/g,',').replace(/\s/g,'')
  if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(value)) return []
  const result = new Set<number>()
  for (const part of value.split(',')) {
    const [a,b=a] = part.split('-').map(Number)
    if (a<1 || b<a || b>max) return []
    for(let n=a;n<=b;n++) result.add(n)
  }
  return [...result].sort((a,b)=>a-b)
}
export function parseWeeks(text: string): number[] {
  const value = normalize(text).replace(/[（(\[【]+\s*周\s*[）)\]】]+/g,'周').replace(/[～~—–至]/g,'-').replace(/(\d)[（(](单|双)周[）)]/g,'$1周($2)').replace(/(\d)(单|双)周/g,'$1周($2)')
  const result = new Set<number>()
  const pattern = /(\d+(?:\s*-\s*\d+)?(?:\s*[,，、]\s*\d+(?:\s*-\s*\d+)?)*)(?:\s*[（(])?\s*周(?:[）)])?(?:\s*[（(]?(单|双)(?:周)?[）)]?)?/g
  for (const m of value.matchAll(pattern)) {
    const values = numberList(m[1])
    if (!values.length) return []
    values.filter(w=>!m[2] || w%2===(m[2]==='单'?1:0)).forEach(w=>result.add(w))
  }
  if (result.size) return [...result].sort((a,b)=>a-b)
  const label = value.match(/周次\s*[:：]\s*([\d\s,，、-]+)(?:[（(]?(单|双)[）)]?)?/)
  const values = numberList(label?.[1] ?? value)
  return values.filter(w=>!label?.[2] || w%2===(label[2]==='单'?1:0))
}
export function parseSections(text: string): number[] {
  const value = normalize(text).replace(/[～~—–至]/g,'-')
  const big = value.match(/第?([一二三四五六七1-7])大节/)
  if (big) { const n=Number(big[1]) || '一二三四五六七'.indexOf(big[1])+1; return [n*2-1,n*2] }
  const m = value.match(/(?:节次\s*[:：]\s*|第|\[|【)?(\d+(?:\s*[-,，、]\s*\d+)*)\s*节/)
  // 强智的 05-06-07节 表示连续节次，不是合法的普通范围，单独校验后展开。
  const raw = m?.[1] ?? (/^[\d\s,，、-]+$/.test(value) ? value : '')
  if (/^\d+(?:-\d+){2,}$/.test(raw.replace(/\s/g,''))) {
    const nums=raw.split('-').map(Number)
    return nums.every((n,i)=>n>=1&&n<=14&&(i===0||n===nums[i-1]+1)) ? nums : []
  }
  return numberList(raw,14)
}
export function parseDay(value: unknown): number {
  const text = normalize(value).replace(/\s/g,'')
  const m=text.match(/^(?:(?:星期|周|礼拜))?([一二三四五六日天1-7])(?:$|[（(])/)
  return m ? (Number(m[1]) || ('一二三四五六日'.indexOf(m[1])+1) || 7) : 0
}
