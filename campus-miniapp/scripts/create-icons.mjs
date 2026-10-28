// 自绘的基础几何线性图标。仅构建素材时使用 sharp，不给小程序增加运行依赖。
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_MODULE || 'sharp')
const directory = fileURLToPath(new URL('../src/static/icons/', import.meta.url))
mkdirSync(directory, { recursive: true })
const shapes = {
  home: '<path d="M3 11 12 3l9 8v10h-6v-7H9v7H3Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h1m6 0h1m-8 4h1m6 0h1"/>',
  campus: '<path d="M3 21V9h5V5l4-3 4 3v4h5v12M8 9v12m8-12v12M1 21h22m-13 0v-5h4v5m-3-14h2m-2 4h2m-8 2v2m14-2v2"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/>',
  file: '<path d="M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8m-8 4h6"/>',
  book: '<path d="M12 5C9 2 4 2 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-2-7-2-10 1Zm0 0v15"/>',
  door: '<path d="M4 22V3l13-1v20M2 22h20M17 3h4v19m-8-10v2"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 13H2v8h20v-8h-2"/>',
  grid: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>',
  pin: '<path d="M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14Z"/><circle cx="12" cy="8" r="2.5"/>',
  parcel: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v11l9 4 9-4V7M12 11v11M7 5l10 4v5"/>',
  water: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  takeout: '<path d="M4 9h16l-1 12H5L4 9ZM3 6h18M7 3v3m5-3v3m5-3v3M8 13h8m-6 4h4"/>',
}
const requested = process.argv.slice(2)
if (requested.some(name => !Object.hasOwn(shapes, name))) throw new Error('Unknown icon name')
await Promise.all(Object.entries(shapes).filter(([name]) => !requested.length || requested.includes(name)).flatMap(([name, shape]) =>
  [['', '#8d2f38'], ['-muted', '#786c69']].map(async ([suffix, color]) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`
    await sharp(Buffer.from(svg)).png().toFile(`${directory}${name}${suffix}.png`)
  })))
console.log('Created local UI and tab bar icons.')
