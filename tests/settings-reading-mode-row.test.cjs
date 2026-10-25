'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vue = require('vue');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');
const { createPage } = require('./helpers/storage-fixture.cjs');

const root = path.resolve(__dirname, '..');
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

function compileComponent(relative) {
    const filename = path.join(root, relative);
    const source = fs.readFileSync(filename, 'utf8');
    const { descriptor, errors } = parse(source, { filename });
    assert.deepEqual(errors.map(String), [], `${relative} must parse`);
    const compiled = compileScript(descriptor, { id: relative, inlineTemplate: true });
    const result = ts.transpileModule(compiled.content, {
        fileName: `${filename}.ts`,
        reportDiagnostics: true,
        compilerOptions: {
            module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
        },
    });
    const diagnostics = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
    }));
    return result.outputText;
}

function instantiate(relative, dependencies) {
    const code = compileComponent(relative);
    const module = { exports: {} };
    const requireFromTest = specifier => {
        assert.ok(specifier in dependencies, `${relative} imported unexpected "${specifier}"`);
        return dependencies[specifier];
    };
    new Function('require', 'module', 'exports', code)(requireFromTest, module, module.exports);
    return module.exports.default;
}

const PopoverStub = {
    props: { active: Boolean, customStyle: Object, isCloseToRight: Boolean },
    emits: ['close'],
    render() {
        return this.active ? vue.h('div', { class: 'popover' }, this.$slots.default?.()) : null;
    },
};

const DropDownIconStub = { render: () => vue.h('i', { class: 'icon-drop-down' }) };

function createFieldRuntime() {
    const instance = createPage({});
    instance.init();
    const runtime = createRuntime({
        stubs: new Map([
            ['core/store/app.ts', instance.app],
            ['core/store/i18n.ts', { i18n: vue.computed(() => ({})) }],
        ]),
        realModules: ['core/store/settingFieldRuntime.ts'],
    });
    return { instance, module: runtime.load('core/store/settingFieldRuntime.ts') };
}

const host = {
    patchProp(el, key, prevValue, nextValue) {
        if (key === 'onClick') el.onClick = nextValue;
        else el.props[key] = nextValue;
    },
    insert(el, parent) { el.parent = parent; parent.children.push(el); },
    remove(el) {
        const siblings = el.parent ? el.parent.children : [];
        const at = siblings.indexOf(el);
        if (at >= 0) siblings.splice(at, 1);
    },
    createElement(type) { return { type, props: {}, children: [], parent: null, text: null }; },
    createText(node) { return { type: '#text', props: {}, children: [], parent: null, text: node }; },
    createComment(node) { return { type: '#comment', props: {}, children: [], parent: null, text: node }; },
    setText(node, text) { node.text = text; },
    setElementText(node, text) {
        node.children = text === '' ? [] : [host.createText(text)];
        if (node.children[0]) node.children[0].parent = node;
    },
    parentNode(node) { return node.parent; },
    nextSibling(node) {
        const siblings = node.parent ? node.parent.children : [];
        return siblings[siblings.indexOf(node) + 1] || null;
    },
    querySelector() { return null; },
    setScopeId() {},
    cloneNode(node) {
        const copy = { ...node, props: { ...node.props }, children: node.children.map(child => ({ ...child })) };
        return copy;
    },
    insertStaticContent() { return [host.createElement('div'), host.createElement('div')]; },
};

const renderer = vue.createRenderer(host);

function mount(component, props) {
    const rootNode = host.createElement('root');
    const app = renderer.createApp({ render: () => vue.h(component, props) });
    app.mount(rootNode);
    return { rootNode, unmount: () => app.unmount() };
}

function elements(rootNode, className) {
    const found = [];
    const walk = node => {
        for (const child of node.children || []) {
            const classes = String(child.props?.class || '');
            if (classes.split(/\s+/).includes(className)) found.push(child);
            walk(child);
        }
    };
    walk(rootNode);
    return found;
}

