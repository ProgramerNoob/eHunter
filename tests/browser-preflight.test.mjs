import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { withBrowserPreflight, BrowserPreflightError, classifyReaderFacts, comparePageBaseline, bootstrapReader, PROFILES } from '../scripts/browser-preflight.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, '.tmp/browser-preflight-tests', `${process.pid}-${randomUUID()}`);

after(async () => { await fs.rm(BASE, { recursive: true, force: true }); });

const EH_URL = 'https://exhentai.org/s/fixture/1-1';
const NH_URL = 'https://nhentai.net/g/631366/1/';
const ORIGIN = 'http://127.0.0.1:5173';
const ENTRY = `${ORIGIN}/src/main.ts`;
const DEEP = `${ORIGIN}/core/components/widget/CircleIconButton.vue`;
const STYLE = `${DEEP}?vue&type=style&index=0&scoped=655c7388&lang.scss`;
const LAZY = `${ORIGIN}/core/components/Lazy.vue?t=123`;
const EH_SCRIPT_URLS = [
  ['anonymous', ''],
  ['static userscript URL', 'userscript://eHunter.user.js'],
  ['arbitrary URL', 'https://cdn.example/reader-old.js'],
];
const BUNDLE = '// ==UserScript==\n// @name eHunter\n// @version 3.1.0\n// @grant GM_getValue\n// @grant GM_setValue\n// @connect hath.network\n// ==/UserScript==\n(()=>{document.querySelector("#ehunter-app");globalThis.title="中文😀A"})()';
const LOADER = '// ==UserScript==\n// @name eHunter (dev loader)\n// @grant GM_setValue\n// @grant GM_getValue\n// @grant GM_getValue\n// @connect hath.network\n// @connect localhost\n// @connect 127.0.0.1\n// ==/UserScript==\n';
const event = (method, params) => ({ method, params, sessionId: 'fixture-session' });
const log = (text, id = 2, type = 'log') => event('Runtime.consoleAPICalled', { type, executionContextId: id, args: [{ type: 'string', value: text }] });

// Models documented Ego Page methods and actual CDP wire shapes. No helper-only
// test protocol, browser service, product storage or installed extension changes.
class PageFixture {
  label = 'p1'; spaceId = 42;
  frame = { id: 'frame-main', loaderId: 'old', url: EH_URL };
  queue = [];
  sources = new Map();
  parsed = [];
  executed = new Map();
  calls = [];
  screenshotCount = 0;
  eventsCalls = 0; activeEvents = 0; maxEventsConcurrency = 0;
  navigations = 0;
  openCount = 0;
  state = { url: EH_URL, readyState: 'complete', width: 1200, height: 900, dpr: 1, touchPoints: 0, coarse: false,
    meta: [], mounted: false, open: false, overlay: false, resources: { stylesheets: [], images: [] } };
  async cdp(method, params = {}) {
    this.calls.push({ method, params: structuredClone(params) });
    await this.onCommand?.(method, params);
    switch (method) {
      case 'Page.getFrameTree': return { frameTree: { frame: structuredClone(this.frame) } };
      case 'Page.getLayoutMetrics': return { cssLayoutViewport: { clientWidth: this.state.width, clientHeight: this.state.height } };
      case 'Debugger.getScriptSource': return { scriptSource: this.sources.get(params.scriptId) };
      case 'Profiler.takePreciseCoverage': {
        const result = this.parsed.map(s => ({ scriptId: s.scriptId, url: s.url, functions: [{ functionName: '', isBlockCoverage: true,
          ranges: [{ startOffset: this.rangeStart ?? 0, endOffset: this.rangeEnd ?? this.sources.get(s.scriptId).length, count: this.executed.get(s.scriptId) ?? 0 }] }] }));
        this.executed.clear();
        return { result, timestamp: 20 };
      }
      case 'Network.getResponseBody': return { body: 'body { color: red }', base64Encoded: false };
      default: return {};
    }
  }
  addScript(id, url, text, { contextId = 2, count = 1 } = {}) {
    this.sources.set(id, text);
    const parsed = { scriptId: id, url, executionContextId: contextId, length: text.length };
    this.parsed.push(parsed);
    this.executed.set(id, count);
    this.queue.push(event('Debugger.scriptParsed', parsed));
  }
  async goto() {
    this.navigations++;
    this.frame = { id: 'frame-main', loaderId: `new-${this.navigations}`, url: this.state.url };
    this.parsed = [];
    this.queue.push(event('Runtime.executionContextsCleared', {}), event('Page.frameNavigated', { frame: this.frame }),
      event('Runtime.executionContextCreated', { context: { id: 2, uniqueId: `unique-${this.navigations}`, origin: this.state.url, auxData: { frameId: 'frame-main', isDefault: true } } }));
    await this.onNavigate?.();
    return { url: this.state.url };
  }
  async events() {
    this.eventsCalls++;
    this.activeEvents++;
    this.maxEventsConcurrency = Math.max(this.maxEventsConcurrency, this.activeEvents);
    try {
      if (this.failDrain) throw new Error('fixture CDP drain unavailable');
      const batch = this.queue.splice(0);
      await this.onDrain?.(batch);
      return batch;
    } finally {
      this.activeEvents--;
    }
  }
  async evaluate() { return structuredClone(this.state); }
  async open() {
    this.openCount++;
    Object.assign(this.state, { mounted: true, open: true });
    if (this.state.dpr === 3) Object.assign(this.state, { width: 390, height: 844, meta: ['<meta name="viewport" content="width=device-width, initial-scale=1">'] });
    await this.onOpen?.();
  }
  async close() {
    Object.assign(this.state, { open: false, meta: [] });
    if (this.state.dpr === 3) Object.assign(this.state, { width: 980, height: 2121 });
  }
  async screenshot({ path: file }) {
    this.screenshotCount++;
    await fs.writeFile(file, 'fixture PNG bytes');
    return { path: file };
  }
}

