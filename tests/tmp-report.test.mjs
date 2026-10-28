import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { parseArgs, run } from '../scripts/tmp-report.mjs';

const roots = [];

function makeRepo({ tmpFiles = [], rounds = [], acceptanceRecords = [] } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'tmp-report-'));
  roots.push(repo);
  mkdirSync(join(repo, '.trellis'), { recursive: true });
  for (const record of acceptanceRecords) {
    const dir = join(repo, '.trellis', record.dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'acceptance.json'), JSON.stringify(record.data));
  }
  for (const file of tmpFiles) {
    const full = join(repo, file.path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, 'x'.repeat(file.bytes));
  }
  for (const round of rounds) {
    const dir = join(repo, '.tmp', 'browser-preflight', round.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'result.json'), 'x'.repeat(round.bytes));
  }
  return repo;
}

const baseOptions = { maxBytes: 1024 ** 3, maxOrphanBytes: 1024 ** 3, json: false };

after(() => {
  for (const repo of roots) rmSync(repo, { recursive: true, force: true });
});

describe('tmp report budgets', () => {
  it('a repository without .tmp passes and reports no read failure', () => {
    const repo = makeRepo();
    const result = run(baseOptions, repo);
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.tmpBytes, 0);
    assert.equal(result.report.roundCount, 0);
    assert.equal(result.report.readFailures.count, 0);
  });

  it('a repository without browser-preflight rounds counts no orphan bytes', () => {
    const repo = makeRepo({ tmpFiles: [{ path: '.tmp/build.log', bytes: 10 }] });
    const result = run(baseOptions, repo);
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.tmpBytes, 10);
    assert.equal(result.report.roundCount, 0);
    assert.equal(result.report.orphanCount, 0);
    assert.equal(result.report.readFailures.count, 0);
  });

  it('total size over the budget fails even when no round is orphaned', () => {
    const repo = makeRepo({
      tmpFiles: [{ path: '.tmp/build.log', bytes: 200 }],
      rounds: [{ name: 'round-a', bytes: 10 }],
      acceptanceRecords: [{ dir: 'task-a', data: acceptance({ evidence: ['.tmp/browser-preflight/round-a/result.json'] }) }],
    });
    const result = run({ ...baseOptions, maxBytes: 100 }, repo);
    assert.equal(result.exitCode, 1);
    assert.equal(result.overBudget, true);
    assert.equal(result.report.orphanCount, 0);
    assert.equal(result.report.referencedBytes, 10);
  });

  it('orphan rounds over their own budget fail while the total stays under', () => {
    const repo = makeRepo({
      rounds: [{ name: 'round-a', bytes: 200 }],
      acceptanceRecords: [{ dir: 'task-a', data: acceptance({ evidence: ['.trellis/task-a/doc.md'] }) }],
    });
    const result = run({ ...baseOptions, maxBytes: 1024, maxOrphanBytes: 100 }, repo);
    assert.equal(result.exitCode, 1);
    assert.equal(result.overOrphanBudget, true);
    assert.equal(result.overBudget, false);
    assert.equal(result.report.orphanCount, 1);
    assert.equal(result.report.orphanBytes, 200);
  });

  it('rounds referenced by an acceptance record are not counted as orphans', () => {
    const repo = makeRepo({
      rounds: [
        { name: 'round-used', bytes: 40 },
        { name: 'round-orphan', bytes: 60 },
      ],
      acceptanceRecords: [{ dir: 'task-a', data: acceptance({ log: '.tmp/browser-preflight/round-used/commands.jsonl' }) }],
    });
    const result = run(baseOptions, repo);
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.roundCount, 2);
    assert.equal(result.report.orphanCount, 1);
    assert.equal(result.report.orphanBytes, 60);
    assert.equal(result.report.referencedBytes, 40);
  });

  it('an unreadable directory is counted while a missing one is not', () => {
    const repo = makeRepo({ tmpFiles: [{ path: '.tmp/locked/note.txt', bytes: 5 }] });
    chmodSync(join(repo, '.tmp', 'locked'), 0o000);
    const result = run(baseOptions, repo);
    chmodSync(join(repo, '.tmp', 'locked'), 0o755);
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.readFailures.count, 1);
    assert.deepEqual(result.report.readFailures.reasons, ['EACCES x1']);
    assert.equal(result.report.readFailures.sample[0].path, '.tmp/locked');
  });

  it('references to files already gone are reported without failing the run', () => {
    const repo = makeRepo({
      tmpFiles: [{ path: '.tmp/present.log', bytes: 3 }],
      acceptanceRecords: [
        {
          dir: 'task-gone',
          data: acceptance({ evidence: ['.tmp/present.log', '.tmp/gone.log'], log: '.tmp/gone-command.log' }),
        },
      ],
    });
    const result = run(baseOptions, repo);
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.danglingCount, 2);
    assert.deepEqual(
      result.report.danglingSample.map(entry => entry.path),
      ['.tmp/gone-command.log', '.tmp/gone.log']
    );
    assert.deepEqual(result.report.danglingSample[0].tasks, ['.trellis/task-gone']);
  });

  it('a repository whose references all resolve reports no dangling entries', () => {
    const repo = makeRepo({
      tmpFiles: [{ path: '.tmp/present.log', bytes: 3 }],
      acceptanceRecords: [{ dir: 'task-a', data: acceptance({ evidence: ['.tmp/present.log'] }) }],
    });
    const result = run(baseOptions, repo);
    assert.equal(result.report.danglingCount, 0);
    assert.deepEqual(result.report.danglingSample, []);
  });

  it('a reference whose status cannot be read is a visible read failure, not a silent pass', () => {
    const repo = makeRepo({
      acceptanceRecords: [{ dir: 'task-loop', data: acceptance({ evidence: ['.tmp/loop/x.log'] }) }],
    });
    mkdirSync(join(repo, '.tmp'), { recursive: true });
    symlinkSync(join(repo, '.tmp', 'loop'), join(repo, '.tmp', 'loop'));
    const result = run(baseOptions, repo);
    assert.equal(result.report.danglingCount, 0);
    assert.equal(result.report.readFailures.count, 1);
    assert.deepEqual(result.report.readFailures.reasons, ['ELOOP x1']);
    assert.equal(result.report.readFailures.sample[0].path, '.tmp/loop/x.log');
  });

  it('keeps only the first ten dangling samples but counts them all', () => {
    const evidence = Array.from({ length: 12 }, (_, index) => `.tmp/gone-${String(index).padStart(2, '0')}.log`);
    const repo = makeRepo({ acceptanceRecords: [{ dir: 'task-many', data: acceptance({ evidence }) }] });
    const result = run(baseOptions, repo);
    assert.equal(result.report.danglingCount, 12);
    assert.equal(result.report.danglingSample.length, 10);
    assert.equal(result.report.danglingSample[0].path, '.tmp/gone-00.log');
    assert.equal(result.report.danglingSample[9].path, '.tmp/gone-09.log');
  });

  it('lists every task that references the same missing path', () => {
    const repo = makeRepo({
      acceptanceRecords: [
        { dir: 'task-b', data: acceptance({ evidence: ['.tmp/shared.log'] }) },
        { dir: 'task-a', data: acceptance({ evidence: ['.tmp/shared.log'] }) },
      ],
    });
    const result = run(baseOptions, repo);
    assert.equal(result.report.danglingCount, 1);
    assert.deepEqual(result.report.danglingSample[0].tasks, ['.trellis/task-a', '.trellis/task-b']);
  });
});

describe('tmp report arguments', () => {
  it('rejects an unknown argument', () => {
    assert.throws(() => parseArgs(['--nope']), /unknown argument/);
  });

  it('rejects a negative budget', () => {
    assert.throws(() => parseArgs(['--max-bytes', '-1']), /non-negative/);
  });

  it('accepts overrides and the json flag', () => {
    assert.deepEqual(parseArgs(['--json', '--max-bytes', '5', '--max-orphan-bytes', '6']), {
      maxBytes: 5,
      maxOrphanBytes: 6,
      json: true,
    });
  });
});

function acceptance({ evidence = [], log = null } = {}) {
  return {
    schemaVersion: 1,
    criteria: { AC1: 'x' },
    checks: [
      {
        id: 'check-one',
        ac: ['AC1'],
        claim: 'x',
        scope: 'x',
        method: 'command',
        dimension: 'structure',
        observed: 'passed',
        execution: log ? { argv: ['x'], cwd: '.', exitCode: 0, startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:01Z', log } : null,
        evidence,
        note: 'x',
        waiver: null,
      },
    ],
  };
}
