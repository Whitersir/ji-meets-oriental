# 可选服务端源码

- `src/`：实验性 Express 强智教务适配器，未接入当前前端，不应直接公网部署接收真实教务账号。
- `cloudfunctions/campusBackend/`：留言、作者工作台与人数去重候选实现。
- `cloudfunctions/campusLogin/`：微信 code 与 CloudBase 自定义登录桥接候选实现。

云端默认关闭，身份接入、权限隔离及实际收信未完成线上验收。请先读[部署说明](../docs/DEPLOYMENT.md)，不要把隔离测试通过当作已部署。

Express 本地探索：本目录 `npm ci`，复制 `.env.example` 为 `.env` 后运行 `npm run dev`，默认端口 8787。云函数的业务隔离测试命令见根目录 README。
