import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROFILES = {
  desktop: { width: 1200, height: 900, dpr: 1, mobile: false, touchPoints: 0, coarse: false },
  mobile: { width: 390, height: 844, dpr: 3, mobile: true, touchPoints: 5, coarse: true },
};
const EVENT_DRAIN_GRACE_MS = 1000;
// `SimpleDialog` renders `<flat-button class="operation" mode="inline">`, and Vue
// fallthrough puts the class on the wrapper div, so the clickable node is the
// inner `<a>`. Clicking the outer `.flat-button`/`.operation` does nothing.
export const DIALOG_ACTION_SELECTOR = '.operation-bar .flat-button.operation > a';
const INPUTS = ['src', 'core', 'index.html', 'vite.config.ts', 'vite.config.prod.ts', 'sass-silence.config.mjs', 'package.json', 'package-lock.json'];
const sha = value => createHash('sha256').update(value).digest('hex');
const identity = value => ({ sha256: sha(value), bytes: Buffer.byteLength(value), length: value.toString().length });
const firstDivergence = (expected, actual) => {
  const limit = Math.min(expected.length, actual.length);
  let offset = 0;
  while (offset < limit && expected.charCodeAt(offset) === actual.charCodeAt(offset)) offset += 1;
  const lineStart = expected.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = expected.indexOf('\n', offset);
  const lineAt = value => value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd).trim().slice(0, 200);
  return { offset, line: expected.slice(0, offset).split('\n').length,
    expectedLine: lineAt(expected), actualLine: lineAt(actual), lengthDelta: actual.length - expected.length };
};
const errorRecord = error => ({ name: error?.name ?? 'Error', message: error?.message ?? String(error), stack: error?.stack, code: error?.code, details: error?.details });
const inside = (root, file) => file !== root && !path.relative(root, file).startsWith(`..${path.sep}`) && path.relative(root, file) !== '..' && !path.isAbsolute(path.relative(root, file));

class Blocked extends Error {
  constructor(message, details) { super(message); this.name = 'PreflightBlocked'; this.details = details; }
}
class ProductAssertion extends Error {
  constructor(message, details) { super(message); this.name = 'ProductAssertion'; this.details = details; }
}
function requireCondition(condition, message, details) {
  if (!condition) throw new Blocked(message, details);
}
function raceTimeout(label, limit, operation, makeError, settle = false) {
  let timer;
  const running = Promise.resolve().then(operation);
  return Promise.race([running, new Promise((_, reject) => {
    timer = setTimeout(() => reject(makeError(`${label} timed out after ${limit}ms`)), limit);
  })]).finally(() => {
    clearTimeout(timer);
    if (settle) running.catch(() => {});
  });
}

/** Rejection retains both the original error and all collection/persistence errors. */
export class BrowserPreflightError extends Error {
  constructor(result, cause) {
    super(`Browser preflight ${result.observed}: ${cause?.message ?? result.errors[0]?.message}`, { cause });
    this.name = 'BrowserPreflightError';
    this.result = result;
    this.exitCode = 1;
  }
}

async function fingerprint(root, inputs) {
  const files = [];
  async function visit(relative) {
    const absolute = path.resolve(root, relative);
    requireCondition(inside(root, absolute), 'Input must be inside project', { relative });
    const stat = await fs.lstat(absolute);
    requireCondition(!stat.isSymbolicLink(), 'Symlink input needs an explicit fingerprint design', { relative });
    if (stat.isDirectory()) {
      for (const name of (await fs.readdir(absolute)).sort()) await visit(path.join(relative, name));
    } else if (stat.isFile()) files.push({ path: relative, ...identity(await fs.readFile(absolute)) });
  }
  for (const input of [...new Set(inputs)].sort()) await visit(input);
  return { sha256: sha(JSON.stringify(files)), files };
}

function userscriptMetadata(text) {
  return [...text.matchAll(/^\/\/ ==UserScript==\s*$([\s\S]*?)^\/\/ ==\/UserScript==\s*$/gm)].map(m => m[1]);
}

function userscriptName(block) {
  return block?.match(/^\/\/[ \t]*@name[ \t]+([^\r\n]+)$/m)?.[1]?.trim();
}

function isProductionBundle(text, expected, productionName) {
  // Names come only from metadata blocks. Loader markers in production code
  // must never exempt a stale or duplicate production script from inspection.
  return text === expected || userscriptMetadata(text).some(block => userscriptName(block) === productionName);
}

function permissions(bundle, loader, bundleUrl) {
  function metadata(text) {
    const block = userscriptMetadata(text)[0];
    requireCondition(block, 'Userscript metadata missing');
    const values = name => [...new Set([...block.matchAll(new RegExp(`^//\\s*@${name}\\s+(\\S+)\\s*$`, 'gm'))].map(m => m[1]))].sort();
    const result = { name: userscriptName(block), grant: values('grant'), connect: values('connect') };
    requireCondition(result.grant.length && result.connect.length, 'Userscript grant/connect metadata missing', result);
    return result;
  }
  const production = metadata(bundle), repositoryLoader = metadata(loader);
  const missingGrants = production.grant.filter(x => !repositoryLoader.grant.includes(x));
  const extraGrants = repositoryLoader.grant.filter(x => !production.grant.includes(x));
  const missingConnect = production.connect.filter(x => !repositoryLoader.connect.includes(x));
  const host = new URL(bundleUrl).hostname;
  const localHostCovered = repositoryLoader.connect.includes(host) || repositoryLoader.connect.includes('*');
  return { production, repositoryLoader, missingGrants, extraGrants, missingConnect, host, localHostCovered,
    verified: !missingGrants.length && !extraGrants.length && !missingConnect.length && localHostCovered,
    scope: 'Repository declarations only; installed permissions are not established by these files.' };
}

// Executed by Ego in the page world. Keep this self-contained; no Node captures.
function observePage() {
  const app = document.querySelector('#ehunter-app');
  const rect = app?.getBoundingClientRect();
  const style = app && getComputedStyle(app);
  return {
    url: location.href, title: document.title, readyState: document.readyState,
    width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
    touchPoints: navigator.maxTouchPoints, coarse: matchMedia('(pointer: coarse)').matches,
    client: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    visualViewport: visualViewport && { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale },
    meta: [...document.querySelectorAll('meta[name="viewport"]')].map(x => x.outerHTML),
    mounted: !!document.querySelector('#ehunter-app .ehunter-container'),
    open: !!app && style.visibility === 'visible' && style.display !== 'none' && rect.width > 0 && Math.abs(rect.top) < 1,
    overlay: !!document.querySelector('vite-error-overlay'),
    resources: {
      stylesheets: [...document.styleSheets].map(s => s.href),
      images: [...document.images].map(i => ({ url: i.currentSrc || i.src, complete: i.complete, width: i.naturalWidth, height: i.naturalHeight })),
    },
  };
}

