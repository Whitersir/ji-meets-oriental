/**
 * 校园小程序后端入口
 *   node src/index.js        (或 npm run dev 热重启)
 *
 * 路由一览(均以 /api 为前缀):
 *   POST /api/login          {account, password} → {token, account}
 *   GET  /api/logout         销毁会话
 *   GET  /api/schedule       ?term=2026-2027-1  → {terms, currentTerm, courses}
 *   GET  /api/scores         ?term=2026-2027-1  → {scores, gpa}
 *
 * 鉴权:Header  Authorization: Bearer <token>
 * 错误:{ error: '文案' };401 且 code=SESSION_EXPIRED 时前端应跳回登录页。
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { login, getSchedule, getScores } from './qiangzhi.js';
import { createSession, getSession, destroySession } from './store.js';

const app = express();
const PORT = process.env.PORT || 8787;
const JW_BASE_URL = process.env.JW_BASE_URL || 'http://219.148.95.56:10000';

app.use(cors()); // 开发期小程序工具直连;上线后建议收紧为自家域名
app.use(express.json());

/** 简易登录限速:同 IP 每分钟最多 6 次尝试,防撞库 */
const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, windowStart: now };
  if (now - rec.windowStart > 60_000) {
    rec.count = 0;
    rec.windowStart = now;
  }
  if (++rec.count > 6) {
    return res.status(429).json({ error: '尝试过于频繁,请 1 分钟后再试' });
  }
  loginAttempts.set(ip, rec);
  next();
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: '未登录或会话已过期', code: 'NO_SESSION' });
  }
  req.session = session;
  next();
}

app.get('/', (_req, res) => {
  res.json({
    name: '河北东方学院校园小程序 API',
    status: 'ok',
    jw: JW_BASE_URL,
  });
});

app.post('/api/login', rateLimitLogin, async (req, res) => {
  const { account, password } = req.body || {};
  if (!account || !password) {
    return res.status(400).json({ error: '请输入学号和密码' });
  }
  try {
    const { token, client } = createSession(JW_BASE_URL, account);
    await login(client, account, password);
    res.json({ token, account });
  } catch (err) {
    if (err.code === 'AUTH_FAILED') {
      return res.status(401).json({ error: err.message, code: 'AUTH_FAILED' });
    }
    console.error('[login] 教务系统异常:', err.message);
    res.status(502).json({ error: '教务系统暂时不可用,请稍后再试' });
  }
});

app.get('/api/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  destroySession(token);
  res.json({ ok: true });
});

app.get('/api/schedule', requireAuth, async (req, res) => {
  try {
    const data = await getSchedule(req.session.client, req.query.term);
    res.json(data);
  } catch (err) {
    if (err.code === 'SESSION_EXPIRED') {
      return res.status(401).json({ error: err.message, code: 'SESSION_EXPIRED' });
    }
    console.error('[schedule]', err.message);
    res.status(502).json({ error: '课表获取失败,教务系统可能不稳定,请重试' });
  }
});

app.get('/api/scores', requireAuth, async (req, res) => {
  try {
    const data = await getScores(req.session.client, req.query.term);
    res.json(data);
  } catch (err) {
    if (err.code === 'SESSION_EXPIRED') {
      return res.status(401).json({ error: err.message, code: 'SESSION_EXPIRED' });
    }
    console.error('[scores]', err.message);
    res.status(502).json({ error: '成绩获取失败,教务系统可能不稳定,请重试' });
  }
});

app.listen(PORT, () => {
  console.log(`[campus-server] http://localhost:${PORT}  教务:${JW_BASE_URL}`);
});
