'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');
const vue = require('vue');

const root = path.resolve(__dirname, '../..');
// Deliberately limited to the current storage module graph. New imports require review.
const realModules = new Set([
    'core/store/app.ts',
    'core/store/layoutPreference.ts',
    'core/model/layout.ts',
    'core/model/bookSpread.ts',
    'core/model/thumbExpand.ts',
    'core/utils/runtimeEnv.ts',
    'src/platform/base/service/PlatformService.js',
]);

/** Maps survive navigation; everything else (VM, module cache, Vue scope) is per page. */
function createPage({
    gm = new Map(),
    local = new Map(),
    origin = 'https://e-hentai.org',
    gmApis = ['get', 'set', 'list', 'delete'],
    faults = {},
    clock = { now: Date.parse('2026-09-18T12:00:00.000Z') },
    crypto = webcrypto,
} = {}) {
    const scope = vue.effectScope();
    const cache = new Map();
    const calls = { get: 0, set: 0, list: 0, delete: 0, localGet: 0, localSet: 0, localRemove: 0 };
    let reloads = 0;
    let disposed = false;
    let initialized = false;
    const trip = (operation) => {
        calls[operation] += 1;
        if (faults[operation]) throw new Error(`Injected storage failure: ${operation}`);
    };
    const localStorage = {
        get length() { return local.size; },
        key(index) { return Array.from(local.keys())[index] ?? null; },
        getItem(key) { trip('localGet'); return local.get(String(key)) ?? null; },
        setItem(key, value) { trip('localSet'); local.set(String(key), String(value)); },
        removeItem(key) { trip('localRemove'); local.delete(String(key)); },
    };
    const gmFunctions = {
        get(key, fallback) { trip('get'); return structuredClone(gm.has(key) ? gm.get(key) : fallback); },
        set(key, value) { trip('set'); gm.set(key, structuredClone(value)); },
        list() { trip('list'); return Array.from(gm.keys()); },
        delete(key) { trip('delete'); gm.delete(key); },
    };
    class PageDate extends Date {
        constructor(...args) { super(...(args.length ? args : [clock.now])); }
        static now() { return clock.now; }
    }
    const context = vm.createContext({
        console,
        Date: PageDate,
        crypto,
        navigator: { userAgent: 'storage-regression desktop' },
        window: {
            localStorage,
            location: { host: new URL(origin).host, origin, reload() { reloads += 1; } },
            matchMedia: () => ({ matches: false }),
        },
    });
    const apiNames = { get: 'GM_getValue', set: 'GM_setValue', list: 'GM_listValues', delete: 'GM_deleteValue' };
    for (const api of gmApis) {
        if (!apiNames[api]) throw new Error(`Unknown GM API: ${api}`);
        context[apiNames[api]] = gmFunctions[api];
    }
    const lang = vue.ref('en');
    const stubs = new Map([
        ['core/store/i18n.ts', { lang, i18n: vue.computed(() => ({ terminate: 'Terminate' })) }],
        ['core/store/event.ts', {
            initViewportSizeUpdater() {},
            initKeyboardListener() {},
            resetAutoFlipTimer() {},
            checkInstructions() {},
            openWelcomeInstructionDialog() {},
            checkVersion() {},
        }],
        ['core/service/AlbumService.ts', { NameAlbumService: 'album_service' }],
        ['core/service/GalleryDownloadService.ts', { GalleryDownloadService: class {
            constructor() { throw new Error('Downloads are outside the storage fixture'); }
        } }],
    ]);
    const albumService = {
        getPageCount: () => 3,
        getThumbInfos: () => [],
        getImgPageInfos: () => [],
        getTitle: () => 'Storage fixture',
        getCurPageIndex: () => 0,
    };
    function load(relative) {
        if (stubs.has(relative)) return stubs.get(relative);
        if (!realModules.has(relative)) throw new Error(`Unexpected storage fixture import: ${relative}`);
        if (cache.has(relative)) return cache.get(relative).exports;
        const filename = path.join(root, relative);
        const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
            fileName: filename,
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
            reportDiagnostics: true,
        });
        const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
        if (errors.length) {
            throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
                getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
            }));
        }
        const module = { exports: {} };
        cache.set(relative, module);
        const requireFromPage = (specifier) => {
            if (specifier === 'vue') return vue;
            if (!specifier.startsWith('.')) throw new Error(`Unexpected storage fixture import: ${specifier}`);
            const resolved = path.relative(root, path.resolve(path.dirname(filename), specifier));
            const candidate = [resolved, `${resolved}.ts`, `${resolved}.js`]
                .find(f => realModules.has(f) || stubs.has(f));
            if (!candidate) throw new Error(`Unexpected storage fixture import: ${specifier} from ${relative}`);
            return load(candidate);
        };
        vm.runInContext('(function(require, module, exports) {\n' + result.outputText + '\n})', context, { filename })(
            requireFromPage, module, module.exports,
        );
        return module.exports;
    }
    try {
        const app = scope.run(() => load('core/store/app.ts'));
        const platform = load('src/platform/base/service/PlatformService.js').default;
        return {
            app, platform, calls, faults, lang,
            get reloads() { return reloads; },
            init() {
                if (disposed || initialized) throw new Error('Create a new page for a reload');
                scope.run(() => app.init(albumService));
                initialized = true;
                return this;
            },
            async dispose() {
                if (disposed) return;
                try { await vue.nextTick(); } finally { scope.stop(); disposed = true; }
            },
        };
    } catch (error) {
        scope.stop();
        throw error;
    }
}

module.exports = { createPage };
