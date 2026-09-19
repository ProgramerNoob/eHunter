# 清理遗留死文件恢复 type-check 基线

## Goal

消除 `npm run type-check`（`vue-tsc --noEmit`）的全部 22 项错误，恢复退出码 0 的绿灯基线，解锁历史上依赖该检查的待办项。

## Requirements

- **R1**：删除 6 个无人引用的遗留文件：`src/platform/base/index.ts`、`src/platform/eh/index.ts`、`src/platform/nh/index.ts`、`src/platform/eh/service/AlbumServiceImpl.old.ts`、`src/platform/nh/service/AlbumServiceImpl.old.ts`、`src/platform/eh/service/AlbumCacheService.ts`。用户已确认采用删除方案（不使用 tsconfig exclude，不做就地修复）。
- **R2**：`core/components/TopBar.vue` 的 `getItemStyle()` 返回值类型与 Vue 模板 prop 类型兼容，消除 `TopBar.vue(20,14)` 错误；不改变运行时布局行为（测量阶段的 `visibility:hidden`、隐藏项的 `display:none` 语义保持）。
- **R3**：删除前再确认各文件确实无 import 引用；删除后同步修正仍然声称这些文件存在的文档段落：`.trellis/spec/frontend/state-management.md:102-106`（“legacy album-cache code used by `AlbumServiceImpl.old.ts`”整段）、`.trellis/spec/frontend/directory-structure.md:60-67`（“Historical files also remain inside current directories”条目）、`AGENTS.md:23`（`AlbumCacheService` 引用改为现役对象，保留仍适用的检查项）。历史任务产物（`.trellis/spec/frontend/features/001-add-pageview-magnifier/tasks.md:112`、`.trellis/spec/frontend/features/002-more-settings-modal/plan.md:84`）与 `.tmp/t038/t038-evidence.md` 是过往记录，保持原样。
- **R4**：`npm run type-check` 退出码 0，且不再有新增错误；`tsconfig.json` 的 `include`/`exclude` 不需要为本次清理新增排除项。

## Acceptance Criteria

- [ ] `npm run type-check` 退出码 0，终端无错误输出（记录实际命令与输出摘要）。
- [ ] 6 个遗留文件已删除；删除前对每个文件执行一次引用检索，结果记录在案。
- [ ] 删除后重新检索，确认 `src/platform/base/service/PlatformService.js`、`src/platform/base/request/TextReq`（活跃引用）与 `core/`、`src/main.ts` 的导入链未受影响。
- [ ] 文档已同步：`state-management.md:102-106` 与 `directory-structure.md:60-67` 改述为已删除的历史实现（不再声称文件存在），`AGENTS.md:23` 去掉 `AlbumCacheService`（`ImgUrlListParser` 仍为现役，须保留）；历史任务产物与 `.tmp/` 证据按原样保留并说明原因。
- [ ] `TopBar.vue` 修复前后行为一致：顶栏字段的显示/隐藏与测量阶段不可见性在桌面 1200×900 与移动 390×844 视口下无变化，含截图。
- [ ] `npm run build-prod` 退出码 0 且 `dist/ehunter.iife.js` 非空（注入用的是生产 IIFE 包）。
- [ ] 未验证范围（如因删除文件而暴露的运行期路径）显式列出。

## Out of Scope

- 修复 6 个遗留文件的类型错误（已确认选择删除）。
- 重构 `src/platform/base/` 的现役模块、改写 `AlbumServiceImpl.old.ts` 中的业务逻辑。
- 新增 lint、单测或 CI 脚本（仓库当前无这些脚本）。
- 其他历史待办的文档/契约对齐。

## Notes

- 错误构成：21 项来自上述遗留文件（`UniStorage` 无 `load/save/clearMapForKey/sync`、找不到 `'../../../core'`、`AlbumServiceImpl` 已改名 `EHAlbumServiceImpl`），1 项来自 `TopBar.vue(20,14)`。
- 这些文件仅因 `tsconfig.json` 的 `include: ["src/platform/**/*"]` 而被编译，并非被现役代码使用。
- 根因分析与删除依据见同目录 `implement.md`；父任务见 `.trellis/tasks/09-20-backlog-nh-thumb-and-typecheck`。
