/**
 * 强智(Kingosoft)教务系统适配器 — 河北东方学院
 *
 * 实测确认的接口(2026-10 探测):
 *   会话:  GET  /jsxsd/                                → 取 bzb_jsxsd cookie
 *   登录:  POST /jsxsd/xk/LoginToXk
 *          表单: loginMethod=LoginToXk & userAccount=<学号> & userPassword=<空>
 *                & encoded=base64(学号)+"%%%"+base64(密码)
 *          登录页实际生效的提交函数是 submitForm1(),用的是 encodeInp(=标准 base64),
 *          而非旧版 login() 的 scode/sxh 混淆(flag=sess 接口在该校已失效)。
 *   课表:  GET  /jsxsd/kbcx/xskbcx?xnxq01id=<学年学期>   (未登录时返回登录页而非 302)
 *   成绩:  POST /jsxsd/kscj/cjcx_list                    (查询条件以表单提交)
 *   学期:  课表页 <select id="xnxq01id"> 的 option 列表
 *
 * 服务端不落库任何凭据:密码只在 login() 调用栈内存中用于换取教务 session,
 * 之后所有请求仅依赖 cookie jar。
 */
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** 创建一个绑定独立 cookie jar 的 axios 实例(每个用户一份会话) */
export function createClient(baseUrl) {
  const jar = new CookieJar();
  return wrapper(
    axios.create({
      baseURL: baseUrl,
      jar,
      timeout: 20000,
      headers: {
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
      },
      // 教务系统登录成功会 302,跟随即可;非 2xx 不抛异常,由调用方判断
      validateStatus: () => true,
      maxRedirects: 5,
    }),
  );
}

/** 构造登录混淆字段 */
export function encodeLogin(account, password) {
  return (
    Buffer.from(String(account), 'utf8').toString('base64') +
    '%%%' +
    Buffer.from(String(password), 'utf8').toString('base64')
  );
}

/** 判断响应 HTML 是否为登录页(该校未登录时不跳 302,直接渲染登录页) */
function isLoginPage(html) {
  const $ = cheerio.load(html);
  const title = ($('title').text() || '').trim();
  return title === '登录' || $('#loginForm').length > 0;
}

/** 登录失败时,从登录页提取 showMsg 错误文案 */
function loginErrorMessage(html) {
  const $ = cheerio.load(html);
  return ($('#showMsg').text() || '').trim() || '登录失败,请检查账号与密码';
}

/**
 * 登录教务系统。
 * 成功返回 true;失败抛错(err.code = 'AUTH_FAILED' / 'JW_UNREACHABLE')。
 */
export async function login(client, account, password) {
  // 1. 初始化会话 cookie(bzb_jsxsd)
  const boot = await client.get('/jsxsd/');
  if (boot.status !== 200) {
    const err = new Error(`教务系统不可达(HTTP ${boot.status})`);
    err.code = 'JW_UNREACHABLE';
    throw err;
  }

  // 2. 提交混淆后的登录表单
  const form = new URLSearchParams({
    loginMethod: 'LoginToXk',
    userAccount: String(account),
    userPassword: '',
    encoded: encodeLogin(account, password),
  });
  await client.post('/jsxsd/xk/LoginToXk', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: client.defaults.baseURL + '/jsxsd/',
    },
  });

  // 3. 登录结果不直接体现在响应里,以"能否打开学生主框架页"为准
  const check = await client.get('/jsxsd/framework/xsMainV.jsp');
  if (isLoginPage(check.data)) {
    const err = new Error(loginErrorMessage(check.data));
    err.code = 'AUTH_FAILED';
    throw err;
  }
  return true;
}

/** 解析"1-17周" / "3,5-17周(单)" / "第1-16周" 这类周次文本为数字数组 */
export function parseWeeks(text) {
  const weeks = new Set();
  const m = String(text || '').match(/([\d,，\-]+)\s*周/);
  if (!m) return [];
  const isOdd = /(单)/.test(text);
  const isEven = /(双)/.test(text);
  for (const part of m[1].split(/[,，]/)) {
    const range = part.split('-');
    if (range.length === 1) {
      const w = parseInt(range[0], 10);
      if (w) weeks.add(w);
    } else {
      const [a, b] = range.map((x) => parseInt(x, 10));
      for (let w = a; w <= b; w++) weeks.add(w);
    }
  }
  let list = [...weeks].sort((a, b) => a - b);
  if (isOdd) list = list.filter((w) => w % 2 === 1);
  if (isEven) list = list.filter((w) => w % 2 === 0);
  return list;
}

/**
 * 解析课表页 HTML(强智标准结构:<table id="kblist">)。
 * 表格:第一行表头,之后每行一个大节;第一列是节次,第 2~8 列为周一~周日。
 * 单元格 class 含 kbcontent,内容以 <br> 分隔:课程名 / 周次 / 教师 / 教室。
 * 存在 rowspan(跨节次课程),用占位数组把列号对齐到真实星期。
 */
