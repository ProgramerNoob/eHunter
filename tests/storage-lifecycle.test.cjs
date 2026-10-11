'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { nextTick } = require('vue');
const { createPage } = require('./helpers/storage-fixture.cjs');

// Persisted input contracts: reader-behavior decision §3 and settings quickstart §3.
// These builders describe records, not the product's merge/identity algorithms.
const keys = {
    unified: 'ehunter:reader:prefs:unified-settings',
    layout: 'ehunter:reader:prefs:mode-layout',
    marker: 'ehunter:reader:prefs:legacy-migration',
    observation: 'ehunter:reader:prefs:reset-observation',
    animation: 'ehunter:reader:prefs:page-turn-animation',
};
const time = '2026-09-18T12:00:00.000Z';
const unified = (settings = {}, extra = {}) => ({ schemaVersion: 3, updatedAt: time, settings, ...extra });
const mode = (thumbSlot, thumbSizePx, extra = {}) => ({ thumbSlot, thumbSizePx, updatedAt: time, ...extra });
const layout = (scroll, book = mode('left', 150)) => ({ schemaVersion: 1, updatedAt: time, layouts: { scroll, book } });
const marker = (resetId = 'current', migratedAt = time) => ({ schemaVersion: 1, legacyImport: 'blocked', migratedAt, ...(resetId ? { resetId } : {}) });
const animation = (animationMode, extra = {}) => ({ schemaVersion: 1, scope: 'global', updatedAt: time, animationMode, ...extra });
const localMap = (entries) => new Map(entries.map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
const readLocal = (map, key) => JSON.parse(map.get(key));
function page(t, options = {}, init = true) {
    const instance = createPage(options);
    t.after(() => instance.dispose());
    if (init) instance.init();
    return instance;
}
function assertLayout(instance, slot, size) {
    assert.equal(instance.app.store.thumbDockSlot, slot);
    assert.equal(slot === 'bottom' ? instance.app.store.thumbViewHeight : instance.app.store.thumbViewWidth, size);
}
function staleLocal() {
    return localMap([
        [keys.unified, unified({ magnifierAreaSize: 137, magnifierZoom: 5 })],
        [keys.layout, layout(mode('right', 300), mode('bottom', 310))],
    ]);
}

for (const [name, initialFaults] of [
    ['healthy', {}], ['get-only failure', { get: true }],
    ['set-only failure', { set: true }], ['get+set failure', { get: true, set: true }],
]) {
    test(`GM channel: ${name}, continuous writes and new-page recovery`, async t => {
        const key = 'ehunter:probe';
        const gm = new Map([[key, 277]]);
        const local = localMap([[key, 137]]);
        const faults = { ...initialFaults };
        const first = page(t, { gm, local, faults }, false);
        // Write first: a failed read must be detected before writing into GM.
        assert.equal(first.platform.storageSetShared(key, 211), true);
        const failed = Boolean(faults.get || faults.set);
        assert.equal(first.platform.storageGetShared(key), failed ? '211' : 211);
        assert.equal(gm.get(key), failed ? 277 : 211);
        assert.equal(local.get(key), failed ? '211' : '137');
        if (faults.get) assert.equal(first.calls.set, 0);
        if (faults.set && !faults.get) assert.equal(first.calls.set, 1);
        assert.equal(first.platform.storageGetShared(key, null, false), faults.get ? null : gm.get(key));
        faults.get = false;
        faults.set = false;
        assert.equal(first.platform.storageSetShared(key, 233), true);
        assert.equal(first.platform.storageGetShared(key), failed ? '233' : 233);
        assert.equal(gm.get(key), failed ? 277 : 233, 'same-page recovery does not undo ordinary-channel degradation');
        await first.dispose();
        const fresh = page(t, { gm, local, faults }, false);
        assert.notEqual(fresh.app.store, first.app.store);
        assert.equal(fresh.platform.storageGetShared(key), failed ? 277 : 233);
        assert.equal(fresh.platform.storageGetShared('absent', null, false), null);
    });
}

test('GM values are copied on get/set; local fallback retains string semantics', t => {
    const gm = new Map();
    const local = new Map();
    const p = page(t, { gm, local }, false);
    const value = { nested: { size: 137 } };
    p.platform.storageSetShared('ehunter:probe', value);
    value.nested.size = 211;
    const fetched = p.platform.storageGetShared('ehunter:probe');
    assert.equal(fetched.nested.size, 137);
    fetched.nested.size = 233;
    assert.equal(p.platform.storageGetShared('ehunter:probe').nested.size, 137);
    p.faults.set = true;
    p.platform.storageSetShared('ehunter:probe', value);
    assert.equal(p.platform.storageGetShared('ehunter:probe'), JSON.stringify(value));
});

test('No GM: origin-local reset/save/reload leaves the other origin unchanged', async t => {
    const aLocal = staleLocal();
    const bLocal = localMap([[keys.unified, unified({ magnifierAreaSize: 211 })]]);
    const aOptions = { local: aLocal, gmApis: [], origin: 'https://e-hentai.org' };
    const bOptions = { local: bLocal, gmApis: [], origin: 'https://nhentai.net' };
    const a = page(t, aOptions);
    const b = page(t, bOptions);
    assert.equal(a.app.store.magnifierAreaSize, 137);
    assert.equal(b.app.store.magnifierAreaSize, 211);
    assert.equal(a.platform.storageGetShared(keys.unified, null, false), null);
    a.app.storeAction.runFactoryReset();
    assert.equal(a.app.store.factoryResetStatus, 'success');
    assert.equal(a.reloads, 1);
    await a.dispose();
    const reset = page(t, aOptions);
    assert.equal(reset.app.store.magnifierAreaSize, 80);
    reset.app.storeAction.setMagnifierAreaSize(166);
    await reset.dispose();
    assert.equal(page(t, aOptions).app.store.magnifierAreaSize, 166);
    await b.dispose();
    assert.equal(page(t, bOptions).app.store.magnifierAreaSize, 211);
});

for (const [name, faults, gmApis, success] of [
    ['success', {}, undefined, true],
    ['GM set throws', { set: true }, undefined, false],
    ['GM list throws', { list: true }, undefined, false],
    ['GM delete throws', { delete: true }, undefined, false],
    ['local removal throws', { localRemove: true }, undefined, false],
    ['GM set absent', {}, ['get', 'list', 'delete'], false],
    ['GM list absent', {}, ['get', 'set', 'delete'], false],
]) {
    test(`Factory reset: ${name}`, t => {
        const gm = new Map([['ehunter:old', 1], ['AlbumCacheVersion', 2], ['site:keep', 3]]);
        const local = localMap([['ehunter:old', 1], ['AlbumCache:old', 2], ['site:keep', 4]]);
        const p = page(t, { gm, local, faults, gmApis }, false);
        p.app.storeAction.runFactoryReset();
        assert.equal(p.app.store.factoryResetStatus, success ? 'success' : 'failed');
        assert.equal(p.reloads, success ? 1 : 0);
        assert.equal(gm.get('site:keep'), 3);
        assert.equal(local.get('site:keep'), '4');
        if (success) {
            assert.equal(gm.has('ehunter:old'), false);
            assert.equal(gm.has('AlbumCacheVersion'), false);
            assert.equal(local.has('ehunter:old'), false);
            assert.equal(local.has('AlbumCache:old'), false);
            const saved = gm.get(keys.marker);
            assert.equal(saved.legacyImport, 'blocked');
            assert.equal(typeof saved.resetId, 'string');
            assert.ok(saved.resetId.length > 0);
            assert.equal(readLocal(local, keys.marker).resetId, saved.resetId);
            assert.equal(readLocal(local, keys.observation).resetId, saved.resetId);
        } else {
            assert.equal(p.app.store.factoryResetErrorMessage, 'Factory reset failed');
            assert.equal(gm.has(keys.marker), false);
        }
    });
}

test('No GM and local write failure: reset cannot report success', t => {
    const p = page(t, { gmApis: [], faults: { localSet: true } }, false);
    p.app.storeAction.runFactoryReset();
    assert.equal(p.app.store.factoryResetStatus, 'failed');
    assert.equal(p.reloads, 0);
});

for (const bothBroken of [false, true]) {
    test(`A reset -> B observes -> ${bothBroken ? 'get+set' : 'set-only'} failure -> save -> two reloads -> recovery`, async t => {
        const gm = new Map();
        const a = page(t, { gm, local: new Map() });
        const bLocal = staleLocal();
        a.app.storeAction.runFactoryReset();
        assert.equal(a.app.store.factoryResetStatus, 'success');
        const resetId = gm.get(keys.marker).resetId;
        const faults = {};
        const options = { gm, local: bLocal, origin: 'https://nhentai.net', faults };
        const b = page(t, options);
        assert.equal(b.app.store.magnifierAreaSize, 80);
        assertLayout(b, 'left', 150);
        assert.equal(readLocal(bLocal, keys.observation).resetId, resetId);
        faults.set = true;
        faults.get = bothBroken;
        b.app.storeAction.setMagnifierAreaSize(211);
        b.app.storeAction.setThumbDockSlot('bottom');
        b.app.storeAction.setThumbPanelSize(260);
        assert.equal(readLocal(bLocal, keys.unified).resetId, resetId);
        assert.equal(readLocal(bLocal, keys.layout).layouts.scroll.resetId, resetId);
        await b.dispose();
        for (let i = 0; i < 2; i++) {
            const refreshed = page(t, options);
            assert.equal(refreshed.app.store.magnifierAreaSize, 211);
            assertLayout(refreshed, 'bottom', 260);
            await refreshed.dispose();
        }
        faults.get = false;
        faults.set = false;
        const restored = page(t, options);
        assert.equal(restored.app.store.magnifierAreaSize, 211);
        assertLayout(restored, 'bottom', 260);
        assert.equal(gm.get(keys.unified).settings.magnifierAreaSize, 211);
        assert.equal(gm.get(keys.layout).layouts.scroll.thumbSizePx, 260);
    });
}

test('Unobserved origin with broken GM reads cannot infer another origin reset', t => {
    const gm = new Map();
    page(t, { gm }).app.storeAction.runFactoryReset();
    const local = staleLocal();
    const b = page(t, { gm, local, faults: { get: true }, origin: 'https://nhentai.net' });
    assert.equal(b.app.store.magnifierAreaSize, 137);
    assertLayout(b, 'right', 300);
    assert.equal(local.has(keys.observation), false);
});

test('Single-field save after reset never revives stale layout or overwrites legal shared zoom', async t => {
    const gm = new Map([[keys.marker, marker()], [keys.unified, unified({ magnifierZoom: 4 })]]);
    const local = staleLocal();
    const options = { gm, local, faults: { set: true } };
    const p = page(t, options);
    assert.equal(p.app.store.magnifierAreaSize, 80);
    p.app.storeAction.setMagnifierAreaSize(211);
    await p.dispose();
    const fresh = page(t, options);
    assert.equal(fresh.app.store.magnifierAreaSize, 211);
    assert.equal(fresh.app.store.magnifierZoom, 4);
    assertLayout(fresh, 'left', 150);
    assert.equal(readLocal(local, keys.layout).layouts.scroll.thumbSizePx, 300, 'old data retained, not reimported');
});

test('Single-mode save after reset keeps untouched book layout at defaults without current identity', async t => {
    const gm = new Map([[keys.marker, marker()]]);
    const local = staleLocal();
    const options = { gm, local, faults: { set: true } };
    const p = page(t, options);
    p.app.storeAction.setThumbDockSlot('bottom');
    p.app.storeAction.setThumbPanelSize(260);
    const saved = readLocal(local, keys.layout);
    assert.equal(saved.layouts.scroll.resetId, 'current');
    assert.notEqual(saved.layouts.book.resetId, 'current');
    await p.dispose();
    const fresh = page(t, options);
    assertLayout(fresh, 'bottom', 260);
    fresh.app.storeAction.setReadingMode(1);
    assertLayout(fresh, 'left', 150);
});

for (const setBroken of [false, true]) {
    for (const [name, sharedSize, localId, expected] of [
        ['shared legal wins', 277, 'current', 277],
        ['same identity fills missing', undefined, 'current', 137],
        ['same identity fills invalid', 999, 'current', 137],
        ['different identity rejected', 999, 'previous', 80],
        ['missing identity rejected', 999, undefined, 80],
    ]) {
        test(`Identity merge: ${name}; GM set ${setBroken ? 'broken' : 'healthy'}`, async t => {
            const gm = new Map([[keys.marker, marker()], [keys.unified, unified({ magnifierAreaSize: sharedSize, magnifierZoom: 4 })]]);
            const local = localMap([[keys.unified, unified({ magnifierAreaSize: 137, magnifierZoom: 5 }, { resetId: localId })]]);
            const options = { gm, local, faults: { set: setBroken } };
            for (let i = 0; i < 2; i++) {
                const p = page(t, options);
                assert.equal(p.app.store.magnifierAreaSize, expected);
                assert.equal(p.app.store.magnifierZoom, 4);
                await p.dispose();
            }
        });
    }
}

test('Unparseable shared JSON admits only same-generation local data', t => {
    for (const resetId of ['current', 'previous']) {
        const gm = new Map([[keys.marker, marker()], [keys.unified, '{broken']]);
        const local = localMap([[keys.unified, unified({ magnifierAreaSize: 137 }, { resetId })]]);
        const p = page(t, { gm, local });
        assert.equal(p.app.store.magnifierAreaSize, resetId === 'current' ? 137 : 80);
    }
});

for (const resetId of ['current', undefined]) {
    test(`Legacy independent animation: ${resetId ? 'same identity fills invalid shared' : 'no identity rejected'}`, async t => {
        const gm = new Map([[keys.marker, marker()], [keys.animation, animation('invalid')]]);
        const local = localMap([[keys.animation, animation('none', { resetId })]]);
        const options = { gm, local, faults: { set: true } };
        for (let i = 0; i < 2; i++) {
            const p = page(t, options);
            assert.equal(p.app.store.pageTurnAnimationMode, resetId ? 'none' : 'realistic');
            await p.dispose();
        }
    });
}

for (const blocked of [false, true]) {
    for (const mixedValid of [false, true]) {
        test(`Field normalization: ${blocked ? 'blocked same identity' : 'migration'}; ${mixedValid ? 'mixed shared list wins' : 'all unknown list fills from local'}`, async t => {
            const gm = new Map([[keys.unified, unified({ magnifierAreaSize: mixedValid ? 80.5 : 999, magnifierZoom: 4 }, {
                quickSelection: mixedValid ? ['unknown', 'widthScale'] : ['unknown'],
                quickOrder: mixedValid ? ['unknown', 'widthScale'] : ['unknown'],
                shortcuts: { goNext: '', goPrev: 42 },
            })]]);
            if (blocked) gm.set(keys.marker, marker());
            const local = localMap([[keys.unified, unified({ magnifierAreaSize: 137, magnifierZoom: 5 }, {
                resetId: 'current', quickSelection: ['readingMode', 'loadNum'], quickOrder: ['readingMode', 'loadNum'],
                shortcuts: { goNext: 'x', goPrev: 'z' },
            })]]);
            for (let i = 0; i < 2; i++) {
                const p = page(t, { gm, local });
                assert.equal(p.app.store.magnifierAreaSize, 137);
                assert.equal(p.app.store.magnifierZoom, 4);
                assert.equal(p.app.store.shortcutBindings.goNext, '');
                assert.equal(p.app.store.shortcutBindings.goPrev, 'z');
                assert.deepEqual(Array.from(p.app.store.quickSettingSelected), ['readingMode', mixedValid ? 'widthScale' : 'loadNum']);
                assert.deepEqual(Array.from(p.app.store.quickSettingOrder).slice(0, 2), ['readingMode', mixedValid ? 'widthScale' : 'loadNum']);
                await p.dispose();
            }
        });
    }
}

for (const blocked of [false, true]) {
    for (const localModern of [false, true]) {
        test(`Shortcut schema migration: ${blocked ? 'blocked' : 'unblocked'}; ${localModern ? 'local schema3 tilde preserved' : 'shared schema2 defaults upgraded'}; two reloads`, async t => {
            const gm = new Map([[keys.unified, unified({}, {
                schemaVersion: 2, shortcuts: { toggleTopBar: 'Escape', ...(localModern ? {} : { toggleThumbView: '~' }) },
            })]]);
            if (blocked) gm.set(keys.marker, marker());
            const local = localMap([[keys.unified, unified({}, {
                resetId: 'current', shortcuts: { toggleThumbView: '~' },
            })]]);
            for (let i = 0; i < 3; i++) {
                const p = page(t, { gm, local });
                assert.equal(p.app.store.shortcutBindings.toggleTopBar, 'q');
                assert.equal(p.app.store.shortcutBindings.toggleThumbView, localModern ? '~' : 't');
                assert.equal(gm.get(keys.unified).schemaVersion, 3);
                await p.dispose();
            }
        });
    }
}

for (const nativeCrypto of [true, false]) {
    test(`Reset identity: same millisecond, rollback, stale rejection and save recovery (${nativeCrypto ? 'native crypto' : 'fallback'})`, async t => {
        const gm = new Map();
        const clock = { now: Date.parse(time) };
        const options = { gm, clock, ...(nativeCrypto ? {} : { crypto: null }) };
        const a = page(t, options);
        a.app.storeAction.runFactoryReset();
        assert.equal(a.app.store.factoryResetStatus, 'success');
        const first = gm.get(keys.marker);
        const bLocal = staleLocal();
        const b = page(t, { ...options, local: bLocal, faults: { set: true } });
        b.app.storeAction.setMagnifierAreaSize(137);
        b.app.storeAction.setThumbDockSlot('right');
        b.app.storeAction.setThumbPanelSize(300);
        await b.dispose();
        a.app.storeAction.runFactoryReset();
        const second = gm.get(keys.marker);
        assert.equal(a.app.store.factoryResetStatus, 'success');
        assert.equal(a.reloads, 2);
        assert.notEqual(first.resetId, second.resetId);
        assert.equal(first.migratedAt, time);
        assert.equal(second.migratedAt, time);
        clock.now -= 86_400_000;
        const bOptions = { ...options, local: bLocal, faults: { set: true } };
        const rolledBack = page(t, bOptions);
        assert.equal(rolledBack.app.store.magnifierAreaSize, 80);
        assertLayout(rolledBack, 'left', 150);
        rolledBack.app.storeAction.setMagnifierAreaSize(233);
        rolledBack.app.storeAction.setThumbDockSlot('right');
        rolledBack.app.storeAction.setThumbPanelSize(180);
        assert.equal(readLocal(bLocal, keys.unified).updatedAt, new Date(clock.now).toISOString());
        assert.equal(readLocal(bLocal, keys.unified).resetId, second.resetId);
        await rolledBack.dispose();
        const fresh = page(t, bOptions);
        assert.equal(fresh.app.store.magnifierAreaSize, 233);
        assertLayout(fresh, 'right', 180);
    });
}

for (const hasIdentity of [true, false]) {
    test(`Marker timestamp changes: ${hasIdentity ? 'stable resetId preserves values' : 'legacy timestamp identity rejects old values'}`, async t => {
        const gm = new Map([[keys.marker, marker(hasIdentity ? 'current' : null)]]);
        const local = new Map();
        const options = { gm, local, faults: { set: true } };
        const p = page(t, options);
        p.app.storeAction.setMagnifierAreaSize(137);
        await p.dispose();
        gm.set(keys.marker, marker(hasIdentity ? 'current' : null, '2026-09-19T12:00:00.000Z'));
        const fresh = page(t, options);
        assert.equal(fresh.app.store.magnifierAreaSize, hasIdentity ? 137 : 80);
    });
}

test('Healthy shared save is not a local mirror; later total GM failure rejects old local data', async t => {
    const gm = new Map([[keys.marker, marker()]]);
    const local = staleLocal();
    const p = page(t, { gm, local });
    p.app.storeAction.setMagnifierAreaSize(211);
    assert.equal(gm.get(keys.unified).settings.magnifierAreaSize, 211);
    assert.equal(readLocal(local, keys.unified).settings.magnifierAreaSize, 137);
    await p.dispose();
    const fresh = page(t, { gm, local, faults: { get: true, set: true } });
    assert.equal(fresh.app.store.magnifierAreaSize, 80);
    assertLayout(fresh, 'left', 150);
});

test('Real Vue language watcher persists and disposed pages stop writing', async t => {
    const gm = new Map();
    const p = page(t, { gm });
    p.lang.value = 'jp';
    await nextTick();
    assert.equal(gm.get(keys.unified).settings.lang, 'jp');
    await p.dispose();
    p.lang.value = 'en';
    await nextTick();
    assert.equal(gm.get(keys.unified).settings.lang, 'jp');
    assert.equal(page(t, { gm }).lang.value, 'jp');
});