async function fixture(t, { kind = 'eh', mobile = false } = {}) {
  await fs.mkdir(BASE, { recursive: true });
  const dir = await fs.mkdtemp(path.join(BASE, 'case-'));
  const evidence = path.join(dir, 'prerequisites.json');
  await fs.writeFile(evidence, JSON.stringify({ note: 'Controlled fixture; no runtime browser claim.' }));
  const scenario = path.join(dir, 'scenario.json');
  await fs.writeFile(scenario, JSON.stringify({ scenario: 'fixture', kind, mobile }));
  const page = new PageFixture();
  if (mobile) Object.assign(page.state, { width: 980, height: 2121, dpr: 3, touchPoints: 5, coarse: true });
  const source = kind === 'eh' || kind === 'nh' ? {
    kind, bundlePath: path.join(dir, 'bundle.js'), loaderPath: path.join(dir, 'loader.js'), bundleUrl: 'http://127.0.0.1:8787/ehunter.iife.js',
    build: { exitCode: 0, evidence }, installation: kind === 'nh'
      ? { dynamicLoaderEnabled: true, staticScriptDisabled: true, evidence }
      : { loggedIn: true, dynamicLoaderEnabled: true, staticScriptDisabled: true, evidence },
  } : {
    kind, origin: ORIGIN, service: { origin: ORIGIN, cwd: ROOT, pid: process.pid, evidence }, requiredModules: [ENTRY, DEEP, STYLE],
  };
  const expectedModules = new Map([[ENTRY, 'import "./reader";'], [DEEP, 'export default {render(){}};'], [STYLE, 'updateStyle("id", ".button {color:red}");'], [LAZY, 'export const lazy = true;']]);
  if (kind === 'eh' || kind === 'nh') {
    await fs.writeFile(source.bundlePath, BUNDLE); await fs.writeFile(source.loaderPath, LOADER);
    if (kind === 'nh') page.frame.url = page.state.url = NH_URL;
    page.onNavigate = () => page.addScript('bundle', '', BUNDLE);
  } else {
    page.state.url = ORIGIN + '/';
    page.onNavigate = () => {
      for (const [id, url] of [['entry', ENTRY], ['deep', DEEP], ['style', STYLE]]) page.addScript(id, url, expectedModules.get(url));
      page.addScript('vendor', `${ORIGIN}/node_modules/.vite/deps/vue.js?v=123`, 'export const Vue = {};');
    };
    t.mock.method(globalThis, 'fetch', async url => new Response(expectedModules.get(url) ?? 'missing', { status: expectedModules.has(url) ? 200 : 404 }));
  }
  const diagnostics = [];
  t.mock.method(console, 'error', text => diagnostics.push(JSON.parse(text)));
  const options = { page, artifactDir: path.join(dir, 'evidence'), profile: mobile ? 'mobile' : 'desktop', source,
    scenarioInputs: [path.relative(ROOT, scenario)],
    navigate: () => page.goto(), prepareReader: () => page.open(), timeoutMs: 250 };
  const run = (checks = async () => {}) => withBrowserPreflight(options, checks);
  const read = async file => JSON.parse(await fs.readFile(path.join(options.artifactDir, file), 'utf8'));
  const batches = async () => (await fs.readFile(path.join(options.artifactDir, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  return { dir, page, options, source, expectedModules, diagnostics, run, read, batches };
}
async function blocked(f, pattern, checks) {
  let entered = false;
  const error = await f.run(async api => { entered = true; await checks?.(api); }).then(() => assert.fail('must reject'), e => e);
  assert.ok(error instanceof BrowserPreflightError);
  assert.equal(error.exitCode, 1);
  assert.equal(error.result.observed, 'blocked');
  assert.match(JSON.stringify(error.result.errors), pattern);
  if (!checks) { assert.equal(entered, false); assert.equal(error.result.checks, 'unrun'); }
  assert.equal(f.diagnostics.at(-1).browserPreflight, 'blocked');
  return error;
}

for (const mobile of [false, true]) test(`EH ${mobile ? 'mobile' : 'desktop'} exact UTF-8 source, execution and normal viewport lifecycle`, async t => {
  const f = await fixture(t, { mobile });
  let entered = 0;
  const result = await f.run(async api => {
    entered++;
    await api.phase('mode-switch', () => f.page.queue.push(log('mode changed')));
    await api.screenshot('reader.png');
    await api.closeReader(() => f.page.close());
    await api.openReader();
    await api.checkpoint('reopened');
  });
  assert.equal(entered, 1);
  assert.equal(result.observed, 'passed');
  assert.equal(result.identity[0].topLevel.ranges[0].endOffset, BUNDLE.length);
  assert.notEqual(result.identity[0].actual.bytes, BUNDLE.length);
  assert.equal(result.viewportRestoration.verified, true);
  assert.equal(result.screenshots[0].scale, 'css');
  assert.equal(result.screenshots[0].visualReview, 'unrun');
  assert.equal(f.page.openCount, 2);
  const actual = result.environments.find(e => e.phase === 'prepare-reader:opened').actual;
  assert.equal(actual.width, mobile ? 390 : 1200);
  assert.equal(actual.dpr, mobile ? 3 : 1);
  const command = f.page.calls.find(c => c.method === 'Emulation.setDeviceMetricsOverride');
  assert.equal(command.params.mobile, mobile);
  assert.equal((await f.read('result.json')).observed, 'passed');
  const batches = await f.batches();
  assert.ok(batches.some(b => b.phase === 'before-navigation-old-document'));
  assert.ok(batches.some(b => b.phase === 'finally-after-disable'));
  assert.ok(batches.flatMap(b => b.events).some(e => e.params.args?.[0]?.value === 'mode changed'));
  assert.deepEqual(batches.map(b => b.sequence), batches.map((_, i) => i));
});

test('same version and same length different bundle is blocked before UI or checks', async t => {
  const f = await fixture(t);
  const old = BUNDLE.replace('中文😀A', '中文😀B');
  assert.equal(old.length, BUNDLE.length);
  f.page.onNavigate = () => f.page.addScript('bundle', '', old);
  const error = await blocked(f, /Exact source/);
  assert.equal(error.result.identity[0].exact, false);
  assert.notEqual(error.result.identity[0].actual.sha256, error.result.identity[0].expected.sha256);
  assert.equal(f.page.openCount, 0);
});

test('mismatched source reports where the two texts diverge', async t => {
  const f = await fixture(t);
  const old = BUNDLE.replace('中文😀A', '中文😀B');
  f.page.onNavigate = () => f.page.addScript('bundle', '', old);
  const error = await blocked(f, /Exact source/);
  const { difference } = error.result.identity[0];
  assert.equal(difference.lengthDelta, 0);
  assert.equal(difference.offset, BUNDLE.indexOf('中文😀A') + '中文😀'.length);
  assert.match(difference.expectedLine, /中文😀A/);
  assert.match(difference.actualLine, /中文😀B/);
  assert.ok(difference.line >= 1);
});

for (const [name, second] of [
  ['current and same-length stale EH bundles coexist', BUNDLE.replace('中文😀A', '中文😀B')],
  ['duplicate current EH bundles coexist', BUNDLE],
  ['current and different-length stale EH bundles coexist', `${BUNDLE}\n// stale production bundle`],
]) test(`EH rejects ${name}`, async t => {
  const f = await fixture(t);
  f.page.onNavigate = () => {
    f.page.addScript('bundle-current', '', BUNDLE);
    f.page.addScript('bundle-second', '', second);
  };
  const error = await blocked(f, /Exactly one current production bundle/);
  const candidates = error.result.identity.filter(row => row.fullBundleCandidate);
  assert.equal(candidates.length, 2);
  assert.equal(candidates.every(row => row.topLevel?.ranges?.[0]?.count > 0), true);
  assert.equal(f.page.openCount, 0);
});

for (const [label, url] of EH_SCRIPT_URLS) {
  for (const coexist of [false, true]) test(`different-length stale EH bundle (${label}, current=${coexist}) blocks preparation`, async t => {
    const f = await fixture(t);
    const stale = `${BUNDLE}\n// older production build`;
    f.page.onNavigate = () => {
      if (coexist) f.page.addScript('current', '', BUNDLE);
      f.page.addScript('stale', url, stale);
    };
    const error = await blocked(f, coexist ? /Exactly one current production bundle/ : /Exact source/);
    const row = error.result.identity.find(item => item.scriptId === 'stale');
    assert.equal(row.fullBundleCandidate, true);
    assert.equal(row.exact, false);
    assert.notEqual(row.actual.length, row.expected.length);
    assert.equal(await fs.readFile(path.join(f.options.artifactDir, `source-${row.actual.sha256}.js`), 'utf8'), stale);
    assert.equal(f.page.openCount, 0);
    assert.equal(f.page.screenshotCount, 0);
  });
}

test('stale production body with loader marker is still a second production candidate', async t => {
  const f = await fixture(t);
  f.page.onNavigate = () => {
    f.page.addScript('current', '', BUNDLE);
    f.page.addScript('stale', 'https://cdn.example/other.js', `${BUNDLE}\nconst EHUNTER_BUNDLE_URL = "old";`);
  };
  const error = await blocked(f, /Exactly one current production bundle/);
  assert.equal(error.result.identity.filter(row => row.fullBundleCandidate).length, 2);
  assert.equal(f.page.openCount, 0);
});

test('production body marker and named loader wrapper are classified from real metadata names', async t => {
  const f = await fixture(t);
  const production = `${BUNDLE}\nconst loaderMarker = "EHUNTER_BUNDLE_URL";`;
  await fs.writeFile(f.source.bundlePath, production);
  f.page.onNavigate = () => {
    f.page.addScript('bundle', 'https://cdn.example/any.js', production);
    f.page.addScript('loader', 'https://host.example/userscript.js', `${LOADER}\nconst EHUNTER_BUNDLE_URL = "http://127.0.0.1:8787/ehunter.iife.js";`);
    f.page.addScript('host', 'https://host.example/host.js', 'window.hostReady = true;');
  };
  const result = await f.run();
  assert.equal(result.observed, 'passed');
  assert.equal(result.identity.find(row => row.scriptId === 'bundle').fullBundleCandidate, true);
  assert.equal(result.identity.find(row => row.scriptId === 'loader').fullBundleCandidate, false);
  assert.equal(result.identity.find(row => row.scriptId === 'host').fullBundleCandidate, false);
});

test('a production name outside loader metadata does not turn its wrapper into a bundle', async t => {
  const f = await fixture(t);
  const wrapper = `(function () {\n// @name eHunter\n${LOADER}\nconst EHUNTER_BUNDLE_URL = "local";\n})();`;
  f.page.onNavigate = () => {
    f.page.addScript('bundle', '', BUNDLE);
    f.page.addScript('loader', 'userscript:loader', wrapper);
  };
  const result = await f.run();
  assert.equal(result.observed, 'passed');
  assert.equal(result.identity.find(row => row.scriptId === 'loader').fullBundleCandidate, false);
});

for (const [name, replacement] of [
  ['missing', ''], ['same as production', '// @name eHunter\n'],
]) test(`ambiguous loader metadata name (${name}) blocks before navigation`, async t => {
  const f = await fixture(t);
  await fs.writeFile(f.source.loaderPath, LOADER.replace('// @name eHunter (dev loader)\n', replacement));
  await blocked(f, /distinct.*metadata names/);
  assert.equal(f.page.navigations, 0);
});

for (const variant of ['parsed-only', 'inner-range-only', 'UTF8-offset']) test(`execution evidence rejects ${variant}`, async t => {
  const f = await fixture(t);
  if (variant === 'parsed-only') f.page.onNavigate = () => f.page.addScript('bundle', '', BUNDLE, { count: 0 });
  if (variant === 'inner-range-only') f.page.rangeStart = 10;
  if (variant === 'UTF8-offset') f.page.rangeEnd = Buffer.byteLength(BUNDLE);
  await blocked(f, /top-level execution/);
});

for (const variant of ['old-document', 'old-context', 'destroyed-context', 'no-commit']) test(`identity excludes ${variant}`, async t => {
  const f = await fixture(t);
  if (variant === 'old-document') {
    f.page.queue.push(event('Runtime.executionContextCreated', { context: { id: 1, auxData: { frameId: 'frame-main' } } }));
    f.page.addScript('old', '', BUNDLE, { contextId: 1 });
    f.page.onNavigate = () => {};
  }
  if (variant === 'old-context') f.page.onNavigate = () => f.page.addScript('old', '', BUNDLE, { contextId: 1 });
  if (variant === 'destroyed-context') f.page.onNavigate = () => {
    f.page.addScript('bundle', '', BUNDLE);
    f.page.queue.push(event('Runtime.executionContextDestroyed', { executionContextId: 2 }));
  };
  if (variant === 'no-commit') f.options.navigate = async () => { f.page.addScript('bundle', '', BUNDLE); };
  await blocked(f, /execution evidence|commit evidence|Exactly one current production bundle/);
});

test('historical error logs are saved but cannot poison the current document', async t => {
  const f = await fixture(t);
  f.page.queue.push(log('eHunter initialization failed: previous round', 1, 'error'));
  const result = await f.run();
  assert.equal(result.observed, 'passed');
  assert.equal(result.logs.length, 0);
  assert.match(JSON.stringify((await f.batches())[0]), /previous round/);
});

for (const [name, patch, pattern] of [
  ['CSS width', { width: 742 }, /CSS viewport/], ['CSS height', { height: 1606 }, /CSS viewport/],
  ['DPR', { dpr: 2 }, /DPR mismatch/], ['touch points', { touchPoints: 1 }, /Touch capability/],
  ['coarse', { coarse: false }, /Touch capability/],
]) test(`independent mobile ${name} failure blocks functional callback`, async t => {
  const f = await fixture(t, { mobile: true });
  f.page.onOpen = () => Object.assign(f.page.state, patch);
  await blocked(f, pattern);
  assert.equal(f.page.screenshotCount, 0);
});

for (const method of ['Emulation.setDeviceMetricsOverride', 'Emulation.setTouchEmulationEnabled', 'Debugger.enable', 'Profiler.startPreciseCoverage']) test(`rejected ${method} is a preparation blocker`, async t => {
  const f = await fixture(t, { mobile: true });
  f.page.onCommand = name => { if (name === method) throw new Error(`fixture command rejected: ${method}`); };
  await blocked(f, /fixture command rejected/);
  assert.equal(f.page.navigations, 0);
});

test('profile does not accept caller-supplied width/mobile targets', async t => {
  const f = await fixture(t);
  f.options.profile = { width: 742, mobile: false };
  await blocked(f, /profile must be desktop or mobile/);
  assert.equal(f.page.navigations, 0);
});

for (const variant of ['init-error', 'overlay', 'not-mounted']) test(`health condition ${variant} blocks before functionality`, async t => {
  const f = await fixture(t);
  if (variant === 'init-error') f.page.onOpen = () => f.page.queue.push(log('eHunter initialization failed: timeout', 2, 'error'));
  if (variant === 'overlay') f.page.state.overlay = true;
  if (variant === 'not-mounted') f.page.onOpen = () => { f.page.state.mounted = false; };
  await blocked(f, /initialization error|overlay|timed out|Unattributed runtime error/);
});

test('host errors are retained with attribution and review boundary', async t => {
  const f = await fixture(t);
  f.page.onOpen = () => {
    const hostError = log('ad provider unavailable', 2, 'error');
    hostError.params.stackTrace = { callFrames: [{ url: 'https://ads.example/loader.js', scriptId: 'ad' }] };
    f.page.queue.push(hostError);
  };
  const result = await f.run();
  assert.equal(result.logs[0].attribution, 'host-or-third-party');
  assert.equal(result.logs[0].impact, 'retained-for-caller-review');
});

for (const [name, url, shouldBlock] of [
  ['favicon network error', `${ORIGIN}/favicon.ico`, false],
  ['loaded project module error', DEEP, true],
]) test(`Vite logs attribute by loaded script identity: ${name}`, async t => {
  const f = await fixture(t, { kind: 'vite' });
  f.page.onOpen = () => f.page.queue.push(event('Log.entryAdded', { entry: {
    source: 'network', level: 'error', text: 'Failed to load resource: 404', url,
  } }));
  if (shouldBlock) {
    await blocked(f, /eHunter runtime\/initialization error/);
  } else {
    const result = await f.run();
    assert.equal(result.observed, 'passed');
    assert.equal(result.logs[0].attribution, 'host-or-third-party');
    assert.equal(result.logs[0].impact, 'retained-for-caller-review');
  }
});

test('screenshot rechecks the environment and skips capture on mismatch', async t => {
  const f = await fixture(t);
  await blocked(f, /CSS viewport/, async api => {
    f.page.state.width = 1199;
    await api.screenshot('must-not-exist.png');
  });
  assert.equal(f.page.screenshotCount, 0);
});

test('closing validates original meta without requiring original CSS width 390', async t => {
  const f = await fixture(t, { mobile: true });
  const result = await f.run(api => api.closeReader(() => f.page.close()));
  assert.equal(result.viewportRestoration.actual.width, 980);
  assert.equal(result.observed, 'passed');
});

test('wrong meta restoration is blocked', async t => {
  const f = await fixture(t, { mobile: true });
  await blocked(f, /meta was not restored/, api => api.closeReader(async () => {
    await f.page.close(); f.page.state.meta = ['<meta name="viewport" content="wrong">'];
  }));
});

test('auto-open does not invent an original-site baseline', async t => {
  const f = await fixture(t);
  f.page.state.open = true; f.page.state.mounted = true;
  await blocked(f, /baseline missing/, api => api.closeReader(() => f.page.close()));
});

test('reader actions after close require openReader preparation', async t => {
  const f = await fixture(t);
  let ran = false;
  await blocked(f, /must be prepared/, async api => {
    await api.closeReader(() => f.page.close());
    await api.phase('invalid-reader-action', () => { ran = true; });
  });
  assert.equal(ran, false);
});

for (const [name, text, pattern] of [
  ['missing grant', LOADER.replace('// @grant GM_setValue\n', ''), /GM_setValue/],
  ['same count wrong grant', LOADER.replace('GM_setValue', 'GM_deleteValue'), /extraGrants.*GM_deleteValue/],
  ['missing connect', LOADER.replace('// @connect hath.network\n', ''), /missingConnect.*hath.network/],
  ['missing host', LOADER.replace('// @connect 127.0.0.1\n', ''), /localHostCovered.*false/],
  ['missing metadata', 'console.log("loader")', /metadata missing/],
]) test(`permissions compare names: ${name}`, async t => {
  const f = await fixture(t);
  await fs.writeFile(f.source.loaderPath, text);
  await blocked(f, pattern);
  assert.equal(f.page.navigations, 0);
});

test('correct repository permissions cannot establish browser installation prerequisites', async t => {
  const f = await fixture(t);
  delete f.source.installation.dynamicLoaderEnabled;
  const error = await blocked(f, /prerequisites unconfirmed/);
  assert.equal(error.result.permissions.verified, true);
  assert.equal(f.page.navigations, 0);
});

test('navigation timeout retains prior logs and finally, without running preparation UI', async t => {
  const f = await fixture(t);
  f.options.navigate = async () => {
    await f.page.goto();
    f.page.queue.push(log('navigation started'));
    await new Promise(() => {});
  };
  await blocked(f, /navigation timed out/);
  const batches = await f.batches();
  assert.match(JSON.stringify(batches), /navigation started/);
  assert.ok(batches.some(b => b.phase === 'finally'));
  assert.equal(f.page.openCount, 0);
});

test('initial manifest failure stops before browser commands', async t => {
  const f = await fixture(t);
  await fs.mkdir(f.options.artifactDir);
  await blocked(f, /EEXIST/);
  assert.equal(f.page.calls.length, 0);
});

test('drain failure is blocked with saved earlier events', async t => {
  const f = await fixture(t);
  f.options.prepareReader = async () => { await f.page.open(); f.page.failDrain = true; };
  await blocked(f, /CDP drain unavailable/);
  assert.match(JSON.stringify(await f.batches()), /Debugger.scriptParsed/);
});

test('drained events survive write failure in diagnostics and are never analyzed to pass', async t => {
  const f = await fixture(t);
  f.options.navigate = async () => {
    const receipt = await f.page.goto();
    await fs.rename(path.join(f.options.artifactDir, 'events.jsonl'), path.join(f.dir, 'earlier-events.jsonl'));
    await fs.mkdir(path.join(f.options.artifactDir, 'events.jsonl'));
    return receipt;
  };
  const error = await blocked(f, /EISDIR/);
  assert.ok(error.result.unsaved.some(b => b.events.some(e => e.method === 'Debugger.scriptParsed')));
  assert.ok(f.diagnostics.at(-1).unsavedBatches.length);
  assert.equal(f.page.openCount, 0);
});

test('late event drain remains single-consumer and saves a batch returned after timeout', async t => {
  const f = await fixture(t);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  f.page.onDrain = async batch => {
    if (f.page.eventsCalls === 2) {
      batch.push(event('Debugger.scriptParsed', { scriptId: 'late-marker' }));
      await gate;
    }
  };
  const originalTimeout = f.options.timeoutMs;
  f.options.timeoutMs = 25;
  setTimeout(release, 60);
  const error = await blocked(f, /page\.events timed out/);
  assert.equal(error.result.eventCollection.maxConcurrent, 1);
  assert.equal(f.page.maxEventsConcurrency, 1);
  assert.match(JSON.stringify(await f.batches()), /late-marker/);
  assert.deepEqual(error.result.eventCollection.unresolved, []);
  f.options.timeoutMs = originalTimeout;
});

test('third-party error text and source URL containing ehunter stays external', async t => {
  for (const variant of ['text', 'source']) {
    const f = await fixture(t);
    f.page.onOpen = () => {
      const item = log(variant === 'text' ? 'ad failed: https://ads.example/ehunter' : 'remote unavailable', 2, 'error');
      item.params.stackTrace = { callFrames: [{ url: variant === 'source' ? 'https://ads.example/ehunter-ad.js' : 'https://ads.example/script.js', scriptId: 'ad-provider' }] };
      f.page.queue.push(item);
    };
    const result = await f.run();
    assert.equal(result.observed, 'passed');
    assert.equal(result.logs[0].attribution, 'host-or-third-party');
    assert.equal(result.logs[0].impact, 'retained-for-caller-review');
  }
});

test('result persistence failure cannot return passed', async t => {
  const f = await fixture(t);
  const error = await blocked(f, /EISDIR/, async () => {
    await fs.mkdir(path.join(f.options.artifactDir, 'result.json'));
  });
  assert.equal(error.result.observed, 'blocked');
  assert.equal((await f.read('manifest.json')).state, 'incomplete');
});

test('explicit product assertion is failed; plain callback exceptions are blocked', async t => {
  for (const explicit of [true, false]) await t.test(String(explicit), async t => {
    const f = await fixture(t);
    const error = await f.run(api => api.phase('product-check', () => {
      if (explicit) api.assert(false, 'current page assertion failed', { expected: 2, actual: 1 });
      throw new Error('transport disconnected');
    })).catch(e => e);
    assert.ok(error instanceof BrowserPreflightError);
    assert.equal(error.result.phases.find(p => p.name === 'product-check').observed, explicit ? 'failed' : 'blocked');
    assert.equal(error.result.observed, explicit ? 'failed' : 'blocked');
    assert.equal(error.result.checks, explicit ? 'failed' : 'blocked');
    assert.equal((await f.read('result.json')).observed, error.result.observed);
  });
});

test('original product exception and finally errors are both preserved', async t => {
  const f = await fixture(t);
  const error = await blocked(f, /drain unavailable/, api => {
    f.page.failDrain = true;
    api.assert(false, 'original product failure');
  });
  assert.equal(error.cause.message, 'original product failure');
  assert.equal(error.result.checks, 'failed');
  assert.ok(error.result.errors.some(e => e.message === 'original product failure'));
  assert.ok(error.result.errors.some(e => e.message === 'fixture CDP drain unavailable'));
});

test('catching a failed protected phase cannot allow later actions or a green result', async t => {
  const f = await fixture(t);
  let next = false;
  await blocked(f, /CSS viewport/, async api => {
    f.page.state.width = 1;
    await api.checkpoint().catch(() => {});
    f.page.state.width = 1200;
    await api.phase('later', () => { next = true; });
  });
  assert.equal(next, false);
});

test('bundle mutation after checks invalidates the evidence', async t => {
  const f = await fixture(t);
  await blocked(f, /Source inputs changed/, async () => {
    await fs.appendFile(f.source.bundlePath, '\n// new build');
  });
});

test('new navigation requires new-document execution evidence', async t => {
  const f = await fixture(t);
  await blocked(f, /execution evidence/, async api => {
    await api.phase('refresh', async () => {
      f.page.onNavigate = () => f.page.addScript('bundle', '', BUNDLE, { count: 0 });
      await f.page.goto();
    });
  });
});

test('new valid document is reidentified and prepared after navigation', async t => {
  const f = await fixture(t);
  const result = await f.run(api => api.phase('refresh', () => f.page.goto()));
  assert.equal(result.observed, 'passed');
  assert.equal(result.identity[0].loaderId, 'new-2');
});

test('Vite checks all current modules, query-exact style, third-party boundary and resource response', async t => {
  const f = await fixture(t, { kind: 'vite' });
  const navigate = f.page.onNavigate;
  f.page.onNavigate = () => {
    navigate();
    f.page.queue.push(event('Network.responseReceived', { requestId: 'css', loaderId: 'new-1', type: 'Stylesheet', response: { url: `${ORIGIN}/independent.css`, status: 200 } }),
      event('Network.loadingFinished', { requestId: 'css' }));
  };
  const result = await f.run();
  assert.equal(result.identity.length, 3);
  assert.equal(result.identity.find(i => i.scriptId === 'style').url, STYLE);
  assert.ok(result.inventory.thirdParty.some(i => i.scriptId === 'vendor'));
  assert.ok(result.inventory.notLoadedInputs.includes('core/store/app.ts'));
  assert.ok(result.inventory.lockfile.sha256);
  assert.ok(result.resources[0].body.sha256);
  assert.ok((await fs.stat(path.join(f.options.artifactDir, result.resources[0].file))).size > 0);
});

for (const variant of ['deep-mismatch', 'style-mismatch', 'style-missing', 'style-query-mismatch']) test(`Vite ${variant} cannot pass from entry identity`, async t => {
  const f = await fixture(t, { kind: 'vite' });
  f.page.onNavigate = () => {
    f.page.addScript('entry', ENTRY, f.expectedModules.get(ENTRY));
    f.page.addScript('deep', DEEP, variant === 'deep-mismatch' ? 'old deep module' : f.expectedModules.get(DEEP));
    if (variant !== 'style-missing') f.page.addScript('style', variant === 'style-query-mismatch' ? STYLE + '&t=old' : STYLE,
      variant === 'style-mismatch' ? 'old style module' : f.expectedModules.get(STYLE));
  };
  await blocked(f, /Exact source|Required Vite modules|fetch failed/);
});

test('Vite lazy module joins inventory only after its protected interaction', async t => {
  const f = await fixture(t, { kind: 'vite' });
  const result = await f.run(async api => {
    await api.phase('open-lazy', () => f.page.addScript('lazy', LAZY, f.expectedModules.get(LAZY)), { requiredModules: [LAZY] });
    await api.screenshot('lazy.png');
  });
  assert.ok(result.inventory.loaded.some(r => r.url === LAZY));
  assert.ok(result.inventory.requiredModules.includes(LAZY));
  assert.equal(result.identity.find(r => r.url === LAZY).verified, true);
});

test('missing lazy module blocks the next callback and screenshot', async t => {
  const f = await fixture(t, { kind: 'vite' });
  let next = false;
  await blocked(f, /Required Vite modules/, async api => {
    await api.phase('open-lazy', async () => {}, { requiredModules: [LAZY] });
    await api.phase('later', () => { next = true; });
  });
  assert.equal(next, false);
});

test('Vite input fingerprint includes caller-declared scene inputs and detects mutation', async t => {
  const f = await fixture(t, { kind: 'vite' });
  const input = path.join(f.dir, 'scene-input.txt');
  await fs.writeFile(input, 'before');
  f.source.inputs = [path.relative(ROOT, input)];
  await blocked(f, /Source inputs changed/, async api => {
    await api.phase('edit-input', () => fs.writeFile(input, 'after'));
  });
});

test('Vite HMR invalidates current evidence even if source hashes would still match', async t => {
  const f = await fixture(t, { kind: 'vite' });
  await blocked(f, /HMR invalidated/, async api => {
    await api.phase('hmr', () => f.page.queue.push(event('Network.webSocketFrameReceived', { requestId: 'socket', response: { payloadData: JSON.stringify({ type: 'update', updates: [] }) } })));
  });
});

test('Vite refuses absent service attribution', async t => {
  const f = await fixture(t, { kind: 'vite' });
  delete f.source.service;
  await blocked(f, /Attributed Vite service record/);
  assert.equal(f.page.navigations, 0);
});

test('late eval after document load waits for current script and execution', async t => {
  const f = await fixture(t);
  f.page.onNavigate = () => {
    setTimeout(() => f.page.addScript('bundle', '', BUNDLE, { count: 0 }), 10);
    setTimeout(() => f.page.executed.set('bundle', 1), 120);
  };
  const result = await f.run();
  assert.equal(result.observed, 'passed');
  assert.equal(result.identity[0].topLevel.ranges[0].count, 1);
});

test('helper evaluate scripts do not cause an unstable project module inventory', async t => {
  const f = await fixture(t, { kind: 'vite' });
  let evaluations = 0;
  f.page.evaluate = async () => {
    f.page.addScript(`evaluate-${evaluations++}`, '', '() => document.title');
    return structuredClone(f.page.state);
  };
  assert.equal((await f.run()).observed, 'passed');
});

test('a deep module arriving during environment observation is checked before a screenshot', async t => {
  const f = await fixture(t, { kind: 'vite' });
  await blocked(f, /Exact source/, async api => {
    const original = f.page.evaluate.bind(f.page);
    f.page.evaluate = async () => {
      f.page.evaluate = original;
      f.page.addScript('late', LAZY, 'old lazy code');
      return original();
    };
    await api.screenshot('blocked-lazy.png');
  });
  assert.equal(f.page.screenshotCount, 0);
});

test('severe logs without source attribution block instead of being assumed to be host errors', async t => {
  const f = await fixture(t);
  f.page.onOpen = () => f.page.queue.push(log('unknown exception', 2, 'error'));
  await blocked(f, /Unattributed runtime error/);
});

test('an uncaught current bundle error is attributed by scriptId without relying on message text', async t => {
  const f = await fixture(t);
  f.page.onOpen = () => f.page.queue.push(event('Runtime.exceptionThrown', { exceptionDetails: {
    executionContextId: 2, text: 'ReferenceError', stackTrace: { callFrames: [{ scriptId: 'bundle', url: '' }] },
  } }));
  await blocked(f, /eHunter runtime/);
});

test('a missing mobile command success receipt cannot pass from CSS and touch signals', async t => {
  const f = await fixture(t, { mobile: true });
  const cdp = f.page.cdp.bind(f.page);
  f.page.cdp = (method, params) => method === 'Emulation.setDeviceMetricsOverride' ? Promise.resolve(undefined) : cdp(method, params);
  await blocked(f, /Emulation command receipt mismatch/);
  assert.equal(f.page.openCount, 0);
});

test('a failing round persists full command receipts and no summary', async t => {
  const f = await fixture(t);
  f.page.onOpen = () => { throw new Error('fixture product failure'); };
  const error = await f.run().then(() => assert.fail('must reject'), e => e);
  assert.ok(error instanceof BrowserPreflightError);
  assert.ok(error.result.errors.length > 0);
  const raw = await fs.readFile(path.join(f.options.artifactDir, 'commands.jsonl'), 'utf8');
  const receipts = raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.ok(receipts.length > 0);

  assert.ok(receipts.every(row => typeof row.method === 'string' && row.runId && row.roundId));
  assert.ok(!(await fs.readdir(f.options.artifactDir)).includes('commands.json'));
});

test('a passing round writes a command summary instead of full receipts', async t => {
  const f = await fixture(t);
  assert.equal((await f.run()).observed, 'passed');
  assert.ok(!(await fs.readdir(f.options.artifactDir)).includes('commands.jsonl'));
  const summary = JSON.parse(await fs.readFile(path.join(f.options.artifactDir, 'commands.json'), 'utf8'));
  assert.ok(summary.receiptCount > 0);
  assert.equal(summary.failedReceiptCount, 0);
  assert.equal(summary.byMethod.reduce((total, entry) => total + entry.count, 0), summary.receiptCount);
});

test('a command summary write error still blocks an otherwise passing round', async t => {
  const f = await fixture(t);
  await fs.mkdir(f.options.artifactDir, { recursive: true });
  await fs.mkdir(path.join(f.options.artifactDir, 'commands.json'));
  const error = await f.run().then(() => assert.fail('must reject'), e => e);
  assert.ok(error instanceof BrowserPreflightError);
  assert.equal(error.result.observed, 'blocked');
  assert.ok(error.result.errors.some(e => e.code === 'EISDIR' || e.code === 'EEXIST'));
});

test('suite timeout aborts the callback signal and prevents subsequent protected actions', async t => {
  const f = await fixture(t);
  f.options.checksTimeoutMs = 30;
  let context;
  await blocked(f, /functional-checks timed out/, async api => {
    context = api;
    await new Promise(() => {});
  });
  assert.equal(context.signal.aborted, true);
  let called = false;
  await assert.rejects(context.phase('late', () => { called = true; }));
  assert.equal(called, false);
});

for (const [label, url] of EH_SCRIPT_URLS) test(`late stale EH bundle during observation (${label}) blocks screenshot and next action`, async t => {
  const f = await fixture(t);
  let next = false;
  const error = await blocked(f, /Exactly one current production bundle/, async api => {
    const evaluate = f.page.evaluate.bind(f.page);
    f.page.evaluate = async () => {
      f.page.evaluate = evaluate;
      f.page.addScript('late-stale', url, `${BUNDLE}\n// late stale build`);
      return evaluate();
    };
    await api.screenshot('must-not-capture.png');
    await api.phase('must-not-run', () => { next = true; });
  });
  assert.equal(next, false);
  assert.equal(f.page.screenshotCount, 0);
  assert.equal(error.result.identity.find(row => row.scriptId === 'late-stale').fullBundleCandidate, true);
});

test('EH observation scripts are all inspected and checkpoint converges without evaluating again', async t => {
  const f = await fixture(t);
  let evaluations = 0;
  f.page.evaluate = async () => {
    f.page.addScript(`observation-${evaluations++}`, '', '() => document.title');
    return structuredClone(f.page.state);
  };
  const result = await f.run(api => api.screenshot('reader.png'));
  assert.equal(result.observed, 'passed');
  assert.equal(f.page.screenshotCount, 1);
  assert.ok(evaluations > 0);
  assert.equal(result.identity.filter(row => row.scriptId.startsWith('observation-')).length, evaluations);
  assert.equal(result.identity.filter(row => row.fullBundleCandidate).length, 1);
});

test('late arbitrary-url host script during interaction is inspected before the checkpoint settles', async t => {
  const f = await fixture(t);
  let inspected = 0;
  f.page.onNavigate = () => f.page.addScript('bundle', '', BUNDLE);
  const originalCdp = f.page.cdp.bind(f.page);
  f.page.cdp = async (method, params) => {
    if (method === 'Debugger.getScriptSource' && params.scriptId === 'late-host') inspected++;
    return originalCdp(method, params);
  };
  const result = await f.run(async api => {
    await api.phase('late-host-interaction', () => {
      f.page.addScript('late-host', 'https://host.example/arbitrary.js', 'window.lateHost = true;');
    });
  });
  assert.equal(result.observed, 'passed');
  assert.ok(inspected >= 1);
  assert.equal(result.identity.find(row => row.scriptId === 'late-host').fullBundleCandidate, false);
});

test('late production script after coverage stops cannot reuse the prior identity', async t => {
  const f = await fixture(t);
  f.page.onCommand = method => {
    if (method === 'Profiler.stopPreciseCoverage') f.page.addScript('late-production', 'https://host.example/arbitrary.js', BUNDLE);
  };
  await blocked(f, /Exactly one current production bundle|execution evidence/, async () => {});
});

for (const [label, url] of EH_SCRIPT_URLS) test(`late stale EH bundle after coverage stops (${label}) invalidates final result`, async t => {
  const f = await fixture(t);
  f.page.onCommand = method => {
    if (method === 'Profiler.stopPreciseCoverage') f.page.addScript('late-stale', url, `${BUNDLE}\n// stale build`);
  };
  const error = await blocked(f, /Exactly one current production bundle/, async () => {});
  assert.equal(error.result.identity.find(row => row.scriptId === 'late-stale').fullBundleCandidate, true);
  assert.equal(error.result.identity.find(row => row.scriptId === 'late-stale').topLevel, undefined);
  assert.equal((await f.read('result.json')).observed, 'blocked');
});

test('late loader wrapper and host scripts after coverage stops are inspected without blocking', async t => {
  const f = await fixture(t);
  f.page.onCommand = method => {
    if (method === 'Profiler.stopPreciseCoverage') {
      f.page.addScript('late-loader', 'userscript:loader', `(function () {\n${LOADER}\n})();`);
      f.page.addScript('late-host', 'https://host.example/script.js', 'window.adReady = true;');
    }
  };
  const result = await f.run();
  assert.equal(result.observed, 'passed');
  for (const id of ['late-loader', 'late-host']) {
    const row = result.identity.find(item => item.scriptId === id);
    assert.equal(row.fullBundleCandidate, false);
    assert.equal(row.verified, false);
    assert.ok(row.actual.sha256);
  }
  const stop = f.page.calls.findIndex(call => call.method === 'Profiler.stopPreciseCoverage');
  assert.equal(f.page.calls.slice(stop + 1).some(call => call.method === 'Profiler.takePreciseCoverage'), false);
});

test('final events still block a green result after the last functional checkpoint', async t => {
  const f = await fixture(t);
  f.page.onCommand = method => {
    if (method === 'Profiler.stopPreciseCoverage') {
      const late = log('eHunter late failure', 2, 'error');
      late.params.stackTrace = { callFrames: [{ url: '', scriptId: 'bundle' }] };
      f.page.queue.push(late);
    }
  };
  await blocked(f, /eHunter runtime/, async () => {});
  assert.equal((await f.read('result.json')).observed, 'blocked');
});

for (const mobile of [false, true]) test(`NH ${mobile ? 'mobile' : 'desktop'} userscript flow without login prerequisite`, async t => {
  const f = await fixture(t, { kind: 'nh', mobile });
  const result = await f.run(async api => {
    await api.phase('book-page', () => f.page.queue.push(log('turn page')));
    await api.screenshot('nh-reader.png');
  });
  assert.equal(result.observed, 'passed');
  assert.equal(result.checks, 'executed');
  assert.equal(result.identity.length, 1);
  assert.equal(result.identity[0].fullBundleCandidate, true);
  assert.equal(result.identity[0].verified, true);
  assert.equal(result.installation.loggedIn, undefined);
  assert.equal(result.installation.dynamicLoaderEnabled, true);
  assert.equal(f.options.source.installation.loggedIn, undefined);
});

test('NH wrong page URL blocks at the reader-page prerequisite', async t => {
  const f = await fixture(t, { kind: 'nh' });
  f.page.frame.url = f.page.state.url = 'https://nhentai.net/';
  await blocked(f, /NH \/g\/<id>\/<page>\/ page prerequisite missing/);
});

test('NH source kind passes entry validation while invalid kinds block', async t => {
  const f = await fixture(t, { kind: 'nh' });
  f.options.source = { kind: 'other' };
  await blocked(f, /source\.kind must be eh, nh or vite/);
});

for (const [label, error] of [['timeout', 'request timed out'], ['429', 'https://nhentai.net/g/631366/1/: 429']]) test(`retryable TextReq ${label} error does not block current document`, async t => {
  const f = await fixture(t, { kind: 'nh' });
  const retryable = log(`TextReq: request error in ${NH_URL}, retry:(1/3), error: ${error}`, 2, 'error');
  retryable.params.stackTrace = { callFrames: [{ url: '', scriptId: 'bundle' }] };
  f.page.onOpen = () => f.page.queue.push(retryable);
  const result = await f.run(async () => {});
  assert.equal(result.observed, 'passed');
  assert.equal(result.logs.find(entry => entry.retryableTextReqError)?.impact, 'retained-for-caller-review');
  assert.equal(result.logs.find(entry => entry.retryableTextReqError)?.retryableTextReqError, true);
});

test('non-retryable TextReq errors still block the current document', async t => {
  const f = await fixture(t, { kind: 'nh' });
  const fatal = log(`TextReq: request error in ${NH_URL}, retry:(3/3), error: TypeError: failed`, 2, 'error');
  fatal.params.stackTrace = { callFrames: [{ url: '', scriptId: 'bundle' }] };
  f.page.onOpen = () => f.page.queue.push(fatal);
  await blocked(f, /eHunter runtime/);
});

const sha = value => createHash('sha256').update(value).digest('hex');

for (const kind of ['eh', 'vite']) test(`${kind} provenance records artifact association, source identity and scenario inputs`, async t => {
  const f = await fixture(t, { kind });
  f.options.taskSpace = '10-17-browser-artifact-verification';
  const result = await f.run();
  const manifest = await f.read('manifest.json');
  const source = await f.read('source.json');
  const scenario = JSON.parse(await fs.readFile(path.resolve(ROOT, f.options.scenarioInputs[0]), 'utf8'));
  assert.equal(manifest.artifactVersion, 1);
  assert.equal(manifest.state, 'incomplete');
  assert.equal(manifest.provenance.url, null);
  assert.deepEqual(manifest.provenance.page, result.page);
  assert.equal(manifest.provenance.scenarioInputsSha256, result.provenance.scenarioInputsSha256);
  assert.equal(result.artifactVersion, 1);
  assert.equal(result.provenance.runId, result.runId);
  assert.equal(result.provenance.roundId, result.roundId);
  assert.equal(manifest.provenance.runId, result.runId);
  assert.equal(manifest.provenance.roundId, result.roundId);
  assert.equal(manifest.provenance.artifactDir, f.options.artifactDir);
  assert.equal(result.provenance.artifactDir, f.options.artifactDir);
  assert.equal(result.provenance.result, 'result.json');
  assert.equal(result.provenance.sourceKind, kind);
  assert.equal(result.provenance.profile, f.options.profile);
  assert.equal(result.provenance.taskSpace, '10-17-browser-artifact-verification');
  assert.equal(result.provenance.scenarioInputs.length, 1);
  assert.deepEqual(result.provenance.scenarioInputs[0].path, f.options.scenarioInputs[0]);
  assert.equal(result.provenance.scenarioInputs[0].sha256, sha(JSON.stringify(scenario)));
  assert.equal(result.provenance.scenarioInputsSha256, sha(JSON.stringify(result.provenance.scenarioInputs)));
  assert.equal(source.artifactVersion, 1);
  if (kind === 'eh') {
    assert.equal(result.provenance.url, EH_URL);
    assert.deepEqual(result.provenance.viewport, { width: 1200, height: 900, dpr: 1, mobile: false, touchPoints: 0, coarse: false });
    assert.equal(result.provenance.source.bundle.sha256, sha(BUNDLE));
    assert.equal(result.provenance.source.loader.sha256, sha(LOADER));
    assert.equal(result.provenance.source.bundle.sha256, source.initialFingerprint.bundle.sha256);
  } else {
    assert.equal(result.provenance.url, `${ORIGIN}/`);
    assert.equal(result.provenance.source.fingerprint, source.initialFingerprint.sha256);
    assert.deepEqual(result.provenance.source.files, source.initialFingerprint.files);
    assert.ok(result.provenance.source.files.some(file => file.path === 'src/main.ts'));
  }
});

test('scenarioInputs is required, repository-relative and must exist', async t => {
  const f = await fixture(t);
  const scenario = path.resolve(ROOT, f.options.scenarioInputs[0]);
  const link = path.join(path.dirname(scenario), 'scenario-link.json');
  await fs.symlink(scenario, link);
  for (const [label, value, pattern] of [
    ['missing', undefined, /scenarioInputs must declare at least one repository-relative input/],
    ['empty', [], /scenarioInputs must declare at least one repository-relative input/],
    ['absolute', [path.resolve(ROOT, 'package.json')], /scenarioInputs entries must be repository-relative paths/],
    ['escape', ['../outside.json'], /Scenario input escapes repository/],
    ['absent', ['.tmp/browser-preflight/absent-scenario.json'], /ENOENT/],
    ['directory', [path.relative(ROOT, path.dirname(scenario))], /Scenario input must be a regular repository file/],
    ['symlink', [path.relative(ROOT, link)], /Scenario input must be a regular repository file/],
    ['duplicate', [f.options.scenarioInputs[0], `./${f.options.scenarioInputs[0]}`], /scenarioInputs must not repeat a path/],
  ]) await t.test(label, async () => {
    f.options.scenarioInputs = value;
    await blocked(f, pattern);
  });
});

test('scenario input mutation invalidates the round', async t => {
  const f = await fixture(t);
  const input = path.resolve(ROOT, f.options.scenarioInputs[0]);
  await blocked(f, /Scenario inputs changed during this round/, async () => {
    await fs.writeFile(input, JSON.stringify({ scenario: 'mutated' }));
  });
});

test('a real artifact passes verify-browser and turns stale after a rebuild', async t => {
  const f = await fixture(t);
  const verify = () => {
    const run = spawnSync('python3', ['scripts/acceptance.py', 'verify-browser', f.options.artifactDir], { cwd: ROOT, encoding: 'utf8' });
    return { code: run.status, report: JSON.parse(run.stdout), stderr: run.stderr };
  };
  await f.run();
  const fresh = verify();
  assert.equal(fresh.stderr, '');
  assert.equal(fresh.code, 0);
  assert.equal(fresh.report.valid, true);
  assert.equal(fresh.report.status, 'passed');
  assert.deepEqual(fresh.report.errors, []);
  assert.equal(fresh.report.artifact.sourceKind, 'eh');
  assert.equal(fresh.report.artifact.observed, 'passed');
  assert.equal(fresh.report.artifact.artifactDir, path.relative(ROOT, f.options.artifactDir));
  await fs.writeFile(f.source.bundlePath, `${BUNDLE}\n// rebuilt`);
  const stale = verify();
  assert.equal(stale.code, 1);
  assert.equal(stale.report.status, 'stale');
  assert.match(stale.report.errors.join(' '), /bundle source changed since this round/);
});

test('a real Vite artifact passes verify-browser and turns stale after an input change', async t => {
  const f = await fixture(t, { kind: 'vite' });
  const input = path.join(f.dir, 'vite-input.json');
  await fs.writeFile(input, JSON.stringify({ scene: 'reader' }));
  f.source.inputs = [path.relative(ROOT, input)];
  const verify = () => {
    const run = spawnSync('python3', ['scripts/acceptance.py', 'verify-browser', f.options.artifactDir], { cwd: ROOT, encoding: 'utf8' });
    return { code: run.status, report: JSON.parse(run.stdout), stderr: run.stderr };
  };
  await f.run();
  const fresh = verify();
  assert.equal(fresh.stderr, '');
  assert.equal(fresh.code, 0);
  assert.equal(fresh.report.valid, true);
  assert.equal(fresh.report.status, 'passed');
  assert.deepEqual(fresh.report.errors, []);
  assert.equal(fresh.report.artifact.sourceKind, 'vite');
  await fs.writeFile(input, JSON.stringify({ scene: 'reader', rebuilt: true }));
  const stale = verify();
  assert.equal(stale.code, 1);
  assert.equal(stale.report.status, 'stale');
  assert.match(stale.report.errors.join(' '), /source input changed since this round/);
});

const VIEWPORTS = Object.fromEntries(Object.entries(PROFILES).map(([name, profile]) => [name,
  { width: profile.width, height: profile.height, dpr: profile.dpr, touchPoints: profile.touchPoints, coarse: profile.coarse }]));
const SCROLL_HEIGHT = 9000;
const SCROLL_TOP = 4321;
const READER_URL = 'https://exhentai.org/g/123/0123456789/';
const uiBox = (patch = {}) => ({ found: true, display: 'block', visibility: 'visible', opacity: '1',
  rect: { x: 0, y: 0, width: 1200, height: 900 }, ...patch });

function readerState({ profile = 'desktop', mode = 'book', open = true, mounted = true, progress = '12 / 300',
  scrollTop = 0, spreadCount = 8, visibleSpreadIndex = 2, windowScrollY = 0, readyState = 'complete',
  overlay = false, url = READER_URL, viewport, scrollViews } = {}) {
  const size = VIEWPORTS[profile];
  const bookVisible = mode === 'book' || mode === 'both';
  const scrollVisible = mode === 'scroll' || mode === 'both';
  const app = { ...uiBox({ rect: { x: 0, y: 0, width: open ? size.width : 0, height: open ? size.height : 0 } }), mounted };
  return {
    url, title: 'fixture gallery', readyState, viewport: viewport ?? { ...size }, overlay, app,
    bookMode: bookVisible ? uiBox() : { found: false },
    scrollMode: scrollVisible ? uiBox() : { found: false },
    scrollViews: scrollViews ?? (mode === 'scroll' ? [{ index: 0, ...uiBox({ rect: { x: 0, y: 0, width: size.width, height: size.height } }),
      scrollTop, scrollHeight: SCROLL_HEIGHT, clientHeight: size.height }] : []),
    book: bookVisible ? { spreadCount, visibleSpreadIndex } : null,
    progress: progress === null ? { found: false, text: null }
      : { ...uiBox({ rect: { x: 0, y: size.height - 40, width: 60, height: 24 } }), text: progress },
    window: { scrollX: 0, scrollY: windowScrollY, documentScrollTop: windowScrollY },
    documentScripts: { total: 6, external: 3 },
  };
}

const baselineOf = options => classifyReaderFacts(readerState(options)).pageBaseline;
async function bootstrapDir() {
  await fs.mkdir(BASE, { recursive: true });
  const dir = await fs.mkdtemp(path.join(BASE, 'bootstrap-'));
  return path.join(dir, 'evidence');
}
async function bootstrapRecords(file) {
  return (await fs.readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
}
function bootstrapPage(raw) {
  return { label: 'p1', spaceId: 42, evaluate: async () => structuredClone(raw) };
}

for (const profile of ['desktop', 'mobile']) test(`bootstrap reads a persisted book reader (${profile})`, async () => {
  const artifactDir = await bootstrapDir();
  const raw = readerState({ profile, mode: 'book', progress: '12 / 300', spreadCount: 8, visibleSpreadIndex: 2 });
  const result = await bootstrapReader({ page: bootstrapPage(raw), profile, artifactDir, taskSpace: 'fixture space' });
  assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  assert.deepEqual(result.errors, []);
  assert.equal(result.prepFacts.schema, 'reader-bootstrap');
  assert.equal(result.prepFacts.readerOpen, true);
  assert.equal(result.prepFacts.readingMode, 'book');
  assert.equal(result.prepFacts.scrollContainer, null);
  assert.deepEqual(result.prepFacts.pageBaseline.book, { spreadCount: 8, visibleSpreadIndex: 2 });
  assert.deepEqual(result.prepFacts.pageBaseline.progress, { text: '12 / 300', current: 12, total: 300 });
  assert.equal(result.prepFacts.pageBaseline.url, READER_URL);
  assert.equal(result.prepFacts.profile.matches, true);
  assert.deepEqual(result.prepFacts.profile.actual, VIEWPORTS[profile]);
  assert.equal(result.prepFacts.taskSpace, 'fixture space');
  assert.deepEqual(result.prepFacts.page, { label: 'p1', spaceId: 42 });
  assert.deepEqual(result.prepFacts.documentScripts, { first: { total: 6, external: 3 }, last: { total: 6, external: 3 } });
  assert.equal(result.evidence.schema, 'reader-bootstrap');
  assert.equal(result.evidence.artifactVersion, 1);
  const [record] = await bootstrapRecords(result.evidence.file);
  assert.equal(record.status, 'ready');
  assert.deepEqual(record.errors, []);
  assert.deepEqual(record.prepFacts, result.prepFacts);
});

for (const profile of ['desktop', 'mobile']) test(`bootstrap reads a persisted scroll reader from its scroll container (${profile})`, async () => {
  const artifactDir = await bootstrapDir();
  const raw = readerState({ profile, mode: 'scroll', scrollTop: SCROLL_TOP, windowScrollY: 17, progress: '7 / 300' });
  const result = await bootstrapReader({ page: bootstrapPage(raw), profile, artifactDir });
  assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  assert.equal(result.prepFacts.readingMode, 'scroll');
  assert.equal(result.prepFacts.scrollContainer.selector, '.content.scroll-mode .awesome-scroll-view');
  assert.equal(result.prepFacts.scrollContainer.index, 0);
  assert.equal(result.prepFacts.scrollContainer.scrollTop, SCROLL_TOP);
  assert.equal(result.prepFacts.scrollContainer.scrollHeight, SCROLL_HEIGHT);
  assert.equal(result.prepFacts.scrollContainer.clientHeight, VIEWPORTS[profile].height);
  assert.equal(result.prepFacts.scrollContainer.windowScrollY, 17);
  assert.equal(result.prepFacts.pageBaseline.scroll.scrollTop, SCROLL_TOP);
  assert.equal(result.prepFacts.pageBaseline.book, null);
  assert.equal(result.prepFacts.windowScroll.scrollY, 17);
  const [record] = await bootstrapRecords(result.evidence.file);
  assert.equal(record.prepFacts.scrollContainer.scrollTop, SCROLL_TOP);
});

test('page baseline comparison uses relative progress instead of absolute page numbers', () => {
  const moved = comparePageBaseline(baselineOf({ progress: '12 / 300' }), baselineOf({ progress: '14 / 300' }));
  assert.equal(moved.comparable, true);
  assert.equal(moved.changed, true);
  assert.deepEqual(moved.progress, { before: 12, after: 14, delta: 2 });
  assert.equal(moved.scroll, null);
  assert.equal(moved.identityChanged, false);
  const idle = comparePageBaseline(baselineOf({ progress: '12 / 300' }), baselineOf({ progress: '12 / 300' }));
  assert.equal(idle.comparable, true);
  assert.equal(idle.changed, false);
  assert.deepEqual(idle.progress, { before: 12, after: 12, delta: 0 });
  const lateStart = comparePageBaseline(baselineOf({ progress: '201 / 300' }), baselineOf({ progress: '203 / 300' }));
  assert.equal(lateStart.comparable, true);
  assert.equal(lateStart.changed, true);
  assert.deepEqual(lateStart.progress, { before: 201, after: 203, delta: 2 });
});

test('page baseline comparison covers scroll, spread identity and mode changes', () => {
  const scrolled = comparePageBaseline(baselineOf({ mode: 'scroll', scrollTop: 1000 }), baselineOf({ mode: 'scroll', scrollTop: 2500 }));
  assert.equal(scrolled.comparable, true);
  assert.equal(scrolled.changed, true);
  assert.deepEqual(scrolled.scroll, { before: 1000, after: 2500, delta: 1500, direction: 'forward' });
  const upward = comparePageBaseline(baselineOf({ mode: 'scroll', scrollTop: 2500 }), baselineOf({ mode: 'scroll', scrollTop: 1000 }));
  assert.deepEqual(upward.scroll, { before: 2500, after: 1000, delta: -1500, direction: 'backward' });
  const still = comparePageBaseline(baselineOf({ mode: 'scroll', scrollTop: 1000 }), baselineOf({ mode: 'scroll', scrollTop: 1000 }));
  assert.equal(still.changed, false);
  assert.equal(still.scroll.direction, 'none');
  const spread = comparePageBaseline(baselineOf({ visibleSpreadIndex: 2 }), baselineOf({ visibleSpreadIndex: 3 }));
  assert.equal(spread.identityChanged, true);
  assert.equal(spread.comparable, true);
  assert.deepEqual(spread.spread, { before: 2, after: 3, delta: 1, direction: 'forward' });
  assert.equal(spread.changed, true);
  assert.equal(spread.progress.delta, 0);
  const mode = comparePageBaseline(baselineOf({ mode: 'book' }), baselineOf({ mode: 'scroll', scrollTop: 100 }));
  assert.equal(mode.modeChanged, true);
  assert.equal(mode.changed, true);
  const navigated = comparePageBaseline(baselineOf({}), { ...baselineOf({}), url: 'https://exhentai.org/g/9/deadbeef/' });
  assert.equal(navigated.urlChanged, true);
  assert.equal(navigated.blockedReason, 'navigated');
});

test('page baseline comparison refuses missing or non-positional baselines', () => {
  const missing = comparePageBaseline(null, baselineOf({}));
  assert.deepEqual(missing, { comparable: false, changed: false, modeChanged: false, urlChanged: false,
    blockedReason: null, progress: null, scroll: null, spread: null, identityChanged: false });
  const noPosition = comparePageBaseline(baselineOf({ progress: null, spreadCount: 0 }), baselineOf({ progress: null, spreadCount: 0 }));
  assert.equal(noPosition.comparable, false);
  assert.equal(noPosition.blockedReason, 'no-baseline');
  assert.equal(noPosition.changed, false);
  const spreadLayoutChanged = comparePageBaseline(
    baselineOf({ progress: null, spreadCount: 8, visibleSpreadIndex: 2 }),
    baselineOf({ progress: null, spreadCount: 10, visibleSpreadIndex: 2 }));
  assert.equal(spreadLayoutChanged.comparable, false);
  assert.equal(spreadLayoutChanged.blockedReason, 'incomparable-spread');
});

for (const [label, patch, expectedStatus, code] of [
  ['reader not mounted', { mounted: false }, 'blocked', 'reader-not-mounted'],
  ['reader mounted but not visible', { open: false }, 'blocked', 'reader-not-open'],
  ['both mode containers visible', { mode: 'both' }, 'unknown', 'mode-ambiguous'],
  ['no mode container visible', { mode: 'none' }, 'unknown', 'mode-unknown'],
  ['scroll mode without a scroll view', { mode: 'scroll', scrollViews: [] }, 'unknown', 'scroll-container-unknown'],
  ['scroll view hidden', { mode: 'scroll', scrollViews: [{ index: 0, ...uiBox({ display: 'none', rect: { x: 0, y: 0, width: 0, height: 0 } }),
    scrollTop: 0, scrollHeight: 1, clientHeight: 1 }] }, 'unknown', 'scroll-container-unknown'],
  ['scroll metrics invalid', { mode: 'scroll', scrollViews: [{ index: 0, ...uiBox(), scrollTop: Number.NaN, scrollHeight: 1, clientHeight: 1 }] }, 'unknown', 'scroll-container-unknown'],
  ['two visible scroll views', { mode: 'scroll', scrollViews: [{ index: 0, ...uiBox(), scrollTop: 0, scrollHeight: 1, clientHeight: 1 },
    { index: 1, ...uiBox(), scrollTop: 0, scrollHeight: 1, clientHeight: 1 }] }, 'unknown', 'scroll-container-unknown'],
  ['document still loading', { readyState: 'loading' }, 'unknown', 'document-not-ready'],
  ['vite overlay present', { overlay: true }, 'blocked', 'vite-error-overlay'],
  ['book baseline without progress or spreads', { progress: null, spreadCount: 0 }, 'unknown', 'baseline-unknown'],
  ['window scrolling is not a scroll container', { mode: 'scroll', scrollViews: [], windowScrollY: 900 }, 'unknown', 'scroll-container-unknown'],
]) test(`bootstrap records ${label} as ${expectedStatus}`, async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => readerState(patch) });
  assert.equal(result.status, expectedStatus, JSON.stringify(result.errors));
  assert.ok(result.errors.some(error => error.code === code), JSON.stringify(result.errors));
  assert.notEqual(result.status, 'ready');
  const [record] = await bootstrapRecords(result.evidence.file);
  assert.equal(record.status, expectedStatus);
  assert.deepEqual(record.prepFacts, result.prepFacts);
  assert.equal(JSON.stringify(record.errors), JSON.stringify(result.errors));
});

test('bootstrap records a failed observation as blocked with its error details', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: () => { throw new Error('fixture observe failed'); } });
  assert.equal(result.status, 'blocked');
  assert.equal(result.prepFacts, null);
  const failure = result.errors.find(error => error.code === 'observation-failed');
  assert.equal(failure.details.name, 'Error');
  assert.equal(failure.details.message, 'fixture observe failed');
  assert.equal(typeof failure.details.stack, 'string');
  const [record] = await bootstrapRecords(result.evidence.file);
  assert.equal(record.status, 'blocked');
  assert.equal(record.prepFacts, null);
});

