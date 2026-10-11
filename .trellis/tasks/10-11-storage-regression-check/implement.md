# 存储回归与检查执行计划

2026-10-11 执行结果：实现、干净 Node22/Python3.12 验证、负向探针和正式审查均已完成。详见 [实现记录](research/implementation.md)、[审查](research/review.md) 和 acceptance.json；以下保留已批准的执行顺序，提交与归档尚未进行。

## 前置

等待本轮规划审阅，01实现/检查结束后start本任务；共享quality文档串行写。读trellis-before-dev、现有state/type规范、决策/quickstart与研究。将完整预期场景映射到AC1，先创建acceptance.json未运行项，不沿用230条旧通过。

## 开发

1. 提取唯一真实模块夹具，去除.tmp/旧Git版本依赖、源码文本patch、观察型JSON runner和固定wx文件。
2. 按设计的场景族写node:test公开行为测试；每次刷新独立实例，同类输入用最少参数化对照。遇到当前缺陷先固定反例/汇报范围，不改弱期望。
3. 本地test:storage通过后接package四条命令，零新依赖；只在必要时同步lock最小元数据。
4. 配置Actions，核实官方action major与runner支持；Node22/Python3.12明确，安装仅根lock。更新quality文档。
5. 进行下列统一验证，冻结代码/测试/规范后正式trellis-check只读审查；检查暂存区与工作区，修复留下一轮。

## 验证命令与证据

每轮测试开始前短通知，日志/干净副本位于.tmp/。先在当前实现验证：

```bash
npm run test:storage
npm run check
python3 scripts/acceptance.py summarize .trellis/tasks/10-11-storage-regression-check
```

关键最终验证在隔离干净副本，使用选定Node22与Python3.12：只复制Git当前文件及本次明确的新交付文件，排除node_modules/.tmp/历史产物与无关用户改动；可在完成本地工作提交后用临时checkout再证实。执行npm ci --include=dev、npm run check。单独再运行npm test证明无固定文件/残留状态依赖；版本与各阶段退出码落盘。

同一隔离副本的负向验证（每次恢复后才进行下个）：

1. 故意改错一条关键expected，npm test/总check非零，可定位actual/expected。
2. 在已覆盖TS输入加 `const gateProbe: number = 'bad'`，type-check及总check非零。
3. 还原一个历史故障（如允许异代local身份补缺），对应真实生命周期用例失败。改动只在隔离副本，保留diff与失败测试名。
4. 对type-check/test/build-prod逐个注入固定非零，证明总入口非零且后续阶段未运行；只验证传播，不替代真实正确版本成功。

恢复副本，确认最终正确版本/工作区无mutation；必要时最终重跑受影响范围，不为测试数量重复全矩阵。

CI静态核验触发、权限、官方action版本、Node/Python、锁文件和统一命令；远端实际执行未发生则标未验证。不推送、不改branch protection。

## 完成与清理

实际check结果进入本任务acceptance.json，脚本回归/存储VM/生产构建/CI静态审查分开，不能用一个全绿条目代替未验证范围。通过后整合到父任务；保留原始日志和负向证据，清理自建依赖副本/进程时只动本轮资源。测试型改动不启动UI服务/浏览器；若超出边界改产品，重新按项目平台/浏览器验收规则安排。
