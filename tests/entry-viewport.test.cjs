const assert = require('node:assert/strict');
const test = require('node:test');
const vue = require('vue');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

// DOM property/event boundary only: no layout engine and no claim about CSS pixels.
function createElement(tag) {
    const attributes = new Map(), properties = new Map(), listeners = new Map();
    const element = {
        tag, children: [], parent: null,
        style: {
            getPropertyValue: key => properties.get(key)?.value || '',
            getPropertyPriority: key => properties.get(key)?.priority || '',
            setProperty: (key, value, priority = '') => properties.set(key, { value, priority }),
            removeProperty: key => properties.delete(key),
        },
        classList: { add() {} },
        setAttribute: (key, value) => attributes.set(key, String(value)),
        getAttribute: key => attributes.get(key) ?? null,
        removeAttribute: key => attributes.delete(key),
        appendChild(child) { this.children.push(child); child.parent = this; },
        remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); },
        addEventListener: (name, callback) => listeners.set(name, callback),
        click: () => listeners.get('click')?.(),
        get id() { return attributes.get('id'); },
        set id(value) { attributes.set('id', value); },
        get name() { return attributes.get('name'); },
        set name(value) { attributes.set('name', value); },
    };
    return element;
}
function createEntryPage({ platform = 'EH', mobile = true, viewport = 'width=980',
    overflowX = ['scroll', 'important'], overflowY = ['auto', ''], autoOpen = false,
    initializationError } = {}) {
    const html = createElement('html'), head = createElement('head'), body = createElement('body');
    html.appendChild(head); html.appendChild(body);
    for (const [key, [value, priority]] of [['overflow-x', overflowX], ['overflow-y', overflowY]]) {
        if (value) html.style.setProperty(key, value, priority);
    }
    html.style.setProperty('color', 'red', 'important');
    let originalMeta = null;
    if (viewport !== undefined && viewport !== false) {
        originalMeta = createElement('meta');
        originalMeta.name = 'viewport';
        if (viewport !== null) originalMeta.setAttribute('content', viewport);
        head.appendChild(originalMeta);
    }
    const descendants = node => [node, ...node.children.flatMap(descendants)];
    const document = {
        documentElement: html, head, body, createElement,
        getElementById: id => descendants(html).find(el => el.id === id) || null,
        querySelector: selector => {
            assert.equal(selector, 'meta[name="viewport"]');
            return descendants(html).find(el => el.tag === 'meta' && el.name === 'viewport') || null;
        },
    };
    const writes = [], LoadingView = { name: 'LoadingViewFixture' };
    let component, instance, mounted = 0, initialized = 0, hostActions = 0;
    const stubs = new Map([
        ['vue', { ...vue, createApp: options => {
            component = options;
            return { provide() {}, mount() { mounted++; instance = vue.proxyRefs(options.setup()); } };
        } }],
        ['core/TestApp.vue', {}], ['core/components/LoadingView.vue', LoadingView],
        ['core/style/_normalize.scss', {}],
        ['core/service/AlbumService.ts', { NameAlbumService: 'album_service' }],
        ['src/platform/detector.ts', { detectPlatform: () => ({ platform }) }],
        ['src/platform/factory.ts', { createPlatformService: () => ({}) }],
        ['src/platform/initializer.ts', { initializeWithTimeout: async () => {
            initialized++;
            if (initializationError) throw initializationError;
        } }],
        ['src/platform/hostActions.ts', { applyPlatformHostActions: () => { hostActions++; } }],
        ['src/platform/base/service/PlatformService.js', {
            storageGet: () => autoOpen, storageSet: (key, value) => writes.push([key, value]),
        }],
        ['src/platform/types.ts', { Platform: { EH: 'EH', NH: 'NH', TEST: 'TEST' } }],
        ['core/utils/runtimeEnv.ts', { isMobileLikeDevice: () => mobile }],
    ]);
    const runtime = createRuntime({ stubs, realModules: ['src/main.ts'], globals: {
        document, requestAnimationFrame: callback => runtime.window.setTimeout(callback, 16),
    } });
    runtime.load('src/main.ts');
    return Object.assign(runtime, { document, html, originalMeta, writes,
        getStats: () => ({ mounted, initialized, hostActions }),
        renderLoadingView: () => {
            const vnode = component.render.call(instance);
            assert.equal(vnode.type, LoadingView);
            return vnode.props;
        },
    });
}
const viewportContent = page => page.document.querySelector('meta[name="viewport"]')?.getAttribute('content');
function rootStyles(page) {
    return ['overflow-x', 'overflow-y', 'color'].map(key => [
        key, page.html.style.getPropertyValue(key), page.html.style.getPropertyPriority(key),
    ]);
}
function assertIsolated(page) {
    assert.equal(viewportContent(page), 'width=device-width, initial-scale=1, viewport-fit=cover');
    for (const key of ['overflow-x', 'overflow-y']) {
        assert.equal(page.html.style.getPropertyValue(key), 'hidden', `${key} constrains host overflow`);
    }
}

