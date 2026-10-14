# 实施与验收计划

当前任务已获准实施。2026-10-14用户另行授权将更新请求错误及EH移动视口两个阻塞纳入当前任务；以PRD R1–R8、AC1–AC8及design扩展方案为准。

## 1. 原预检实现与历史验证

- [x] 能力探针确认CDP完整源码、当前文档关联和顶层执行取证；身份/权限/独立环境/阶段事件/异常保存/回调保护实现完成。
- [x] 新增96项预检回归，并接入通用浏览器指南和EH技能；保持同一空间、服务归属和主会话单写acceptance。
- [x] 修复事件串行收集和EH全部活动脚本身份检查，静态审查完成。
- [x] 保留[修复前四场景阻塞](research/current-runtime.md)、[历史70项版本结果](research/final-runtime.md)及受控异常矩阵；历史结果不替代当前版本。

## 2. 获准的两项产品修复

- [x] 先取得红测：原生/GM通知失败各6条严重日志；EH inner1232×2666，根节点overflow可逆A/B定位。证据在`.tmp/browser-preflight/blocker-fix/`。
- [x] 规划回填R7/R8、AC7/AC8：通知局部单次/去重/15秒fetch+body预算；EH移动打开接管根节点overflow，关闭恢复原值和priority。严格预检不放宽。
- [x] trellis-implement修改`core/store/event.ts`与`src/main.ts`，通知37项、入口13项真实模块回归由红转绿。通用请求层、业务更新源、存储协议、loader未修改。
- [x] 主会话核对实际补丁；`npm run check`通过类型检查、37 Python+46存储+96预检+50生命周期测试及生产构建。

## 3. 当前版本真实验收

详见[修复后最终运行](research/post-fix-runtime.md)。每轮使用同一空间3/p1、当前源码/生产包、固定profile和正常UI动作；先保存事件再分析，helper单一drain。每个测试阶段执行短通知。

- [x] Vite桌面1200×900、DPR1、无触摸：120模块身份/执行，打开关闭重开、两模式、更新结束后操作和5张截图。
- [x] Vite移动390×844、DPR3、触摸5/coarse、mobile true回执：120模块，模式/开关/更新结束和4张截图。
- [x] EH桌面：唯一完整生产包执行、标题1/136、模式、缩略图加载定位第2页、开关、更新结束和4张截图。
- [x] EH移动：严格390×844、DPR3/触摸5/coarse、mobile true回执，完整生产包、首屏/模式/缩略图/开关、根节点及viewport恢复和4张截图。
- [x] 17张截图逐张读取；产品severe/未捕获异常为0，原生外部网络错误与可选通知warning保留归因。
- [x] 最终包权限矩阵通过；同指纹预检受控CSS/旧代码/超时负例保留有效，不冒充实际Vite功能通过。
- [x] 主会话回填21项acceptance；未验证物理设备/其他浏览器/NH真站/未加载分支等边界写入报告。

## 4. 最终收口

- [x] 稳定契约更新至state-management与quality指南；产品、测试、入口文档冻结。
- [x] 固定版本trellis-check审查全范围Standards与Spec；未发现产品/测试缺陷，P3规范函数名已修正并复核。
- [x] 所属四个服务/npm进程退出、5175/8787释放；空间3正常finish一次，保留用户资源、既有__pycache__与交付证据。
- [x] 记录/文档检查、task validate与acceptance summarize通过；21 passed、0 failed/blocked/partial/unrun/waived。
- [x] 原实现提交6f3dc84后经acceptance archive成功归档（23910a2），重定位本任务文档与证据引用，归档后审计通过且21项仍passed。会话日志及长通知已完成。经用户确认迁到独立分支后，实现/归档提交分别为13fc961/067894c，详见[分支修正记录](research/branch-correction.md)。

## 回退

产品修复可独立撤回两个产品文件及对应测试/命令增量；预检可独立撤回helper、测试和入口文档。不删除证据、不覆盖同期用户改动，不改写Git历史。没有数据迁移。任何新增失败先记录真实观察并修复，不写手工整体passed。
