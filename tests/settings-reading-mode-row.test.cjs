'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');
const { createPage } = require('./helpers/storage-fixture.cjs');

const RUNTIME_MODULE = 'core/store/settingFieldRuntime.ts';
const FAKE_APP_MODULE = 'core/store/app.ts';
const I18N_MODULE = 'core/store/i18n.ts';
const MODE_FIELD = 'readingMode';
const MODE_LABEL_KEYS = ['readingMode', 'readingModeTip'];
const MODE_OPTION_KEYS = ['scrollMode', 'bookMode'];

const plain = value => JSON.parse(JSON.stringify(value));

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
    for (const key of [...MODE_LABEL_KEYS, ...MODE_OPTION_KEYS]) {
        assert.ok(dict[key], `core/assets/i18n.ts must define ${key}.cn`);
        dict[key] = sentinelFor(key);
    }
    return dict;
}

function createSettingsRuntime({ readingMode }) {
    const calls = { setReadingMode: [] };
    const store = { readingMode };
    const settingConf = {
        readingModeList: [{ i18nKey: MODE_OPTION_KEYS[0], val: 0 }, { i18nKey: MODE_OPTION_KEYS[1], val: 1 }],
    };
    const settingFieldMap = {
        [MODE_FIELD]: {
            id: MODE_FIELD,
            control: 'drop',
            labelI18nKey: MODE_LABEL_KEYS[0],
            tipI18nKey: MODE_LABEL_KEYS[1],
            modeScope: 'both',
            showInTopBar: true,
            showInDialog: true,
            dialogCategory: 'general',
            dropKey: 'readingModeList',
        },
    };
    const storeAction = {
        setReadingMode(value) {
            calls.setReadingMode.push(value);
            store.readingMode = value;
        },
    };
    const i18nDict = loadI18nDict();
    const stubs = new Map([
        [FAKE_APP_MODULE, { store, storeAction, settingConf, settingFieldMap, dialogSettingFieldIds: { general: [MODE_FIELD], scroll: [], book: [] } }],
        [I18N_MODULE, { i18n: { value: i18nDict } }],
    ]);
    const runtime = createRuntime({ stubs, realModules: [RUNTIME_MODULE] });
    return { module: runtime.load(RUNTIME_MODULE), calls, store, i18nDict };
}

test('the settings dialog lists reading mode in General with the scroll/book dropdown', t => {
    const instance = createPage({});
    t.after(() => instance.dispose());
    const { store, storeAction, settingFieldMap, settingConf, dialogSettingFieldIds } = instance.app;
    instance.init();

    const field = settingFieldMap[MODE_FIELD];
    assert.equal(field.control, 'drop');
    assert.equal(field.showInDialog, true);
    assert.equal(field.dialogCategory, 'general');
    assert.equal(field.modeScope, 'both');
    assert.equal(dialogSettingFieldIds.general.includes(MODE_FIELD), true);

    assert.deepEqual(
        plain(settingConf.readingModeList.map(item => [item.i18nKey, item.val])),
        [[MODE_OPTION_KEYS[0], 0], [MODE_OPTION_KEYS[1], 1]],
    );
    assert.equal(store.readingMode, 0);
    storeAction.setReadingMode(1);
    assert.equal(store.readingMode, 1);
});

test('the dropdown options and labels resolve through the i18n dictionary', () => {
    const { module, i18nDict } = createSettingsRuntime({ readingMode: 1 });

    const listed = module.getDropList(MODE_FIELD);
    assert.deepEqual(plain(listed.map(item => item.i18nKey)), MODE_OPTION_KEYS);
    for (const item of listed) {
        assert.equal(i18nDict[item.i18nKey], sentinelFor(item.i18nKey));
    }
    assert.deepEqual(plain(module.getDialogFieldIds('general')), [MODE_FIELD]);
});

test('choosing a dropdown value writes the mode through the store action', () => {
    const { module, calls, store } = createSettingsRuntime({ readingMode: 0 });

    assert.equal(module.getFieldValue(MODE_FIELD), 0);

    module.setFieldValue(MODE_FIELD, 1);
    assert.deepEqual(plain(calls.setReadingMode), [1]);
    assert.equal(store.readingMode, 1);
    assert.equal(module.getFieldValue(MODE_FIELD), 1);

    module.setFieldValue(MODE_FIELD, 0);
    assert.deepEqual(plain(calls.setReadingMode), [1, 0]);
    assert.equal(store.readingMode, 0);
    assert.equal(module.getFieldValue(MODE_FIELD), 0);
});
