#!/usr/bin/env node
/**
 * check-syntax.mjs — `scripts/` 与 `tests/` 的 JS 语法检查（零依赖，Node 标准库）。
 *
 * 范围：`scripts/`、`tests/` 下递归的全部 `.mjs`/`.cjs`，跳过 `__pycache__` 与 `node_modules`。
 *
 * 背景：`tsconfig.json` 的 `include` 只覆盖 `src/` 与 `core/`，`checkJs` 为 false，
 * 这些文件的语法错误原本只在被测试加载时才暴露。
 *
 * 退出码：任一文件 `node --check` 失败、某个根目录不可读、或一个文件都没收集到时为 1
 * 并打印失败项与诊断，否则 0。不静默容忍零覆盖：目录读不到等同于检查没跑。
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['scripts', 'tests'];
const EXTENSIONS = ['.mjs', '.cjs'];
const SKIP_DIRS = new Set(['__pycache__', 'node_modules']);

function collect(dir, found, unreadable) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    unreadable.push({ dir: relative(repo, dir), reason: (error && (error.code || error.message)) || 'unknown' });
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collect(full, found, unreadable);
    } else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      found.push(full);
    }
  }
}

const files = [];
const unreadable = [];
for (const root of ROOTS) collect(join(repo, root), files, unreadable);
files.sort();

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push({ file: relative(repo, file), output: `${result.stdout}${result.stderr}`.trim() });
  }
}

for (const entry of unreadable) {
  console.error(`FAIL ${entry.dir}`);
  console.error(`unreadable directory: ${entry.reason}`);
}
for (const failure of failures) {
  console.error(`FAIL ${failure.file}`);
  console.error(failure.output);
}
console.log(`check-syntax: ${files.length} files, ${failures.length} failed, ${unreadable.length} unreadable`);
if (!files.length) {
  console.error('check-syntax: no files collected');
  process.exit(1);
}
if (failures.length || unreadable.length) {
  console.error('check-syntax: FAILED');
  process.exit(1);
}
console.log('check-syntax: OK');
