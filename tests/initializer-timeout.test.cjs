const assert = require('node:assert/strict');
const test = require('node:test');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const modules = [
    'src/platform/types.ts',
    'src/platform/init-steps.ts',
    'src/platform/initializer.ts',
];

function setup() {
    const runtime = createRuntime({ realModules: modules });
    const types = runtime.load('src/platform/types.ts');
    const initializer = runtime.load('src/platform/initializer.ts');
    return { runtime, types, initializer };
}

function trackSettled(promise) {
    const state = { settled: false, value: undefined, error: undefined };
    const tracked = promise.then(
        value => { state.settled = true; state.value = value; },
        error => { state.settled = true; state.error = error; },
    );
    return { state, tracked };
}

test('initialization gives up after 60 seconds and reports the threshold', async () => {
    const { runtime, types, initializer } = setup();
    const neverSettles = { init: () => new Promise(() => {}) };
    const { state, tracked } = trackSettled(
        initializer.initializeWithTimeout(neverSettles, types.Platform.EH),
    );

    await runtime.advance(59999);
    assert.equal(state.settled, false, 'must still wait just before the threshold');

    await runtime.advance(1);
    await tracked;
    assert.equal(state.settled, true);
    assert.ok(state.error instanceof types.InitializationError, String(state.error));
    assert.equal(
        state.error.message,
        'Platform initialization timed out after 60 seconds',
    );
    assert.equal(state.error.platform, types.Platform.EH);
    await runtime.flush();
    assert.deepEqual(runtime.rejectedJobs, []);
});

test('initialization before the threshold resolves without a timeout error', async () => {
    const { runtime, types, initializer } = setup();
    const slowButFine = {
        init: () => new Promise(resolve => runtime.window.setTimeout(resolve, 1000)),
    };
    const { state, tracked } = trackSettled(
        initializer.initializeWithTimeout(slowButFine, types.Platform.NH),
    );

    await runtime.advance(1000);
    await tracked;
    assert.equal(state.settled, true);
    assert.equal(state.error, undefined);
    assert.equal(state.value, undefined);

    await runtime.advance(60000);
    await runtime.flush();
    assert.deepEqual(runtime.rejectedJobs, []);
});
