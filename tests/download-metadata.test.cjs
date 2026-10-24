process.env.TZ = 'Asia/Shanghai';

const assert = require('node:assert/strict');
const test = require('node:test');
const fflate = require('fflate');
const { createRuntime } = require('./helpers/runtime-fixture.cjs');

const DOWNLOAD_TIME = '2026-10-14T20:00:00.000+08:00';

function createService(fetchDelayByIndex = () => 0) {
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
            ['../store/i18n', { i18n: { value: { downloadFetching: '已完成 {{current}}/{{total}} 张图片' } } }],
            ['./imageRetryPolicy', { getImageRetryStages: () => [{ mode: 0, attempts: 1 }] }],
            ['../utils/runtimeEnv', { isTestEnvironment: () => true }],
        ]),
        realModules: ['core/service/GalleryDownloadService.ts'],
    });
    const { GalleryDownloadService } = runtime.load('core/service/GalleryDownloadService.ts');
    const albumService = {
        isSupportImgChangeSource: () => false,
        getImgSrc: async (index, mode) => {
            for (let hop = 0; hop < fetchDelayByIndex(index); hop++) {
                await null;
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

test('fetch progress reports finished page counts that never decrease under concurrency', async () => {
    const slowFirstPage = index => index === 0 ? 20 : 0;
    const { service, albumService } = createService(slowFirstPage);
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
    assert.ok(progress.length >= 10, `expected at least two fetches per page, got ${progress.length}`);
    const counts = progress.map(item => item.current);
    for (let i = 1; i < counts.length; i++) {
        assert.ok(counts[i] >= counts[i - 1], `progress went backwards: ${counts.join(',')}`);
    }
    assert.equal(counts[counts.length - 1], 5);
    for (const item of progress) {
        assert.equal(item.message, `已完成 ${item.current}/${item.total} 张图片`, item.message);
    }
});
