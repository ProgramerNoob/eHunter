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

测试开始前播放 5 次，任务完成后播放 10 次，每次间隔 0.5 秒；失败时输出可见原因。用 pi 的 `bash` 工具执行一次下面的命令，执行前把 `COUNT` 改成对应阶段的次数（test-start 用 5，task-complete 用 10），命令在后台播放、不阻塞主任务。

```bash
COUNT=5  # test-start: 5；task-complete: 10
SOUND=/System/Library/Sounds/Ping.aiff
if ! AFPLAY=$(command -v afplay) || [ ! -r "$SOUND" ]; then
  echo "notify-complete: 找不到 afplay 或 ${SOUND}，已跳过通知" >&2
  exit 0
fi
(for i in $(seq 1 "$COUNT"); do
  "$AFPLAY" "$SOUND" || echo "notify-complete: 第 ${i} 次播放失败" >&2
  sleep 0.5
done) &
```

用户明确要求静音或跳过时不再执行。命令成功启动只表示通知已触发，不代表用户已听到或完成验收。
