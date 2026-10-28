# 配置与部署

## 本地课表

1. 在 `campus-miniapp/` 执行 `npm ci`。
2. H5 运行 `npm run dev:h5`。
3. 微信端将 `src/manifest.json` 的 `mp-weixin.appid` 改成自己的 AppID，运行 `npm run dev:mp-weixin`，导入 `dist/dev/mp-weixin`。

公开版使用游客 / 示例配置，不附带作者云环境或后台权限。自己的 AppID 不会自动赋予第三方网页的嵌入权限。

## H5 发布

前端执行 `npm run build:h5`，将 `dist/build/h5/` 部署到自己的静态服务。使用 hash 路由。发布后验证文件选择、刷新、剪贴板和移动端布局；剪贴板可能需要 HTTPS、安全上下文和用户手势，拒绝时使用保留的手动复制地址。

项目没有替你创建公网部署。浏览器能访问预约地址，不代表个人微信小程序能够用 `web-view` 直接打开。

## 微信发布

前端执行 `npm run build:mp-weixin`，导入 `dist/build/mp-weixin`，使用自己的开发者账号完成预览、真机调试、上传和审核。核对隐私保护指引、服务类目和外部入口。

四个主页面预留底栏安全区。iPhone / Android 均需检查小屏、底部横条、拖动取消、返回恢复，以及不支持模糊时的可读性。

## 可选云端：留言与统计

**默认 `COMMUNITY_READY = false`，这部分仍需接入与验收，不是填写环境 ID 就能上线。**

- `campusBackend`：私下留言、本人留言、作者回复 / 状态、访问人数去重、作者工作台。
- `campusLogin`：实验性微信 code 校验及 CloudBase 自定义登录 Ticket 签发。
- 前端 `src/services/community.ts` 当前使用 `wx.cloud.callFunction`，依赖可信微信上下文；**尚未集成自定义 Ticket 登录客户端链路**。

桥接不会自动为业务函数补出可信 OPENID。不要将客户端传入的 `openid` / `isAdmin` 当成身份，不要为了连通而放开全环境匿名访问。

| 配置 | 放在哪里 | 说明 |
| --- | --- | --- |
| AppID | 前端 manifest、云函数 `WX_APPID` | 自己有权管理的小程序 |
| 环境 ID | 前端 `CLOUD_ENV`、登录函数 `CLOUDBASE_ENV_ID` | 使用自己的环境 |
| AppSecret | 服务端 `WX_APP_SECRET` | 不放前端、Git、截图或 Issue |
| 签名凭据 | 服务端 `TCB_CUSTOM_LOGIN_CREDENTIALS` | 仅自定义登录方案需要；私钥 JSON 只放服务端 |
| 作者 OPENID | `campusBackend` 的 `ADMIN_OPENIDS` | 服务端逗号分隔白名单，不能自助提权 |
| 内容安全 | 云函数 `config.json` 和平台授权 | 失败时不保存留言，在自己的环境验证 |

仓储当前使用文档数据库 API，不直接使用 PostgreSQL SQL。具体环境的数据库、身份上下文和 SDK 接入能力须自行核对，不能照搬另一环境的配置。

准备 `campus_visitors`、`campus_daily_visitors`、`campus_feedback`、`campus_feedback_quotas`，关闭客户端直读写，通过服务端校验访问。按仓储查询建立日期、用户 / 状态及排序索引，先做隔离验证。

真实登录、普通用户隔离、作者权限、内容检查、失败重试不重复、收信回复、人数去重、错误脱敏、真机和隐私说明全部验收后再开启前端开关。启用后从实际使用开始计数，不回填历史人数。

根目录执行业务隔离测试，不读线上数据或使用真实 AppSecret：

```bash
node --test campus-server/cloudfunctions/campusBackend/tests/*.test.cjs
node --test campus-server/cloudfunctions/campusLogin/tests/*.test.cjs
```

## 实验性 Express 教务适配器

```bash
cd campus-server
npm ci
cp .env.example .env
npm run dev
```

PowerShell 可使用 `Copy-Item .env.example .env`。默认本地端口 8787，教务地址通过 `JW_BASE_URL` 指定。

保留 `POST /api/login`、`GET /api/logout`、`GET /api/schedule`、`GET /api/scores`。它未接入当前前端；真实账号联调、会话过期、异常日志、HTTPS、来源限制和生产限流尚未完成生产验收。不要直接公网部署并接收同学的教务密码。
