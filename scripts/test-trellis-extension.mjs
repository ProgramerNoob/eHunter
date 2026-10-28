// Run with Node 22.13+ and an installed Pi SDK: node --test scripts/test-trellis-extension.mjs
// Child processes are stubbed; host preparation/validation and extension code are real.
import assert from 'node:assert/strict';
import { after, test, mock } from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { stripTypeScriptTypes, syncBuiltinESMExports } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import childProcess from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = join(repo, '.pi/extensions/trellis/index.ts');
const globalModules = childProcess.execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const sdkRoot = [join(repo, 'node_modules'), globalModules]
  .map(base => join(base, '@earendil-works/pi-coding-agent'))
  .find(base => existsSync(join(base, 'dist/core/tools/tool-definition-wrapper.js')));
assert.ok(sdkRoot, 'Install Pi before running the extension contract tests');
const { version: sdkVersion } = JSON.parse(readFileSync(join(sdkRoot, 'package.json'), 'utf8'));
const { wrapToolDefinition } = await import(pathToFileURL(join(sdkRoot, 'dist/core/tools/tool-definition-wrapper.js')));
const { validateToolArguments } = await import(pathToFileURL(join(sdkRoot, 'node_modules/@earendil-works/pi-ai/dist/utils/validation.js')));
const { runToolCall } = await import(pathToFileURL(join(sdkRoot, 'node_modules/@earendil-works/pi-agent-core/dist/agent-loop.js')));
// Frozen pre-lean source: compare contracts and injection payloads with identical inputs.
const baselineRevision = 'e7e5f28';
const baselineSource = childProcess.execFileSync('git', ['show', `${baselineRevision}:.pi/extensions/trellis/index.ts`], { cwd: repo, encoding: 'utf8' });

mkdirSync(join(repo, '.tmp'), { recursive: true });
const fixture = mkdtempSync(join(repo, '.tmp/trellis-extension-'));
const savedEnv = new Map(['TRELLIS_SUBAGENT_CHILD', 'TRELLIS_PI_CLI_JS', 'PI_CODING_AGENT_SESSION_DIR'].map(key => [key, process.env[key]]));
delete process.env.TRELLIS_SUBAGENT_CHILD;
process.env.TRELLIS_PI_CLI_JS = join(fixture, 'pi-stub.mjs');
process.env.PI_CODING_AGENT_SESSION_DIR = join(fixture, 'sessions');
writeFileSync(process.env.TRELLIS_PI_CLI_JS, '// Stubbed at the subprocess boundary.\n');
let now = 1_800_000_000_000;
mock.method(Date, 'now', () => now);
const childCalls = [];
let liveChildren = 0;
let peakChildren = 0;
let failNextChild = false;
const contextCalls = [];
mock.method(childProcess, 'spawnSync', (command, args, options) => {
  assert.match(command, /^python3?$/);
  assert.equal(args[0], join(options.cwd, '.trellis/scripts/get_context.py'));
  contextCalls.push({ args, options });
  const filename = args.includes('phase') ? 'phase.txt' : 'overview.txt';
  return { status: 0, stdout: readFileSync(join(options.cwd, '.trellis', filename), 'utf8'), stderr: '' };
});
mock.method(childProcess, 'spawn', (command, args, options) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.kill = () => { child.exitCode = 1; child.emit('close', 1); };
  child.exitCode = null;
  const call = { command, args, options, prompt: '' };
  childCalls.push(call);
  liveChildren += 1;
  peakChildren = Math.max(peakChildren, liveChildren);
  const fail = failNextChild;
  failNextChild = false;
  child.stdin.on('data', data => { call.prompt += data.toString(); });
  child.stdin.on('finish', () => queueMicrotask(() => {
    const message = { role: 'assistant', content: [{ type: 'text', text: fail ? 'fixture failure' : 'fixture output' }], usage: { input: 10, output: 2, cacheRead: 3, cacheWrite: 0, cost: { total: 0 } } };
    child.stdout.write(`${JSON.stringify({ type: 'message_end', message })}\n`);
    child.stdout.write(`${JSON.stringify({ type: 'agent_end', messages: [message] })}\n`);
    child.exitCode = fail ? 1 : 0;
    liveChildren -= 1;
    child.emit('close', child.exitCode);
  }));
  return child;
});
syncBuiltinESMExports();

