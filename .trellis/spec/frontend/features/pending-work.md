# 历史待办与独立清单

由迁移基线 `647ff26` 的七份 tasks 原顺序提取。此处是发现入口，不是当前缺陷数或新的开发任务；保持原编号、未勾状态与条目文本。后续修改按 [Trellis workflow](../../../workflow.md) 建任务，并先核对[功能索引中的差异](index.md#已知状态差异)。

## 独立状态表

三类清单分别计数；不能合并为缺陷数，也不能相互代替验收。翻页与设置 tasks 中的新决策免责声明继续有效。

| 功能 | tasks 总数 / 已勾 / 未勾 | requirements 总数 / 未勾 | quickstart 总数 / 未勾 |
| --- | --- | --- | --- |
| [001-add-pageflip-toggle](001-add-pageflip-toggle/tasks.md) | 36 / 32 / 4 | [18 / 2](001-add-pageflip-toggle/checklists/requirements.md) | [0 / 0](001-add-pageflip-toggle/quickstart.md) |
| [001-add-pageview-magnifier](001-add-pageview-magnifier/tasks.md) | 39 / 39 / 0 | [21 / 5](001-add-pageview-magnifier/checklists/requirements.md) | [5 / 5](001-add-pageview-magnifier/quickstart.md) |
| [001-dockable-panel-layout](001-dockable-panel-layout/tasks.md) | 35 / 35 / 0 | [16 / 0](001-dockable-panel-layout/checklists/requirements.md) | [0 / 0](001-dockable-panel-layout/quickstart.md) |
| [001-gallery-download-bundle](001-gallery-download-bundle/tasks.md) | 37 / 27 / 10 | [19 / 3](001-gallery-download-bundle/checklists/requirements.md) | [0 / 0](001-gallery-download-bundle/quickstart.md) |
| [001-platform-injection](001-platform-injection/tasks.md) | 149 / 51 / 98 | [16 / 0](001-platform-injection/checklists/requirements.md) | [19 / 19](001-platform-injection/quickstart.md) |
| [001-thumb-expand-modal](001-thumb-expand-modal/tasks.md) | 26 / 26 / 0 | [16 / 0](001-thumb-expand-modal/checklists/requirements.md) | [0 / 0](001-thumb-expand-modal/quickstart.md) |
| [002-more-settings-modal](002-more-settings-modal/tasks.md) | 44 / 42 / 2 | [18 / 2](002-more-settings-modal/checklists/requirements.md) | [0 / 0](002-more-settings-modal/quickstart.md) |
| 合计 | 366 / 252 / 114 | 124 / 12 | 24 / 24 |

放大镜 tasks 39/39，但 requirements 5 项、quickstart 5 项未勾；下载 T036/T037 有完成证据，requirements 仍有 3 项未勾。保持各自历史状态。

## 001-add-pageflip-toggle

- [T029](001-add-pageflip-toggle/tasks.md)（原未勾）：[P] 对齐实现与契约描述 in `.trellis/spec/frontend/features/001-add-pageflip-toggle/contracts/page-turn-animation.openapi.yaml`
- [T030](001-add-pageflip-toggle/tasks.md)（原未勾）：[P] 更新交付说明与验证步骤 in `.trellis/spec/frontend/features/001-add-pageflip-toggle/quickstart.md`
- [T032](001-add-pageflip-toggle/tasks.md)（原未勾）：在 `core/store/app.ts` 与 `core/components/TopBar.vue` 清理临时字段/分支并补充最小注释
- [T033](001-add-pageflip-toggle/tasks.md)（原未勾）：运行类型检查 `npm run type-check` in `.`

## 001-add-pageview-magnifier

tasks 没有未勾项。仍须核对本组 [requirements](001-add-pageview-magnifier/checklists/requirements.md) 和 [quickstart](001-add-pageview-magnifier/quickstart.md)，不等于当前版本已验收。

## 001-dockable-panel-layout

tasks 没有未勾项。仍须核对本组 [requirements](001-dockable-panel-layout/checklists/requirements.md) 和 [quickstart](001-dockable-panel-layout/quickstart.md)，不等于当前版本已验收。

## 001-gallery-download-bundle

- [T004](001-gallery-download-bundle/tasks.md)（原未勾）：[P] Add download/notification i18n keys for progress and result messages in `core/store/i18n.ts`
- [T011](001-gallery-download-bundle/tasks.md)（原未勾）：Wire foundational contract/schema alignment for download settings in `.trellis/spec/frontend/features/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml`
- [T018](001-gallery-download-bundle/tasks.md)（原未勾）：[P] [US1] Add user-facing download option text and chunk size labels in `core/store/i18n.ts`
- [T024](001-gallery-download-bundle/tasks.md)（原未勾）：[P] [US2] Add responsive styles for desktop/mobile notification readability in `core/components/status/StatusNotificationStack.vue`
- [T030](001-gallery-download-bundle/tasks.md)（原未勾）：[US3] Align robustness and status fields with contract payloads in `.trellis/spec/frontend/features/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml`
- [T031](001-gallery-download-bundle/tasks.md)（原未勾）：[P] Update quickstart verification steps with finalized interaction details in `.trellis/spec/frontend/features/001-gallery-download-bundle/quickstart.md`
- [T032](001-gallery-download-bundle/tasks.md)（原未勾）：[P] Update plan validation notes with implementation-time findings in `.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md`
- [T033](001-gallery-download-bundle/tasks.md)（原未勾）：Run `npm run type-check` and record result notes in `.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md`
- [T034](001-gallery-download-bundle/tasks.md)（原未勾）：Run `npm run dev` and validate changed flows via `ego-browser` in desktop/mobile, then record outcomes in `.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md`
- [T035](001-gallery-download-bundle/tasks.md)（原未勾）：[P] Verify task/spec/contract terminology consistency (`status-pannel`, chunk fields, retry wording) in `.trellis/spec/frontend/features/001-gallery-download-bundle/spec.md`

## 001-platform-injection

98 条原未勾项（迁移基线口径）。T043–T082/T098 实现已存在、旧计划未按清单验收；T149 已于 2026-09-20 修复并完成 T113 真实 NH 验收，两条在[组内 tasks.md](001-platform-injection/tasks.md) 中已勾选（本页计数与条目仍按基线口径保留）。以下原文中的计划产物、示例路径及旧 60 秒目标须结合[状态前言](001-platform-injection/tasks.md)解释。

- [T037](001-platform-injection/tasks.md)（原未勾）：[US1] Test non-album page: navigate to localhost:5173/search and verify no initialization occurs (no errors in console)
- [T038](001-platform-injection/tasks.md)（原未勾）：[US1] Test initialization timeout: modify init() to delay 65s, verify timeout error displays with technical details and close button
- [T039](001-platform-injection/tasks.md)（原未勾）：[US1] Verify error message includes: user-friendly description, stack trace, platform info, URL per FR-017, FR-018
- [T040](001-platform-injection/tasks.md)（原未勾）：[US1] Verify error is logged to browser console per FR-019
- [T041](001-platform-injection/tasks.md)（原未勾）：[US1] Verify close button in top-right corner dismisses error UI per FR-018
- [T042](001-platform-injection/tasks.md)（原未勾）：[US1] Document test results in .trellis/spec/frontend/features/001-platform-injection/validation-us1.md
- [T043](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Create EH ImgHtmlParser class in src/platform/eh/parser/ImgHtmlParser.ts (rewrite from scratch per clarification Q4)
- [T044](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseImageUrl() method in EH ImgHtmlParser to extract full-size image URL from EH page DOM
- [T045](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseImageDimensions() method in EH ImgHtmlParser to extract width/height from EH page DOM
- [T046](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Add error handling for missing DOM elements in EH ImgHtmlParser
- [T047](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Create EH IntroHtmlParser class in src/platform/eh/parser/IntroHtmlParser.ts (rewrite from scratch)
- [T048](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseTitle() method in EH IntroHtmlParser to extract album title from EH gallery page
- [T049](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseAlbumId() method in EH IntroHtmlParser to extract gallery ID from EH URL
- [T050](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parsePageCount() method in EH IntroHtmlParser to extract total page count from EH gallery page
- [T051](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseCurPageIndex() method in EH IntroHtmlParser to extract current page index from EH URL
- [T052](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Add error handling for missing metadata in EH IntroHtmlParser
- [T053](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Create EH ImgUrlListParser class in src/platform/eh/parser/ImgUrlListParser.ts (rewrite from scratch)
- [T054](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseThumbnails() method in EH ImgUrlListParser to extract thumbnail URLs and sprite positions
- [T055](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseImagePageUrls() method in EH ImgUrlListParser to extract all image page URLs
- [T056](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Add caching logic in EH ImgUrlListParser using PlatformService.storageGet/storageSet
- [T057](001-platform-injection/tasks.md)（原未勾）：[US2] Create EHAlbumServiceImpl class in src/platform/eh/service/AlbumServiceImpl.ts implementing AlbumService interface
- [T058](001-platform-injection/tasks.md)（原未勾）：[US2] Implement isSupportOriginImg() in EHAlbumServiceImpl returning true (EH supports original images)
- [T059](001-platform-injection/tasks.md)（原未勾）：[US2] Implement isSupportImgChangeSource() in EHAlbumServiceImpl returning true (EH supports source switching)
- [T060](001-platform-injection/tasks.md)（原未勾）：[US2] Implement isSupportThumbView() in EHAlbumServiceImpl returning true (EH supports thumbnails)
- [T061](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getTitle() in EHAlbumServiceImpl using IntroHtmlParser
- [T062](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getAlbumId() in EHAlbumServiceImpl using IntroHtmlParser
- [T063](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getPageCount() in EHAlbumServiceImpl using IntroHtmlParser
- [T064](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getCurPageIndex() in EHAlbumServiceImpl using IntroHtmlParser
- [T065](001-platform-injection/tasks.md)（原未勾）：[US2] Implement init() in EHAlbumServiceImpl: parse DOM using IntroHtmlParser and ImgUrlListParser
- [T066](001-platform-injection/tasks.md)（原未勾）：[US2] Add error handling in EHAlbumServiceImpl.init() for DOM parsing failures
- [T067](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getThumbInfos() in EHAlbumServiceImpl using ImgUrlListParser with cache support
- [T068](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getImgPageInfos() in EHAlbumServiceImpl returning placeholder ImgPageInfo array
- [T069](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getImgSrc() in EHAlbumServiceImpl: fetch image page HTML, parse with ImgHtmlParser, return ImgPageInfo
- [T070](001-platform-injection/tasks.md)（原未勾）：[US2] Add retry logic in EHAlbumServiceImpl.getImgSrc() using TextReq from platform/base/
- [T071](001-platform-injection/tasks.md)（原未勾）：[US2] Implement getPreviewThumbnailStyle() in EHAlbumServiceImpl returning CSS styles for thumbnail sprites
- [T072](001-platform-injection/tasks.md)（原未勾）：[US2] Update src/platform/factory.ts to return actual EHAlbumServiceImpl instance (remove stub)
- [T073](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Create NH ImgHtmlParser class in src/platform/nh/parser/ImgHtmlParser.ts (rewrite from scratch per clarification Q4)
- [T074](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseImageUrl() method in NH ImgHtmlParser to extract full-size image URL from NH page DOM
- [T075](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseImageDimensions() method in NH ImgHtmlParser to extract width/height from NH page DOM
- [T076](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Add error handling for missing DOM elements in NH ImgHtmlParser
- [T077](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Create NH IntroHtmlParser class in src/platform/nh/parser/IntroHtmlParser.ts (rewrite from scratch)
- [T078](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseTitle() method in NH IntroHtmlParser to extract album title from NH gallery page
- [T079](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseAlbumId() method in NH IntroHtmlParser to extract gallery ID from NH URL
- [T080](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parsePageCount() method in NH IntroHtmlParser to extract total page count from NH gallery page
- [T081](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Implement parseCurPageIndex() method in NH IntroHtmlParser to extract current page index from NH URL
- [T082](001-platform-injection/tasks.md)（原未勾）：[P] [US2] Add error handling for missing metadata in NH IntroHtmlParser
- [T098](001-platform-injection/tasks.md)（原未勾）：[US2] Update src/platform/factory.ts to return actual NHAlbumServiceImpl instance (remove stub)
- [T149](001-platform-injection/tasks.md)（原未勾）：[US2] 修复 `src/platform/nh/parser/IntroHtmlParser.ts` 的缩略图地址解析：兼容旧 `data-src` 与当前原生 `src`（现有属性改写后分别为 `data-x-src`、`x-src`），保留旧格式兼容；验证两种 HTML 输入均能提取非空地址，并完成 T113 的真实 NH 浏览器验收。
- [T099](001-platform-injection/tasks.md)（原未勾）：[US2] Run `npm run dev` and start development server in background
- [T100](001-platform-injection/tasks.md)（原未勾）：[US2] Use ego-browser to navigate to e-hentai.org/g/[real-gallery-id] (use actual EH gallery URL)
- [T101](001-platform-injection/tasks.md)（原未勾）：[US2] Verify EH platform initializes with loading animation
- [T102](001-platform-injection/tasks.md)（原未勾）：[US2] Verify EH reader UI renders with correct album title, page count
- [T103](001-platform-injection/tasks.md)（原未勾）：[US2] Verify EH book mode displays pages correctly
- [T104](001-platform-injection/tasks.md)（原未勾）：[US2] Verify EH scroll mode displays pages correctly
- [T105](001-platform-injection/tasks.md)（原未勾）：[US2] Verify EH thumbnail navigation works (click thumbnail, page changes)
- [T106](001-platform-injection/tasks.md)（原未勾）：[US2] Verify EH page flipping works (keyboard arrows, click navigation)
- [T107](001-platform-injection/tasks.md)（原未勾）：[US2] Test EH error handling: navigate to invalid gallery URL, verify error displays with technical details
- [T108](001-platform-injection/tasks.md)（原未勾）：[US2] Use ego-browser to navigate to nhentai.net/g/[real-gallery-id]/1/ (use actual NH gallery URL)
- [T109](001-platform-injection/tasks.md)（原未勾）：[US2] Verify NH platform initializes with loading animation
- [T110](001-platform-injection/tasks.md)（原未勾）：[US2] Verify NH reader UI renders with correct album title, page count
- [T111](001-platform-injection/tasks.md)（原未勾）：[US2] Verify NH book mode displays pages correctly
- [T112](001-platform-injection/tasks.md)（原未勾）：[US2] Verify NH scroll mode displays pages correctly
- [T113](001-platform-injection/tasks.md)（原未勾）：[US2] Verify NH thumbnail loading and navigation after T149: 在真实 NH 图集中确认缩略图列表数量与页数一致、各项地址非空；等待侧栏及展开面板中当前可见缩略图加载，逐张确认 `img.complete && img.naturalWidth > 0` 且图片实际可见，不能仅凭占位、页码或 DOM 数量判定通过；覆盖书页/卷轴切换及缩略图点击跳页、当前页定位，按仓库要求完成桌面与移动视口验收并记录控制台、未捕获异常和截图。
- [T114](001-platform-injection/tasks.md)（原未勾）：[US2] Verify NH page flipping works (keyboard arrows, click navigation)
- [T115](001-platform-injection/tasks.md)（原未勾）：[US2] Test NH error handling: navigate to invalid gallery URL, verify error displays with technical details
- [T116](001-platform-injection/tasks.md)（原未勾）：[US2] Compare EH and NH reader behavior: verify book mode, scroll mode, thumbnails work identically per FR-022
- [T117](001-platform-injection/tasks.md)（原未勾）：[US2] Search codebase for legacy patterns: grep for "core.launcher", "core.createAppView", verify none found per FR-010, SC-007
- [T118](001-platform-injection/tasks.md)（原未勾）：[US2] Document test results in .trellis/spec/frontend/features/001-platform-injection/validation-us2.md
- [T119](001-platform-injection/tasks.md)（原未勾）：[P] [US3] Extract platform detection logic into src/platform/detector.ts if not already done (should be from T011)
- [T120](001-platform-injection/tasks.md)（原未勾）：[P] [US3] Extract platform factory logic into src/platform/factory.ts if not already done (should be from T016)
- [T121](001-platform-injection/tasks.md)（原未勾）：[P] [US3] Extract initialization logic into src/platform/initializer.ts if not already done (should be from T020)
- [T122](001-platform-injection/tasks.md)（原未勾）：[US3] Add JSDoc comments to detectPlatform() function explaining URL patterns and return values
- [T123](001-platform-injection/tasks.md)（原未勾）：[US3] Add JSDoc comments to createPlatformService() function explaining factory pattern
- [T124](001-platform-injection/tasks.md)（原未勾）：[US3] Add JSDoc comments to initializeWithTimeout() function explaining timeout behavior
- [T125](001-platform-injection/tasks.md)（原未勾）：[US3] Create src/platform/README.md documenting platform structure and how to add new platforms
- [T126](001-platform-injection/tasks.md)（原未勾）：[US3] Document in README: platform directory structure (service/, parser/, index.ts)
- [T127](001-platform-injection/tasks.md)（原未勾）：[US3] Document in README: AlbumService interface requirements
- [T128](001-platform-injection/tasks.md)（原未勾）：[US3] Document in README: URL pattern detection requirements
- [T129](001-platform-injection/tasks.md)（原未勾）：[US3] Document in README: shared utilities in platform/base/ (TextReq, ReqQueue, MultiAsyncReq, PlatformService)
- [T130](001-platform-injection/tasks.md)（原未勾）：[US3] Add code example in README showing how to add hypothetical new platform (e.g., hitomi.la)
- [T131](001-platform-injection/tasks.md)（原未勾）：[US3] Review src/platform/detector.ts: verify detection logic is centralized in single function per acceptance scenario 2
- [T132](001-platform-injection/tasks.md)（原未勾）：[US3] Review platform directories: verify eh/, nh/, test/ follow consistent structure (service/, parser/) per acceptance scenario 3
- [T133](001-platform-injection/tasks.md)（原未勾）：[US3] Review src/platform/base/: verify shared utilities (request/, service/) are in common location per acceptance scenario 4
- [T134](001-platform-injection/tasks.md)（原未勾）：[US3] Code review: verify adding new platform requires only (1) new directory with AlbumService impl, (2) one line in detectPlatform() per acceptance scenario 1
- [T135](001-platform-injection/tasks.md)（原未勾）：[US3] Verify no platform-specific logic leaked into main.ts (should only call detector, factory, initializer)
- [T136](001-platform-injection/tasks.md)（原未勾）：[US3] Document code review results in .trellis/spec/frontend/features/001-platform-injection/validation-us3.md
- [T137](001-platform-injection/tasks.md)（原未勾）：[P] Update AGENTS.md "Recent Changes" section with 001-platform-injection summary
- [T138](001-platform-injection/tasks.md)（原未勾）：[P] Add inline code comments for complex parser logic (DOM selectors, regex patterns)
- [T139](001-platform-injection/tasks.md)（原未勾）：[P] Verify all error messages are user-friendly (no raw stack traces without context)
- [T140](001-platform-injection/tasks.md)（原未勾）：Run final cross-platform validation: test EH, NH, Test platforms in sequence
- [T141](001-platform-injection/tasks.md)（原未勾）：Verify platform detection performance: measure detectPlatform() execution time, confirm <100ms per SC-002
- [T142](001-platform-injection/tasks.md)（原未勾）：Verify initialization timeout: test with slow network, confirm 60s timeout works per SC-003
- [T143](001-platform-injection/tasks.md)（原未勾）：Verify error handling: test various failure scenarios (network error, DOM parsing error, timeout), confirm no uncaught errors per SC-005
- [T144](001-platform-injection/tasks.md)（原未勾）：Verify host page integrity: test on real EH/NH pages, confirm host page functionality not broken per FR-015
- [T145](001-platform-injection/tasks.md)（原未勾）：Run `npm run build-prod` and verify production build succeeds
- [T146](001-platform-injection/tasks.md)（原未勾）：Test production build on real EH/NH pages using Tampermonkey
- [T147](001-platform-injection/tasks.md)（原未勾）：Document final validation results in .trellis/spec/frontend/features/001-platform-injection/final-validation.md
- [T148](001-platform-injection/tasks.md)（原未勾）：Create pull request with all changes, reference spec.md and validation docs

## 001-thumb-expand-modal

tasks 没有未勾项。仍须核对本组 [requirements](001-thumb-expand-modal/checklists/requirements.md) 和 [quickstart](001-thumb-expand-modal/quickstart.md)，不等于当前版本已验收。

## 002-more-settings-modal

- [T036](002-more-settings-modal/tasks.md)（原未勾）：[P] Clean up obsolete i18n keys/usages related to removed second-row settings in `core/assets/i18n.ts`
- [T037](002-more-settings-modal/tasks.md)（原未勾）：Run type validation for final changes with `npm run type-check` from `package.json`