test('bootstrap keeps the reader open state when closeReader fails', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => readerState({ open: true }),
    closeReader: () => { throw new Error('fixture close failed'); } });
  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.some(error => error.code === 'close-reader-failed' && error.details.message === 'fixture close failed'));
  assert.equal(result.prepFacts.readerOpen, true);
  assert.deepEqual(result.prepFacts.calls.map(call => [call.name, call.ok]),
    [['observe', true], ['closeReader', false], ['observe', true]]);
});

test('bootstrap reports close-reader-timeout when the reader stays open', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir, timeoutMs: 120,
    observe: async () => readerState({ open: true }),
    closeReader: async () => {} });
  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.some(error => error.code === 'close-reader-timeout'));
});

test('bootstrap does not report a timeout when a polling observation fails', async () => {
  const artifactDir = await bootstrapDir();
  let calls = 0;
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir, timeoutMs: 120,
    observe: async () => {
      calls += 1;
      if (calls === 1) return readerState({ open: true });
      throw new Error('polling observation failed');
    },
    closeReader: async () => {} });
  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.some(error => error.code === 'observation-failed' && error.details.message === 'polling observation failed'));
  assert.ok(!result.errors.some(error => error.code === 'close-reader-timeout'));
  assert.equal(result.prepFacts.readerOpen, true);
});