async function loadExtension(source) {
  const js = stripTypeScriptTypes(source, { mode: 'transform' });
  return (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)).default;
}
const extension = await loadExtension(readFileSync(extensionPath, 'utf8'));
const baselineExtension = await loadExtension(baselineSource);
after(() => {
  mock.restoreAll();
  syncBuiltinESMExports();
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(fixture, { recursive: true, force: true });
});

const taskPath = '.trellis/tasks/fixture';
const agentTools = 'read,write,edit,bash,find,grep,compress,decompress,search_context,acp_status';
function put(root, path, text) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}
function project(name) {
  const root = join(fixture, name);
  put(root, '.trellis/scripts/get_context.py', '# subprocess stub\n');
  put(root, '.trellis/overview.txt', `developer: fixture\ngit: clean\njournal: .trellis/workspace/fixture\nroot: ${name}\n`);
  put(root, '.trellis/phase.txt', `phase index for ${name}\n`);
  put(root, '.trellis/workflow.md', ['no_task', 'planning', 'in_progress', 'completed', 'task_error'].map(status => `[workflow-state:${status}]\nRule for ${status}\n[/workflow-state:${status}]`).join('\n'));
  for (const agent of ['implement', 'check', 'research']) {
    put(root, `.pi/agents/trellis-${agent}.md`, `---\nname: trellis-${agent}\ntools: ${agentTools}\n---\nRole body ${agent}\n`);
  }
  put(root, `${taskPath}/task.json`, JSON.stringify({ id: 'fixture', status: 'planning' }));
  put(root, `${taskPath}/prd.md`, 'PRD 中文 body\n');
  put(root, `${taskPath}/design.md`, 'Design body\n');
  put(root, `${taskPath}/implement.md`, 'Implementation body\n');
  put(root, '.trellis/spec/fixture.md', 'Curated 中文 body\n');
  put(root, `${taskPath}/implement.jsonl`, `${JSON.stringify({ file: '.trellis/spec/fixture.md', reason: 'Fixture spec' })}\n`);
  put(root, `${taskPath}/check.jsonl`, `${JSON.stringify({ file: '.trellis/spec/fixture.md', reason: 'Fixture spec' })}\n`);
  return root;
}
function ctx(root, id = 'fixture-session') {
  return { cwd: root, sessionManager: { getSessionId: () => id }, model: { provider: 'fixture', id: 'parent' } };
}
function point(root, task = taskPath, id = 'fixture-session') {
  put(root, `.trellis/.runtime/sessions/pi_${id}.json`, JSON.stringify({ current_task: task }));
}
function register(factory = extension) {
  const tools = [], hooks = new Map(), shortcuts = new Map();
  factory({ registerTool: tool => tools.push(tool), on: (name, fn) => hooks.set(name, fn), registerShortcut: (name, value) => shortcuts.set(name, value), getThinkingLevel: () => 'medium' });
  return { tools, tool: tools[0], hooks, shortcuts };
}
function validate(tool, args) {
  return validateToolArguments(wrapToolDefinition(tool), { id: 'validation', name: tool.name, arguments: tool.prepareArguments ? tool.prepareArguments(args) : args });
}
async function dispatch(registration, args, context, options = {}) {
  const tool = wrapToolDefinition(registration.tool, () => context);
  return runToolCall({ id: 'dispatch', name: tool.name, arguments: args }, {
    tools: [tool], context: { systemPrompt: '', messages: [], tools: [tool] },
    assistantMessage: { role: 'assistant', content: [] }, ...options,
  });
}
function before(registration, context) {
  now += 2000; // Advance past the existing 1500ms overview cache, without sleeping.
  return registration.hooks.get('before_agent_start')({ systemPrompt: 'host system' }, context);
}
function normalizeWrappers(text) {
  return text?.replace(/<first-reply-notice>[\s\S]*?<\/first-reply-notice>/, '<first-reply-notice/>')
    .replace(/<session-context>[\s\S]*?<\/session-context>/, '<session-context/>')
    .replace(/<ready>[\s\S]*?<\/ready>/, '<ready/>')
    .replace(/Task directory:/g, 'Task:')
    .replace(/### Curated Spec \/ Research Context/g, '### Curated specs/research')
    .replace(/(<trellis-task-context-update>\n)[^\n]+\n/, '$1<update notice>\n');
}
function compareInjection(actual, original) {
  assert.equal(normalizeWrappers(actual.systemPrompt), normalizeWrappers(original.systemPrompt));
  assert.equal(normalizeWrappers(actual.message?.content), normalizeWrappers(original.message?.content));
  assert.equal(actual.message?.customType, original.message?.customType);
  assert.equal(actual.message?.display, original.message?.display);
}

test(`registration and schema remain compatible with ${baselineRevision}; Pi SDK ${sdkVersion}`, () => {
  const current = register(), original = register(baselineExtension);
  assert.deepEqual(current.tools.map(tool => tool.name), ['trellis_subagent']);
  assert.deepEqual([...current.hooks.keys()], [...original.hooks.keys()]);
  assert.deepEqual([...current.shortcuts.keys()], ['alt+o']);
  const omitDescriptions = schema => JSON.parse(JSON.stringify(schema, (key, value) => key === 'description' ? undefined : value));
  assert.deepEqual(omitDescriptions(current.tool.parameters), omitDescriptions(original.tool.parameters));
  assert.equal(current.tool.parameters.required, undefined);
  assert.equal(current.tool.parameters.properties.prompts.maxItems, 6);
  assert.equal(current.tool.promptSnippet, undefined);
  assert.deepEqual(current.tool.promptGuidelines, ['Use trellis_subagent for task delegation. Start each prompt with "Active task: <task path from `task.py current`>".']);
  assert.equal(current.tool.parameters.properties.agent.description, 'Name from .pi/agents/.');
  const text = tool => JSON.stringify({ name: tool.name, description: tool.description, parameters: tool.parameters });
  assert.equal([...text(current.tool)].length, 483);
  assert.equal([...text(original.tool)].length, 724);
});

test('host invokes preparation before schema validation, permission hook and execution', async () => {
  const { tool } = register();
  // A constrained probe makes the order observable: raw arguments fail this schema.
  const order = [];
  const probe = { ...tool, parameters: { type: 'object', required: ['agent', 'mode', 'prompt'], properties: {
    agent: { const: 'trellis-check' }, mode: { const: 'single' }, prompt: { const: 'work' },
  } }, prepareArguments: args => { order.push('prepare'); return tool.prepareArguments(args); },
  execute: async (_id, args) => { order.push('execute'); return { content: [{ type: 'text', text: args.prompt }] }; } };
  const raw = { agent: 'check', prompt: ' work ' };
  assert.throws(() => validateToolArguments(probe, { name: probe.name, arguments: raw }), /Validation failed/);
  const result = await dispatch({ tool: probe }, raw, undefined, { beforeToolCall: ({ args }) => {
    order.push('beforeToolCall'); assert.equal(args.mode, 'single'); assert.equal(args.prompt, 'work');
  } });
  assert.equal(result.isError, false);
  assert.deepEqual(order, ['prepare', 'beforeToolCall', 'execute']);
  assert.deepEqual(raw, { agent: 'check', prompt: ' work ' });
});

test('defaults, short agent names, trim and prompt precedence retain legal calls', () => {
  const { tool } = register();
  const raw = { prompt: '  work\n', prompts: [' ', ' extra '] };
  assert.deepEqual(validate(tool, raw), { agent: 'trellis-implement', mode: 'single', prompt: 'work', prompts: ['extra'] });
  assert.deepEqual(raw, { prompt: '  work\n', prompts: [' ', ' extra '] });
  for (const agent of ['implement', 'check', 'research', 'trellis-check']) {
    assert.equal(validate(tool, { agent, prompt: 'work' }).agent, agent.startsWith('trellis-') ? agent : `trellis-${agent}`);
  }
  for (const mode of ['parallel', 'chain']) {
    assert.equal(validate(tool, { mode, prompt: 'fallback', prompts: [' ', '\n'] }).prompts, undefined);
    assert.deepEqual(validate(tool, { mode, prompt: 'unused', prompts: ['first', 'second'] }).prompts, ['first', 'second']);
  }
  const normalized = validate(tool, { mode: 'chain', prompts: [' first ', ' ', ' second '] });
  assert.deepEqual(tool.prepareArguments(normalized), normalized);
});

test('wrong types, missing text, unknown enums and oversized raw arrays fail without coercion', () => {
  const { tool } = register();
  for (const args of [null, [], 'work', 12]) assert.throws(() => validate(tool, args), /arguments must be an object/);
  for (const field of ['agent', 'prompt', 'mode', 'model', 'thinking']) {
    for (const value of [null, 42, false, {}, []]) {
      assert.throws(() => validate(tool, { prompt: 'work', [field]: value }), new RegExp(`${field} must be a string`));
    }
  }
  for (const prompts of [null, 'work', {}, [42], ['work', null], [false]]) {
    assert.throws(() => validate(tool, { prompt: 'work', prompts }), /prompts must be an array of strings/);
  }
  for (const args of [{}, { prompt: ' ' }, { prompts: ['no mode inference'] }]) {
    assert.throws(() => validate(tool, args), /prompt is required for single mode/);
  }
  for (const mode of ['parallel', 'chain']) {
    for (const prompts of [undefined, [], [' ', '\n']]) {
      assert.throws(() => validate(tool, { mode, prompts }), /prompt or prompts are required/);
    }
  }
  for (const args of [{ prompt: 'work', mode: 'guess' }, { prompt: 'work', thinking: 'huge' }]) {
    assert.throws(() => validate(tool, args), /Validation failed/);
  }
  for (const mode of ['single', 'parallel', 'chain']) {
    assert.equal(validate(tool, { mode, prompt: 'work', prompts: Array(6).fill('work') }).prompts.length, 6);
    for (const prompts of [Array(7).fill('work'), ['work', ...Array(6).fill(' ')], Array(7).fill(' ')]) {
      assert.throws(() => validate(tool, { mode, prompt: 'fallback', prompts }), /at most 6 items/);
    }
    assert.throws(() => validateToolArguments(tool, { name: tool.name, arguments: { mode, prompt: 'work', prompts: Array(7).fill('work') } }), /Validation failed/);
  }
});

test('single, parallel and chain dispatch preserve context, CLI arguments, results and progress', async () => {
  const root = project('dispatch'); point(root);
  const registration = register();
  for (const mode of ['single', 'parallel', 'chain']) {
    const start = childCalls.length;
    peakChildren = 0;
    const updates = [];
    const args = { agent: 'check', mode, prompt: ' Active task: test\nwork ', prompts: [' Active task: first\nfirst ', ' ', ' Active task: second\nsecond '], model: 'test/model', thinking: 'high' };
    const result = await dispatch(registration, args, ctx(root), { onUpdate: result => updates.push(result) });
    assert.equal(result.isError, false);
    const calls = childCalls.slice(start);
    assert.equal(calls.length, mode === 'single' ? 1 : 2);
    assert.equal(peakChildren, mode === 'parallel' ? 2 : 1);
    for (const call of calls) {
      assert.deepEqual(call.args.slice(1), ['--mode', 'json', '-p', '--no-session', '--model', 'test/model:high', '--tools', agentTools]);
      assert.equal(call.options.cwd, root);
      assert.equal(call.options.env.TRELLIS_SUBAGENT_CHILD, '1');
      assert.equal(call.options.env.TRELLIS_CONTEXT_ID, 'pi_fixture-session');
      assert.equal(call.options.env.PI_SUBAGENT_PARENT_SESSION, 'fixture-session');
      assert.equal(call.options.env.PI_SESSION_ID, undefined);
      assert.match(call.prompt, /Role body check/);
      assert.match(call.prompt, /PRD 中文 body/);
      assert.match(call.prompt, /Curated 中文 body/);
    }
    assert.ok(calls[0].prompt.endsWith(mode === 'single' ? 'Active task: test\nwork' : 'Active task: first\nfirst'));
    if (mode === 'chain') assert.ok(calls[1].prompt.endsWith('Active task: second\nsecond\n\nPrevious output:\nfixture output'));
    if (mode === 'parallel') assert.ok(calls[1].prompt.endsWith('Active task: second\nsecond'));
    assert.equal(result.result.content[0].text, mode === 'parallel' ? 'fixture output\n\n---\n\nfixture output' : 'fixture output');
    const details = result.result.details;
    assert.equal(details.final, true);
    assert.equal(details.mode, mode);
    assert.ok(details.runs.every(run => run.status === 'succeeded' && run.usage.turns === 1 && run.usage.input === 10));
    assert.ok(updates.length > 0);
    assert.ok(updates.every(update => update.content[0].text === 'subagent running'));
    assert.deepEqual(registration.tool.renderCall().render(), []);
    assert.ok(registration.tool.renderResult(result.result).render(100).length > 0);
  }
});

test('model/thinking inheritance, overrides, suffix and all thinking values survive host validation', async () => {
  const root = project('models'); point(root);
  const registration = register();
  for (const thinking of registration.tool.parameters.properties.thinking.enum) {
    const result = await dispatch(registration, { prompt: 'work', model: 'test/model:low', thinking }, ctx(root));
    assert.equal(result.isError, false);
    assert.equal(childCalls.at(-1).args[6], thinking === 'off' ? 'test/model' : `test/model:${thinking}`);
  }
  await dispatch(registration, { prompt: 'work' }, ctx(root));
  assert.equal(childCalls.at(-1).args[6], 'fixture/parent:medium');
  await dispatch(registration, { prompt: 'work', model: 'test/model:low' }, ctx(root));
  assert.equal(childCalls.at(-1).args[6], 'test/model:low');
  put(root, '.pi/agents/trellis-check.md', `---\nmodel: role/model:low\nthinking: high\ntools: ${agentTools}\n---\nRole body\n`);
  await dispatch(registration, { agent: 'check', prompt: 'work' }, ctx(root));
  assert.equal(childCalls.at(-1).args[6], 'role/model:high');
});

test('unknown agent, bad arguments, child failures and cancellation retain diagnostics without extra dispatch', async () => {
  const root = project('errors'); point(root);
  const registration = register();
  const start = childCalls.length;
  const missing = await dispatch(registration, { agent: 'unknown', prompt: 'work' }, ctx(root));
  assert.match(missing.result.content[0].text, /No definition found for: trellis-unknown/);
  assert.equal(missing.result.details.error, 'not a trellis workflow agent');
  for (const args of [{ prompt: 42 }, { prompts: ['work'] }, { mode: 'invalid', prompt: 'work' }]) {
    const outcome = await dispatch(registration, args, ctx(root));
    assert.equal(outcome.isError, true);
  }
  assert.equal(childCalls.length, start);
  failNextChild = true;
  const failed = await dispatch(registration, { mode: 'chain', prompts: ['first', 'never'] }, ctx(root));
  assert.equal(childCalls.length, start + 1);
  assert.equal(failed.result.details.runs[0].status, 'failed');
  assert.deepEqual(registration.hooks.get('tool_result')({ toolName: 'trellis_subagent', details: failed.result.details }), { isError: true });
  // Direct execution exercises the extension's already-aborted subprocess path.
  const cancelled = await registration.tool.execute('abort', validate(registration.tool, { prompt: 'work' }), AbortSignal.abort(), undefined, ctx(root));
  assert.equal(cancelled.details.runs[0].status, 'cancelled');
  assert.equal(childCalls.length, start + 1);
});

test('state snapshots, repeated requests, task/spec updates and resumed sessions match baseline', () => {
  const root = project('states');
  const current = register(), original = register(baselineExtension), context = ctx(root);
  const sample = () => { const actual = before(current, context); compareInjection(actual, before(original, context)); return actual; };
  const initial = sample();
  assert.match(initial.message.content, /Status: no_task/);
  assert.match(initial.systemPrompt, /No active Trellis task found/);
  assert.match(initial.systemPrompt, /first visible assistant reply only/);
  assert.match(initial.systemPrompt, /current user request's language; if unclear, use the established project communication language/);
  assert.match(initial.systemPrompt, /exactly `Trellis SessionStart ✓`/);
  assert.match(initial.systemPrompt, /without changing the remainder's language/);
  assert.equal(sample().message, undefined);
  point(root);
  for (const status of ['planning', 'in_progress', 'completed', 'task_error', 'unknown']) {
    put(root, `${taskPath}/task.json`, JSON.stringify({ id: 'fixture', status }));
    const result = sample();
    assert.equal(result.systemPrompt, initial.systemPrompt);
    assert.match(result.message.content, new RegExp(`Task: fixture \\(${status}\\)`));
    assert.equal(sample().message, undefined);
  }
  for (const path of [`${taskPath}/prd.md`, `${taskPath}/design.md`, `${taskPath}/implement.md`, '.trellis/spec/fixture.md']) {
    put(root, path, `Updated ${path}\n`);
    const result = sample();
    assert.match(result.message.content, /<trellis-task-context-update>/);
    assert.ok(result.message.content.includes(`Updated ${path}`));
    assert.equal(result.systemPrompt, initial.systemPrompt);
    assert.equal(sample().message, undefined);
  }
  put(root, '.trellis/overview.txt', 'developer: fixture\ngit: modified\n');
  assert.match(sample().message.content, /git: modified/);
  assert.equal(sample().message, undefined);
  put(root, `${taskPath}/task.json`, '{broken');
  assert.match(sample().message.content, /Status: no_task/); // Existing TS fallback; no new task_error policy.
  const resumed = register(), resumedBaseline = register(baselineExtension);
  resumed.hooks.get('session_start')({}, context);
  const restored = before(resumed, context);
  compareInjection(restored, before(resumedBaseline, context));
  assert.ok(restored.systemPrompt.includes(`Updated ${taskPath}/prd.md`));
  assert.equal(before(resumed, context).message, undefined);
  assert.ok(contextCalls.every(call => call.options.env.TRELLIS_CONTEXT_ID === 'pi_fixture-session'));
  assert.ok(contextCalls.filter(call => call.args.includes('phase')).every(call => call.args.slice(1).join(' ') === '--mode phase --platform pi'));
});

test('project A → B → A reasserts each current root, with isolated per-session snapshots', () => {
  const rootA = project('root-a'), rootB = project('root-b');
  point(rootA); point(rootB);
  put(rootB, `${taskPath}/prd.md`, 'Project B body\n');
  const current = register(), original = register(baselineExtension);
  let first;
  for (const root of [rootA, rootB, rootA]) {
    const actual = before(current, ctx(root));
    compareInjection(actual, before(original, ctx(root)));
    if (!first) first = actual;
    else assert.match(actual.message.content, /<trellis-task-context-update>/);
    assert.ok(actual.systemPrompt.includes(`Task: ${root}`));
    assert.equal(before(current, ctx(root)).message, undefined);
  }
  assert.equal(before(current, ctx(rootA)).systemPrompt, first.systemPrompt);
  const otherSession = before(current, ctx(rootA, 'other-session'));
  assert.match(otherSession.systemPrompt, /No active Trellis task found/);
  assert.ok(!otherSession.systemPrompt.includes('PRD 中文 body'));
});

test('curated/artifact content, ordering and byte budgets are identical apart from fixed wrappers', () => {
  const root = project('budgets'); point(root);
  const compareFresh = () => {
    const current = before(register(), ctx(root));
    compareInjection(current, before(register(baselineExtension), ctx(root)));
    return current.systemPrompt;
  };
  const full = compareFresh();
  assert.ok(full.indexOf('PRD 中文 body') < full.indexOf('Design body'));
  assert.ok(full.indexOf('Design body') < full.indexOf('Implementation body'));
  assert.ok(full.indexOf('Implementation body') < full.indexOf('Curated 中文 body'));
  put(root, '.trellis/config.yaml', 'context_injection:\n  max_file_bytes: 9\n  max_artifact_bytes: 8\n  max_total_bytes: 0\n');
  const truncated = compareFresh();
  assert.match(truncated, /truncated at 9 bytes/);
  assert.match(truncated, /truncated at 8 bytes/);
  assert.ok(!truncated.includes('\uFFFD'));
  put(root, '.trellis/config.yaml', 'context_injection:\n  max_file_bytes: 0\n  max_artifact_bytes: 0\n  max_total_bytes: 70\n');
  const limited = compareFresh();
  assert.match(limited, /Curated 中文 body/); // Curated specs consume budget first, though displayed last.
  assert.match(limited, /not inlined \(total context limit reached\)/);
});

test('child recursion guard, bash context bridge, notifications and shutdown hooks remain available', () => {
  process.env.TRELLIS_SUBAGENT_CHILD = '1';
  try { assert.equal(register().tools.length, 0); }
  finally { delete process.env.TRELLIS_SUBAGENT_CHILD; }
  const registration = register(), root = project('hooks');
  const notices = [];
  registration.hooks.get('session_start')({}, { ...ctx(root), ui: { notify: (...args) => notices.push(args) } });
  assert.equal(notices.length, 1);
  assert.match(notices[0][0], /trellis-start.*trellis-continue/);
  const event = { toolName: 'bash', input: { command: 'python3 .trellis/scripts/task.py current' } };
  registration.hooks.get('tool_call')(event, ctx(root));
  const once = event.input.command;
  registration.hooks.get('tool_call')(event, ctx(root));
  assert.equal(event.input.command, once);
  assert.match(once, /export TRELLIS_CONTEXT_ID=/);
  registration.hooks.get('session_shutdown')({});
});

test('in_progress tasks refuse main-session implementation writes and keep the rest open', () => {
  const registration = register(), root = project('write-guard');
  point(root, taskPath, 'guard-session');
  const context = ctx(root, 'guard-session');
  const call = (toolName, path) => registration.hooks.get('tool_call')({ toolName, input: { path } }, context);
  put(root, `${taskPath}/task.json`, JSON.stringify({ id: 'fixture', status: 'in_progress' }));

  const blocked = call('write', 'src/main.ts');
  assert.equal(blocked.block, true);
  assert.match(blocked.reason, /src\/main\.ts.*trellis-implement/s);
  assert.equal(call('edit', join(root, 'core/TestApp.vue')).block, true);
  assert.equal(call('edit', 'scripts/acceptance.py').block, true);

  assert.equal(call('write', `${taskPath}/acceptance.json`), undefined);
  assert.equal(call('edit', '.trellis/spec/frontend/quality-guidelines.md'), undefined);
  assert.equal(call('edit', 'AGENTS.md'), undefined);
  assert.equal(call('write', '.trellis/tasks/fixture/notes.txt'), undefined);
  assert.equal(call('bash', 'src/main.ts'), undefined);

  put(root, `${taskPath}/task.json`, JSON.stringify({ id: 'fixture', status: 'planning' }));
  assert.equal(call('write', 'src/main.ts'), undefined);

  put(root, `${taskPath}/task.json`, JSON.stringify({ id: 'fixture', status: 'in_progress' }));
  process.env.TRELLIS_SUBAGENT_CHILD = '1';
  try { assert.equal(call('write', 'src/main.ts'), undefined); }
  finally { delete process.env.TRELLIS_SUBAGENT_CHILD; }

  assert.equal(registration.hooks.get('tool_call')({ toolName: 'write', input: { path: 'src/main.ts' } }, ctx(root, 'other-session')), undefined);
});
