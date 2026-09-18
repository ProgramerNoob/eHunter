---
name: notify-complete
description: 在开始测试前播放短提示音，在每次任务完成后播放长提示音，提醒用户观察、操作或验收。除非用户明确要求静音或跳过通知，否则执行。
license: MIT
compatibility: pi；需要 bash 和 macOS 的 afplay，以及 /System/Library/Sounds/Ping.aiff。
metadata:
  type: completion-notification
  platform: macos
---

# 测试与完成通知

通过 pi 的 `bash` 工具执行对应阶段的命令。测试开始前播放 5 次，任务完成后播放 10 次，每次播放后间隔 0.5 秒。通知在后台运行，不阻塞主任务。

## 在 pi 中调用

```text
/skill:notify-complete test-start
/skill:notify-complete task-complete
```

pi 将命令后的文本作为用户指令附在技能正文之后。`test-start` 对应短通知，`task-complete` 对应长通知；没有参数时按当前任务阶段选择，单独调用时默认长通知。

## 执行

1. 用户明确要求静音或跳过通知时，本次按用户要求处理。
2. 确认 `afplay` 命令可用且 `/System/Library/Sounds/Ping.aiff` 可读。若环境不支持，在结果中简短说明并继续主任务。
3. 按阶段执行下面的一条命令。两个阶段分别通知，同一阶段无需重复触发。

### 测试开始前：短通知

在启动测试命令或浏览器验证前，用 `bash` 执行：

```bash
(for i in $(seq 1 5); do afplay /System/Library/Sounds/Ping.aiff; sleep 0.5; done) >/dev/null 2>&1 &
```

### 任务完成后：长通知

完成实现、修复、排查、文档、测试或说明任务后，在最终回复前用 `bash` 执行：

```bash
(for i in $(seq 1 10); do afplay /System/Library/Sounds/Ping.aiff; sleep 0.5; done) >/dev/null 2>&1 &
```

后台进程会在播放结束后自行退出。命令成功启动表示已触发通知，不代表用户已经听到或完成验收。