test('bootstrap reports open-reader-timeout when the reader stays closed', async () => {
  const artifactDir = await bootstrapDir();
  let open = true;
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir, timeoutMs: 120,
    observe: async () => readerState({ open }),
    closeReader: async () => { open = false; },
    openReader: async () => {} });
  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.some(error => error.code === 'open-reader-timeout'));
});

test('bootstrap records a failed openReader as blocked', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => readerState({ open: false }),
    openReader: () => { throw new Error('fixture open failed'); } });
  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.some(error => error.code === 'open-reader-failed'));
  assert.equal(result.prepFacts.readerOpen, false);
});

test('bootstrap blocks when the page navigates between observations', async () => {
  const artifactDir = await bootstrapDir();
  let observations = 0;
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => (++observations === 1 ? readerState() : readerState({ open: false, url: `${READER_URL}#navigated` })),
    closeReader: async () => {} });
  assert.equal(result.status, 'blocked');
  const navigated = result.errors.find(error => error.code === 'page-navigated');
  assert.deepEqual(navigated.details, { before: READER_URL, after: `${READER_URL}#navigated` });
});


test('bootstrap records a late host script as unknown', async () => {
  const artifactDir = await bootstrapDir();
  let observations = 0;
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => {
      observations++;
      const raw = readerState({ open: observations !== 2 });
      raw.documentScripts = { total: observations === 3 ? 8 : 6, external: 3 };
      return raw;
    },
    closeReader: async () => {},
    openReader: async () => {} });
  assert.equal(result.status, 'unknown', JSON.stringify(result.errors));
  const late = result.errors.find(error => error.code === 'host-script-late');
  assert.deepEqual(late.details, { first: { total: 6, external: 3 }, last: { total: 8, external: 3 } });
  assert.deepEqual(result.prepFacts.documentScripts, { first: { total: 6, external: 3 }, last: { total: 8, external: 3 } });
  const [record] = await bootstrapRecords(result.evidence.file);
  assert.equal(record.status, 'unknown');
});
test('bootstrap hooks stay serial and run close before open', async () => {
  const artifactDir = await bootstrapDir();
  let open = true, active = 0, maxActive = 0;
  const step = action => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 10));
    action();
    active--;
  };
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => readerState({ open }),
    closeReader: step(() => { open = false; }),
    openReader: step(() => { open = true; }) });
  assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  assert.equal(result.prepFacts.readerOpen, true);
  assert.equal(maxActive, 1);
  assert.deepEqual(result.prepFacts.calls.map(call => call.name), ['observe', 'closeReader', 'observe', 'openReader', 'observe']);
  assert.equal(result.prepFacts.calls.every(call => call.ok), true);
});

