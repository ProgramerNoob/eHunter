#!/usr/bin/env node
/**
 * tmp-report.mjs — `.tmp` 体积与孤儿轮次报告（零依赖，Node 标准库）。
 *
 * 范围：`.trellis/**` 下所有 `acceptance.json` 的 `checks[].evidence` 与
 * `checks[].execution.log` 引用的 `.tmp/` 路径，对照 `.tmp/browser-preflight/`
 * 下的轮次目录。
 *
 * 只读：列出未被任何验收记录引用的轮次目录及体积，按体积降序。不删除任何文件。
 *
 * 退出码：总体积超过 `--max-bytes` 阈值（默认 3 GiB）、或存在孤儿轮次超过
 * `--max-orphan-bytes`（默认 2 GiB）时为 1，否则 0。读取失败只计数并写进报告，
 * 不影响退出码：报告是估算，不该因为一个不可读子目录就报成超预算。
 * `.tmp` 或 `.tmp/browser-preflight` 不存在时按 0 字节处理、不计入读取失败，CI 的全新 clone 因此照常通过且不产生噪音。
 */
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MAX_BYTES = 3 * 1024 ** 3;
const DEFAULT_MAX_ORPHAN_BYTES = 2 * 1024 ** 3;

export function parseArgs(argv) {
  const options = { maxBytes: DEFAULT_MAX_BYTES, maxOrphanBytes: DEFAULT_MAX_ORPHAN_BYTES, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--max-bytes') options.maxBytes = Number(argv[++i]);
    else if (arg === '--max-orphan-bytes') options.maxOrphanBytes = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  for (const key of ['maxBytes', 'maxOrphanBytes']) {
    if (!Number.isFinite(options[key]) || options[key] < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
  }
  return options;
}

const gib = bytes => `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
const mib = bytes => `${(bytes / 1024 ** 2).toFixed(1)} MiB`;

function formatSize(bytes) {
  return bytes >= 1024 ** 3 ? gib(bytes) : mib(bytes);
}

function summarizeFailures(readFailures) {
  const counts = new Map();
  for (const failure of readFailures) counts.set(failure.reason, (counts.get(failure.reason) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => `${reason} x${count}`);
}

export function run(options, repo = DEFAULT_REPO) {
  const readFailures = [];
  const noteReadFailure = (target, error) => {
    readFailures.push({
      path: relative(repo, target),
      reason: (error && (error.code || error.message)) || 'unknown',
    });
  };

  function* walkFiles(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') noteReadFailure(dir, error);
      return;
    }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* walkFiles(full);
      else if (entry.isFile()) yield full;
    }
  }

  function referencedTmpPaths() {
    const referenced = new Map();
    for (const file of walkFiles(join(repo, '.trellis'))) {
      if (!file.endsWith('acceptance.json')) continue;
      let data;
      try {
        data = JSON.parse(readFileSync(file, 'utf8'));
      } catch (error) {
        noteReadFailure(file, error);
        continue;
      }
      const task = relative(repo, dirname(file));
      const noteReference = path => {
        if (typeof path !== 'string' || !path.startsWith('.tmp/')) return;
        if (!referenced.has(path)) referenced.set(path, new Set());
        referenced.get(path).add(task);
      };
      for (const check of data?.checks ?? []) {
        for (const path of check?.evidence ?? []) noteReference(path);
        noteReference(check?.execution?.log);
      }
    }
    return referenced;
  }

  function danglingReferences(referenced) {
    const dangling = [];
    for (const [path, tasks] of referenced) {
      const target = join(repo, path);
      let present;
      try {
        present = statSync(target, { throwIfNoEntry: false }) !== undefined;
      } catch (error) {
        noteReadFailure(target, error);
        present = true;
      }
      if (!present) dangling.push({ path, tasks: [...tasks].sort() });
    }
    return dangling.sort((a, b) => a.path.localeCompare(b.path));
  }

  function directorySize(dir) {
    let total = 0;
    for (const file of walkFiles(dir)) {
      try {
        total += statSync(file).size;
      } catch (error) {
        noteReadFailure(file, error);
      }
    }
    return total;
  }

  function roundEntries(roundsDir) {
    let names;
    try {
      names = readdirSync(roundsDir, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') noteReadFailure(roundsDir, error);
      return [];
    }
    return names
      .filter(entry => entry.isDirectory())
      .map(entry => {
        const dir = join(roundsDir, entry.name);
        return { name: entry.name, path: `.tmp/browser-preflight/${entry.name}`, dir };
      });
  }

  const referenced = referencedTmpPaths();
  const referencedList = [...referenced.keys()];
  const dangling = danglingReferences(referenced);
  const rounds = roundEntries(join(repo, '.tmp', 'browser-preflight'));
  const orphans = [];
  let referencedBytes = 0;
  for (const round of rounds) {
    const prefix = `${round.path}/`;
    const used = referencedList.some(path => path.startsWith(prefix));
    const size = directorySize(round.dir);
    if (used) {
      referencedBytes += size;
      continue;
    }
    orphans.push({ path: round.path, bytes: size });
  }
  orphans.sort((a, b) => b.bytes - a.bytes);

  const tmpBytes = directorySize(join(repo, '.tmp'));
  const orphanBytes = orphans.reduce((sum, entry) => sum + entry.bytes, 0);
  const report = {
    tmpBytes,
    referencedFiles: referenced.size,
    referencedBytes,
    roundCount: rounds.length,
    orphanCount: orphans.length,
    orphanBytes,
    topOrphans: orphans.slice(0, 10),
    danglingCount: dangling.length,
    danglingSample: dangling.slice(0, 10),
    budgets: { maxBytes: options.maxBytes, maxOrphanBytes: options.maxOrphanBytes },
    readFailures: {
      count: readFailures.length,
      reasons: summarizeFailures(readFailures),
      sample: readFailures.slice(0, 5),
    },
  };

  const overBudget = tmpBytes > options.maxBytes;
  const overOrphanBudget = orphanBytes > options.maxOrphanBytes;
  return {
    report,
    exitCode: overBudget || overOrphanBudget ? 1 : 0,
    overBudget,
    overOrphanBudget,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('usage: npm run tmp:report [--json] [--max-bytes N] [--max-orphan-bytes N]');
    return 0;
  }

  const { report, exitCode, overBudget, overOrphanBudget } = run(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`.tmp total: ${formatSize(report.tmpBytes)} (${report.tmpBytes} bytes)`);
    console.log(
      `referenced by acceptance records: ${report.referencedFiles} paths, ` +
        `${formatSize(report.referencedBytes)} in browser-preflight`
    );
    console.log(
      `browser-preflight rounds: ${report.roundCount}, ` +
        `orphan rounds: ${report.orphanCount} (${formatSize(report.orphanBytes)})`
    );
    for (const entry of report.topOrphans) {
      console.log(`  orphan ${formatSize(entry.bytes).padStart(10)}  ${entry.path}`);
    }
    if (report.orphanCount > 10) console.log(`  ... and ${report.orphanCount - 10} more orphan rounds`);
    if (report.danglingCount > 0) {
      console.log(`dangling references: ${report.danglingCount} (listed in acceptance.json, missing on disk)`);
      for (const entry of report.danglingSample) {
        console.log(`  missing ${entry.path}  <- ${entry.tasks.join(', ')}`);
      }
      if (report.danglingCount > 10) {
        console.log(`  ... and ${report.danglingCount - 10} more dangling references`);
      }
    }
    if (report.readFailures.count > 0) {
      console.log(`read failures: ${report.readFailures.count} (${report.readFailures.reasons.join(', ')})`);
      for (const failure of report.readFailures.sample) {
        console.log(`  unreadable ${failure.path} (${failure.reason})`);
      }
      if (report.readFailures.count > 5) {
        console.log(`  ... and ${report.readFailures.count - 5} more read failures`);
      }
    }
  }

  if (overBudget) {
    console.error(`FAIL .tmp is ${formatSize(report.tmpBytes)}, over the ${formatSize(options.maxBytes)} budget`);
  }
  if (overOrphanBudget) {
    console.error(
      `FAIL orphan rounds are ${formatSize(report.orphanBytes)}, ` +
        `over the ${formatSize(options.maxOrphanBytes)} budget`
    );
  }
  return exitCode;
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    return realpathSync(process.argv[1]) === realpathSync(self);
  } catch {
    return resolve(process.argv[1]) === resolve(self);
  }
}

if (invokedDirectly()) {
  process.exitCode = main();
}
