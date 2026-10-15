#!/usr/bin/env node
// Node 24+, Python 3, and the existing Pi installation; no added dependencies.
// Run from any cwd. --check verifies the checked-in reports without rewriting them.
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes, syncBuiltinESMExports } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = 'e7e5f28';
const task = '.trellis/tasks/10-15-trellis-lean-tool-descriptions';
const evidence = '.tmp/trellis-context-measure';
const check = process.argv.includes('--check');
assert.ok(process.argv.slice(2).every(arg => arg === '--check'), 'Usage: node scripts/measure-trellis-context.mjs [--check]');
const exec = (command, args, options = {}) => childProcess.execFileSync(command, args, {
  cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options,
});
const git = args => exec('git', args);
const digest = text => createHash('sha256').update(text).digest('hex');
function put(root, path, text) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}
const read = path => readFileSync(join(repo, path), 'utf8');
const globalModules = exec('npm', ['root', '-g']).trim();
const sdk = [join(repo, 'node_modules'), globalModules]
  .map(base => join(base, '@earendil-works/pi-coding-agent'))
  .find(base => existsSync(join(base, 'dist/core/system-prompt.js')));
assert.ok(sdk, 'Pi installation not found in local or global node_modules');
const hostImport = path => import(pathToFileURL(join(sdk, 'dist', path)));
const { loadSkillsFromDir, formatSkillsForPrompt } = await hostImport('core/skills.js');
const { buildSystemPromptSections } = await hostImport('core/system-prompt.js');
const { parseFrontmatter } = await hostImport('utils/frontmatter.js');

// Freeze all sources before measuring. Git is read-only; no checkout or index changes.
const baselineHash = git(['rev-parse', `${baseline}^{commit}`]).trim();
const tracked = git(['ls-tree', '-r', '--name-only', baselineHash]).trim().split('\n');
const skillPaths = tracked.filter(path => /^\.agents\/skills\/trellis-[^/]+\/SKILL\.md$/.test(path)).sort();
const promptPaths = tracked.filter(path => /^\.pi\/prompts\/trellis-[^/]+\.md$/.test(path)).sort();
const agentPaths = tracked.filter(path => /^\.pi\/agents\/trellis-[^/]+\.md$/.test(path)).sort();
for (const [paths, pattern, count] of [
  [skillPaths, '.agents/skills/trellis-*/SKILL.md', 9],
  [promptPaths, '.pi/prompts/trellis-*.md', 3],
  [agentPaths, '.pi/agents/trellis-*.md', 3],
]) {
  assert.equal(paths.length, count, `Unexpected baseline file set: ${pattern}`);
  assert.deepEqual(globSync(pattern, { cwd: repo }).sort(), paths, `File set changed: ${pattern}`);
}
const pythonPaths = [...new Set([
  ...tracked.filter(path => path.startsWith('.trellis/scripts/') && path.endsWith('.py')),
  ...globSync('.trellis/scripts/**/*.py', { cwd: repo }),
])].sort();
const inputPaths = [...new Set([
  '.pi/extensions/trellis/index.ts', '.trellis/workflow.md',
  ...pythonPaths, ...skillPaths, ...promptPaths, ...agentPaths,
])].sort();
const sources = {
  original: Object.fromEntries(inputPaths.map(path => [path, git(['show', `${baselineHash}:${path}`])])),
  lean: Object.fromEntries(inputPaths.map(path => [path, read(path)])),
};

// These bytes, metadata, git results and paths are the same for both implementations.
const fixtureTask = '.trellis/tasks/context-measure-fixture';
const fixtureFiles = {
  '.trellis/.developer': 'name=fixture-dev\n',
  '.trellis/config.yaml': '# Fixture: default injection budgets, single repository.\n',
  '.trellis/.runtime/sessions/pi_measure.json': JSON.stringify({ current_task: fixtureTask }),
  [`${fixtureTask}/task.json`]: JSON.stringify({
    id: 'context-measure-fixture', name: 'context-measure-fixture', title: 'Fixed context fixture',
    status: 'in_progress', assignee: 'fixture-dev', priority: 'P1', createdAt: '2026-10-15',
    description: '固定比较输入，包含 Unicode 🧭。',
  }),
  [`${fixtureTask}/prd.md`]: '# Requirements\nPreserve dispatch, context and skill contracts.\n固定任务正文 🧭。\n',
  [`${fixtureTask}/design.md`]: '# Design\nMeasure original and lean with identical task inputs.\n',
  [`${fixtureTask}/implement.md`]: '# Implementation\nCompare text, retain evidence, report measurement limits.\n',
  '.trellis/spec/tooling/fixture.md': '# Curated spec\nKeep task bodies, budgets and refresh behavior unchanged.\n',
  '.trellis/workspace/fixture-dev/journal-1.md': '# Journal\nFixed entry.\n',
};
for (const role of ['implement', 'check']) {
  fixtureFiles[`${fixtureTask}/${role}.jsonl`] = `${JSON.stringify({ file: '.trellis/spec/tooling/fixture.md', reason: 'Fixed curated spec' })}\n`;
}
const bodyPaths = ['prd.md', 'design.md', 'implement.md'].map(name => `${fixtureTask}/${name}`)
  .concat('.trellis/spec/tooling/fixture.md');
