# 执行清单：type-check 基线清理

> 顺序执行；每步留下可核对的实际输出。方案见 `prd.md`。

## 0. 记录基线

- [ ] `npm run type-check`，完整输出存 `.tmp/typecheck-dead-code-cleanup/before.log`，记录错误总数与逐条 `error TS*` 的文件:行:列。
- [ ] 与 `.tmp/t038/t038-evidence.md:154` 的历史记录对齐：预期 22 条 = `src/platform/**` 21 条 + `core/components/TopBar.vue(20,14)` 1 条。

## 1. 删除前引用核对

- [ ] 对 6 个文件逐一检索引用（文件名检索 + `from '<相对路径>'` 检索），记录命中：预期仅 `src/platform/eh/service/AlbumServiceImpl.old.ts:2` 引用 `AlbumCacheService`，其余为 0 命中。
- [ ] 确认活跃引用不受影响：`src/platform/base/service/PlatformService.js`（被 `src/main.ts:10`、`core/store/app.ts:7`、`core/store/layoutPreference.ts:1` 引用）、`src/platform/base/request/TextReq`（被 `core/store/event.ts:6` 引用）。
- [ ] `git ls-files` 核对清单与实际路径一致：`src/platform/base/index.ts`、`src/platform/eh/index.ts`、`src/platform/nh/index.ts`、`src/platform/eh/service/AlbumServiceImpl.old.ts`、`src/platform/nh/service/AlbumServiceImpl.old.ts`、`src/platform/eh/service/AlbumCacheService.ts`。

## 2. 删除并确认错误收敛

- [ ] `git rm` 上述 6 个文件。
- [ ] `npm run type-check` 存 `.tmp/typecheck-dead-code-cleanup/after-delete.log`：预期只剩 `TopBar.vue(20,14)` 1 条。
- [ ] 再次检索被删文件名，确认无残留代码引用（文档与历史记录除外，逐条列出）。

## 3. TopBar.vue 类型修复

- [ ] 记录 `TopBar.vue(20,14)` 的完整错误消息到 `after-delete.log` 同目录笔记。
- [ ] 修 `core/components/TopBar.vue:81-91`：为 `getItemStyle()` 加 `CSSProperties` 返回类型注解（`import type { CSSProperties } from 'vue'`），**三个返回分支的语义与取值不变**（测量阶段 `visibility:'hidden'`、隐藏项 `display:'none'`、默认 `{}`）。
- [ ] `npm run type-check` 退出码 0，输出留档 `after.log`。
- [ ] `npm run build-prod` 退出码 0 且 `dist/ehunter.iife.js` 非空（注入用的是生产 IIFE 包；`vite build` 只出 SPA 产物）。

## 4. 文档同步

- [ ] `.trellis/spec/frontend/state-management.md:102-106`：整段改述为历史实现已删除（不再指向 `src/platform/eh/service/AlbumCacheService.ts`）。
- [ ] `.trellis/spec/frontend/directory-structure.md:60-67`：删去“Historical files also remain inside current directories”中指向被删文件的条目，保留 `core_old/`、`old/` 与“先追踪导入再判定活跃”的有效约束。
- [ ] `AGENTS.md:23`：去掉已删除的 `AlbumCacheService`，保留 `ImgUrlListParser`（现役：`src/platform/eh/service/AlbumServiceImpl.ts:13,124`）；逐条核对保留下来的检查项仍对应现役代码，不保留失效约束。
- [ ] 历史记录不改写并说明原因：`.trellis/spec/frontend/features/001-add-pageview-magnifier/tasks.md:112`、`.trellis/spec/frontend/features/002-more-settings-modal/plan.md:84`、`.tmp/t038/t038-evidence.md`。

## 5. 行为验收

- [ ] 测试开始前执行 notify-complete 短通知。
- [ ] 服务与注入按 `.pi/skills/eh-test/SKILL.md` 流程；确认页面加载的是本次 `dist/` 产物、无 Vite 编译错误。
- [ ] 说明并验证：`TopBar.vue` 改动是纯类型注解，编译后不产生运行期代码；验收目标是顶栏交互未受影响，而非像素比对。
- [ ] 桌面 1200×900：顶栏字段显示/隐藏、更多菜单、快捷设置项变更后布局重排正常；截图。
- [ ] 移动 390×844：同上；截图。
- [ ] 控制台无新增报错、无未捕获异常。
- [ ] 任务完成后执行 notify-complete 长通知；清理本次服务并核实进程退出、端口释放。

## 回退点

- 删除为 `git rm`：提交前可 `git checkout -- <path>` 恢复，提交后可用 `git revert`，无不可逆操作。
- `TopBar.vue` 改动为单行类型注解，可单行还原。
- 文档改动随代码回退一并还原。
