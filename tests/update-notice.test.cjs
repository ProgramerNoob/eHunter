const assert = require('node:assert/strict');
const test = require('node:test');
const { createRuntime, startTime } = require('./helpers/runtime-fixture.cjs');
const pkg = require('../package.json');
const source = 'https://jp.animesales.xyz/ehunter/update.json';

function createNoticePage({ transport = 'fetch', respond = () => Promise.reject(new TypeError('Failed to fetch')),
    language = 'en', seen = '', lastRemote = 0, sources, dialogError, storageError } = {}) {
    const requests = [], dialogs = [], remoteWrites = [], versionWrites = [], opened = [];
    const globals = { window: {
        fetch: (url, options) => {
            requests.push({ url, options });
            return respond(url);
        },
        open: (...args) => opened.push(args),
    } };
    if (transport === 'gm') {
        globals.GM_info = { version: 'fixture' };
        globals.GM_xmlhttpRequest = options => {
            requests.push({ url: options.url, options: { method: options.method } });
            Promise.resolve().then(() => respond(options.url)).then(async response => {
                options.onload({ status: response.status, responseText: await response.text() });
            }, () => options.onerror({ status: 0 }));
        };
    }
    const stubs = new Map([
        ['core/store/app.ts', {
            hasStoredLangPreference: () => true,
            store: { lastSeenVersionNotice: seen, lastRemoteUpdateNoticeAt: lastRemote },
            storeAction: {
                openInstructionDialog: dialog => {
                    if (dialogError) throw dialogError;
                    dialogs.push(dialog);
                },
                markRemoteUpdateNoticeShown: time => {
                    if (storageError) throw storageError;
                    remoteWrites.push(time);
                },
                markVersionNoticeSeen: version => versionWrites.push(version),
            },
        }],
        ['core/store/i18n.ts', { lang: { value: language },
            i18n: { value: { versionUpdate: 'Version', confirm: 'Confirm', later: 'Later' } } }],
        ['core/assets/instructions.ts', { getWelcomeInstructionText: () => '' }],
        ['core/assets/versionNotes.ts', { getVersionNotesText: () => 'local notes' }],
        ['package.json', pkg],
    ]);
    // Only multi-source competition tests replace config; the default uses the real URLs.
    if (sources) stubs.set('src/config.ts', { updateServer1: sources[0], updateServer2: sources[1] });
    const runtime = createRuntime({ globals, stubs, realModules: [
        'core/store/event.ts', 'src/config.ts', 'src/platform/base/request/TextReq.ts',
        'src/platform/base/service/PlatformService.js',
    ] });
    const event = runtime.load('core/store/event.ts');
    return Object.assign(runtime, { event, requests, dialogs, remoteWrites, versionWrites, opened });
}

function assertLocalOnly(page) {
    assert.equal(page.dialogs.length, 1, 'local version notes continue');
    assert.equal(page.dialogs[0].title, `Version v${pkg.version}`);
    assert.equal(page.dialogs[0].mdText, 'local notes');
    assert.deepEqual(page.remoteWrites, [], 'unavailable remote notice is never marked shown');
    assert.deepEqual(page.versionWrites, [], 'local notes need explicit acknowledgement');
    assert.deepEqual(page.rejectedJobs, [], 'scheduled check must settle without rejection');
    assert.deepEqual(page.logs.error, [], 'optional failure must not emit severe product logs');
    assert.equal(page.timers.size, 0, 'notice timers are cleared');
}

function jsonResponse(data, status = 200) {
    return { status, text: async () => JSON.stringify(data) };
}
function updateMessage(overrides = {}) {
    return { title: 'Remote title', version: '9.0.0', text: '**remote notes**',
        operations: [{ name: 'Download', url: 'https://fixture.invalid/download' }, { name: 5, url: 'invalid' }],
        time: startTime - 1, duration: 0, ...overrides };
}
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

