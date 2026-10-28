'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const MODEL = 'core/model/settingsNavigation.ts';

function loadModel() {
    const runtime = createRuntime({ realModules: [MODEL] });
    return runtime.load(MODEL);
}

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

test('settings navigation: an unreachable last section wins at the scroll boundary', () => {
    const model = loadModel();
    assert.ok(SECTIONS[SECTIONS.length - 1].offsetTop > SCROLL_MAX);
    assert.equal(model.resolveActiveSettingsCategory(SCROLL_MAX - 200, SECTIONS, SCROLL_MAX), 'shortcuts');
    assert.equal(model.resolveActiveSettingsCategory(SCROLL_MAX, SECTIONS, SCROLL_MAX), 'other');
    assert.equal(model.resolveSettingsCategoryScrollTop(SECTIONS[5].offsetTop, SCROLL_MAX), SCROLL_MAX);
});

test('settings navigation: a reachable last section is not forced to win at the boundary', () => {
    const model = loadModel();
    const reachable = [
        { id: 'general', offsetTop: 16 },
        { id: 'scroll', offsetTop: 400 },
        { id: 'book', offsetTop: 800 },
    ];
    const reachableMax = 1600;
    assert.equal(model.resolveActiveSettingsCategory(reachableMax, reachable, reachableMax), 'book');
    assert.equal(model.resolveActiveSettingsCategory(700, reachable, reachableMax), 'scroll');
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

test('settings navigation: missing sections and empty lists stay inert', () => {
    const model = loadModel();
    assert.equal(model.resolveActiveSettingsCategory(0, [], SCROLL_MAX), null);
    assert.equal(model.resolveActiveSettingsCategory(0, SECTIONS, 0), 'general');
    assert.equal(model.resolveSettingsCategoryScrollTop(-40, SCROLL_MAX), 0);
    assert.equal(model.resolveSettingsCategoryScrollTop(500, 0), 0);
    assert.equal(model.resolveSettingsCategoryScrollTop(120.6, SCROLL_MAX), 121);
});