for (const viewport of ['width=980', null, false]) {
    test(`EH mobile preserves original viewport (${viewport}) and root styles across reopen`, async () => {
        const page = createEntryPage({ viewport });
        const before = rootStyles(page);
        const contentBefore = viewportContent(page);
        page.document.getElementById('ehunter-switch').click();
        assertIsolated(page);
        const loading = page.renderLoadingView();
        assert.equal(loading.isLoading, true);
        await page.flush();
        assert.equal(page.renderLoadingView().isLoading, false);
        page.window.__EHUNTER_UI__.close();
        assert.deepEqual(rootStyles(page), before);
        assert.equal(viewportContent(page), contentBefore);
        assert.equal(page.document.querySelector('meta[name="viewport"]'), page.originalMeta);
        page.window.__EHUNTER_UI__.open();
        assertIsolated(page);
        page.window.__EHUNTER_UI__.close();
        await page.advance(2500);
        assert.deepEqual(rootStyles(page), before);
        assert.equal(viewportContent(page), contentBefore);
        assert.deepEqual(page.getStats(), { mounted: 1, initialized: 1, hostActions: 1 });
        assert.deepEqual(page.logs.error, []);
    });
}

test('repeated opens retain first snapshot; unrelated style changes and later host values survive', async () => {
    const page = createEntryPage();
    const before = rootStyles(page);
    const ui = page.window.__EHUNTER_UI__;
    ui.open(); ui.open(); ui.toggle(true);
    assertIsolated(page);
    page.html.style.setProperty('color', 'blue');
    ui.close(); ui.close();
    assert.deepEqual(rootStyles(page).slice(0, 2), before.slice(0, 2));
    assert.equal(page.html.style.getPropertyValue('color'), 'blue');
    ui.open(); ui.close(); ui.open(); // close-animation timer must not hide a reopened reader
    await page.advance(600);
    assertIsolated(page);
    assert.equal(page.document.getElementById('ehunter-app').style.visibility, 'visible');
    ui.close();
    assert.deepEqual(rootStyles(page).slice(0, 2), before.slice(0, 2));
    page.html.style.setProperty('overflow-x', 'clip');
    ui.open(); ui.close();
    assert.equal(page.html.style.getPropertyValue('overflow-x'), 'clip');
    assert.equal(page.html.style.getPropertyPriority('overflow-x'), '');
    assert.equal(page.html.style.getPropertyValue('color'), 'blue');
});

for (const overflow of [[['', ''], ['', '']], [['auto', ''], ['scroll', 'important']]]) {
    test(`auto-open restores absent or important properties: ${JSON.stringify(overflow)}`, async () => {
        const page = createEntryPage({ overflowX: overflow[0], overflowY: overflow[1], autoOpen: true });
        assertIsolated(page);
        page.window.__EHUNTER_UI__.close();
        assert.deepEqual(rootStyles(page).slice(0, 2), [
            ['overflow-x', ...overflow[0]], ['overflow-y', ...overflow[1]],
        ]);
    });
}

for (const viewport of ['width=980', false]) {
    test(`loading-error close restores root and viewport (${viewport})`, async () => {
        const cause = new Error('fixture initialization failed');
        const page = createEntryPage({ viewport, initializationError: cause });
        const before = rootStyles(page), contentBefore = viewportContent(page);
        page.window.__EHUNTER_UI__.open();
        await page.flush();
        const loading = page.renderLoadingView();
        assert.equal(loading.isLoading, false);
        assert.equal(loading.error, cause);
        assert.equal(page.logs.error.length, 1, 'real initialization error stays visible');
        assertIsolated(page);
        loading.onClose();
        assert.deepEqual(rootStyles(page), before);
        assert.equal(viewportContent(page), contentBefore);
        assert.deepEqual(page.writes.at(-1), ['ehunter:reader:open', false]);
        await page.advance(600);
        assert.equal(page.document.getElementById('ehunter-app').style.visibility, 'hidden');
        page.window.__EHUNTER_UI__.open();
        assertIsolated(page);
        page.renderLoadingView().onClose();
        assert.deepEqual(rootStyles(page), before);
    });
}

for (const [platform, mobile] of [['EH', false], ['NH', true], ['TEST', true], ['NH', false], ['TEST', false]]) {
    test(`${platform}, mobile=${mobile}: root style and viewport remain untouched`, async () => {
        const page = createEntryPage({ platform, mobile });
        const before = rootStyles(page);
        page.window.__EHUNTER_UI__.open();
        assert.deepEqual(rootStyles(page), before);
        assert.equal(viewportContent(page), 'width=980');
        page.window.__EHUNTER_UI__.close();
        await page.advance(600);
        assert.deepEqual(rootStyles(page), before);
        assert.equal(viewportContent(page), 'width=980');
    });
}
