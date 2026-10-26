'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const MODEL = 'core/model/layout.ts';

function loadLayout() {
    const runtime = createRuntime({ realModules: [MODEL] });
    return runtime.load(MODEL);
}

const plain = value => JSON.parse(JSON.stringify(value));

test('layout: viewport clamp keeps the main block floor first', () => {
    const layout = loadLayout();
    const mainFloor = layout.computeMainMinSizePx;
    assert.equal(layout.computeMainMinSizePx(1200), 320);
    assert.equal(layout.computeMainMinSizePx(500), 300);
    assert.equal(layout.computeMainMinSizePx(390), 234);
    assert.equal(layout.computeMainMinSizePx(100), 60);
    assert.equal(layout.computeMainMinSizePx(0), 0);
    assert.equal(layout.computeMainMinSizePx(-40), 0);
    assert.equal(mainFloor, layout.computeMainMinSizePx);
});

test('layout: side and bottom size ranges come from the block registry', () => {
    const layout = loadLayout();
    assert.deepEqual(plain(layout.getThumbSizeRange('left')), { min: 60, max: 520 });
    assert.deepEqual(plain(layout.getThumbSizeRange('right')), { min: 60, max: 520 });
    assert.deepEqual(plain(layout.getThumbSizeRange('left', 1200)), { min: 60, max: 520 });
    assert.deepEqual(plain(layout.getThumbSizeRange('left', 390)), { min: 60, max: 156 });
    assert.deepEqual(plain(layout.getThumbSizeRange('bottom')), { min: 60, max: 420 });
    assert.deepEqual(plain(layout.getThumbSizeRange('bottom', 900)), { min: 60, max: 420 });
    assert.deepEqual(plain(layout.getThumbSizeRange('bottom', 400)), { min: 60, max: 160 });
    assert.deepEqual(plain(layout.getThumbSizeRange('left', 0)), { min: 60, max: 520 });
    assert.deepEqual(plain(layout.getThumbSizeRange('bottom', -10)), { min: 60, max: 420 });
});

test('layout: extreme viewport makes the thumb range yield to the main floor', () => {
    const layout = loadLayout();
    const range = layout.getThumbSizeRange('left', 100);
    const main = layout.computeMainMinSizePx(100);
    assert.equal(range.max, 100 - main);
    assert.ok(range.min <= range.max);
    assert.deepEqual(plain(range), { min: 40, max: 40 });
});

test('layout: clampThumbSize rounds and falls back for non-finite sizes', () => {
    const layout = loadLayout();
    assert.equal(layout.clampThumbSize('left', 150.4), 150);
    assert.equal(layout.clampThumbSize('left', 150.6), 151);
    assert.equal(layout.clampThumbSize('left', 10), 60);
    assert.equal(layout.clampThumbSize('left', 5000), 520);
    assert.equal(layout.clampThumbSize('bottom', 5000), 420);
    assert.equal(layout.clampThumbSize('bottom', Number.NaN), 200);
    assert.equal(layout.clampThumbSize('left', Number.NaN), 150);
    assert.equal(layout.clampThumbSize('left', Number.POSITIVE_INFINITY), 150);
    assert.equal(layout.clampThumbSize('left', 150, 390), 150);
    assert.equal(layout.clampThumbSize('left', 500, 390), 156);
    assert.equal(layout.clampThumbSize('bottom', 500, 400), 160);
});

test('layout: registry exposes dock slots and long press without leaking mutable state', () => {
    const layout = loadLayout();
    assert.deepEqual(plain(layout.getDockAllowedSlots()), ['left', 'right', 'bottom']);
    assert.equal(layout.getDockLongPressMs(), 500);
    const slots = layout.getDockAllowedSlots();
    slots.push('left');
    slots.length = 0;
    assert.deepEqual(plain(layout.getDockAllowedSlots()), ['left', 'right', 'bottom']);
});

test('layout: registry entries are internally consistent', () => {
    const layout = loadLayout();
    const ids = plain(layout.layoutBlockRegistry.map(block => block.blockId));
    assert.deepEqual(ids, [...new Set(ids)]);
    for (const block of layout.layoutBlockRegistry) {
        assert.ok(block.sizeRange.minSizePx < block.sizeRange.maxSizePx, `${block.blockId} sizeRange`);
        for (const [slot, range] of Object.entries(block.slotSizeRanges || {})) {
            assert.ok(range.minSizePx < range.maxSizePx, `${block.blockId}.${slot} slot range`);
            assert.ok(block.allowedSlots.includes(slot), `${block.blockId}.${slot} must be an allowed slot`);
        }
        if (block.dockable) {
            assert.ok(block.allowedSlots.length > 0, `${block.blockId} is dockable`);
        }
    }
    assert.deepEqual(plain(layout.getBlockSizeRange('thumb', 'bottom')), { minSizePx: 60, maxSizePx: 420 });
    assert.deepEqual(plain(layout.getBlockSizeRange('thumb', 'left')), { minSizePx: 60, maxSizePx: 520 });
    assert.deepEqual(plain(layout.getBlockSizeRange('main')), { minSizePx: 320, maxSizePx: 2400 });
});

test('layout: registry is declared before the helpers that read it', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '..', MODEL), 'utf8');
    const registryAt = source.indexOf('export const layoutBlockRegistry');
    assert.ok(registryAt > 0, 'registry declaration must exist');
    for (const symbol of ['getLayoutBlock', 'getBlockSizeRange', 'getDockAllowedSlots', 'getDockLongPressMs',
        'computeMainMinSizePx', 'getThumbSizeRange', 'clampThumbSize', 'createDefaultModeLayout',
        'createDefaultLayoutPreference']) {
        const at = source.indexOf(`export function ${symbol}`);
        assert.ok(at > registryAt, `${symbol} must be declared after the registry`);
    }
});

test('layout: reclamping must not persist the clamped size', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'core/store/app.ts'), 'utf8');
    const start = source.indexOf('function reclampThumbSizes');
    assert.ok(start > 0, 'reclampThumbSizes must exist');
    const bodyEnd = source.indexOf('\n}', start);
    assert.ok(bodyEnd > start, 'reclampThumbSizes body must be found');
    const body = source.slice(start, bodyEnd);
    assert.ok(!body.includes('persistCurrentModeLayoutPreference'),
        'reclampThumbSizes must not persist the clamped size; the stored value keeps the user requested size');
});
