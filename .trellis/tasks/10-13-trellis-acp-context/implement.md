# 执行计划

## 当前状态
用户已批准实施；两个子任务的修复、有限实验、正式审查与总任务集成验收已完成；规范已沉淀。尚未提交或归档，等待提交方案确认。

## 顺序
- [x] 建立两个子任务、需求边界和初始验收记录。
- [x] 确认仅当前项目内修复。
- [x] 建立设计、执行计划与 spec/research 上下文清单。
- [x] 用户审阅并批准规划；已激活子任务一。
- [x] 完成子任务一的短实验、最小修复与运行验收。
- [x] 完成子任务二的对照实验、最小修复与运行验收。
- [x] 固定最终代码与测试版本，使用 trellis-check 核对规范、验收及两项修复的联合表现。
- [x] 总任务复核角色限制、全局配置不变、交付物正确及回滚记录，更新 acceptance.json。
- [ ] 按 Trellis 收口流程完成规范沉淀与交付；提交前只纳入本任务明确归属的修改。

## 规划校验命令
```bash
python3 .trellis/scripts/task.py validate .trellis/tasks/10-13-trellis-acp-context
python3 scripts/acceptance.py summarize .trellis/tasks/10-13-trellis-acp-context
```
summarize 在 planning 返回 valid: true、status: unrun 和退出码 1 是预期结果，不能报告为功能通过。

## 验收与退出条件
先验证子任务结果，再运行代表性联合场景；记录实测覆盖与未验证范围。
每个功能实验有超时、停止条件和证据目录；连续三次相同失败停止并修正假设。
本任务不改产品功能，默认使用 CLI/实际 Pi 子进程验证；若发现产品行为也受影响，先修订范围与验收路线。

## 回滚点
每个子任务保留自身差异与修改前状态。回退只针对本任务变更；保留已有浏览器验收任务及其文件。

最终审查记录：父任务 `research/final-review.md`，无阻塞项；验收以各任务 acceptance.json 的最终 summarize 为准。
