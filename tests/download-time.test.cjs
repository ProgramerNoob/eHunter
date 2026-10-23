const assert = require('node:assert/strict');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const source = path.join(__dirname, '..', 'core', 'service', 'GalleryDownloadService.ts');
const instant = Date.parse('2026-10-24T12:00:00.000Z');

// Runs the real formatter inside a child process so each case owns its TZ.
function formatIn(timezone) {
    const script = `
        const fs = require('node:fs');
        const ts = require('typescript');
        const source = ${JSON.stringify(source)};
        const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
            fileName: source,
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText;
        const scope = { exports: {} };
        new Function('require', 'module', 'exports', compiled)(() => ({}), scope, scope.exports);
        process.stdout.write(scope.exports.formatLocalDateTime(new Date(${instant})));
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
        encoding: 'utf8',
        env: { ...process.env, TZ: timezone },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
}

test('downloadTime carries the local offset instead of UTC Z', () => {
    const shanghai = formatIn('Asia/Shanghai');
    assert.equal(shanghai, '2026-10-24T20:00:00.000+08:00');
    assert.notEqual(shanghai, new Date(instant).toISOString());
    assert.equal(Date.parse(shanghai), instant);

    const utc = formatIn('UTC');
    assert.equal(utc, '2026-10-24T12:00:00.000+00:00');
    assert.equal(Date.parse(utc), instant);
});

test('half-hour offsets keep minute precision', () => {
    const kolkata = formatIn('Asia/Kolkata');
    assert.equal(kolkata, '2026-10-24T17:30:00.000+05:30');
    assert.equal(Date.parse(kolkata), instant);
});

test('westward offsets keep the local calendar date', () => {
    const newYork = formatIn('America/New_York');
    assert.equal(newYork, '2026-10-24T08:00:00.000-04:00');
    assert.equal(Date.parse(newYork), instant);
});