for (const transport of ['fetch', 'gm']) {
    test(`${transport}: unavailable update degrades once and local notes remain usable`, async () => {
        const page = createNoticePage({ transport });
        page.event.checkVersion();
        page.event.checkVersion();
        await page.advance(4999);
        assert.equal(page.requests.length, 0);
        await page.advance(1);
        assertLocalOnly(page);
        assert.equal(page.requests.length, 1, 'duplicate configured URL gets one attempt');
        assert.equal(page.logs.warn.length, 1);
        const warning = page.logs.warn[0].map(String).join(' ');
        assert.ok(warning.includes(source));
        assert.match(warning, transport === 'gm' ? /GM_xhr error, 0/ : /Failed to fetch/);
        const request = page.requests[0];
        assert.equal(new URL(request.url).searchParams.get('_t'), String(startTime + 5000));
        assert.equal(request.options.method, 'GET');
        if (transport === 'fetch') assert.equal(request.options.credentials, 'omit');
        page.dialogs[0].operations[0].onClick();
        assert.deepEqual(page.versionWrites, [pkg.version]);
        await page.advance(100000);
        page.event.checkVersion();
        assert.equal(page.requests.length, 1);
        assert.equal(page.timers.size, 0);
    });

    for (const [name, respond, reason] of [
        ['HTTP failure', () => jsonResponse({}, 503), /503/],
        ['invalid JSON', () => ({ status: 200, text: async () => '{broken' }), /SyntaxError/],
        ['invalid structure', () => jsonResponse(null), /structure/],
        ['missing language', () => jsonResponse({ cn: updateMessage() }), /structure/],
    ]) {
        test(`${transport}: ${name} preserves reason and continues local notes`, async () => {
            const page = createNoticePage({ transport, respond });
            page.event.checkVersion();
            await page.advance(5000);
            assertLocalOnly(page);
            assert.equal(page.requests.length, 1);
            assert.equal(page.logs.warn.length, 1);
            const warning = page.logs.warn[0].map(String).join(' ');
            assert.ok(warning.includes(source));
            assert.match(warning, reason);
        });
    }

    for (const lateOutcome of ['success', 'failure']) {
        test(`${transport}: request deadline ignores late ${lateOutcome}`, async () => {
            const response = deferred();
            const page = createNoticePage({ transport, respond: () => response.promise });
            page.event.checkVersion();
            await page.advance(19999);
            assert.equal(page.dialogs.length, 0);
            await page.advance(1);
            assertLocalOnly(page);
            assert.match(page.logs.warn[0].map(String).join(' '), /15000/);
            if (lateOutcome === 'success') response.resolve(jsonResponse({ en: updateMessage() }));
            else response.reject(new Error('late network failure'));
            await page.flush();
            assertLocalOnly(page);
            assert.equal(page.logs.warn.length, 1);
        });
    }

    for (const language of ['cn', 'jp', 'en', 'unknown']) {
        test(`${transport}: ${language} success keeps version, Markdown, operations and order`, async () => {
            const data = Object.fromEntries(['cn', 'jp', 'en'].map(key =>
                [key, updateMessage({ title: key, version: '0.0.1' })]));
            const page = createNoticePage({ transport, language, respond: () => jsonResponse(data) });
            page.event.checkVersion();
            await page.advance(5000);
            assert.equal(page.dialogs.length, 2, 'remote notice precedes local notes');
            const remote = page.dialogs[0];
            assert.equal(remote.title, language === 'unknown' ? 'en' : language);
            assert.equal(remote.mdText, '**remote notes**');
            assert.equal(remote.isCompulsive, true);
            assert.equal(remote.operations.length, 2, 'malformed operation filtered');
            assert.equal(remote.operations[0].name, 'Later');
            assert.equal(remote.operations[0].isCloseModal, true);
            assert.equal(remote.operations[1].name, 'Download');
            remote.operations[1].onClick();
            assert.deepEqual(page.opened, [['https://fixture.invalid/download', '_blank']]);
            assert.equal(page.dialogs[1].title, `Version v${pkg.version}`);
            assert.deepEqual(page.remoteWrites, [startTime + 5000]);
            assert.deepEqual(page.versionWrites, []);
            assert.equal(page.timers.size, 0);
            assert.deepEqual(page.logs.warn, []);
            assert.deepEqual(page.logs.error, []);
            assert.deepEqual(page.rejectedJobs, []);
        });
    }
}

for (const [name, message, lastRemote] of [
    ['same version', updateMessage({ version: pkg.version }), 0],
    ['exact release time', updateMessage({ time: startTime + 5000 }), 0],
    ['future release', updateMessage({ time: startTime + 5001 }), 0],
    ['exact interval', updateMessage({ duration: 5000 }), startTime],
    ['interval not elapsed', updateMessage({ duration: 5001 }), startTime],
]) {
    test(`successful response does not notify at ${name}`, async () => {
        const page = createNoticePage({ seen: pkg.version, lastRemote,
            respond: () => jsonResponse({ en: message }) });
        page.event.checkVersion();
        await page.advance(5000);
        assert.deepEqual(page.dialogs, []);
        assert.deepEqual(page.remoteWrites, []);
        assert.deepEqual(page.logs.warn, []);
        assert.equal(page.timers.size, 0);
    });
}

