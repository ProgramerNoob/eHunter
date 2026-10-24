const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const LOADER = 'core/components/composables/usePageImageLoader.ts';
const SENTINEL_LOADING_FAILED = '__sentinel_loading_failed__';
const LOADER_I18N_KEYS = ['reload', 'loadingImgFailed', 'imgLoaded', 'waiting', 'loadingImg', 'noOriginalImg', 'loadingFailed'];

function sentinelFor(key) {
    return `__sentinel_${key}__`;
}

function loadI18nDict() {
    const runtime = createRuntime({ realModules: ['core/assets/i18n.ts'] });
    const loaded = runtime.load('core/assets/i18n.ts');
    const table = loaded.default === undefined ? loaded : loaded.default;
    const dict = {};
    for (const key of Object.keys(table)) {
        if (table[key] && typeof table[key].cn === 'string') {
            dict[key] = table[key].cn;
        }
    }
    for (const key of LOADER_I18N_KEYS) {
        assert.ok(dict[key], `core/assets/i18n.ts must define ${key}.cn`);
        dict[key] = sentinelFor(key);
    }
    return dict;
}

function createHarness({ supportChangeSource, autoRetryByOtherSource }) {
    const page = { src: '', preciseHeightOfWidth: 0 };
    const store = { autoRetryByOtherSource };
    const srcWrites = [];
    const logs = [];
    const dict = loadI18nDict();
    const stubs = new Map([
        ['vue', {
            ref: value => ({ value }),
            computed: fn => ({ get value() { return fn(); } }),
            nextTick: async () => {},
        }],
        ['../../store/i18n', { i18n: { value: dict } }],
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
        // The page realm and the fixture must share one Error identity: prod code
        // checks `resp instanceof Error` on values produced by the same realm.
        globals: { Error },
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
            await null;
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
    return { runtime, loader, ImgSrcMode, ImgLoadStatus: loaderModule.ImgLoadStatus, calls, page, logs, dict, albumService };
}

const imageErrorEvent = { preventDefault() {} };

async function driveFailures(harness, rounds) {
    for (let i = 0; i < rounds; i += 1) {
        harness.loader.failLoad(imageErrorEvent);
        await harness.runtime.flush();
    }
}

function failAllImageSources(harness) {
    harness.albumService.getImgSrc = async () => new Error('IMG_FAILED');
}

function rejectAllImageSources(harness, message) {
    harness.albumService.getImgSrc = async () => new Error(message);
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
    assert.ok(harness.loader.loadingInfo.value.includes(sentinelFor('loadingImgFailed')), harness.loader.loadingInfo.value);
});

test('loading info renders the i18n entry that matches the current load status', async () => {
    const harness = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    const { ImgSrcMode, ImgLoadStatus } = harness;

    assert.ok(harness.loader.loadingInfo.value.includes(sentinelFor('waiting')), harness.loader.loadingInfo.value);

    const loading = harness.loader.getNewImgSrc(ImgSrcMode.Default);
    assert.equal(harness.loader.curLoadStatus.value, ImgLoadStatus.Loading);
    assert.ok(harness.loader.loadingInfo.value.includes(sentinelFor('loadingImg')), harness.loader.loadingInfo.value);
    await loading;
    await harness.runtime.flush();

    harness.loader.loaded();
    assert.equal(harness.loader.curLoadStatus.value, ImgLoadStatus.Loaded);
    assert.ok(harness.loader.loadingInfo.value.includes(sentinelFor('imgLoaded')), harness.loader.loadingInfo.value);
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

test('image source errors surface the i18n entry that matches the error code', async () => {
    const missing = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    rejectAllImageSources(missing, 'ERROR_NO_ORIGIN');
    await missing.loader.getNewImgSrc(missing.ImgSrcMode.Origin);
    await missing.runtime.flush();
    assert.ok(missing.loader.loadingInfo.value.includes(sentinelFor('noOriginalImg')), missing.loader.loadingInfo.value);
    assert.ok(!missing.loader.loadingInfo.value.includes(sentinelFor('loadingFailed')), missing.loader.loadingInfo.value);

    const failed = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    rejectAllImageSources(failed, 'ERROR_OTHER');
    await failed.loader.getNewImgSrc(failed.ImgSrcMode.Default);
    await failed.runtime.flush();
    assert.ok(failed.loader.loadingInfo.value.includes(sentinelFor('loadingFailed')), failed.loader.loadingInfo.value);
    assert.ok(!failed.loader.loadingInfo.value.includes(sentinelFor('noOriginalImg')), failed.loader.loadingInfo.value);
});

test('loading info prefixes the reload counter with the reload i18n entry', async () => {
    const harness = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    const { ImgSrcMode } = harness;

    await harness.loader.loadImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    harness.loader.loaded();
    await harness.loader.getNewImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();

    assert.ok(
        harness.loader.loadingInfo.value.startsWith(`[${sentinelFor('reload')}-`),
        harness.loader.loadingInfo.value,
    );
});

test('a successful load restores the full retry budget, and a manual refresh restores it again', async () => {
    const harness = createHarness({ supportChangeSource: false, autoRetryByOtherSource: true });
    const { ImgSrcMode } = harness;
    const budget = 3;

    await harness.loader.loadImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length, budget);

    harness.loader.loaded();
    const afterLoaded = harness.calls.length;
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length - afterLoaded, budget - 1, 'the failing load is the first attempt of the restored budget');

    await harness.loader.getNewImgSrc(ImgSrcMode.Default);
    await harness.runtime.flush();
    const afterManualRefresh = harness.calls.length;
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length - afterManualRefresh, budget - 1);

    const exhausted = harness.calls.length;
    await driveFailures(harness, 10);
    assert.equal(harness.calls.length, exhausted);
});