// Executed by Ego in the page world. Keep this self-contained; no Node captures.
function observeReaderState() {
  const box = element => {
    if (!element) return { found: false };
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { found: true, display: style.display, visibility: style.visibility, opacity: style.opacity,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  };
  const bookMode = box(document.querySelector('.content.book-mode'));
  const scrollMode = box(document.querySelector('.content.scroll-mode'));
  const scrollViews = [...document.querySelectorAll('.content.scroll-mode .awesome-scroll-view')].map((element, index) => {
    const state = box(element);
    return { index, found: state.found, display: state.display, visibility: state.visibility, opacity: state.opacity, rect: state.rect,
      scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
  });
  const spreads = bookMode.found ? [...document.querySelectorAll('.content.book-mode .book-spread')] : [];
  const progressElement = document.querySelector('.status-pannel .progress');
  const progress = box(progressElement);
  return {
    url: location.href, title: document.title, readyState: document.readyState,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
      touchPoints: navigator.maxTouchPoints, coarse: matchMedia('(pointer: coarse)').matches },
    overlay: !!document.querySelector('vite-error-overlay'),
    app: { ...box(document.querySelector('#ehunter-app')),
      mounted: !!document.querySelector('#ehunter-app .ehunter-container') },
    bookMode, scrollMode, scrollViews,
    book: bookMode.found ? {
      spreadCount: spreads.length,
      visibleSpreadIndex: spreads.findIndex(element => { const state = box(element); return state.rect.width > 0 && state.rect.height > 0; }),
    } : null,
    progress: { ...progress, text: progressElement ? progressElement.textContent : null },
    window: { scrollX, scrollY,
      documentScrollTop: document.scrollingElement ? document.scrollingElement.scrollTop : document.documentElement.scrollTop },
    documentScripts: { total: document.scripts.length, external: [...document.scripts].filter(script => !!script.src).length },
  };
}

const BOOTSTRAP_SCHEMA = 'reader-bootstrap';
const BOOTSTRAP_FILE = 'reader-bootstrap.jsonl';
const SCROLL_VIEW_SELECTOR = '.content.scroll-mode .awesome-scroll-view';

function isVisibleBox(box) {
  if (!box || typeof box !== 'object' || box.found === false) return false;
  if (box.display === 'none' || box.visibility === 'hidden') return false;
  if (Number(box.opacity ?? 1) === 0) return false;
  const width = Number(box.rect?.width);
  const height = Number(box.rect?.height);
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
}

function progressFact(rawProgress) {
  if (!isVisibleBox(rawProgress)) return null;
  const text = typeof rawProgress.text === 'string' ? rawProgress.text.trim() : '';
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(text);
  return match ? { text, current: Number(match[1]), total: Number(match[2]) } : null;
}

function bookFact(rawBook) {
  if (!rawBook || !Number.isInteger(rawBook.spreadCount) || rawBook.spreadCount < 1) return null;
  if (!Number.isInteger(rawBook.visibleSpreadIndex)) return null;
  if (rawBook.visibleSpreadIndex < 0 || rawBook.visibleSpreadIndex >= rawBook.spreadCount) return null;
  return { spreadCount: rawBook.spreadCount, visibleSpreadIndex: rawBook.visibleSpreadIndex };
}

/** Classifies page-world reader facts; unknown facts are never filled with defaults. */
export function classifyReaderFacts(raw) {
  const facts = {
    readerOpen: false, readingMode: 'unknown', scrollContainer: null, pageBaseline: null,
    viewport: raw?.viewport ?? null, url: raw?.url ?? null, readyState: raw?.readyState ?? null,
    documentScripts: raw?.documentScripts ?? null, window: raw?.window ?? null, errors: [],
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    facts.errors.push({ code: 'observation-invalid', severity: 'blocked', message: 'Reader observation is not an object' });
    return facts;
  }
  const blocked = (code, message, details) => facts.errors.push({ code, severity: 'blocked', message, ...(details === undefined ? {} : { details }) });
  const unknown = (code, message, details) => facts.errors.push({ code, severity: 'unknown', message, ...(details === undefined ? {} : { details }) });
  if (raw.overlay) blocked('vite-error-overlay', 'Vite error overlay is present');
  if (raw.readyState !== 'complete') unknown('document-not-ready', 'Document is not complete', { readyState: raw.readyState ?? null });
  const app = raw.app;
  if (app?.found === false || app?.mounted !== true) {
    blocked('reader-not-mounted', 'Reader mount marker is missing', app ? { found: app.found !== false, mounted: !!app.mounted } : undefined);
    return facts;
  }
  facts.readerOpen = isVisibleBox(app);
  if (!facts.readerOpen) {
    blocked('reader-not-open', 'Reader is mounted but not visible',
      { display: app.display, visibility: app.visibility, opacity: app.opacity, rect: app.rect });
    return facts;
  }
  const bookVisible = isVisibleBox(raw.bookMode);
  const scrollVisible = isVisibleBox(raw.scrollMode);
  if (bookVisible && scrollVisible) unknown('mode-ambiguous', 'Book and scroll mode containers are both visible');
  else if (bookVisible) facts.readingMode = 'book';
  else if (scrollVisible) facts.readingMode = 'scroll';
  else unknown('mode-unknown', 'No reader mode container is visible');
  if (facts.readingMode === 'scroll') {
    const views = (Array.isArray(raw.scrollViews) ? raw.scrollViews : [])
      .map((view, index) => ({ ...view, index: Number.isInteger(view?.index) ? view.index : index }));
    const visible = views.filter(isVisibleBox);
    if (visible.length !== 1) {
      unknown('scroll-container-unknown', 'Scroll mode needs exactly one visible scroll view', { visible: visible.length, total: views.length, selector: SCROLL_VIEW_SELECTOR });
    } else {
      const [view] = visible;
      const metrics = [view.scrollTop, view.scrollHeight, view.clientHeight];
      if (!metrics.every(value => Number.isFinite(value) && value >= 0)) {
        unknown('scroll-container-unknown', 'Scroll metrics are invalid', { scrollTop: view.scrollTop, scrollHeight: view.scrollHeight, clientHeight: view.clientHeight });
      } else {
        facts.scrollContainer = { selector: SCROLL_VIEW_SELECTOR, index: view.index, scrollTop: view.scrollTop,
          scrollHeight: view.scrollHeight, clientHeight: view.clientHeight,
          windowScrollY: Number.isFinite(raw.window?.scrollY) ? raw.window.scrollY : null };
      }
    }
  }
  const progress = progressFact(raw.progress);
  const book = facts.readingMode === 'book' ? bookFact(raw.book) : null;
  const scroll = facts.scrollContainer && { selector: facts.scrollContainer.selector, index: facts.scrollContainer.index,
    scrollTop: facts.scrollContainer.scrollTop, scrollHeight: facts.scrollContainer.scrollHeight, clientHeight: facts.scrollContainer.clientHeight };
  if (!progress && !scroll && !book) unknown('baseline-unknown', 'No progress text, scroll position or book spread is observable');
  facts.pageBaseline = { mode: facts.readingMode, url: facts.url, progress: progress ? { ...progress } : null,
    scroll: scroll || null, book };
  return facts;
}

/** Relative page comparison; absolute page numbers are evidence, never assertions. */
export function comparePageBaseline(before, after) {
  const result = { comparable: false, changed: false, modeChanged: false, urlChanged: false, blockedReason: null,
    progress: null, scroll: null, spread: null, identityChanged: false };
  if (!before || typeof before !== 'object' || !after || typeof after !== 'object') return result;
  const progressBefore = Number.isFinite(before.progress?.current) ? before.progress.current : null;
  const progressAfter = Number.isFinite(after.progress?.current) ? after.progress.current : null;
  const scrollBefore = Number.isFinite(before.scroll?.scrollTop) ? before.scroll.scrollTop : null;
  const scrollAfter = Number.isFinite(after.scroll?.scrollTop) ? after.scroll.scrollTop : null;
  if (progressBefore !== null && progressAfter !== null) {
    result.progress = { before: progressBefore, after: progressAfter, delta: progressAfter - progressBefore };
  }
  if (scrollBefore !== null && scrollAfter !== null) {
    const delta = scrollAfter - scrollBefore;
    result.scroll = { before: scrollBefore, after: scrollAfter, delta, direction: delta > 0 ? 'forward' : delta < 0 ? 'backward' : 'none' };
  }
  const spreadBefore = Number.isInteger(before.book?.visibleSpreadIndex) ? before.book.visibleSpreadIndex : null;
  const spreadAfter = Number.isInteger(after.book?.visibleSpreadIndex) ? after.book.visibleSpreadIndex : null;
  const spreadCountsDiffer = spreadBefore !== null && spreadAfter !== null
    && before.book?.spreadCount !== after.book?.spreadCount;
  if (spreadBefore !== null && spreadAfter !== null && !spreadCountsDiffer) {
    const delta = spreadAfter - spreadBefore;
    result.spread = { before: spreadBefore, after: spreadAfter, delta, direction: delta > 0 ? 'forward' : delta < 0 ? 'backward' : 'none' };
    result.identityChanged = delta !== 0;
  } else if (spreadBefore !== null && spreadAfter !== null) {
    result.identityChanged = spreadBefore !== spreadAfter;
  }
  result.urlChanged = (before.url ?? null) !== (after.url ?? null);
  result.modeChanged = (before.mode ?? null) !== (after.mode ?? null);
  result.comparable = !result.urlChanged && (result.progress !== null || result.scroll !== null || result.spread !== null);
  if (result.urlChanged) result.blockedReason = 'navigated';
  else if (result.comparable) result.blockedReason = null;
  else if (spreadCountsDiffer) result.blockedReason = 'incomparable-spread';
  else result.blockedReason = 'no-baseline';
  result.changed = result.modeChanged || result.identityChanged
    || (result.progress !== null && result.progress.delta !== 0)
    || (result.scroll !== null && result.scroll.delta !== 0)
    || (result.spread !== null && result.spread.delta !== 0);
  return result;
}

/**
 * Preparation-only observation of the current page. Never throws: invalid inputs,
 * failed observation and unwritable evidence return a blocked result. Callbacks are
 * normal UI actions; page.events() stays owned by withBrowserPreflight.
 */
export async function bootstrapReader({ page, taskSpace, profile, observe, closeReader, openReader, artifactDir, timeoutMs = 15000 } = {}) {
  const errors = [], calls = [];
  let observedAt = null;
  const status = () => (errors.some(error => error.severity === 'blocked') ? 'blocked' : errors.length ? 'unknown' : 'ready');
  const fail = (code, message, details) => errors.push({ code, severity: 'blocked', message, ...(details === undefined ? {} : { details }) });
  const unknown = (code, message, details) => errors.push({ code, severity: 'unknown', message, ...(details === undefined ? {} : { details }) });
  const invalid = (code, message, details) => {
    fail(code, message, details);
    return { status: 'blocked', prepFacts: null, evidence: null, errors, calls };
  };
  if (profile !== undefined && profile !== null && !Object.hasOwn(PROFILES, profile)) return invalid('invalid-profile', 'profile must be desktop or mobile', { profile });
  if (taskSpace !== undefined && taskSpace !== null && (typeof taskSpace !== 'string' || taskSpace.trim() === '')) {
    return invalid('invalid-task-space', 'taskSpace must be a nonempty string when provided', { taskSpace });
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) return invalid('invalid-timeout', 'timeoutMs must be in (0, 60000]', { timeoutMs });
  if (!page || typeof page.evaluate !== 'function') return invalid('invalid-page', 'page must provide evaluate()', { evaluate: typeof page?.evaluate });
  if (typeof artifactDir !== 'string' || !path.isAbsolute(artifactDir) || !inside(path.join(ROOT, '.tmp'), artifactDir)) {
    return invalid('invalid-artifact-dir', 'artifactDir must be an absolute path inside this repository .tmp', { artifactDir });
  }
  const bounded = (label, operation, limit = timeoutMs) => raceTimeout(label, limit, operation, message => new Error(message), true);
  const observeOnce = async () => {
    const startedAt = new Date().toISOString();
    try {
      const raw = await bounded('observe', () => (typeof observe === 'function' ? observe() : page.evaluate(observeReaderState)));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Reader observation must be an object');
      calls.push({ name: 'observe', startedAt, endedAt: new Date().toISOString(), ok: true });
      observedAt ??= new Date().toISOString();
      return raw;
    } catch (error) {
      calls.push({ name: 'observe', startedAt, endedAt: new Date().toISOString(), ok: false, error: errorRecord(error) });
      fail('observation-failed', 'Reader state observation failed', { name: error?.name ?? 'Error', message: error?.message ?? String(error), stack: error?.stack });
      return null;
    }
  };
  const callHook = async (name, code, callback) => {
    const startedAt = new Date().toISOString();
    try {
      await bounded(name, () => callback());
      calls.push({ name, startedAt, endedAt: new Date().toISOString(), ok: true });
      return true;
    } catch (error) {
      calls.push({ name, startedAt, endedAt: new Date().toISOString(), ok: false, error: errorRecord(error) });
      fail(code, `${name} callback failed`, errorRecord(error));
      return false;
    }
  };
  const waitForOpenState = async wantOpen => {
    const deadline = Date.now() + timeoutMs;
    let wait = 100;
    let current = await observeOnce();
    while (current && classifyReaderFacts(current).readerOpen !== wantOpen && Date.now() < deadline) {
      await delay(wait);
      wait = Math.min(wait * 2, 500);
      current = await observeOnce();
    }
    return current;
  };
  const finish = async prepFacts => {
    let evidence = null;
    try {
      const realTmp = await fs.realpath(path.join(ROOT, '.tmp'));
      await fs.mkdir(artifactDir, { recursive: true });
      const realTarget = await fs.realpath(artifactDir);
      if (!inside(realTmp, realTarget)) {
        fail('invalid-artifact-dir', 'artifactDir resolves outside this repository .tmp', { artifactDir, resolved: realTarget });
        await fs.rmdir(artifactDir).catch(() => {});
      } else {
        const file = path.join(realTarget, BOOTSTRAP_FILE);
        await fs.appendFile(file, JSON.stringify({ schema: BOOTSTRAP_SCHEMA, artifactVersion: 1, status: status(), prepFacts, errors, calls }) + '\n');
        evidence = { path: path.relative(ROOT, file), file, schema: BOOTSTRAP_SCHEMA, artifactVersion: 1 };
      }
    } catch (error) {
      fail('evidence-write-failed', 'Reader bootstrap evidence could not be written', errorRecord(error));
    }
    return { status: status(), prepFacts, evidence, errors, calls };
  };
  try {
    const first = await observeOnce();
    if (!first) return await finish(null);
    let current = first;
    const firstFacts = classifyReaderFacts(first);
    if (typeof closeReader === 'function' && firstFacts.readerOpen) {
      if (await callHook('closeReader', 'close-reader-failed', closeReader)) {
        const closed = await waitForOpenState(false);
        if (closed) {
          current = closed;
          if (classifyReaderFacts(current).readerOpen) fail('close-reader-timeout', 'Reader did not close within timeoutMs', { timeoutMs });
        }
      } else {
        current = (await observeOnce()) ?? current;
      }
    }
    if (typeof openReader === 'function' && !classifyReaderFacts(current).readerOpen) {
      if (await callHook('openReader', 'open-reader-failed', openReader)) {
        const opened = await waitForOpenState(true);
        if (opened) {
          current = opened;
          if (!classifyReaderFacts(current).readerOpen) fail('open-reader-timeout', 'Reader did not open within timeoutMs', { timeoutMs });
        }
      } else {
        current = (await observeOnce()) ?? current;
      }
    }
    const facts = classifyReaderFacts(current);
    errors.push(...facts.errors);
    const firstScripts = firstFacts.documentScripts;
    const lastScripts = facts.documentScripts;
    if (Number.isFinite(firstScripts?.total) && Number.isFinite(lastScripts?.total) && lastScripts.total > firstScripts.total) {
      unknown('host-script-late', 'Scripts arrived after the first reader observation', { first: firstScripts, last: lastScripts });
    }
    if (typeof first.url === 'string' && typeof facts.url === 'string' && first.url !== facts.url) {
      fail('page-navigated', 'Page navigated during bootstrap', { before: first.url, after: facts.url });
    }
    let profileFact = null;
    if (profile !== undefined && profile !== null) {
      const expected = { ...PROFILES[profile] };
      const actual = facts.viewport ? { width: facts.viewport.width, height: facts.viewport.height, dpr: facts.viewport.dpr,
        touchPoints: facts.viewport.touchPoints, coarse: facts.viewport.coarse } : null;
      const matches = !!actual && actual.width === expected.width && actual.height === expected.height
        && Number.isFinite(actual.dpr) && Math.abs(actual.dpr - expected.dpr) <= 1e-6
        && actual.touchPoints === expected.touchPoints && actual.coarse === expected.coarse;
      profileFact = { requested: profile, expected, actual, matches };
      if (!matches) fail('profile-mismatch', 'Measured viewport does not match the requested profile', profileFact);
    }
    const prepFacts = {
      schema: BOOTSTRAP_SCHEMA,
      taskSpace: taskSpace ?? null,
      page: { label: page.label ?? null, spaceId: page.spaceId ?? null },
      url: facts.url,
      profile: profileFact,
      readerOpen: facts.readerOpen,
      readingMode: facts.readingMode,
      scrollContainer: facts.scrollContainer,
      pageBaseline: facts.pageBaseline,
      windowScroll: { scrollX: Number.isFinite(facts.window?.scrollX) ? facts.window.scrollX : null,
        scrollY: Number.isFinite(facts.window?.scrollY) ? facts.window.scrollY : null,
        documentScrollTop: Number.isFinite(facts.window?.documentScrollTop) ? facts.window.documentScrollTop : null },
      documentScripts: { first: firstScripts, last: lastScripts },
      readyState: facts.readyState,
      calls,
      observedAt,
    };
    return await finish(prepFacts);
  } catch (error) {
    fail('bootstrap-failed', 'Reader bootstrap failed', errorRecord(error));
    return { status: 'blocked', prepFacts: null, evidence: null, errors, calls };
  }
}

/**
 * One call is one CDP session/round. Callers own the existing Ego space, services,
 * UI selectors, and acceptance.json. They must not drain page.events themselves.
 *
 * source.kind='eh': bundlePath, loaderPath, bundleUrl, build {exitCode:0,evidence},
 * installation {loggedIn, dynamicLoaderEnabled, staticScriptDisabled, evidence}.
 * source.kind='nh': same userscript flow as 'eh' without the EH login prerequisite;
 * the document must be an nhentai.net /g/<id>/<page>/ reader page.
 * source.kind='vite': origin, service {cwd:ROOT,pid,origin,evidence},
 * requiredModules: exact URLs (entry + scene's Vue/style modules), inputs?: extra
 * repository-relative paths. Mandatory project inputs cannot be removed.
 * Evidence paths must name readable files; caller is responsible for their truth.
 * scenarioInputs: nonempty repository-relative scenario/test input paths, hashed at start and rechecked before the round closes. taskSpace labels the owning task space.
 *
 * navigate/prepareReader/actions receive {signal, timeoutMs}; use Ego timeouts and
 * stop on abort. JS cannot forcibly cancel an arbitrary caller's promise.
 * timeoutMs bounds each browser action; checksTimeoutMs bounds the whole suite.
 * Use only sequential awaited context methods. Never change emulation externally
 * during a round: CDP has no readback for the mobile switch.
 */
export async function withBrowserPreflight({ page, artifactDir, profile, source, navigate, prepareReader, scenarioInputs,
  taskSpace, timeoutMs = 15000, checksTimeoutMs = 120000, roundId = randomUUID() }, runChecks) {
  const expected = PROFILES[profile] && { ...PROFILES[profile] };
  const runId = randomUUID();
  const result = { runId, roundId, page: { label: page?.label, spaceId: page?.spaceId }, artifactDir,
    observed: 'incomplete', preparation: 'unrun', checks: 'unrun', phases: [], errors: [], unsaved: [],
    eventCollection: { maxConcurrent: 0, unresolved: [], timeouts: [] },
    identity: [], environments: [], logs: [], screenshots: [], startedAt: new Date().toISOString() };
  const controller = new AbortController();
  let phase = 'initial', readyToWrite = false, sequence = 0, eventIndex = 0, collecting = false;
  let navigationStarted = false, initialFrame, documentState, originalSite, readerReady = false, preparedLoaderId;
  let initialFingerprint, bundle, loader, sourceRecord, userscript = false, inChecks = false, originalError, scenarioSha256;
  let stickyError, coverageStarted = false, finalized = false, activeGuard;
  let activeDrain, nextDrainId = 0;
  let checkedScriptIds = new Set(), verifiedScriptIds = new Set();
  const enabled = [], receipts = [], pendingBatches = [];
  const requiredModules = new Set();
  const scripts = new Map(), contexts = new Map(), coverage = new Map();
  const allLogs = [], responses = new Map(), finishedRequests = new Set(), savedResources = new Map();
  const recordError = (error, where) => {
    result.errors.push({ phase: where, ...errorRecord(error) });
    stickyError ??= error;
  };
  const bounded = (label, operation, limit = timeoutMs) => raceTimeout(label, limit, operation, message => new Blocked(message));
  async function save(name, value, append = false) {
    try {
      const text = JSON.stringify(value, null, append ? undefined : 2) + '\n';
      await fs[append ? 'appendFile' : 'writeFile'](path.join(artifactDir, name), text);
    } catch (error) { recordError(error, `${phase}:save:${name}`); throw error; }
  }
  async function command(method, params = {}) {
    if (controller.signal.aborted && !phase.startsWith('finally')) throw controller.signal.reason;
    const row = { runId, roundId, phase, method, params: structuredClone(params), at: new Date().toISOString() };
    let failure;
    try { row.result = await bounded(method, () => page.cdp(method, params, { timeout: timeoutMs })); }
    catch (error) { row.error = errorRecord(error); failure = error; }
    receipts.push(row);
    if (failure) throw failure;
    return row.result;
  }
  function commandSummary() {
    const byMethod = new Map();
    for (const row of receipts) {
      const entry = byMethod.get(row.method) ?? { method: row.method, count: 0 };
      entry.count += 1;
      byMethod.set(row.method, entry);
    }
    return { receiptCount: receipts.length,
      byMethod: [...byMethod.values()].sort((a, b) => b.count - a.count || a.method.localeCompare(b.method)),
      note: 'Full receipts are persisted only for rounds that did not pass.' };
  }
  async function persistCommandReceipts(observed) {
    if (observed !== 'passed') {
      await fs.writeFile(path.join(artifactDir, 'commands.jsonl'),
        receipts.map(row => JSON.stringify(row) + '\n').join(''));
      return;
    }
    await fs.writeFile(path.join(artifactDir, 'commands.json'), JSON.stringify(commandSummary(), null, 2) + '\n');
  }
  function consume(events) {
    for (const event of events) {
      const index = eventIndex++;
      if (!navigationStarted) continue;
      const p = event.params ?? {};
      if (event.method === 'Page.frameNavigated' && !p.frame.parentId) {
        if (p.frame.loaderId !== initialFrame?.loaderId && p.frame.loaderId !== documentState?.loaderId) {
          documentState = { ...p.frame, eventIndex: index };
          scripts.clear(); contexts.clear(); coverage.clear(); responses.clear(); finishedRequests.clear(); savedResources.clear();
          originalSite = undefined; readerReady = false;
        }
      }
      if (!documentState) continue;
      switch (event.method) {
        case 'Runtime.executionContextsCleared':
          contexts.clear(); scripts.clear(); coverage.clear(); readerReady = false;
          break;
        case 'Runtime.executionContextCreated':
          if (p.context.auxData?.frameId === documentState.id) contexts.set(p.context.id, { ...p.context, loaderId: documentState.loaderId, eventIndex: index });
          break;
        case 'Runtime.executionContextDestroyed':
          contexts.delete(p.executionContextId);
          break;
        case 'Debugger.scriptParsed':
          if (contexts.has(p.executionContextId)) scripts.set(p.scriptId, { ...p, loaderId: documentState.loaderId, eventIndex: index });
          break;
        case 'Network.responseReceived':
          if (p.loaderId === documentState.loaderId) responses.set(p.requestId, p);
          break;
        case 'Network.loadingFinished': finishedRequests.add(p.requestId); break;
        case 'Network.webSocketFrameReceived': {
          if (sourceRecord?.kind !== 'vite') break;
          let payload;
          try { payload = JSON.parse(p.response.payloadData); } catch { break; }
          if (['update', 'full-reload', 'error', 'prune'].includes(payload.type)) {
            stickyError ??= new Blocked('Vite HMR invalidated this round', payload);
          }
          break;
        }
        case 'Runtime.consoleAPICalled':
        case 'Runtime.exceptionThrown':
        case 'Log.entryAdded': {
          const contextId = p.executionContextId ?? p.exceptionDetails?.executionContextId;
          if (contextId !== undefined && !contexts.has(contextId)) break;
          allLogs.push({ event, document: { frameId: documentState.id, loaderId: documentState.loaderId }, eventIndex: index });
          break;
        }
      }
    }
  }
  function drainRecord(state) {
    return { id: state.id, label: state.label, startedAt: state.startedAt, timedOut: state.timedOut,
      endedAt: state.endedAt, error: state.error && errorRecord(state.error) };
  }
  function startDrain(label) {
    const state = { id: ++nextDrainId, label, startedAt: new Date().toISOString(),
      timedOut: false, settled: false, error: undefined };
    activeDrain = state;
    collecting = true;
    result.eventCollection.maxConcurrent = Math.max(result.eventCollection.maxConcurrent, 1);
    state.promise = (async () => {
      try {
        const events = await page.events();
        const batch = { runId, roundId, page: result.page, phase: label, sequence: sequence++,
          recordedAt: new Date().toISOString(), events };
        pendingBatches.push(batch);
        await save('events.jsonl', batch, true);
        pendingBatches.pop();
        requireCondition(Array.isArray(events), 'page.events did not return a CDP event array');
        consume(events);
        return { ok: true, batch };
      } catch (error) {
        state.error = error;
        recordError(error, `${label}:events`);
        return { ok: false, error };
      } finally {
        state.settled = true;
        state.endedAt = new Date().toISOString();
        if (activeDrain === state) activeDrain = undefined;
        collecting = false;
      }
    })();
    // The state promise resolves to an outcome, so a late page.events() failure
    // cannot become an unhandled rejection after the caller has timed out.
    return state;
  }
  async function drain(label, waitMs = timeoutMs) {
    const state = activeDrain ?? startDrain(label);
    if (state.timedOut && state === activeDrain && waitMs === timeoutMs) throw state.timeoutError;
    try {
      const outcome = await bounded('page.events', () => state.promise, waitMs);
      if (!outcome.ok) throw outcome.error;
    } catch (error) {
      if (!state.settled && error?.name === 'PreflightBlocked' && /^page\.events timed out after /.test(error.message)) {
        state.timedOut = true;
        state.timeoutError ??= error;
        if (!result.eventCollection.timeouts.some(item => item.id === state.id)) {
          result.eventCollection.timeouts.push({ ...drainRecord(state), timeout: errorRecord(error) });
          recordError(error, `${label}:events`);
        }
      }
      throw error;
    }
  }
  // Drain periodically during navigation/UI waits, using the same single consumer.
  async function action(label, callback) {
    phase = label;
    const row = { name: label, startedAt: new Date().toISOString(), observed: 'incomplete' };
    result.phases.push(row);
    let settled = false, value, failure;
    const operation = bounded(label, () => callback({ signal: controller.signal, timeoutMs })).then(
      v => { value = v; settled = true; }, e => { failure = e; settled = true; });
    try {
      while (!settled) {
        await Promise.race([operation, delay(Math.min(100, timeoutMs))]);
        if (!settled) await drain(`${label}:waiting`);
      }
      if (failure) throw failure;
      row.receipt = value;
      row.observed = 'executed';
      return value;
    } catch (error) {
      controller.abort(error);
      row.observed = inChecks && error instanceof ProductAssertion ? 'failed' : 'blocked';
      row.error = errorRecord(error);
      throw error;
    } finally {
      row.endedAt = new Date().toISOString();
      try { await drain(`${label}:after`); }
      catch (error) { if (!failure) throw error; }
    }
  }
  async function observe(label) {
    phase = label;
    const observation = await bounded('page observation', () => page.evaluate(observePage));
    const layout = await command('Page.getLayoutMetrics');
    const record = { phase: label, document: documentState, actual: observation, expected, layout,
      emulation: receipts.filter(r => r.method.startsWith('Emulation.')),
      mobileEvidence: 'Command parameters and successful CDP receipt only; no direct mobile readback exists.' };
    result.environments.push(record);
    await save('environments.jsonl', record, true);
    return observation;
  }
  function environment(actual, strict) {
    for (const [method, params] of [
      ['Emulation.setDeviceMetricsOverride', { width: expected.width, height: expected.height, deviceScaleFactor: expected.dpr, mobile: expected.mobile }],
      ['Emulation.setTouchEmulationEnabled', expected.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }],
    ]) {
      const receipt = receipts.findLast(r => r.method === method);
      requireCondition(receipt && !receipt.error && receipt.result && Object.entries(params).every(([k, v]) => receipt.params[k] === v), 'Emulation command receipt mismatch', { method, expected: params, receipt });
    }
    requireCondition(Number.isFinite(actual.dpr) && Math.abs(actual.dpr - expected.dpr) <= 1e-6, 'DPR mismatch', { expected, actual });
    requireCondition(actual.touchPoints === expected.touchPoints && actual.coarse === expected.coarse, 'Touch capability mismatch', { expected, actual });
    if (strict) requireCondition(actual.width === expected.width && actual.height === expected.height, 'Reader CSS viewport mismatch', { expected, actual });
  }
  // TextReq timeout/429 errors are transient network failures; retain them without blocking preparation.
  function isRetryableTextReqError(log) {
    const text = log.event.params?.args?.[0]?.value || log.event.params?.entry?.text || '';
    return typeof text === 'string'
      && text.includes('TextReq: request error')
      && text.includes('retry:')
      && (text.includes('timed out') || text.includes(': 429'));
  }

  function checkLogs() {
    result.logs = allLogs.map(row => {
      const { method, params: p } = row.event;
      const severe = method === 'Runtime.exceptionThrown' || p.type === 'error' || p.entry?.level === 'error';
      const trace = p.stackTrace ?? p.exceptionDetails?.stackTrace ?? p.entry?.stackTrace;
      const frames = trace?.callFrames ?? [];
      const urls = [...frames.map(f => f.url), p.entry?.url, p.exceptionDetails?.url].filter(u => /^https?:\/\//.test(u ?? ''));
      const productByScript = frames.some(f => result.identity.some(i => i.verified && i.scriptId === f.scriptId));
      const productByUrl = sourceRecord?.kind === 'vite' && urls.some(url => result.identity.some(i => i.verified && i.url === url));
      const product = productByScript || productByUrl;
      const attribution = product ? 'ehunter' : urls.length ? 'host-or-third-party' : 'unattributed';
      const retryableTextReqError = severe && isRetryableTextReqError(row);
      const impact = retryableTextReqError
        ? 'retained-for-caller-review'
        : severe
          ? (attribution === 'host-or-third-party' ? 'retained-for-caller-review' : 'blocks-preparation')
          : 'diagnostic';
      return { ...row, attribution, impact, severe, retryableTextReqError };
    });
    requireCondition(!result.logs.some(l => l.document.loaderId === documentState?.loaderId && l.severe && l.attribution === 'ehunter' && !isRetryableTextReqError(l)), 'eHunter runtime/initialization error', result.logs.filter(l => l.severe && !isRetryableTextReqError(l)));
    requireCondition(!result.logs.some(l => l.document.loaderId === documentState?.loaderId && l.severe && l.attribution === 'unattributed'), 'Unattributed runtime error requires investigation', result.logs.filter(l => l.severe));
    if (stickyError) throw stickyError;
  }
  async function scenarioIdentity() {
    const files = [];
    for (const input of scenarioInputs) files.push({ path: input, ...identity(await fs.readFile(path.resolve(ROOT, input))) });
    return { files, sha256: sha(JSON.stringify(files)) };
  }
  async function unchanged() {
    const current = userscript
      ? { bundle: identity(await fs.readFile(sourceRecord.bundlePath)), loader: identity(await fs.readFile(sourceRecord.loaderPath)) }
      : await fingerprint(ROOT, [...INPUTS, ...(sourceRecord.inputs ?? [])]);
    const scenario = await scenarioIdentity();
    await save('fingerprints.jsonl', { phase, recordedAt: new Date().toISOString(), current, scenarioInputs: scenario.files, scenarioInputsSha256: scenario.sha256 }, true);
    requireCondition(JSON.stringify(current) === JSON.stringify(initialFingerprint), 'Source inputs changed during this round', { initial: initialFingerprint, current });
    requireCondition(scenario.sha256 === scenarioSha256, 'Scenario inputs changed during this round', { initial: scenarioSha256, current: scenario.sha256 });
  }
  function projectUrl(url) {
    if (!url) return false;
    const parsed = new URL(url);
    if (parsed.origin !== sourceRecord.origin) return false;
    const pathname = decodeURIComponent(parsed.pathname);
    if (pathname.includes('/node_modules/') || pathname.startsWith('/@vite/') || pathname.startsWith('/@id/')) return false;
    if (pathname.startsWith('/@fs/')) return inside(ROOT, pathname.slice(4));
    return !pathname.startsWith('/@');
  }
  async function verifyIdentity(extraRequired = []) {
    phase = `${phase}:identity`;
    await drain(phase);
    const frame = (await command('Page.getFrameTree')).frameTree.frame;
    requireCondition(documentState && documentState.id === frame.id && documentState.loaderId === frame.loaderId && frame.loaderId !== initialFrame.loaderId,
      'New current-document commit evidence missing', { initialFrame, documentState, frame });
    if (sourceRecord.kind === 'eh') requireCondition(/^https:\/\/(exhentai\.org|e-hentai\.org)\/s\//.test(frame.url), 'EH /s/ page prerequisite missing', frame);
    else if (sourceRecord.kind === 'nh') requireCondition(/^https:\/\/nhentai\.net\/g\/\d+\/\d+\//.test(frame.url), 'NH /g/<id>/<page>/ page prerequisite missing', frame);
    else requireCondition(new URL(frame.url).origin === sourceRecord.origin, 'Vite document is outside the attributed origin', frame);
    const deadline = Date.now() + timeoutMs;
    // GM loader fetch/eval can finish after the document's load event. Wait for
    // this round's script events, never for loader text or a historical mount.
    while (true) {
      const current = [...scripts.values()].filter(s => contexts.has(s.executionContextId));
      const present = userscript
        ? current.some(s => s.length === bundle.length)
        : [...requiredModules, ...extraRequired.map(u => new URL(u, sourceRecord.origin).href)].every(u => current.some(s => s.url === u));
      if (present || Date.now() >= deadline) break;
      await delay(Math.min(100, timeoutMs));
      await drain(`${phase}:scripts-waiting`);
    }
    await unchanged();
    async function collectCoverage() {
      const taken = await command('Profiler.takePreciseCoverage');
      for (const entry of taken.result) {
        const script = scripts.get(entry.scriptId);
        if (!script) continue;
        // Counters reset on every take. Keep only the executed full-length top
        // range for this current-document script; raw coverage is on disk.
        const top = entry.functions.find(f => f.ranges[0]?.startOffset === 0 && f.ranges[0]?.endOffset === script.length && f.ranges[0]?.count > 0);
        if (top) coverage.set(entry.scriptId, top);
      }
    }
    if (coverageStarted) await collectCoverage();
    const active = [...scripts.values()].filter(s => contexts.has(s.executionContextId) && s.loaderId === frame.loaderId);
    // EH sources must be inspected before classification: URL and length cannot
    // exclude an older bundle or a static userscript wrapper.
    const candidates = userscript ? active : active.filter(s => projectUrl(s.url));
    const rows = [];
    for (const script of candidates) {
      controller.signal.throwIfAborted();
      const actual = (await command('Debugger.getScriptSource', { scriptId: script.scriptId })).scriptSource;
      let expectedSource = bundle, http;
      if (sourceRecord.kind === 'vite') {
        const response = await fetch(script.url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error', headers: { accept: '*/*' } });
        expectedSource = await response.text();
        http = { status: response.status, url: response.url };
        requireCondition(response.ok, 'Vite expected source fetch failed', http);
      }
      while (coverageStarted && expectedSource === actual && !coverage.has(script.scriptId) && Date.now() < deadline) {
        await delay(Math.min(100, timeoutMs));
        await drain(`${phase}:execution-waiting`);
        await collectCoverage();
      }
      const recordedTop = coverage.get(script.scriptId);
      const topLevel = recordedTop?.ranges[0]?.endOffset === actual.length ? recordedTop : undefined;
      const row = { scriptId: script.scriptId, url: script.url, context: contexts.get(script.executionContextId),
        frameId: frame.id, loaderId: frame.loaderId, expected: identity(expectedSource), actual: identity(actual),
        exact: expectedSource === actual, difference: expectedSource === actual ? undefined : firstDivergence(expectedSource, actual),
        topLevel, http,
        fullBundleCandidate: userscript && isProductionBundle(actual, bundle, result.permissions.production.name),
        verified: expectedSource === actual && !!topLevel };
      rows.push(row);
      await fs.writeFile(path.join(artifactDir, `source-${row.actual.sha256}.js`), actual);
      await fs.writeFile(path.join(artifactDir, `source-${row.expected.sha256}.js`), expectedSource);
    }
    result.identity = rows;
    if (sourceRecord.kind === 'vite') {
      for (const url of extraRequired) requiredModules.add(new URL(url, sourceRecord.origin).href);
      const loaded = new Set(rows.map(r => r.url));
      const inputFiles = initialFingerprint.files.map(f => f.path);
      const loadedPaths = new Set(rows.map(r => decodeURIComponent(new URL(r.url).pathname)).map(p => p.startsWith('/@fs/') ? path.relative(ROOT, p.slice(4)) : p.slice(1)));
      result.inventory = {
        requiredModules: [...requiredModules], missingRequired: [...requiredModules].filter(u => !loaded.has(u)),
        loaded: rows.map(r => ({ url: r.url, scriptId: r.scriptId })),
        notLoadedInputs: inputFiles.filter(p => !loadedPaths.has(p)),
        thirdParty: active.filter(s => !projectUrl(s.url)).map(s => ({ url: s.url, scriptId: s.scriptId })),
        lockfile: initialFingerprint.files.find(f => f.path === 'package-lock.json'),
        boundary: 'Only listed current-document project JS modules have identity/execution evidence. Unloaded inputs are not execution coverage. Independent assets need response/application and visual review.',
      };
    }
    await save('identity.jsonl', { phase, document: documentState, rows, inventory: result.inventory }, true);
    if (userscript) {
      const bundleRows = rows.filter(row => row.fullBundleCandidate);
      requireCondition(bundleRows.length === 1, 'Exactly one current production bundle candidate is required', bundleRows);
      requireCondition(bundleRows[0].verified, 'Exact source or full-length top-level execution evidence missing', bundleRows);
    } else {
      requireCondition(rows.length && rows.every(row => row.verified), 'Exact source or full-length top-level execution evidence missing', rows);
    }
    requireCondition(!result.inventory?.missingRequired.length, 'Required Vite modules are missing', result.inventory?.missingRequired);
    const finalFrame = (await command('Page.getFrameTree')).frameTree.frame;
    requireCondition(finalFrame.loaderId === frame.loaderId && documentState.loaderId === frame.loaderId, 'Document changed during identity collection');
    checkedScriptIds = new Set(rows.map(row => row.scriptId));
    verifiedScriptIds = new Set(rows.filter(row => userscript ? row.fullBundleCandidate && row.verified : row.verified).map(row => row.scriptId));
    checkLogs();
  }
  async function identityIsCurrent() {
    await drain(`${phase}:identity-current`);
    const current = [...scripts.values()].filter(s => contexts.has(s.executionContextId) && s.loaderId === documentState?.loaderId);
    const relevant = userscript ? current : current.filter(s => projectUrl(s.url));
    const bundleRows = result.identity.filter(r => r.fullBundleCandidate);
    const hasExecution = userscript
      ? bundleRows.length === 1 && bundleRows[0].verified && verifiedScriptIds.has(bundleRows[0].scriptId)
        && relevant.some(s => s.scriptId === bundleRows[0].scriptId)
      : result.identity.some(r => r.verified && r.loaderId === documentState?.loaderId && relevant.some(s => s.scriptId === r.scriptId));
    if (!hasExecution) return false;
    if (userscript) {
      // Host pages can keep injecting unrelated scripts after the userscript has
      // executed. Inspect late scripts once, but do not make each checkpoint
      // wait for an otherwise irrelevant host inventory to stop changing.
      for (const script of relevant) {
        if (checkedScriptIds.has(script.scriptId)) continue;
        const actual = (await command('Debugger.getScriptSource', { scriptId: script.scriptId })).scriptSource;
        const actualIdentity = identity(actual);
        const fullBundleCandidate = isProductionBundle(actual, bundle, result.permissions.production.name);
        result.identity.push({
          scriptId: script.scriptId,
          url: script.url,
          context: contexts.get(script.executionContextId),
          frameId: documentState.id,
          loaderId: documentState.loaderId,
          expected: identity(bundle),
          actual: actualIdentity,
          exact: actual === bundle,
          fullBundleCandidate,
          verified: false,
        });
        await fs.writeFile(path.join(artifactDir, `source-${actualIdentity.sha256}.js`), actual);
        checkedScriptIds.add(script.scriptId);
        if (fullBundleCandidate) return false;
      }
      await save('identity.jsonl', { phase, document: documentState, rows: result.identity, inventory: result.inventory }, true);
      return true;
    }
    return relevant.every(s => checkedScriptIds.has(s.scriptId)
      && result.identity.some(r => r.scriptId === s.scriptId && r.loaderId === s.loaderId && r.context.id === s.executionContextId))
      && relevant.every(s => verifiedScriptIds.has(s.scriptId));
  }
  async function resources() {
    if (sourceRecord.kind !== 'vite') return;
    for (const [id, response] of responses) {
      if (savedResources.has(id) || !finishedRequests.has(id) || !['Stylesheet', 'Image', 'Font'].includes(response.type)) continue;
      const row = { ...response, scope: 'Response captured; application observations are in environments.jsonl. Visual review remains external.' };
      // Third-party resource bodies may not be available; retain response metadata
      // without claiming those resources were checked against local files.
      if (new URL(response.response.url).origin === sourceRecord.origin) {
        const body = await command('Network.getResponseBody', { requestId: id });
        const bytes = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8');
        row.body = identity(bytes);
        row.file = `resource-${row.body.sha256}`;
        await fs.writeFile(path.join(artifactDir, row.file), bytes);
      }
      savedResources.set(id, row);
    }
    result.resources = [...savedResources.values()];
    await save('resources.json', result.resources);
  }
  async function waitForReader(label, wantOpen) {
    const deadline = Date.now() + timeoutMs;
    let actual;
    do {
      await drain(`${label}:waiting`);
      actual = await bounded('reader observation', () => page.evaluate(observePage));
      checkLogs();
      requireCondition(!actual.overlay, 'Vite error overlay is present');
      if (wantOpen ? actual.mounted && actual.open : !actual.open) return actual;
      await delay(Math.min(100, timeoutMs));
    } while (Date.now() < deadline);
    throw new Blocked(`${label} timed out`, actual);
  }
  async function prepare(label = 'prepare-reader') {
    phase = label;
    await verifyIdentity();
    let actual = await observe(`${label}:before`);
    await drain(`${label}:before-ui`);
    environment(actual, false);
    requireCondition(!actual.overlay, 'Vite error overlay is present');
    checkLogs();
    if (!actual.open) {
      originalSite ??= { document: documentState, observation: actual };
      requireCondition(typeof prepareReader === 'function', 'Reader is closed; normal UI preparation callback is required');
      await action(label, prepareReader);
    }
    await waitForReader(label, true);
    await verifyIdentity();
    actual = await observe(`${label}:opened`);
    environment(actual, true);
    readerReady = true;
    preparedLoaderId = documentState.loaderId;
  }
  async function checkpoint(label = 'checkpoint', { requiredModules: extraRequired = [] } = {}) {
    if (stickyError) throw stickyError;
    const deadline = Date.now() + timeoutMs;
    do {
      phase = label;
      await verifyIdentity(extraRequired);
      if (preparedLoaderId !== documentState.loaderId) await prepare(`${label}:new-document`);
      const actual = await observe(label);
      requireCondition(readerReady && actual.mounted && actual.open && !actual.overlay, 'Reader must be prepared before functionality or screenshots', actual);
      environment(actual, true);
      await resources();
      await drain(`${label}:checked`);
      checkLogs();
      // Inspect late scripts without another page.evaluate: the observation
      // itself may create an anonymous script in the EH document.
      while (!(await identityIsCurrent())) {
        requireCondition(Date.now() < deadline, 'Module/document inventory did not stabilize at checkpoint');
        await verifyIdentity(extraRequired);
        if (preparedLoaderId !== documentState.loaderId) break;
        await drain(`${label}:reidentified`);
        checkLogs();
      }
      if (await identityIsCurrent()) return actual;
    } while (Date.now() < deadline);
    throw new Blocked('Module/document inventory did not stabilize at checkpoint');
  }
  async function guarded(callback) {
    requireCondition(!finalized, 'This preflight round has already ended');
    controller.signal.throwIfAborted();
    if (stickyError) throw stickyError;
    requireCondition(!activeGuard, 'Protected browser actions must be awaited sequentially');
    const operation = callback();
    activeGuard = operation;
    try { return await operation; }
    catch (error) { recordError(error, phase); controller.abort(error); throw error; }
    finally { activeGuard = undefined; }
  }
  const api = {
    checkpoint: (...args) => guarded(() => checkpoint(...args)),
    phase: (name, callback, options = {}) => guarded(async () => {
      await checkpoint(`${name}:before`);
      const value = await action(name, callback);
      await checkpoint(`${name}:after`, options);
      return value;
    }),
    screenshot: (name) => guarded(async () => {
      requireCondition(/^[\w-]+\.png$/.test(name), 'Screenshot name must be a simple .png filename');
      await checkpoint(`screenshot:${name}:before`);
      const file = path.join(artifactDir, name);
      const receipt = await action(`screenshot:${name}`, () => page.screenshot({ path: file, scale: 'css' }));
      requireCondition((await fs.stat(file)).size > 0, 'Screenshot file was not saved');
      await checkpoint(`screenshot:${name}:after`);
      result.screenshots.push({ file, scale: 'css', raw: false, receipt, visualReview: 'unrun' });
      return file;
    }),
    closeReader: callback => guarded(async () => {
      await checkpoint('close-reader:before');
      requireCondition(originalSite?.document.loaderId === documentState.loaderId, 'Original-site viewport baseline missing; start a fresh round with the reader closed');
      await action('close-reader', callback);
      await waitForReader('close-reader', false);
      await verifyIdentity();
      const actual = await observe('close-reader:restored');
      environment(actual, false);
      requireCondition(JSON.stringify(actual.meta) === JSON.stringify(originalSite.observation.meta), 'Original-site viewport meta was not restored', { original: originalSite.observation, actual });
      readerReady = false;
      result.viewportRestoration = { original: originalSite, actual, verified: true };
    }),
    openReader: () => guarded(() => prepare('reopen-reader')),
    assert: (condition, message, details) => {
      if (!condition) {
        const error = new ProductAssertion(message, details);
        recordError(error, phase);
        throw error;
      }
    },
    signal: controller.signal,
  };

  try {
    requireCondition(expected, 'profile must be desktop or mobile');
    requireCondition(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60000, 'timeoutMs must be in (0, 60000]');
    requireCondition(Number.isFinite(checksTimeoutMs) && checksTimeoutMs > 0 && checksTimeoutMs <= 600000, 'checksTimeoutMs must be in (0, 600000]');
    requireCondition(Array.isArray(scenarioInputs) && scenarioInputs.length > 0, 'scenarioInputs must declare at least one repository-relative input');
    requireCondition(taskSpace === undefined || (typeof taskSpace === 'string' && taskSpace.trim() !== ''), 'taskSpace must be a nonempty string when provided');
    const scenarioFiles = [];
    const scenarioPaths = new Set();
    for (const input of scenarioInputs) {
      requireCondition(typeof input === 'string' && input.trim() !== '' && !path.isAbsolute(input), 'scenarioInputs entries must be repository-relative paths', { input });
      const absolute = path.resolve(ROOT, input);
      requireCondition(inside(ROOT, absolute), 'Scenario input escapes repository', { input });
      requireCondition(!scenarioPaths.has(absolute), 'scenarioInputs must not repeat a path', { input });
      const stat = await fs.lstat(absolute);
      requireCondition(stat.isFile() && !stat.isSymbolicLink(), 'Scenario input must be a regular repository file', { input });
      scenarioPaths.add(absolute);
      scenarioFiles.push({ path: input, ...identity(await fs.readFile(absolute)) });
    }
    scenarioSha256 = sha(JSON.stringify(scenarioFiles));
    requireCondition(path.isAbsolute(artifactDir) && inside(path.join(ROOT, '.tmp'), artifactDir), 'artifactDir must be absolute and inside this repository .tmp');
    // Check the nearest existing ancestor before creating directories (including
    // symlink escapes). The final run directory must be fresh, never overwritten.
    let ancestor = path.dirname(artifactDir);
    while (true) {
      try { ancestor = await fs.realpath(ancestor); break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; ancestor = path.dirname(ancestor); }
    }
    const realRoot = await fs.realpath(ROOT);
    requireCondition(ancestor === realRoot || inside(path.join(realRoot, '.tmp'), ancestor) || ancestor === path.join(realRoot, '.tmp'), 'artifactDir ancestor escapes repository .tmp');
    await fs.mkdir(path.dirname(artifactDir), { recursive: true });
    await fs.mkdir(artifactDir);
    result.artifactVersion = 1;
    result.provenance = {
      artifactVersion: 1, runId, roundId, artifactDir, result: 'result.json',
      sourceKind: source?.kind ?? null, url: null, profile, viewport: expected,
      page: result.page, taskSpace: taskSpace ?? null,
      scenarioInputs: scenarioFiles, scenarioInputsSha256: scenarioSha256,
      source: null, startedAt: result.startedAt,
    };
    await fs.writeFile(path.join(artifactDir, 'manifest.json'), JSON.stringify({ ...result, expected, source, state: 'incomplete', eventBufferCompleteness: 'CDP buffer capacity unknown; hard termination cannot guarantee finally.' }, null, 2) + '\n', { flag: 'wx' });
    readyToWrite = true;
    sourceRecord = structuredClone(source);
    requireCondition(['eh', 'nh', 'vite'].includes(sourceRecord?.kind), 'source.kind must be eh, nh or vite');
    userscript = sourceRecord.kind === 'eh' || sourceRecord.kind === 'nh';
    async function evidence(file) {
      requireCondition(typeof file === 'string' && inside(ROOT, path.resolve(ROOT, file)), 'Evidence must be a repository file', { file });
      requireCondition((await fs.stat(path.resolve(ROOT, file))).isFile(), 'Evidence must be a readable file', { file });
      await fs.access(path.resolve(ROOT, file));
    }
    if (userscript) {
      bundle = await fs.readFile(sourceRecord.bundlePath, 'utf8');
      loader = await fs.readFile(sourceRecord.loaderPath, 'utf8');
      initialFingerprint = { bundle: identity(await fs.readFile(sourceRecord.bundlePath)), loader: identity(await fs.readFile(sourceRecord.loaderPath)) };
      requireCondition(identity(bundle).sha256 === initialFingerprint.bundle.sha256, 'Bundle is not exact UTF-8 text');
      result.permissions = permissions(bundle, loader, sourceRecord.bundleUrl);
      await save('permissions.json', result.permissions);
      requireCondition(result.permissions.verified, 'Repository userscript permissions mismatch', result.permissions);
      const productionName = result.permissions.production.name, loaderName = result.permissions.repositoryLoader.name;
      requireCondition(productionName && loaderName && productionName !== loaderName,
        'Production and loader need distinct nonempty metadata names', { productionName, loaderName });
      requireCondition(sourceRecord.build?.exitCode === 0, 'Successful production build record required');
      await evidence(sourceRecord.build.evidence);
      result.installation = sourceRecord.installation;
      const requiredInstallation = sourceRecord.kind === 'nh'
        ? ['dynamicLoaderEnabled', 'staticScriptDisabled']
        : ['loggedIn', 'dynamicLoaderEnabled', 'staticScriptDisabled'];
      requireCondition(requiredInstallation.every(k => result.installation?.[k] === true), 'Browser installation/login prerequisites unconfirmed', result.installation);
      await evidence(result.installation.evidence);
    } else {
      const service = sourceRecord.service;
      requireCondition(sourceRecord.origin === new URL(sourceRecord.origin).origin && service?.origin === sourceRecord.origin && service.cwd === ROOT && Number.isInteger(service.pid) && service.pid > 0,
        'Attributed Vite service record required', service);
      await evidence(service.evidence);
      requireCondition(Array.isArray(sourceRecord.requiredModules) && sourceRecord.requiredModules.length, 'Required Vite module list must be explicit');
      for (const url of ['/src/main.ts', ...sourceRecord.requiredModules]) requiredModules.add(new URL(url, sourceRecord.origin).href);
      requireCondition([...requiredModules].every(projectUrl), 'Required modules must be exact project URLs on the attributed origin');
      initialFingerprint = await fingerprint(ROOT, [...INPUTS, ...(sourceRecord.inputs ?? [])]);
    }
    result.provenance.source = userscript
      ? { kind: sourceRecord.kind,
        bundle: { path: sourceRecord.bundlePath, sha256: initialFingerprint.bundle.sha256 },
        loader: { path: sourceRecord.loaderPath, sha256: initialFingerprint.loader.sha256 } }
      : { kind: 'vite', fingerprint: initialFingerprint.sha256, files: initialFingerprint.files };
    await save('source.json', { artifactVersion: 1, source: sourceRecord, initialFingerprint });
    for (const domain of ['Runtime', 'Log', 'Page', 'Network', 'Debugger', 'Profiler']) {
      enabled.push(domain);
      await command(`${domain}.enable`);
    }
    coverageStarted = true;
    await command('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    await command('Emulation.setDeviceMetricsOverride', { width: expected.width, height: expected.height, deviceScaleFactor: expected.dpr, mobile: expected.mobile });
    await command('Emulation.setTouchEmulationEnabled', expected.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    initialFrame = (await command('Page.getFrameTree')).frameTree.frame;
    await drain('before-navigation-old-document');
    navigationStarted = true;
    await action('navigation', navigate);
    // Loading modules and async platform initialization can continue after commit.
    // Wait for document readiness; a closed EH reader may not yet be mounted.
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const observed = await bounded('document readiness', () => page.evaluate(observePage));
      await drain('after-navigation-load');
      requireCondition(!observed.overlay, 'Vite error overlay is present');
      if (observed.readyState === 'complete') break;
      requireCondition(Date.now() < deadline, 'Document load timed out', observed);
      await delay(Math.min(100, timeoutMs));
    }
    await prepare();
    await checkpoint('preflight-complete');
    result.preparation = 'verified';
    result.checks = 'running';
    inChecks = true;
    // The phase methods own event collection. An outer action polling here
    // would race their drains and consume their evidence.
    await bounded('functional-checks', () => runChecks(api), checksTimeoutMs);
    // A deliberately closed reader is allowed at the end, with restoration proof.
    if (readerReady) await checkpoint('checks-complete');
    else { await verifyIdentity(); await unchanged(); }
    result.checks = 'executed';
  } catch (error) {
    originalError = error;
    controller.abort(error);
    // Stop an already-running protected stage before final collection. The
    // caller may ignore its AbortSignal, but it cannot start another stage.
    if (activeGuard) {
      try { await bounded('aborted-stage', () => activeGuard); }
      catch (cleanupError) { recordError(cleanupError, 'aborted-stage'); }
    }
    recordError(error, phase);
    result.checks = inChecks ? (error instanceof ProductAssertion ? 'failed' : 'blocked') : 'unrun';
  } finally {
    finalized = true;
    if (readyToWrite) {
      phase = 'finally';
      for (const cleanup of [
        () => drain('finally', EVENT_DRAIN_GRACE_MS),
        ...(inChecks && !originalError ? [async () => {
          if (!(await identityIsCurrent())) await verifyIdentity();
          requireCondition(await identityIsCurrent(), 'New script/document arrived after the last identity checkpoint');
        }] : []),
        ...(initialFingerprint ? [() => unchanged()] : []),
        ...(coverageStarted ? [async () => {
          await command('Profiler.stopPreciseCoverage');
          coverageStarted = false;
        }] : []),
        () => drain('finally-after-coverage'),
        ...(inChecks && !originalError ? [async () => {
          // Late sources remain inspectable while Debugger is enabled. New
          // production scripts need their own execution evidence even at shutdown.
          if (!(await identityIsCurrent())) await verifyIdentity();
          requireCondition(await identityIsCurrent(), 'New script/document arrived during final collection');
        }] : []),
        ...enabled.slice().reverse().map(domain => () => command(`${domain}.disable`)),
        () => drain('finally-after-disable'),
      ]) {
        try { await cleanup(); } catch (error) { recordError(error, 'finally'); }
      }
      try {
        checkLogs();
        if (inChecks && !originalError) requireCondition(await identityIsCurrent(), 'New script/document arrived during final collection');
      } catch (error) { recordError(error, 'finally:logs'); }
      result.eventCollection.unresolved = activeDrain && !activeDrain.settled ? [drainRecord(activeDrain)] : [];
      result.unsaved = pendingBatches;
      result.endedAt = new Date().toISOString();
      result.provenance.url = documentState?.url ?? null;
      // A product failure remains visible even if saving also failed, but an
      // incomplete evidence set cannot be a successful helper run.
      result.observed = result.errors.some(e => e.name !== 'ProductAssertion') ? 'blocked'
        : result.errors.length ? 'failed' : 'passed';
      if (result.preparation !== 'verified') result.preparation = 'blocked';
      try { await persistCommandReceipts(result.observed); }
      catch (error) {
        recordError(error, 'finally:commands');
        result.observed = 'blocked';
      }
      try {
        await save('result.pending.json', result);
        await fs.rename(path.join(artifactDir, 'result.pending.json'), path.join(artifactDir, 'result.json'));
      } catch (error) {
        recordError(error, 'finally:result');
        result.observed = 'blocked';
      }
    } else {
      result.observed = 'blocked'; result.preparation = 'blocked'; result.endedAt = new Date().toISOString();
    }
    if (result.observed !== 'passed') {
      console.error(JSON.stringify({ browserPreflight: result.observed, artifactDir, errors: result.errors, unsavedBatches: pendingBatches }));
    }
  }
  if (result.observed !== 'passed') throw new BrowserPreflightError(result, originalError ?? stickyError);
  return result;
}

// --- Interaction primitives -------------------------------------------------
//
// These are exported on their own (NOT behind `guarded`) because scenario code
// calls them from inside `check.phase()` callbacks. Going through `guarded`
// would immediately trip 'Protected browser actions must be awaited
// sequentially'. Each helper only issues CDP input commands, never navigates.
//
// `page.mouse.*` is deliberately avoided: in the Ego page model
// `page.mouse.move({ steps })` takes roughly one second per step, which alone
// exhausts the round's 60s timeout budget. `Input.dispatchMouseEvent` is
// millisecond-scale.

const CLICK_SETTLE_MS = 80;

/** Dispatch one CDP mouse event, filling wire fields `page.mouse.*` would add. */
export async function dispatchMouse(page, { type, x, y, button = 'left', buttons, clickCount = 1 } = {}) {
  const pressed = type === 'mousePressed';
  const released = type === 'mouseReleased';
  return page.cdp('Input.dispatchMouseEvent', {
    type,
    x: Math.round(x),
    y: Math.round(y),
    button: pressed || released ? button : 'none',
    buttons: buttons ?? (pressed ? 1 : 0),
    clickCount: pressed || released ? clickCount : 0,
  });
}

/** Move, settle, press, release at viewport coordinates. Real clicks only. */
export async function clickAt(page, x, y, { settleMs = CLICK_SETTLE_MS, button = 'left' } = {}) {
  await dispatchMouse(page, { type: 'mouseMoved', x, y });
  await page.waitForTimeout(settleMs);
  await dispatchMouse(page, { type: 'mousePressed', x, y, button });
  await page.waitForTimeout(settleMs);
  await dispatchMouse(page, { type: 'mouseReleased', x, y, button });
}

/**
 * Scroll the element into view, then click its centre with real mouse events.
 * Synthetic `element.click()` is useless when a dialog overlays the target, and
 * an off-screen element's rect is outside the viewport, so both steps matter.
 * Returns the coordinates used, or null when the element is absent.
 */
export async function clickElement(page, selector, { settleMs = CLICK_SETTLE_MS, scrollWaitMs = 300 } = {}) {
  const point = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    return { found: true };
  }, selector);
  if (!point) return null;
  await page.waitForTimeout(scrollWaitMs);
  const centre = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, selector);
  if (!centre) return null;
  await clickAt(page, centre.x, centre.y, { settleMs });
  return centre;
}

/**
 * Press at `from`, move through `steps` intermediate points, release at `to`.
 * Used for dock dragging and split-handle resizing, both of which need a real
 * pointer path (a single jump does not arm the gesture).
 */
export async function dragBy(page, { from, to, steps = 8, settleMs = 40, holdMs = 0 } = {}) {
  await dispatchMouse(page, { type: 'mouseMoved', x: from.x, y: from.y });
  await page.waitForTimeout(settleMs);
  await dispatchMouse(page, { type: 'mousePressed', x: from.x, y: from.y });
  if (holdMs > 0) await page.waitForTimeout(holdMs);
  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps;
    await dispatchMouse(page, {
      type: 'mouseMoved',
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      buttons: 1,
    });
    await page.waitForTimeout(settleMs);
  }
  await dispatchMouse(page, { type: 'mouseReleased', x: to.x, y: to.y });
}

/**
 * Close every `.simple-dialog` (version notice, about box) with real clicks on
 * the trailing action anchor. Returns how many dialogs remain; 0 means clean.
 * The dialogs reappear after a reload, so call this before any assertion that
 * needs an unobstructed page and again before screenshots.
 */
export async function dismissSimpleDialog(page, { maxRounds = 20, settleMs = 200 } = {}) {
  const remaining = async () => page.evaluate(() => document.querySelectorAll('.simple-dialog').length);
  let count = await remaining();
  for (let round = 0; round < maxRounds && count > 0; round += 1) {
    const target = await page.evaluate((selector) => {
      const dialogs = [...document.querySelectorAll('.simple-dialog')];
      const dialog = dialogs[dialogs.length - 1];
      if (!dialog) return null;
      const buttons = dialog.querySelectorAll(selector);
      const button = buttons[buttons.length - 1];
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, DIALOG_ACTION_SELECTOR);
    if (!target) return count;
    await clickAt(page, target.x, target.y, { settleMs });
    await page.waitForTimeout(settleMs);
    count = await remaining();
  }
  return count;
}

/** Reveal the top bar when `store.showTopBar` left `.inner-content` hidden. */
export async function ensureTopBar(page, { toggleIndex = 1, settleMs = 600 } = {}) {
  const hidden = await page.evaluate(() => document.querySelector('.inner-content')?.classList.contains('hide') ?? true);
  if (!hidden) return false;
  const point = await page.evaluate((index) => {
    const button = document.querySelectorAll('.float-content .button')[index];
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, toggleIndex);
  if (!point) return false;
  await clickAt(page, point.x, point.y);
  await page.waitForTimeout(settleMs);
  return true;
}

/**
 * Make the thumbnail panel visible. Mobile profiles hide it by default
 * (`showThumbView: !isMobile`), and a collapsed panel puts its floating
 * expand trigger outside the viewport.
 */
export async function ensureThumbPanel(page, { settleMs = 600 } = {}) {
  const state = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.thumb-panel')]
      .some(panel => panel.getBoundingClientRect().width > 0);
    return { visible };
  });
  if (state.visible) return false;
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })));
  await page.waitForTimeout(settleMs);
  return true;
}