function textOf(node) {
    if (node.type === '#text') return node.text;
    if (node.children && node.children.length) return node.children.map(textOf).join('');
    return node.text || '';
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
    assert.equal(field.dropKey, 'readingModeList');
    assert.equal(dialogSettingFieldIds.general.includes(MODE_FIELD), true);

    assert.deepEqual(
        plain(settingConf.readingModeList.map(item => [item.i18nKey, item.val])),
        [[MODE_OPTION_KEYS[0], 0], [MODE_OPTION_KEYS[1], 1]],
    );
    assert.equal(store.readingMode, 0);
    storeAction.setReadingMode(1);
    assert.equal(store.readingMode, 1);
});

test('the dropdown options and labels resolve through the i18n dictionary', t => {
    const { instance, module } = createFieldRuntime();
    t.after(() => instance.dispose());

    const field = instance.app.settingFieldMap[MODE_FIELD];
    const listed = module.getDropList(MODE_FIELD);
    assert.deepEqual(plain(listed.map(item => item.i18nKey)), MODE_OPTION_KEYS);
    assert.deepEqual(plain(listed.map(item => item.val)), [0, 1]);

    const i18nDict = loadI18nDict();
    assert.equal(i18nDict[field.labelI18nKey], sentinelFor(MODE_LABEL_KEYS[0]));
    assert.equal(i18nDict[field.tipI18nKey], sentinelFor(MODE_LABEL_KEYS[1]));
    for (const item of listed) {
        assert.equal(i18nDict[item.i18nKey], sentinelFor(item.i18nKey));
    }
});

test('choosing a dropdown value writes the mode through the store action', t => {
    const { instance, module } = createFieldRuntime();
    t.after(() => instance.dispose());
    const { store, storeAction } = instance.app;

    const seen = [];
    const original = storeAction.setReadingMode;
    storeAction.setReadingMode = value => {
        seen.push(value);
        original(value);
    };
    t.after(() => { storeAction.setReadingMode = original; });

    assert.equal(module.getFieldValue(MODE_FIELD), 0);
    module.setFieldValue(MODE_FIELD, 1);
    assert.deepEqual(plain(seen), [1]);
    assert.equal(module.getFieldValue(MODE_FIELD), 1);

    module.setFieldValue(MODE_FIELD, 0);
    assert.deepEqual(plain(seen), [1, 0]);
    assert.equal(module.getFieldValue(MODE_FIELD), 0);
    assert.equal(store.readingMode, 0);
});

test('the dropdown renders the current value and the option labels from the i18n dictionary', () => {
    const i18nDict = loadI18nDict();
    const instance = createPage({});
    instance.init();
    const listed = plain(instance.app.settingConf.readingModeList);

    const DropOption = instantiate('core/components/widget/DropOption.vue', {
        vue,
        './Popover.vue': PopoverStub,
        '../../store/i18n': { i18n: vue.computed(() => i18nDict) },
        '../../assets/svg/drop_down.svg?component': DropDownIconStub,
    });

    const scroll = mount(DropOption, { list: listed, curVal: 0, formatCurValByList: true });
    const scrollTexts = () => elements(scroll.rootNode, 'item').map(textOf);

    assert.ok(elements(scroll.rootNode, 'drop-option').length === 1);
    assert.equal(textOf(elements(scroll.rootNode, 'text')[0]), sentinelFor('scrollMode'));
    assert.deepEqual(scrollTexts(), []);

    elements(scroll.rootNode, 'drop-option')[0].onClick({});
    return vue.nextTick().then(() => {
        assert.deepEqual(scrollTexts(), [sentinelFor('scrollMode'), sentinelFor('bookMode')]);
        scroll.unmount();

        const book = mount(DropOption, { list: listed, curVal: 1, formatCurValByList: true });
        assert.equal(textOf(elements(book.rootNode, 'text')[0]), sentinelFor('bookMode'));
        book.unmount();
        return instance.dispose();
    });
});
