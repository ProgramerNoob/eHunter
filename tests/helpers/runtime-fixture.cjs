const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const startTime = Date.parse('2026-10-14T12:00:00Z');

// Same checkout/transpile/isolated-VM pattern as storage-fixture. This fixture
// exposes only clock and module boundaries; it contains no product behavior.
function createRuntime({ globals = {}, stubs = new Map(), realModules = [] } = {}) {
    for (const ctor of ['Error', 'TypeError', 'RangeError']) {
        assert.ok(!(ctor in globals), `runtime fixture injects ${ctor} itself; drop it from globals`);
    }
    let now = startTime, nextId = 0;
    const timers = new Map(), rejectedJobs = [], logs = { error: [], warn: [], log: [] };
    const setTimeout = (fn, ms = 0, ...args) => {
        const id = ++nextId;
        timers.set(id, { at: now + Number(ms), fn: () => fn(...args) });
        return id;
    };
    const clearTimeout = id => timers.delete(id);
    class ClockDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const window = {
        location: { protocol: 'https:', host: 'fixture.invalid', href: 'https://fixture.invalid/' },
        ...globals.window, setTimeout, clearTimeout,
    };
    const context = vm.createContext({
        URL, URLSearchParams, ...globals, window, Date: ClockDate,
        Error, TypeError, RangeError,
        setTimeout, clearTimeout,
        console: Object.fromEntries(['error', 'warn', 'log', 'info', 'debug'].map(level =>
            [level, (...args) => (logs[level] || logs.log).push(args)])),
    });
    const cache = new Map(), real = new Set(realModules);
    function load(relative) {
        if (stubs.has(relative)) return stubs.get(relative);
        assert.ok(real.has(relative), `Unexpected runtime fixture import: ${relative}`);
        if (cache.has(relative)) return cache.get(relative).exports;
        const filename = path.join(root, relative);
        const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
            fileName: filename, reportDiagnostics: true,
            compilerOptions: {
                module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
                esModuleInterop: true, allowJs: true,
            },
        });
        const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
        assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
            getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
        }));
        const module = { exports: {} };
        cache.set(relative, module);
        const requireFromPage = specifier => {
            if (stubs.has(specifier)) return stubs.get(specifier);
            assert.ok(specifier.startsWith('.'), `Unexpected dependency: ${specifier}`);
            const base = path.relative(root, path.resolve(path.dirname(filename), specifier));
            const target = [base, `${base}.ts`, `${base}.js`].find(p => real.has(p) || stubs.has(p));
            assert.ok(target, `Unexpected import ${specifier} from ${relative}`);
            return load(target);
        };
        vm.runInContext('(function(require,module,exports){\n' + result.outputText + '\n})', context,
            { filename })(requireFromPage, module, module.exports);
        return module.exports;
    }
    const flush = () => new Promise(setImmediate);
    async function advance(ms) {
        const target = now + ms;
        await flush();
        let steps = 0;
        while (true) {
            const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
            if (!next || next[1].at > target) break;
            assert.ok(++steps < 100, 'timer workload is bounded');
            const [id, timer] = next;
            timers.delete(id);
            now = timer.at;
            try { Promise.resolve(timer.fn()).catch(error => rejectedJobs.push(error)); }
            catch (error) { rejectedJobs.push(error); }
            await flush();
        }
        now = target;
        await flush();
    }
    return { load, window, timers, rejectedJobs, logs, advance, flush, get now() { return now; } };
}

module.exports = { createRuntime, startTime };
