# 放大镜验收执行

## 顺序

1. 静态检查：`npm run type-check`，记录 argv、退出码与日志到 `.tmp/10-18-pageview-magnifier-acceptance/logs/type-check.log`。
2. 本地 Vite 两轮固定 profile（桌面 1200×900、移动 390×844），书页与卷轴分别执行 US1/US3 菜单入口、US2-A 边界、US2-B 几何、US2-C 会话与持久化；每轮产物目录独立，结束运行 `verify-browser`。
3. GM 不可用降级与迁移/坏值/重置矩阵：在无 GM API 的 origin 与 fixture 注入下取证，逐行记录初始与终值。
4. 真实油猴 EH → NH → EX 共享与开关不跨会话；EX 不可访问记 blocked。
5. 回填 `.trellis/tasks/10-18-pageview-magnifier-acceptance/acceptance.json`，运行 `summarize`，失败项写复现步骤与证据路径。

## 命令

- `python3 scripts/browser-preflight.mjs prepare --profile desktop-1200x900`
- `python3 scripts/browser-preflight.mjs inject --artifact-dir <dir> --output-dir <dir>/scenario-inputs`
- `python3 scripts/browser-preflight.mjs coverage --artifact-dir <dir>/coverage --max-points 100`
- `node --experimental-strip-types scripts/browser-helper.ts coverage --input-dir <coverage> --output-file <dir>/coverage-report.json`
- `python3 scripts/acceptance.py verify-browser <artifact-dir>`
- `python3 scripts/acceptance.py summarize .trellis/tasks/10-18-pageview-magnifier-acceptance`

## 回滚点

- 本轮不修改产品代码；仅新增任务产物与 `.tmp/` 证据。失败项不改代码，另建修复任务。