const fixtureGit = {
  'rev-parse --is-inside-work-tree': 'true\n',
  'branch --show-current': 'fixture-branch\n',
  'status --porcelain': ' M example.ts\n',
  'status --short': ' M example.ts\n',
  'log --oneline -5': 'abc1234 fixture commit\ndef5678 previous fixture\n',
};

// Run the real Python renderers with filesystem/git inputs isolated from this session.
// Only environment lookups, git output and workflow source location are patched.
const pythonCapture = String.raw`
import json, os, sys
from pathlib import Path
from unittest.mock import patch
source, fixture = map(Path, sys.argv[1:])
sys.path.insert(0, str(source / '.trellis/scripts'))
from common import paths, session_context as session, workflow_phase as workflow
facts = json.load(sys.stdin)
def git(args, cwd, **kwargs):
    key = ' '.join(args)
    return (0, facts[key], '') if key in facts else (1, '', 'fixture: unsupported git query')
with patch.dict(os.environ, {'TRELLIS_DEVELOPER': '', 'TRELLIS_CONTEXT_ID': 'pi_measure'}), \
     patch.object(paths, 'main_worktree_root', return_value=None), \
     patch.object(session, 'run_git', side_effect=git), \
     patch.object(workflow, '_read_workflow', return_value=(source / '.trellis/workflow.md').read_text()):
    print(json.dumps({
        'phase': workflow.filter_platform(workflow.get_phase_index(), 'pi'),
        'overview': session.get_context_text(fixture),
        'facts': session.get_context_json(fixture),
    }, ensure_ascii=False))
`;

