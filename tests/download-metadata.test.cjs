process.env.TZ = 'Asia/Shanghai';

const assert = require('node:assert/strict');
const test = require('node:test');
const fflate = require('fflate');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const DOWNLOAD_TIME = '2026-10-14T20:00:00.000+08:00';

function loadI18nTable() {
    const runtime = createRuntime({ realModules: ['core/assets/i18n.ts'] });
    const loaded = runtime.load('core/assets/i18n.ts');
    const table = loaded.default === undefined ? loaded : loaded.default;
    const dict = {};
    for (const key of Object.keys(table)) {
        if (table[key] && typeof table[key].cn === 'string') {
            dict[key] = table[key].cn;
        }
    }
    assert.ok(dict.downloadFetching, 'core/assets/i18n.ts must define downloadFetching.cn');
    return { table, dict };
}

function createService(interleaveByIndex = () => 0, failIndexes = [], dict = loadI18nTable().dict) {
    const captured = { zip: null, fileName: null };
    const document = {
        createElement: () => ({
            style: {},
            click() { captured.fileName = this.download; },
        }),
        body: { appendChild() {}, removeChild() {} },
    };
    const runtime = createRuntime({
        globals: {
            document,
            Blob,
            Uint8Array,
            ArrayBuffer,
            TextDecoder,
            GM_xmlhttpRequest: options => {
                options.onload({ status: 200, response: new Uint8Array([1, 2, 3]).buffer });
            },
            URL: {
                createObjectURL(blob) {
                    captured.zip = blob;
                    return 'blob:fixture';
                },
                revokeObjectURL() {},
            },
        },
        stubs: new Map([
            ['fflate', fflate],
            ['../store/i18n', { i18n: { value: dict } }],
            ['./imageRetryPolicy', { getImageRetryStages: () => [{ mode: 0, attempts: 1 }] }],
            ['../utils/runtimeEnv', { isTestEnvironment: () => true }],
        ]),
        realModules: ['core/service/GalleryDownloadService.ts'],
    });
    const { GalleryDownloadService } = runtime.load('core/service/GalleryDownloadService.ts');
    const albumService = {
        isSupportImgChangeSource: () => false,
        getImgSrc: async (index, mode) => {
            for (let hop = 0; hop < interleaveByIndex(index); hop++) {
                await null;
            }
            if (failIndexes.includes(index)) {
                throw new Error(`image_unavailable_${index}`);
            }
            return { id: index, index, pageUrl: `/0${index + 1}.jpg`, src: `/0${index + 1}.jpg`, heightOfWidth: 1.4 };
        },
    };
    return { service: new GalleryDownloadService(), albumService, captured, runtime };
}

test('download metadata records local time with an explicit zone offset', async () => {
    const { service, albumService, captured } = createService();
    const statuses = [];
    const result = await service.run({
        taskId: 't1',
        albumService,
        galleryTitle: 'fixture',
        introUrl: '/g/id/test/',
        pageCount: 3,
        chunkSize: 200,
        autoRetryByOtherSource: false,
        eHunterVersion: '9.9.9',
        onStatus: event => statuses.push(event.phase),
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.processedPages, 3);
    assert.deepEqual(statuses.filter(phase => phase === 'completed'), ['completed']);
    assert.equal(captured.fileName, 'fixture.zip');

    const bytes = new Uint8Array(await captured.zip.arrayBuffer());
    const entries = fflate.unzipSync(bytes);
    const metadata = JSON.parse(new TextDecoder().decode(entries['metadata.json']));

    assert.deepEqual(Object.keys(metadata).sort(), [
        'chunkIndex', 'downloadTime', 'eHunterVersion', 'galleryTitle', 'introUrl', 'totalChunks', 'totalPages',
    ]);
    assert.equal(metadata.introUrl, '/g/id/test/');
    assert.equal(metadata.galleryTitle, 'fixture');
    assert.equal(metadata.totalPages, 3);
    assert.equal(metadata.eHunterVersion, '9.9.9');
    assert.equal(metadata.totalChunks, 1);
    assert.equal(metadata.chunkIndex, 1);
    assert.equal(metadata.downloadTime, DOWNLOAD_TIME, metadata.downloadTime);
    assert.equal(Date.parse(metadata.downloadTime), Date.parse('2026-10-14T12:00:00.000Z'));
    assert.deepEqual(Object.keys(entries).sort(), ['0001.jpg', '0002.jpg', '0003.jpg', 'metadata.json']);
});

test('download progress template keeps both placeholders in every language', () => {
    const { table } = loadI18nTable();
    for (const lang of ['cn', 'en', 'jp']) {
        const template = table.downloadFetching[lang];
        assert.ok(template.includes('{{current}}'), `${lang} template lost {{current}}: ${template}`);
        assert.ok(template.includes('{{total}}'), `${lang} template lost {{total}}: ${template}`);
    }
});

test('fetch progress reports finished page counts that never decrease under concurrency', async () => {
    const slowFirstPage = index => index === 0 ? 20 : 0;
    const { dict } = loadI18nTable();
    const sentinel = '__sentinel_fetching__ {{current}} {{total}}';
    const { service, albumService } = createService(slowFirstPage, [], { ...dict, downloadFetching: sentinel });
    const progress = [];
    const result = await service.run({
        taskId: 't2',
        albumService,
        galleryTitle: 'fixture',
        introUrl: '/g/id/test/',
        pageCount: 5,
        chunkSize: 200,
        autoRetryByOtherSource: false,
        eHunterVersion: '9.9.9',
        onStatus: event => {
            if (event.phase === 'fetching') {
                progress.push({ current: event.processedPages, total: event.totalPages, message: event.message });
            }
        },
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.processedPages, 5);
    const counts = progress.map(item => item.current);
    assert.equal(counts.length, 5, 'each finished page pushes exactly one fetching event');
    for (let i = 1; i < counts.length; i++) {
        assert.ok(counts[i] > counts[i - 1], `progress repeated or went backwards: ${counts.join(',')}`);
    }
    assert.equal(counts[counts.length - 1], 5);
    for (const item of progress) {
        const expected = sentinel
            .replace(/{{current}}/g, String(item.current))
            .replace(/{{total}}/g, String(item.total));
        assert.equal(item.message, expected, item.message);
    }
});

test('finished page count includes failed pages and keeps packaging the rest', async () => {
    const { service, albumService, captured } = createService(() => 0, [1]);
    const progress = [];
    const result = await service.run({
        taskId: 't3',
        albumService,
        galleryTitle: 'fixture',
        introUrl: '/g/id/test/',
        pageCount: 4,
        chunkSize: 200,
        autoRetryByOtherSource: false,
        eHunterVersion: '9.9.9',
        onStatus: event => {
            if (event.phase === 'fetching') {
                progress.push({ current: event.processedPages, failed: event.failedPages });
            }
        },
    });

    assert.equal(result.status, 'partial');
    assert.equal(result.totalPages, 4);
    assert.equal(result.processedPages, 4, 'failed pages still count as finished pages');
    assert.equal(result.failedPages, 1);
    assert.deepEqual(Array.from(result.failures, item => item.pageNumber), [2]);
    assert.equal(progress[progress.length - 1].current, 4);
    assert.equal(progress[progress.length - 1].failed, 1);

    const entries = fflate.unzipSync(new Uint8Array(await captured.zip.arrayBuffer()));
    assert.deepEqual(Object.keys(entries).sort(), ['0001.jpg', '0003.jpg', '0004.jpg', 'metadata.json']);
});
