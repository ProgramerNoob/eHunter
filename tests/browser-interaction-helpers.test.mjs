import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dispatchMouse,
  clickAt,
  clickElement,
  dragBy,
  dismissSimpleDialog,
  ensureTopBar,
  ensureThumbPanel,
} from '../scripts/browser-preflight.mjs';

// Minimal page stand-in: records CDP commands and evaluate round trips, so the
// helpers' wire behaviour is asserted without a browser. `evaluate` answers from
// a queue of scripted results, mirroring how Ego returns plain JSON values.
class PageFixture {
  constructor(evaluations = []) {
    this.label = 'p1';
    this.spaceId = 1;
    this.calls = [];
    this.evaluations = [...evaluations];
    this.waits = [];
  }

  async cdp(method, params) {
    this.calls.push({ method, params });
    return {};
  }

  async evaluate(callback, argument) {
    this.calls.push({ method: 'evaluate', argument });
    const next = this.evaluations.shift();
    if (next === undefined) throw new Error('PageFixture ran out of scripted evaluate results');
    return typeof next === 'function' ? next(argument) : next;
  }

  async waitForTimeout(ms) {
    this.waits.push(ms);
  }

  mouseCalls() {
    return this.calls.filter(call => call.method === 'Input.dispatchMouseEvent').map(call => call.params);
  }
}

test('dispatchMouse rounds coordinates and fills wire defaults per event type', async () => {
  const page = new PageFixture();
  await dispatchMouse(page, { type: 'mouseMoved', x: 10.4, y: 20.6 });
  await dispatchMouse(page, { type: 'mousePressed', x: 10, y: 20 });
  await dispatchMouse(page, { type: 'mouseReleased', x: 10, y: 20 });

  assert.deepEqual(page.mouseCalls(), [
    { type: 'mouseMoved', x: 10, y: 21, button: 'none', buttons: 0, clickCount: 0 },
    { type: 'mousePressed', x: 10, y: 20, button: 'left', buttons: 1, clickCount: 1 },
    { type: 'mouseReleased', x: 10, y: 20, button: 'left', buttons: 0, clickCount: 1 },
  ]);
});

test('clickAt moves, settles, presses and releases in that order', async () => {
  const page = new PageFixture();
  await clickAt(page, 100, 200, { settleMs: 5 });

  assert.deepEqual(page.mouseCalls().map(call => call.type), [
    'mouseMoved',
    'mousePressed',
    'mouseReleased',
  ]);
  assert.deepEqual(page.waits, [5, 5]);
});

test('clickElement returns null when the selector is absent', async () => {
  const page = new PageFixture([null]);

  assert.equal(await clickElement(page, '.missing'), null);
  assert.deepEqual(page.mouseCalls(), []);
});

test('clickElement scrolls first and then clicks the measured centre', async () => {
  const page = new PageFixture([{ found: true }, { x: 50, y: 60 }]);

  assert.deepEqual(await clickElement(page, '.target', { scrollWaitMs: 0 }), { x: 50, y: 60 });
  assert.deepEqual(page.mouseCalls().map(call => ({ x: call.x, y: call.y })), [
    { x: 50, y: 60 },
    { x: 50, y: 60 },
    { x: 50, y: 60 },
  ]);
});

test('clickElement refuses zero-sized elements instead of clicking blindly', async () => {
  const page = new PageFixture([{ found: true }, null]);

  assert.equal(await clickElement(page, '.collapsed', { scrollWaitMs: 0 }), null);
  assert.deepEqual(page.mouseCalls(), []);
});

test('dragBy interpolates between endpoints and releases at the target', async () => {
  const page = new PageFixture();
  await dragBy(page, { from: { x: 0, y: 0 }, to: { x: 40, y: 0 }, steps: 4, settleMs: 0 });

  const moves = page.mouseCalls().filter(call => call.type === 'mouseMoved');
  assert.deepEqual(moves.map(call => call.x), [0, 10, 20, 30, 40]);
  const release = page.mouseCalls().at(-1);
  assert.equal(release.type, 'mouseReleased');
  assert.deepEqual({ x: release.x, y: release.y }, { x: 40, y: 0 });
});

test('dragBy can hold before moving so long-press gestures arm', async () => {
  const page = new PageFixture();
  await dragBy(page, { from: { x: 0, y: 0 }, to: { x: 0, y: 10 }, steps: 1, settleMs: 0, holdMs: 750 });

  assert.ok(page.waits.includes(750));
  const order = page.mouseCalls().map(call => call.type);
  assert.deepEqual(order, ['mouseMoved', 'mousePressed', 'mouseMoved', 'mouseReleased']);
});

test('dismissSimpleDialog returns immediately when no dialog is present', async () => {
  const page = new PageFixture([0]);

  assert.equal(await dismissSimpleDialog(page), 0);
  assert.deepEqual(page.mouseCalls(), []);
});

test('dismissSimpleDialog clicks the trailing action button and re-checks', async () => {
  const page = new PageFixture([1, { x: 300, y: 500 }, 0]);

  assert.equal(await dismissSimpleDialog(page, { settleMs: 0 }), 0);
  assert.deepEqual(page.mouseCalls().map(call => call.type), ['mouseMoved', 'mousePressed', 'mouseReleased']);
});

test('dismissSimpleDialog gives up and reports the remaining count', async () => {
  const page = new PageFixture([1, null]);

  assert.equal(await dismissSimpleDialog(page, { settleMs: 0 }), 1);
  assert.deepEqual(page.mouseCalls(), []);
});

test('ensureTopBar is a no-op when the bar is already visible', async () => {
  const page = new PageFixture([false]);

  assert.equal(await ensureTopBar(page), false);
  assert.deepEqual(page.mouseCalls(), []);
});

test('ensureTopBar clicks the toggle button when the bar is hidden', async () => {
  const page = new PageFixture([true, { x: 20, y: 20 }]);

  assert.equal(await ensureTopBar(page, { settleMs: 0 }), true);
  assert.equal(page.mouseCalls().length, 3);
});

test('ensureThumbPanel only presses t when no panel is visible', async () => {
  const hidden = new PageFixture([{ visible: false }, null]);
  assert.equal(await ensureThumbPanel(hidden, { settleMs: 0 }), true);
  assert.equal(hidden.calls.filter(call => call.method === 'evaluate').length, 2);

  const shown = new PageFixture([{ visible: true }]);
  assert.equal(await ensureThumbPanel(shown, { settleMs: 0 }), false);
  assert.equal(shown.calls.filter(call => call.method === 'evaluate').length, 1);
});