// Optional existing tokenizers are reference counters only: no provider framing/usage.
const tokenizerProbe = [];
let tokenizer = null;
let countReference;
function packageVersion(resolved) {
  let directory = dirname(resolved);
  while (dirname(directory) !== directory) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) return JSON.parse(readFileSync(manifest, 'utf8')).version;
    directory = dirname(directory);
  }
  return 'unknown';
}
for (const name of ['js-tiktoken', 'tiktoken', 'gpt-tokenizer']) {
  let resolved;
  for (const base of [repo, sdk, globalModules]) {
    try {
      const entry = name === 'gpt-tokenizer' ? `${name}/encoding/o200k_base` : name;
      resolved = createRequire(join(base, 'measurement.cjs')).resolve(entry, { paths: [base] });
      break;
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  tokenizerProbe.push({ package: name, available: Boolean(resolved) });
  if (!resolved || tokenizer) continue;
  const module = await import(pathToFileURL(resolved));
  const encoder = name === 'gpt-tokenizer' ? module : (module.getEncoding ?? module.get_encoding)('o200k_base');
  countReference = text => encoder.encode(text).length;
  tokenizer = { package: name, version: packageVersion(resolved), encoding: 'o200k_base', scope: 'reference text encoding, not provider billing or full request tokens' };
}
const pythonProbe = JSON.parse(exec('python3', ['-c',
  "import importlib.util,json; print(json.dumps({p: importlib.util.find_spec(p) is not None for p in ['tiktoken','transformers','tokenizers','sentencepiece']}))",
]));
const pythonTokenize = String.raw`
import importlib.metadata, json, sys, tiktoken
from unittest.mock import patch
try:
    with patch('socket.socket.connect', side_effect=RuntimeError('Model vocabulary is not cached; offline measurement')):
        encoding = tiktoken.get_encoding('o200k_base')
    print(json.dumps({'available': True, 'version': importlib.metadata.version('tiktoken'), 'counts': [len(encoding.encode(t, disallowed_special=())) for t in json.load(sys.stdin)]}))
except Exception as error:
    print(json.dumps({'available': False, 'reason': str(error)}))
`;
if (!tokenizer && pythonProbe.tiktoken) {
  const result = JSON.parse(exec('python3', ['-c', pythonTokenize], { input: '[]' }));
  pythonProbe.tiktokenVocabularyAvailable = result.available;
  if (result.available) tokenizer = { package: 'python:tiktoken', version: result.version, encoding: 'o200k_base', scope: 'reference text encoding, not provider billing or full request tokens' };
  else pythonProbe.tiktokenUnavailableReason = result.reason;
}

mkdirSync(join(repo, evidence), { recursive: true });
const sandbox = mkdtempSync(join(repo, evidence, 'run-'));
const fixtureRoot = join(sandbox, 'fixture');
const originalSpawnSync = childProcess.spawnSync;
const childEnv = process.env.TRELLIS_SUBAGENT_CHILD;
delete process.env.TRELLIS_SUBAGENT_CHILD;
const captured = {};
try {
  for (const [path, content] of Object.entries(fixtureFiles)) put(fixtureRoot, path, content);
  mkdirSync(join(fixtureRoot, '.git'), { recursive: true });
  // The extension checks existence before invoking the Python CLI. Its rendered
  // output comes from the actual source-specific Python renderers above.
  put(fixtureRoot, '.trellis/scripts/get_context.py', '# Measurement subprocess boundary\n');
  for (const side of ['original', 'lean']) {
    const sourceRoot = join(sandbox, side);
    for (const [path, content] of Object.entries(sources[side])) put(sourceRoot, path, content);
    const python = JSON.parse(exec('python3', ['-B', '-c', pythonCapture, sourceRoot, fixtureRoot], { input: JSON.stringify(fixtureGit) }));
    put(fixtureRoot, '.trellis/workflow.md', sources[side]['.trellis/workflow.md']);
    for (const path of agentPaths) put(fixtureRoot, path, sources[side][path]);
    childProcess.spawnSync = (command, args, options) => {
      assert.match(command, /^python3?$/);
      assert.equal(args[0], join(fixtureRoot, '.trellis/scripts/get_context.py'));
      assert.equal(options.cwd, fixtureRoot);
      assert.deepEqual(args.slice(1), args.includes('phase') ? ['--mode', 'phase', '--platform', 'pi'] : []);
      return { status: 0, stdout: args.includes('phase') ? python.phase : python.overview, stderr: '' };
    };
    syncBuiltinESMExports();
    // An export-only observation seam; no runtime statements or functions changed.
    const js = stripTypeScriptTypes(`${sources[side]['.pi/extensions/trellis/index.ts']}\nexport { stripFM };`, { mode: 'transform' });
    const module = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
    const normalizePath = text => text.replaceAll(fixtureRoot, repo);
    function captureHook() {
      const tools = [], hooks = new Map();
      module.default({ registerTool: tool => tools.push(tool), on: (name, hook) => hooks.set(name, hook) });
      assert.deepEqual(tools.map(tool => tool.name), ['trellis_subagent']);
      const result = hooks.get('before_agent_start')({ systemPrompt: '' }, {
        cwd: fixtureRoot, sessionManager: { getSessionId: () => 'measure' },
      });
      return { tool: tools[0], system: normalizePath(result.systemPrompt), runtime: normalizePath(result.message?.content ?? '') };
    }
    const { tool, system, runtime } = captureHook();
    const repeated = captureHook();
    assert.equal(repeated.system, system, `${side}: hook output is not deterministic`);
    assert.equal(repeated.runtime, runtime, `${side}: runtime output is not deterministic`);
    const definition = { name: tool.name, description: tool.description, parameters: tool.parameters };
    const promptOptions = { cwd: repo, selectedTools: ['read', tool.name], contextFiles: [], skills: [],
      toolSnippets: tool.promptSnippet ? { [tool.name]: tool.promptSnippet } : {},
      toolGuidelines: { [tool.name]: tool.promptGuidelines ?? [] } };
    const hostSections = buildSystemPromptSections(promptOptions);
    const hostRulesWithoutTool = new Set(buildSystemPromptSections({ ...promptOptions, toolGuidelines: {} }).rules.split('\n'));
    // Actual host rendering; shared section wrappers and generic host rules omitted.
    const guidance = [
      ...hostSections.tools.split('\n').filter(line => line.startsWith(`- ${tool.name}: `)),
      ...hostSections.rules.split('\n').filter(line => !hostRulesWithoutTool.has(line)),
    ].join('\n');
    const skillsResult = loadSkillsFromDir({ dir: join(sourceRoot, '.agents/skills'), source: 'project' });
    assert.equal(skillsResult.diagnostics.length, 0, JSON.stringify(skillsResult.diagnostics));
    const skills = skillsResult.skills.map(skill => ({ ...skill,
      filePath: join(repo, relative(sourceRoot, skill.filePath)),
      baseDir: join(repo, relative(sourceRoot, skill.baseDir)),
    })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    assert.equal(skills.length, 9);
    assert.ok(skills.every(skill => !skill.disableModelInvocation));
    const skillIndex = formatSkillsForPrompt(skills).trim();
    assert.equal(buildSystemPromptSections({ ...promptOptions, skills }).skills, `<skills>\n${skillIndex}\n</skills>`);
    const workflow = python.phase.trim();
    const overview = python.overview.trim();
    assert.ok(system.includes(`<trellis-workflow>\n${workflow}\n</trellis-workflow>`));
    assert.ok(system.includes(`<session-overview>\n${overview}\n</session-overview>`));
    const taskStart = system.indexOf('## Trellis Task Context');
    assert.ok(taskStart > 0);
    const taskContext = system.slice(taskStart);
    function removeOnce(text, part) {
      assert.equal(text.split(part).length, 2, `Expected exactly one occurrence: ${part.slice(0, 70)}`);
      return text.replace(part, '');
    }
    const removeBodies = text => bodyPaths.reduce((value, path) => removeOnce(value, fixtureFiles[path]), text);
    const texts = {
      'tool.definition': JSON.stringify(definition),
      'tool.guidance': guidance,
      'system.skillIndex': skillIndex,
      'injection.workflowIndex': workflow,
      'injection.overview': overview,
      'injection.startupFixed': removeOnce(removeOnce(system.slice(0, taskStart), workflow), overview),
      'injection.taskBodies': bodyPaths.map(path => fixtureFiles[path]).join(''),
      'injection.taskWrapper': removeBodies(taskContext),
      'injection.taskContext': taskContext,
      'injection.fixedSystem': removeBodies(system),
      'injection.completeSystem': system,
      'injection.firstRuntimeUpdate': runtime,
    };
    for (const path of skillPaths) {
      const name = parseFrontmatter(sources[side][path]).frontmatter.name;
      texts[`skillBody.${name}`] = parseFrontmatter(sources[side][path]).body;
      texts[`skillFile.${name}`] = sources[side][path];
    }
    for (const path of promptPaths) {
      const name = path.split('/').at(-1).slice(0, -3);
      texts[`promptBody.${name}`] = parseFrontmatter(sources[side][path]).body;
      texts[`promptFile.${name}`] = sources[side][path];
    }
    for (const path of agentPaths) {
      const name = path.split('/').at(-1).slice(0, -3);
      texts[`agentBody.${name}`] = module.stripFM(sources[side][path]);
      texts[`agentFile.${name}`] = sources[side][path];
    }
    for (const match of sources[side]['.trellis/workflow.md'].matchAll(/\[workflow-state:([A-Za-z0-9_-]+)\]\s*\n([\s\S]*?)\n\s*\[\/workflow-state:\1\]/g)) {
      if (match[1] !== 'my-status') texts[`workflowState.${match[1]}`] = match[2].trim();
    }
    for (const prefix of ['skillBody', 'skillFile', 'promptBody', 'agentBody']) {
      texts[`total.${prefix}`] = Object.entries(texts).filter(([key]) => key.startsWith(`${prefix}.`)).map(([, value]) => value).join('');
    }
    captured[side] = { texts, facts: python.facts };
    put(repo, `${evidence}/${side}/tool.registration.json`, `${JSON.stringify(definition, null, 2)}\n`);
    put(repo, `${evidence}/${side}/tool.registration-guidance.json`, `${JSON.stringify({ promptSnippet: tool.promptSnippet ?? null, promptGuidelines: tool.promptGuidelines ?? [] }, null, 2)}\n`);
    put(repo, `${evidence}/${side}/tool.host-sections.json`, `${JSON.stringify({ tools: hostSections.tools, rules: hostSections.rules }, null, 2)}\n`);
    for (const [key, text] of Object.entries(texts)) put(repo, `${evidence}/${side}/${key}.txt`, text);
  }
} finally {
  childProcess.spawnSync = originalSpawnSync;
  syncBuiltinESMExports();
  if (childEnv === undefined) delete process.env.TRELLIS_SUBAGENT_CHILD;
  else process.env.TRELLIS_SUBAGENT_CHILD = childEnv;
  rmSync(sandbox, { recursive: true, force: true });
}
assert.deepEqual(captured.original.facts, captured.lean.facts, 'Overview fixture facts changed');
assert.equal(captured.original.texts['injection.taskBodies'], captured.lean.texts['injection.taskBodies']);
assert.deepEqual(Object.keys(captured.original.texts), Object.keys(captured.lean.texts));
for (const path of inputPaths) assert.equal(read(path), sources.lean[path], `Source changed during measurement; rerun: ${path}`);
const textList = Object.values(captured).flatMap(side => Object.values(side.texts));
const pythonCounts = tokenizer?.package === 'python:tiktoken'
  ? JSON.parse(exec('python3', ['-c', pythonTokenize], { input: JSON.stringify(textList) })).counts : [];
const referenceByText = new Map(textList.map((text, index) => [text, pythonCounts[index]]));
function measure(text) {
  const characters = [...text].length;
  return { characters, utf8Bytes: Buffer.byteLength(text, 'utf8'), proxyUnits: Math.ceil(characters / 4),
    ...(tokenizer ? { referenceTokens: countReference ? countReference(text) : referenceByText.get(text) } : {}),
    sha256: digest(text) };
}
const rows = Object.fromEntries(Object.keys(captured.original.texts).map(key => {
  const original = measure(captured.original.texts[key]), lean = measure(captured.lean.texts[key]);
  return [key, { original, lean, charactersSaved: original.characters - lean.characters,
    characterReductionPercent: Number(((1 - lean.characters / original.characters) * 100).toFixed(2)) }];
}));
const result = {
  schemaVersion: 1,
  environment: { repository: repo, baseline: baselineHash, lean: 'frozen working-tree sources', node: process.version,
    python: exec('python3', ['--version']).trim(), pi: JSON.parse(readFileSync(join(sdk, 'package.json'), 'utf8')).version,
    piPackage: sdk },
  counter: { characters: 'Unicode code points ([...text].length), not UTF-16 code units',
    utf8Bytes: 'Buffer.byteLength(text, utf8)', proxyUnits: 'ceil(characters / 4); size proxy, not model/provider tokens',
    tokenizer, tokenizerProbe: { node: tokenizerProbe, python: pythonProbe },
    pythonVocabularyNote: 'transformers/tokenizers/sentencepiece alone provide no fixed model vocabulary; no downloads attempted' },
  boundaries: {
    toolDefinition: 'Compact JSON.stringify({name, description, parameters}); registration captured from real extension; label/render/prepareArguments implementation excluded',
    toolGuidance: 'Host-rendered trellis_subagent snippet line plus additional guideline lines; joined with LF; common host rules/section wrappers excluded',
    skillIndex: 'Pi loadSkillsFromDir + formatSkillsForPrompt(...).trim(); nine Trellis skills only, shared skill loading instructions included, outer <skills> tag excluded',
    onDemand: 'skillBody/promptBody use Pi parseFrontmatter.body; agentBody uses extension stripFM; *File retains complete source including frontmatter; total.* concatenates members without separators before counting',
    injection: 'Actual before_agent_start with empty upstream systemPrompt; real Python renderers with fixed filesystem/git inputs substituted at subprocess boundary; phase/overview trimmed as extension does',
    pathNormalization: 'Sandbox task root replaced by current repository root; skill locations use current repository root for both sides; changing checkout path can change absolute counts',
    containment: 'completeSystem contains fixedSystem and taskBodies; fixedSystem contains startupFixed, workflowIndex, overview, taskWrapper; taskContext contains taskWrapper and taskBodies; firstRuntimeUpdate repeats overview plus workflow state; do not sum totals with their children',
    excluded: 'Host base prompt, AGENTS.md, non-Trellis skills/tools, loaded skill references, conversation history, provider request envelope, real model usage and live dispatch validation',
  },
  fixture: { taskPath: fixtureTask, files: fixtureFiles, git: fixtureGit, overviewFacts: captured.original.facts },
  verification: { toolNames: ['trellis_subagent'], skills: 9, prompts: 3, agents: 3,
    freshHookCapturesPerSide: 2, hookOutputIdentical: true, overviewFactsIdentical: true, taskBodyBytesIdentical: true,
    leanInputsStableDuringRun: true },
  inputs: Object.fromEntries(inputPaths.map(path => [path, { originalSha256: digest(sources.original[path]), leanSha256: digest(sources.lean[path]) }])),
  rows,
};
const fmt = value => value.toLocaleString('en-US');
function table(entries) {
  const header = '| 范围 | 原字符 | lean 字符 | 原 bytes | lean bytes | 原代理值 | lean 代理值 | 字符减少 |';
  return [header, '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |', ...entries.map(([label, key]) => {
    const { original: a, lean: b, characterReductionPercent: reduction } = rows[key];
    return `| ${label} | ${fmt(a.characters)} | ${fmt(b.characters)} | ${fmt(a.utf8Bytes)} | ${fmt(b.utf8Bytes)} | ${fmt(a.proxyUnits)} | ${fmt(b.proxyUnits)} | ${reduction}% |`;
  })].join('\n');
}
const report = `# Trellis lean 最终文本计数\n\n` +
  `由 \`node scripts/measure-trellis-context.mjs\` 生成；\`--check\` 重算并校验本报告和 JSON，不改写报告。\n\n` +
  `原版：\`${baselineHash}\`；lean：当前工作区的一次冻结读取。Node ${process.version}、${result.environment.python}、Pi ${result.environment.pi}。仓库路径：\`${repo}\`。源码逐文件 SHA-256、固定输入与全部计数见 [token-comparison.json](token-comparison.json)。\n\n` +
  `## 口径\n\n` +
  `字符按 Unicode 码点计数，bytes 为 UTF-8 字节，代理值为 \`ceil(字符数 / 4)\`。` +
  (tokenizer ? `另有参考 tokenizer：${tokenizer.package} ${tokenizer.version} / ${tokenizer.encoding}，各项 referenceTokens 见 JSON；它不代表本次模型或 provider 计费 token。` : `本地 Node/Python 探测没有可用的固定词表模型 tokenizer，因此仅报告体积代理值，不称为真实 token。`) +
  `没有安装依赖、访问模型服务或读取计费 usage。百分比使用字符差额，避免逐项向上取整误差。\n\n` +
  `工具从两版实际注册函数获取；schema 使用相同紧凑 JSON 序列化，只含 name/description/parameters。调用指导使用当前 Pi 的 system formatter 生成的 snippet/guideline 行，共用宿主规则与标签排除。skill 索引使用 Pi loader/formatter，包含共享加载提示与 9 个条目；两版路径统一使用当前仓库，条目按 name 排序。\n\n` +
  `## 工具与默认文本\n\n` + table([
    ['工具定义', 'tool.definition'], ['工具调用指导', 'tool.guidance'], ['9 个 skill 索引', 'system.skillIndex'],
    ['Pi workflow 索引', 'injection.workflowIndex'], ['固定 overview fixture', 'injection.overview'],
    ['启动固定包装（含标签、分隔）', 'injection.startupFixed'], ['任务固定包装', 'injection.taskWrapper'],
    ['固定正文（PRD/design/implement/spec）', 'injection.taskBodies'], ['任务整体注入', 'injection.taskContext'],
    ['system 固定部分（去任务正文）', 'injection.fixedSystem'], ['Trellis system 整体注入', 'injection.completeSystem'],
    ['首次 runtime 消息', 'injection.firstRuntimeUpdate'],
  ]) + `\n\n` +
  `整体注入通过两版实际 before_agent_start hook 获取，上游 systemPrompt 固定为空。Python workflow/overview 使用对应版本真实 renderer；其文件、身份、任务、journal、git 输入为脚本内固定 fixture。仅在扩展的 Python subprocess 边界回放这些真实输出，未执行模型派发。sandbox 路径映射为当前仓库路径，因此搬动仓库会改变含绝对路径项的计数，但两版仍使用相同路径。\n\n` +
  `任务正文是脚本内冻结的四份小样本，两版逐字相同，不读取本任务持续更新的 PRD/research；因此不会把任务文档变化算成 lean 收益。这不是此前研究快照的任务体积，也不是生产请求的平均值。overview 使用非空任务、单仓库、一次工作区修改、两条提交和一个 journal；详细 fixture 见 JSON。\n\n` +
  `包含关系：system 整体 = system 固定部分 + 任务正文；system 固定部分包含启动包装、workflow 索引、overview 和任务包装。任务整体包含任务包装与正文。首次 runtime 消息再含 overview 和当前状态。表中的子项不能与包含它们的整体相加；工具 JSON、工具指导、skill 索引未包括在扩展 system 整体中。本报告不把不同序列化层拼成“整个请求 token 节省”。\n\n` +
  `## 按需读取与派发正文\n\n` +
  `skill 和命令正文使用 Pi frontmatter parser 返回值（去 frontmatter、trim）；agent 正文使用两版扩展自身的 stripFM（与派发一致）。完整 skill 文件另列，因为 read 工具通常返回含 frontmatter 的文件。JSON 还包含每个命令和 agent 的完整文件计数。合计先无分隔拼接正文，再计算代理值，不把各项已取整代理值相加。\n\n` +
  table(Object.keys(rows).filter(key => /^(skillBody|promptBody|agentBody)\./.test(key)).map(key => [key, key])) + `\n\n` +
  table([['9 个 skill 正文合计', 'total.skillBody'], ['9 个 skill 完整文件合计', 'total.skillFile'],
    ['3 个命令正文合计', 'total.promptBody'], ['3 个 agent 正文合计', 'total.agentBody']]) + `\n\n` +
  `这些是按需加载成本，不是启动时全量发送量。未加载的 skill references、命令参数展开和子代理完整输入没有计入。\n\n` +
  `## 工作流状态正文\n\n` + table(Object.keys(rows).filter(key => key.startsWith('workflowState.')).map(key => [key.slice('workflowState.'.length), key])) + `\n\n` +
  `状态项按源标记抽取并 trim，与 breadcrumb 的正文处理一致；不含 workflow-state 标签和任务状态标题。实际首次 runtime 消息另含当前 in_progress 状态、标题、overview 及标签。\n\n` +
  `## 复现与验证边界\n\n` +
  `\`node scripts/measure-trellis-context.mjs\` 生成报告；\`node scripts/measure-trellis-context.mjs --check\` 校验当前源文件是否仍产生相同报告。脚本要求 Node 24+、Python 3、已有 Pi 安装以及基线 commit 可读；从脚本位置解析仓库，从本地/global npm 位置发现 Pi，不硬编码用户安装路径。\n\n` +
  `每次运行核对 1 个注册工具、9 个可发现 skill、3 个命令、3 个角色；对每版新建两次扩展注册，确认 hook 输出相同；比较 overview 结构化事实、任务正文字节，并确认测量期间工作区源文件未变化。源码 snapshot 临时目录自动清理。原始工具注册 JSON、实际 host tools/rules、各计量文本保存于 \`${evidence}/{original,lean}/\`，未覆盖 \`.tmp/trellis-lean/\` 或 \`.tmp/trellis-lean-context/\` 的历史快照。\n\n` +
  `本报告只证明相同输入下的文本体积与可复现性；不替代参数回归、流程规则审查或真实子代理退出验收，也没有提供真实请求工具表、provider 序列化开销、usage 或缓存收益。更新 lean 文件或 Pi formatter 后需重跑；旧研究快照与本报告的 fixture、trim、格式化边界不同，数字不应直接混用。\n`;
const outputs = { [`${task}/research/token-comparison.json`]: `${JSON.stringify(result, null, 2)}\n`, [`${task}/research/token-report.md`]: report };
for (const [path, content] of Object.entries(outputs)) {
  if (check) assert.equal(read(path), content, `Report is stale; regenerate with node scripts/measure-trellis-context.mjs: ${path}`);
  else put(repo, path, content);
}
console.log(JSON.stringify({ mode: check ? 'checked' : 'generated', reports: Object.keys(outputs), evidence,
  tokenizer: tokenizer ?? 'none: Unicode code points / 4 proxy only',
  tool: rows['tool.definition'], system: rows['injection.completeSystem'], skillFiles: rows['total.skillFile'] }, null, 2));
