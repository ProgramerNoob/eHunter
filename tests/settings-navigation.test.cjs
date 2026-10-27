'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const MODEL = 'core/model/settingsNavigation.ts';

function loadModel() {
    const runtime = createRuntime({ realModules: [MODEL] });
    return runtime.load(MODEL);
}

// Offsets measured in the 1200x900 dialog: group tops relative to the content box.
const SECTIONS = [
    { id: 'general', offsetTop: 16 },
    { id: 'scroll', offsetTop: 528 },
    { id: 'book', offsetTop: 852 },
    { id: 'quick', offsetTop: 1553 },
    { id: 'shortcuts', offsetTop: 2334 },
    { id: 'other', offsetTop: 3185 },
];
const SCROLL_MAX = 2836;

test('settings navigation: every category click lands on its own section', () => {
    const model = loadModel();
    for (const section of SECTIONS) {
        const top = model.resolveSettingsCategoryScrollTop(section.offsetTop, SCROLL_MAX);
        assert.equal(
            model.resolveActiveSettingsCategory(top, SECTIONS, SCROLL_MAX),
            section.id,
            `clicking ${section.id} must highlight ${section.id}`,
        );
    }
});

test('settings navigation: the last section wins at the scroll boundary', () => {
    const model = loadModel();
    assert.equal(model.resolveActiveSettingsCategory(SCROLL_MAX, SECTIONS, SCROLL_MAX), 'other');
    assert.equal(model.resolveSettingsCategoryScrollTop(SECTIONS[5].offsetTop, SCROLL_MAX), SCROLL_MAX);
});

test('settings navigation: manual scrolling switches sections without a one-step lag', () => {
    const model = loadModel();
    const offset = model.settingsCategoryActivationOffsetPx;
    const clamp = value => Math.max(0, Math.min(value, SCROLL_MAX));
    for (const section of SECTIONS) {
        if (section.offsetTop > SCROLL_MAX) {
            continue;
        }
        assert.equal(model.resolveActiveSettingsCategory(clamp(section.offsetTop - offset + 1), SECTIONS, SCROLL_MAX), section.id);
        const previous = SECTIONS[SECTIONS.indexOf(section) - 1];
        if (previous) {
            assert.equal(model.resolveActiveSettingsCategory(clamp(section.offsetTop - offset - 1), SECTIONS, SCROLL_MAX), previous.id);
        }
    }
});

test('settings navigation: an unreachable last section highlights only at the bottom boundary', () => {
    const model = loadModel();
    assert.ok(SECTIONS[5].offsetTop > SCROLL_MAX, 'last section top is unreachable in this layout');
    assert.equal(model.resolveActiveSettingsCategory(SCROLL_MAX - 200, SECTIONS, SCROLL_MAX), 'shortcuts');
    assert.equal(model.resolveActiveSettingsCategory(SCROLL_MAX - 1, SECTIONS, SCROLL_MAX), 'other');
});

test('settings navigation: missing sections and empty lists stay inert', () => {
    const model = loadModel();
    assert.equal(model.resolveActiveSettingsCategory(0, [], SCROLL_MAX), '');
    assert.equal(model.resolveActiveSettingsCategory(0, SECTIONS, 0), 'general');
    assert.equal(model.resolveSettingsCategoryScrollTop(-40, SCROLL_MAX), 0);
    assert.equal(model.resolveSettingsCategoryScrollTop(500, 0), 0);
    assert.equal(model.resolveSettingsCategoryScrollTop(120.6, SCROLL_MAX), 121);
});