test('body rejection is an unavailable update and retains the original cause', async () => {
    const cause = new Error('body stream failed');
    const page = createNoticePage({ respond: () => ({ status: 200, text: () => Promise.reject(cause) }) });
    page.event.checkVersion();
    await page.advance(5000);
    assertLocalOnly(page);
    assert.ok(page.logs.warn[0].includes(cause));
});

for (const lateOutcome of ['success', 'failure']) {
    test(`fetch and body share one deadline; late body ${lateOutcome} has no side effects`, async () => {
        const response = deferred(), body = deferred();
        const page = createNoticePage({ respond: () => response.promise });
        page.event.checkVersion();
        await page.advance(15000); // ten seconds into the request
        response.resolve({ status: 200, text: () => body.promise });
        await page.advance(4999);
        assert.equal(page.dialogs.length, 0);
        await page.advance(1);
        assertLocalOnly(page);
        assert.match(page.logs.warn[0].map(String).join(' '), /15000/);
        if (lateOutcome === 'success') body.resolve(JSON.stringify({ en: updateMessage() }));
        else body.reject(new Error('late body failure'));
        await page.flush();
        assertLocalOnly(page);
    });
}

for (const firstOutcome of ['success', 'failure']) {
    test(`distinct sources keep first-settled ${firstOutcome}, not first-success`, async () => {
        const second = deferred();
        const page = createNoticePage({ sources: [source, 'https://fixture.invalid/update?channel=test'],
            respond: url => new URL(url).host === 'fixture.invalid' ? second.promise
                : firstOutcome === 'success' ? jsonResponse({ en: updateMessage() })
                    : Promise.reject(new Error('first source failed')) });
        page.event.checkVersion();
        await page.advance(5000);
        assert.equal(page.requests.length, 2);
        assert.equal(new URL(page.requests[1].url).searchParams.get('channel'), 'test');
        assert.equal(page.dialogs.length, firstOutcome === 'success' ? 2 : 1);
        second.resolve(jsonResponse({ en: updateMessage({ title: 'Late success' }) }));
        await page.flush();
        assert.equal(page.dialogs.length, firstOutcome === 'success' ? 2 : 1);
        assert.equal(page.remoteWrites.length, firstOutcome === 'success' ? 1 : 0);
        assert.equal(page.timers.size, 0);
        assert.deepEqual(page.rejectedJobs, []);
    });
}

test('no configured source allows local notice without network or warning', async () => {
    const page = createNoticePage({ sources: ['', null] });
    page.event.checkVersion();
    await page.advance(5000);
    assertLocalOnly(page);
    assert.deepEqual(page.requests, []);
    assert.deepEqual(page.logs.warn, []);
});

for (const boundary of ['dialog', 'storage']) {
    test(`real ${boundary} exception is not swallowed by optional request handling`, async () => {
        const cause = new Error(`${boundary} failure`);
        const page = createNoticePage({ [boundary + 'Error']: cause,
            respond: () => jsonResponse({ en: updateMessage() }) });
        page.event.checkVersion();
        await page.advance(5000);
        assert.deepEqual(page.rejectedJobs, [cause]);
        assert.deepEqual(page.logs.warn, [], 'product failure is not mislabeled as unavailable update');
        assert.equal(page.timers.size, 0);
    });
}

for (const transport of ['fetch', 'gm']) {
    test(`${transport}: ordinary TextReq failures retain three attempts and severe diagnostics`, async () => {
        const page = createNoticePage({ transport });
        const { TextReq } = page.load('src/platform/base/request/TextReq.ts');
        const request = new TextReq('/ordinary-request').request();
        const rejected = assert.rejects(request, error => String(error).includes(
            transport === 'gm' ? 'GM_xhr error, 0' : 'Failed to fetch'));
        await page.advance(6000);
        await rejected;
        assert.equal(page.requests.length, 3);
        assert.equal(page.logs.error.length, 3);
        assert.equal(page.logs.warn.length, 0);
        assert.match(page.logs.error[2][0], /retry:\(3\/3\)/);
        if (transport === 'fetch') assert.equal(page.requests[0].options.credentials, 'include');
    });
}