test('bootstrap waits for the close transition before reopening', async () => {
  const artifactDir = await bootstrapDir();
  let open = true;
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
    observe: async () => readerState({ open }),
    closeReader: () => { setTimeout(() => { open = false; }, 30); },
    openReader: () => { open = true; } });
  assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  assert.equal(result.prepFacts.readerOpen, true);
  assert.ok(result.prepFacts.calls.some(call => call.name === 'openReader' && call.ok));
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(open, true);
});

test('auto-open without callbacks is recorded and never closed by a guessed selector', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage(readerState()), profile: 'desktop', artifactDir });
  assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  assert.equal(result.prepFacts.readerOpen, true);
  assert.deepEqual(result.prepFacts.calls.map(call => call.name), ['observe']);
});

test('bootstrap blocks a profile mismatch before downstream assertions', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage(readerState({ profile: 'desktop' })), profile: 'mobile', artifactDir });
  assert.equal(result.status, 'blocked');
  const mismatch = result.errors.find(error => error.code === 'profile-mismatch');
  assert.deepEqual(mismatch.details.actual, VIEWPORTS.desktop);
  assert.equal(result.prepFacts.profile.matches, false);
  assert.equal(result.prepFacts.profile.requested, 'mobile');
});

test('bootstrap bounds a hanging callback without leaking an unhandled rejection', async () => {
  const artifactDir = await bootstrapDir();
  const unhandled = [];
  const onUnhandled = reason => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir, timeoutMs: 20,
      observe: async () => readerState({ open: true }),
      closeReader: () => new Promise((_, reject) => setTimeout(() => reject(new Error('late close failure')), 40)) });
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(result.status, 'blocked');
    assert.ok(result.errors.some(error => error.code === 'close-reader-failed' && /timed out after 20ms/.test(error.details.message)));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('bootstrap rejects a profile inherited from the prototype chain', async () => {
  const artifactDir = await bootstrapDir();
  const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'toString', artifactDir });
  assert.equal(result.status, 'blocked');
  assert.equal(result.errors[0].code, 'invalid-profile');
  assert.equal(result.evidence, null);
});

