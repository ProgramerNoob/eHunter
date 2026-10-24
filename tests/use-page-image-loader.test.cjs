const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const LOADER = 'core/components/composables/usePageImageLoader.ts';

function createHarness({ supportChangeSource, autoRetryByOtherSource }) {
    const page = { src: '', preciseHeightOfWidth: 0 };
    const store = { autoRetryByOtherSource };
    const srcWrites = [];
    const logs = [];
    const stubs = new Map([
        ['vue', {
            ref: value => ({ value }),
            computed: fn => ({ get value() { return fn(); } }),
            nextTick: async () => {},
        }],
        ['../../store/i18n', {
            i18n: {
                value: {
                    reload: '重载',
                    waiting: '等待中..',
                    loadingImg: '加载图片中...',
                    loadingImgFailed: '加载图片失败, 请刷新',
                    imgLoaded: '图片已加载',
                    loadingFailed: '加载失败',
                    noOriginalImg: '没有原图',
                },
            },
        }],
        ['../../store/app', {
            store,
            storeAction: {
                setImgPageInfoSrc: (index, src) => {
                    srcWrites.push(src);
                    page.src = src;
                },
                setImgPageInfoPreciseHeightOfWidth: () => {},
            },
        }],
        ['../../utils/Utils', { timeout: () => Promise.resolve() }],
        ['../../utils/logger', { logText: (tag, text) => logs.push([tag, text]) }],
    ]);
    const runtime = createRuntime({
        stubs,
        realModules: [LOADER, 'core/service/imageRetryPolicy.ts', 'core/model/model.ts'],
    });
    const loaderModule = runtime.load(LOADER);
    const { ImgSrcMode } = runtime.load('core/model/model.ts');
    const calls = [];
    let seq = 0;
    const albumService = {
        isSupportImgChangeSource: () => supportChangeSource,
        isSupportOriginImg: () => supportChangeSource,
        getImgSrc: async (index, mode) => {
            calls.push(mode);
            seq += 1;
            return { src: `https://img.example/${seq}.jpg` };
        },
    };
    const loader = loaderModule.usePageImageLoader({
        index: 0,
        albumService,
        imgPageInfo: { get value() { return page; } },
        warmMagnifierSource: async () => {},
    });
    return { runtime, loader, ImgSrcMode, ImgLoadStatus: loaderModule.ImgLoadStatus, calls, page, logs };
}

const imageErrorEvent = { preventDefault() {} };

async function driveFailures(harness, rounds) {
    for (let i = 0; i < rounds; i += 1) {
        harness.loader.failLoad(imageErrorEvent);
        await harness.runtime.flush();
    }
}

test('nh page retries the default source three times and then stops', async () => {
    const harness = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    const { ImgSrcMode, ImgLoadStatus } = harness;

    await harness.loader.loadImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    assert.deepEqual(harness.calls, [ImgSrcMode.Default]);

    await driveFailures(harness, 10);

    assert.deepEqual(Array.from(harness.calls), [ImgSrcMode.Default, ImgSrcMode.Default, ImgSrcMode.Default]);
    assert.equal(harness.loader.curLoadStatus.value, ImgLoadStatus.Error);
    assert.ok(harness.loader.loadingInfo.value.includes('加载图片失败'), harness.loader.loadingInfo.value);
});

test('eh page walks the source fallback stages once and then stops', async () => {
    const harness = createHarness({ supportChangeSource: true, autoRetryByOtherSource: true });
    const { ImgSrcMode, ImgLoadStatus } = harness;

    await harness.loader.loadImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    await driveFailures(harness, 12);

    assert.deepEqual(Array.from(harness.calls), [
        ImgSrcMode.Default,
        ImgSrcMode.Default,
        ImgSrcMode.ChangeSource,
        ImgSrcMode.ChangeSource,
        ImgSrcMode.Origin,
        ImgSrcMode.Origin,
    ]);
    assert.equal(harness.loader.curLoadStatus.value, ImgLoadStatus.Error);
});

test('a successful load or a manual refresh restores the full retry budget', async () => {
    const harness = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    const { ImgSrcMode } = harness;

    await harness.loader.loadImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length, 3);

    harness.loader.loaded();
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length, 5);

    await harness.loader.getNewImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length, 8);

    await driveFailures(harness, 10);
    assert.equal(harness.calls.length, 8);
});
