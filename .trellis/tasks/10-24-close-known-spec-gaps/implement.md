# 执行清单

## 1. R1 downloadTime 本地时区

- [x] `core/service/GalleryDownloadService.ts:347`：`new Date().toISOString()` 改为本地带偏移的格式化（新增模块内私有函数，如 `formatLocalDateTime`）。
- [x] 保留 `downloadTime` 在 `run()` 起始处只取一次。
- [x] 新增 `tests/download-time.test.cjs`（node:test），用 `TZ=Asia/Shanghai` 与 `TZ=UTC` 两个子进程跑同一格式化逻辑：断言东八区输出 `+08:00`、UTC 输出 `+00:00`，且 `Date.parse(输出)` 还原到同一毫秒。
- [x] 在 `package.json` 的 `test` 脚本加入该测试（挂到现有 `node --test` 组）。

## 2. R2 初始化超时

- [x] `src/platform/initializer.ts:14`：`TIMEOUT_MS = 60000`，注释同步。
- [x] `src/platform/initializer.ts:74`：错误文案改为由 `TIMEOUT_MS / 1000` 插值。
- [x] 全局 grep 确认初始化链路无 `120` 残留。

## 3. R3 NH 属性精确化

- [x] `src/platform/nh/parser/IntroHtmlParser.ts:12`：`/src=/g` → `/\ssrc=/g`，替换值为 ` x-src=`。
- [x] `src/platform/nh/parser/IntroHtmlParser.ts:23`：读取改为 `data-src` → `x-src`。
- [x] `src/platform/nh/parser/ImgHtmlParser.ts:6`：替换形式同步精确化。
- [x] `.tmp/nh-thumb-src-parser/` 两份真实样本跑改写前后解析对比：`IntroHtmlParser` 45/45 缩略图 URL 与页面链接、标题一致；`ImgHtmlParser` 图片 URL、尺寸、页码一致。
- [x] 构造 `data-src` 样本再跑一遍，确认旧格式仍可解析。

## 4. 规格同步

- [x] `001-gallery-download-bundle/data-model.md:74` 改写为本地时间契约。
- [x] `.trellis/spec/frontend/state-management.md:234` 恢复 60 秒一致描述。
- [x] `.trellis/spec/frontend/features/index.md:26-28` 删除 R1/R2/R3 差异，保留下载并发。
- [x] `.trellis/spec/frontend/features/pending-work.md` 删除 R1/R2/R3 三段，保留下载并发。
- [x] `.trellis/spec/frontend/quality-guidelines.md:140` 与 `state-management.md:249` 的 NH 双拼写描述改为定稿契约。

## 5. 验收

- [x] 测试前播放 notify-complete 短通知（5 次）。
- [x] `npm run check`（type-check + 全部测试 + build-prod + check:docs）。
- [x] 非平台链路按 `browser-acceptance.md` 验收（下载元信息与初始化超时）。
- [x] 平台链路按 `.pi/skills/reader-test/SKILL.md` `platform:nh` 验收（图集缩略图、阅读页图片）。
- [x] 汇总已验证/未验证范围，清理临时服务与端口。

## 回滚点

- 三处改动彼此独立，可按 R1 / R2 / R3 单独回滚。
- 规格文件改动只描述当前状态，回滚代码时须同步回滚对应规格描述。