test('bootstrap rejects invalid inputs without writing evidence', async () => {
  const artifactDir = await bootstrapDir();
  const outside = path.join(ROOT, 'bootstrap-outside-evidence');
  for (const [label, patch, code] of [
    ['profile', { profile: 'tablet' }, 'invalid-profile'],
    ['timeout', { timeoutMs: 0 }, 'invalid-timeout'],
    ['page', { page: {} }, 'invalid-page'],
    ['task space', { taskSpace: '   ' }, 'invalid-task-space'],
    ['artifact dir outside .tmp', { artifactDir: outside }, 'invalid-artifact-dir'],
    ['relative artifact dir', { artifactDir: '.tmp/bootstrap-relative' }, 'invalid-artifact-dir'],
  ]) await (async () => {
    const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir, ...patch });
    assert.equal(result.status, 'blocked', label);
    assert.equal(result.prepFacts, null, label);
    assert.equal(result.evidence, null, label);
    assert.equal(result.errors[0].code, code, label);
  })();
  await assert.rejects(fs.access(outside));
  await assert.rejects(fs.readdir(artifactDir));
});

test('bootstrap uses the built-in page observer when no observe callback is passed', async () => {
  const artifactDir = await bootstrapDir();
  const raw = readerState();
  let evaluations = 0;
  const page = { label: 'p1', spaceId: 42, evaluate: async fn => {
    evaluations++;
    assert.equal(typeof fn, 'function');
    return structuredClone(raw);
  } };
  const result = await bootstrapReader({ page, profile: 'desktop', artifactDir });
  assert.equal(evaluations, 1);
  assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  assert.equal(result.prepFacts.readingMode, 'book');
  assert.deepEqual(result.prepFacts.pageBaseline.progress, { text: '12 / 300', current: 12, total: 300 });
});