export function parseSchedule(html) {
  const $ = cheerio.load(html);
  const terms = [];
  $('select#xnxq01id option').each((_, el) => {
    const $el = $(el);
    terms.push({ value: $el.attr('value') || '', name: $el.text().trim() });
  });
  const currentTerm =
    $('select#xnxq01id option[selected]').attr('value') ||
    (terms[0] ? terms[0].value : '');

  const courses = [];
  const table = $('table#kblist').length ? $('table#kblist') : $('table').first();

  // rowspan 感知遍历:occupied[r][c] 记录被上方 rowspan 占用的格子
  const occupied = [];
  const rows = table.find('tr');
  rows.each((rowIdx, tr) => {
    occupied[rowIdx] = occupied[rowIdx] || [];
    let col = 0; // 0 = 节次列,1..7 = 周一..周日
    $(tr)
      .children('td,th')
      .each((_, cell) => {
        while (occupied[rowIdx][col]) col++; // 跳过被占用的列
        const $cell = $(cell);
        const rowspan = parseInt($cell.attr('rowspan') || '1', 10);
        for (let r = 1; r < rowspan; r++) {
          occupied[rowIdx + r] = occupied[rowIdx + r] || [];
          occupied[rowIdx + r][col] = true;
        }
        const cls = $cell.attr('class') || '';
        if (col > 0 && cls.includes('kbcontent')) {
          const text = $cell.text().replace(/\u00a0/g, ' ').trim();
          if (text) {
            const lines = text
              .split(/\n+/)
              .map((s) => s.trim())
              .filter(Boolean);
            // 强智顺序:课程名、周次(含"周"字)、教师、教室;偶有缺项
            const name = lines[0] || '';
            const weekLine = lines.find((l) => /周/.test(l)) || '';
            const teacher = lines.find(
              (l) => l !== name && l !== weekLine && !/周/.test(l) && !/^[\d\s,，\-]*$/.test(l) && l.length <= 10 && /[^\dA-Za-z]/.test(l),
            );
            const room = lines.find(
              (l) =>
                l !== name &&
                l !== weekLine &&
                l !== teacher &&
                /楼|区|层|室|馆|号|[A-Z]\d|栋/.test(l),
            );
            // 节次:本行 + rowspan 跨的行都算(强智每行=1小节,从第2行起)
            const sections = [];
            for (let r = 0; r < rowspan; r++) sections.push(rowIdx + r);
            courses.push({
              name,
              teacher: teacher || '',
              room: room || '',
              weeks: parseWeeks(weekLine),
              day: col, // 1=周一 ... 7=周日
              sections, // 0-based 行号,对应节次需按校情微调
              raw: lines.join(' | '),
            });
          }
        }
        col++;
      });
  });

  return { terms, currentTerm, courses };
}

/** 拉取并解析课表;若教务会话失效抛 401 语义错误 */
export async function getSchedule(client, term) {
  const resp = await client.get('/jsxsd/kbcx/xskbcx', {
    params: term ? { xnxq01id: term } : {},
    headers: { Referer: client.defaults.baseURL + '/jsxsd/kbcx/xskbcx' },
  });
  if (isLoginPage(resp.data)) {
    const err = new Error('教务登录已过期,请重新登录');
    err.code = 'SESSION_EXPIRED';
    throw err;
  }
  return parseSchedule(resp.data);
}

/** 解析成绩页(表格 #dataList,按表头文字动态映射列,兼容列序差异) */
export function parseScores(html) {
  const $ = cheerio.load(html);
  const table = $('#dataList');
  const headers = [];
  table.find('thead th, tr:first th').each((_, el) => {
    headers.push($(el).text().trim());
  });
  const idx = (name) => headers.findIndex((h) => h.includes(name));

  const scores = [];
  table.find('tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (!tds.length) return;
    const at = (name) => {
      const i = idx(name);
      return i >= 0 ? $(tds[i]).text().trim() : '';
    };
    const name = at('课程名称');
    if (!name) return;
    scores.push({
      term: at('学期') || at('开课学期'),
      name,
      nature: at('课程性质') || at('课程类别'),
      credit: parseFloat(at('学分')) || 0,
      gradePoint: parseFloat(at('绩点')) || 0,
      score: at('成绩'),
      makeup: at('补考'),
      retake: at('重修'),
      college: at('学院'),
    });
  });

  // 加权平均绩点(排除无绩点记录,如未出分/体育挂科补考前)
  let gpSum = 0;
  let creditSum = 0;
  for (const s of scores) {
    if (s.gradePoint > 0 && s.credit > 0) {
      gpSum += s.gradePoint * s.credit;
      creditSum += s.credit;
    }
  }
  return { scores, gpa: creditSum ? +(gpSum / creditSum).toFixed(2) : 0 };
}

/** 查询成绩(强智以表单条件 POST 查询) */
export async function getScores(client, term) {
  const form = new URLSearchParams({
    kksj: term || '', // 开课学期,空=全部
    kcxz: '', // 课程性质,空=全部
    kcmc: '', // 课程名,空=全部
    xsxm: 'all', // 查询范围
  });
  const resp = await client.post('/jsxsd/kscj/cjcx_list', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: client.defaults.baseURL + '/jsxsd/kscj/cjcx_list',
    },
  });
  if (isLoginPage(resp.data)) {
    const err = new Error('教务登录已过期,请重新登录');
    err.code = 'SESSION_EXPIRED';
    throw err;
  }
  return parseScores(resp.data);
}

/** 从课表页顶部提取学生姓名(强智通常渲染"XXX 同学"或顶部欢迎栏) */
export function extractStudentName(html) {
  const $ = cheerio.load(html);
  const m = $('#Top1_DDL_XQ, .user, .topUserName, #name')
    .first()
    .text()
    .match(/[\u4e00-\u9fa5]{2,4}/);
  return m ? m[0] : '';
}
