# 未收口项

本页是发现入口，不是缺陷计数，也不是验收结论。列出的是当前仍与规格或验收要求不一致的地方；后续修改按 [Trellis workflow](../../../workflow.md) 建任务，不能以本页条目代替验收。

## 下载图片抓取并发

同一规格要求顺序抓取，当前实现以三个并发 worker 处理（`core/service/GalleryDownloadService.ts` 的 `await Promise.all([runWorker(), runWorker(), runWorker()])`）。行为未改。

## 其余各组的验收未执行

`001-add-pageflip-toggle`（首次系统/设备矩阵、共享与重置防复活矩阵）、`001-dockable-panel-layout`、`001-thumb-expand-modal`、`002-more-settings-modal`（真实脚本环境的共享/补缺/降级/重置矩阵、翻页初始化与放大镜持久化的桌面与移动回归）的 quickstart 步骤仍未执行。`001-gallery-download-bundle` 的分片校验（`metadata.json` 七字段解压校验、分片计数与 `chunkIndex` 对应、`fflate` 与 JSON 单格式确认）同样未执行。

## 平台注入的验收记录未产出

`001-platform-injection` 的 US1/US2/US3 与最终验证记录（`validation-us1.md`、`validation-us2.md`、`validation-us3.md`、`final-validation.md`）尚未产出，该组 quickstart 的验收步骤未执行。