test('bootstrap appends one parseable evidence record per call', async () => {
  const artifactDir = await bootstrapDir();
  for (const mode of ['book', 'scroll']) {
    const result = await bootstrapReader({ page: bootstrapPage({}), profile: 'desktop', artifactDir,
      observe: async () => readerState({ mode }) });
    assert.equal(result.status, 'ready', JSON.stringify(result.errors));
  }
  const records = await bootstrapRecords(path.join(artifactDir, 'reader-bootstrap.jsonl'));
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(record => record.prepFacts.readingMode), ['book', 'scroll']);
  assert.deepEqual(records.map(record => record.artifactVersion), [1, 1]);
  assert.deepEqual(records.map(record => record.schema), ['reader-bootstrap', 'reader-bootstrap']);
});

test('bootstrap inside a preflight round is consumed before the functional phase', async t => {
  const f = await fixture(t);
  const runs = [];
  const result = await f.run(async api => {
    const eventsBefore = f.page.eventsCalls;
    const first = await bootstrapReader({ page: f.page, profile: 'desktop', taskSpace: f.page.label,
      artifactDir: path.join(f.options.artifactDir, 'bootstrap'),
      observe: async () => readerState({ profile: 'desktop' }) });
    runs.push(first);
    api.assert(first.status === 'ready', 'bootstrap must be ready before book assertions', first.errors);
    api.assert(f.page.eventsCalls === eventsBefore, 'bootstrap must not consume page.events');
    await api.phase('book-page-turn', () => f.page.queue.push(log('page turned')));
    const second = await bootstrapReader({ page: f.page, profile: 'desktop', taskSpace: f.page.label,
      artifactDir: path.join(f.options.artifactDir, 'bootstrap'),
      observe: async () => readerState({ profile: 'desktop', progress: '14 / 300', visibleSpreadIndex: 3 }) });
    runs.push(second);
    const comparison = comparePageBaseline(first.prepFacts.pageBaseline, second.prepFacts.pageBaseline);
    api.assert(comparison.comparable && comparison.changed && comparison.progress.delta === 2,
      'a page turn must be observed as a relative baseline change', comparison);
    api.assert(second.prepFacts.taskSpace === 'p1', 'the same task space page must be reusable');
  });
  assert.equal(result.observed, 'passed', JSON.stringify(result.errors));
  assert.equal(runs.length, 2);
  assert.equal(runs[0].prepFacts.taskSpace, 'p1');
  assert.equal(runs[0].prepFacts.readingMode, 'book');
  assert.ok(f.page.eventsCalls > 0);
  const records = await bootstrapRecords(runs[1].evidence.file);
  assert.equal(records.length, 2);
  assert.equal(records.every(record => record.status === 'ready'), true);
});
