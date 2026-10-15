#!/usr/bin/env node
/**
 * check-docs.mjs — 文档链接与引用检查（零依赖，Node 标准库）。
 *
 * 范围：当前 `.trellis/spec/` 树（复盘 S19 检查的持久化入口，历史基线见文末）。
 *
 * 检查项：
 *   1. Markdown 相对链接目标存在（含跨目录；`http(s)://` 外链只计数不校验）。
 *   2. 链接锚点 `#fragment` 在目标文件存在对应标题（GitHub 风格 slug 化）；
 *      指向本文件的 `#fragment` 也校验。
 *   3. `.yaml/.yml` 中本地 `$ref: './path.yaml#/...'` 的文件部分存在。
 *
 * 显式不做（复盘决策，误报成本高）：T/FR 编号交叉核验、正文状态矛盾判断。
 *
 * 历史基线（S19，2026-10 复盘时核验，仅记录口径不用于断言）：
 *   36 个文件、90 个本地链接、53 个 `$ref`。
 *
 * 退出码：有断链/坏锚点/坏 $ref 时为 1，否则 0。
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specRoot = join(repo, '.trellis', 'spec');

// 最小允许清单：链接指向历史计划中的未来产物，存在即有因。
// 每条必须注明来源；清空此清单后本注释保留作示例。
// 格式：'相对仓库根的目标路径'
const ALLOWED_MISSING = new Set([
  // 当前为空——上一轮运行无命中；新增条目时注明引入它的计划/任务。
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** GitHub 风格标题 slug 化：小写、去标点、空格转连字符。 */
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*~!@$%^&()=+[\]{}\\|;:'",.<>/?]/g, '')
    .replace(/\s+/g, '-');
}

const anchorsCache = new Map();
function anchorsOf(file) {
  if (!anchorsCache.has(file)) {
    const set = new Set();
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const m = /^(#{1,6})\s+(.*)$/.exec(line);
        if (m) set.add(slugify(m[2]));
      }
    } catch { /* 文件不可读视为无锚点，目标存在性另行报错 */ }
    anchorsCache.set(file, set);
  }
  return anchorsCache.get(file);
}

const problems = [];
let mdFiles = 0, yamlFiles = 0, localLinks = 0, externalLinks = 0, refs = 0;

// markdown 链接：[text](target) —— 排除 http(s)、mailto；剥离 <> 包裹与标题部分
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
// yaml $ref：$ref: './x.yaml#/frag' 或 "$ref": "./x.yaml#/frag"
const REF_RE = /["']?\$ref["']?\s*:\s*["']([^"'\s]+)["']/g;

for (const file of walk(specRoot)) {
  const rel = relative(repo, file);
  const text = readFileSync(file, 'utf8');

  if (file.endsWith('.md')) {
    mdFiles++;
    for (const m of text.matchAll(LINK_RE)) {
      let target = m[1].replace(/^<|>$/g, '');
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) { externalLinks++; continue; }
      localLinks++;
      const [pathPart, fragment] = target.split('#', 2);
      // 剥离源码引用惯用的行号后缀（path.vue:17 / app.ts:354）
      const cleanPath = pathPart.replace(/:\d+(?::\d+)?$/, '');
      const dest = cleanPath === '' ? file : resolve(dirname(file), decodeURIComponent(cleanPath));
      if (!existsSync(dest)) {
        const destRel = relative(repo, dest);
        if (!ALLOWED_MISSING.has(destRel)) {
          problems.push(`${rel}: 断链 -> ${target}`);
        }
        continue;
      }
      if (fragment && dest.endsWith('.md')) {
        const frag = decodeURIComponent(fragment).toLowerCase();
        if (!anchorsOf(dest).has(frag)) {
          problems.push(`${rel}: 坏锚点 #${fragment} -> ${relative(repo, dest)}`);
        }
      }
    }
  } else if (/\.(ya?ml)$/.test(file)) {
    yamlFiles++;
    for (const m of text.matchAll(REF_RE)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      refs++;
      const [pathPart] = target.split('#', 2);
      if (!pathPart) continue; // 纯本地片段引用（#/components/...）不校验文件
      const dest = resolve(dirname(file), decodeURIComponent(pathPart));
      if (!existsSync(dest) && !ALLOWED_MISSING.has(relative(repo, dest))) {
        problems.push(`${rel}: 坏 $ref -> ${target}`);
      }
    }
  }
}

for (const p of problems) console.error(`FAIL ${p}`);
console.log(
  `check-docs: ${mdFiles} md, ${yamlFiles} yaml, ` +
  `${localLinks} 本地链接, ${externalLinks} 外链(仅记录), ${refs} $ref`
);
if (problems.length) {
  console.error(`check-docs: ${problems.length} 个问题`);
  process.exit(1);
}
console.log('check-docs: OK');
