# 未收口项

本页是发现入口，不是缺陷计数，也不是验收结论。列出的是当前仍与规格或验收要求不一致的地方；后续修改按 [Trellis workflow](../../../workflow.md) 建任务，不能以本页条目代替验收。

## 下载图片抓取并发

同一规格要求顺序抓取，当前实现以三个并发 worker 处理（`core/service/GalleryDownloadService.ts` 的 `await Promise.all([runWorker(), runWorker(), runWorker()])`）。行为未改。

## 放大镜验收未执行

`001-add-pageview-magnifier/quickstart.md` 的验收步骤尚未执行，覆盖桌面设置与快捷菜单的尺寸/倍率边界、尺寸与倍率的共享/降级/迁移/重置证据、两种阅读模式下镜头完整处于 `PageView ∩ viewport` 的几何关系、焦点避让与重算不改偏好，以及桌面/移动回归。已勾选的记录不构成本轮结果。

## 其余各组的验收未执行

`001-add-pageflip-toggle`（首次系统/设备矩阵、共享与重置防复活矩阵）、`001-dockable-panel-layout`、`001-thumb-expand-modal`、`002-more-settings-modal`（真实脚本环境的共享/补缺/降级/重置矩阵、翻页初始化与放大镜持久化的桌面与移动回归）的 quickstart 步骤仍未执行。`001-gallery-download-bundle` 的分片校验（`metadata.json` 七字段解压校验、分片计数与 `chunkIndex` 对应、`fflate` 与 JSON 单格式确认）同样未执行。

## 平台注入的验收记录未产出

`001-platform-injection` 的 US1/US2/US3 与最终验证记录（`validation-us1.md`、`validation-us2.md`、`validation-us3.md`、`final-validation.md`）尚未产出，该组 quickstart 的验收步骤未执行。
