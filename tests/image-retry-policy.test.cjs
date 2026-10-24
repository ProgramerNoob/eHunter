const assert = require('node:assert/strict');
const test = require('node:test');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

function loadPolicy() {
    const runtime = createRuntime({
        realModules: ['core/service/imageRetryPolicy.ts', 'core/model/model.ts'],
    });
    return {
        ...runtime.load('core/service/imageRetryPolicy.ts'),
        ImgSrcMode: runtime.load('core/model/model.ts').ImgSrcMode,
    };
}

function stagePairs(stages) {
    return Array.from(stages, stage => [stage.mode, stage.attempts]);
}

function modes(queue) {
    return Array.from(queue, mode => mode);
}

test('retry stages are a single default stage unless both the switch and the platform allow source switching', () => {
    const { getImageRetryStages, ImgSrcMode } = loadPolicy();

    assert.deepEqual(stagePairs(getImageRetryStages({ autoRetryByOtherSource: false, supportChangeSource: false })), [
        [ImgSrcMode.Default, 3],
    ]);
    assert.deepEqual(stagePairs(getImageRetryStages({ autoRetryByOtherSource: false, supportChangeSource: true })), [
        [ImgSrcMode.Default, 3],
    ]);
    assert.deepEqual(stagePairs(getImageRetryStages({ autoRetryByOtherSource: true, supportChangeSource: false })), [
        [ImgSrcMode.Default, 3],
    ]);
    assert.deepEqual(stagePairs(getImageRetryStages({ autoRetryByOtherSource: true, supportChangeSource: true })), [
        [ImgSrcMode.Default, 2],
        [ImgSrcMode.ChangeSource, 2],
        [ImgSrcMode.Origin, 2],
    ]);
});

test('retry stages are copies, so mutating a returned stage cannot change later reads', () => {
    const { getImageRetryStages, ImgSrcMode } = loadPolicy();
    const options = { autoRetryByOtherSource: true, supportChangeSource: true };

    const first = getImageRetryStages(options);
    first[0].attempts = 99;
    first.push({ mode: ImgSrcMode.Origin, attempts: 99 });

    assert.deepEqual(stagePairs(getImageRetryStages(options)), [
        [ImgSrcMode.Default, 2],
        [ImgSrcMode.ChangeSource, 2],
        [ImgSrcMode.Origin, 2],
    ]);
});

test('retry queue after a failure keeps remaining attempts of the current stage and then later stages', () => {
    const { buildRetryQueueAfterFailure, ImgSrcMode } = loadPolicy();
    const fallback = { autoRetryByOtherSource: true, supportChangeSource: true };

    assert.deepEqual(modes(buildRetryQueueAfterFailure(ImgSrcMode.Default, fallback)), [
        ImgSrcMode.Default,
        ImgSrcMode.ChangeSource,
        ImgSrcMode.ChangeSource,
        ImgSrcMode.Origin,
        ImgSrcMode.Origin,
    ]);
    assert.deepEqual(modes(buildRetryQueueAfterFailure(ImgSrcMode.ChangeSource, fallback)), [
        ImgSrcMode.ChangeSource,
        ImgSrcMode.Origin,
        ImgSrcMode.Origin,
    ]);
    assert.deepEqual(modes(buildRetryQueueAfterFailure(ImgSrcMode.Origin, fallback)), [ImgSrcMode.Origin]);

    const defaultOnly = { autoRetryByOtherSource: false, supportChangeSource: false };
    assert.deepEqual(modes(buildRetryQueueAfterFailure(ImgSrcMode.Default, defaultOnly)), [
        ImgSrcMode.Default,
        ImgSrcMode.Default,
    ]);
    assert.deepEqual(modes(buildRetryQueueAfterFailure(ImgSrcMode.ChangeSource, defaultOnly)), []);
});
