/**
 * 内存会话存储:token → { client, account, createdAt, lastUsedAt }
 *
 * 设计取舍(首版):
 *  - 不引入数据库:教务 cookie 本来就会在 30 分钟左右失效,存内存足够;
 *  - 不存密码:登录完成后内存里只剩教务 cookie,重启即清空;
 *  - 定期清扫,防止长期运行时对象堆积。
 */
import crypto from 'node:crypto';
import { createClient } from './qiangzhi.js';

const TOKEN_TTL_MS = 10 * 60 * 1000; // 空闲 10 分钟后回收(教务会话本身也不长)

const sessions = new Map();

export function createSession(baseUrl, account) {
  // 顺手清扫过期会话
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now - v.lastUsedAt > TOKEN_TTL_MS) sessions.delete(k);
  }

  const token = crypto.randomBytes(24).toString('hex');
  const client = createClient(baseUrl);
  sessions.set(token, { client, account, createdAt: now, lastUsedAt: now });
  return { token, client };
}

export function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  s.lastUsedAt = Date.now();
  return s;
}

export function destroySession(token) {
  return sessions.delete(token);
}
