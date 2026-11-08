/**
 * PINGUIN NEXT — GESTURE LIFECYCLE TESTS
 * ПРИЗНАЧЕННЯ: Детерміновані перевірки input-серій та скасування.
 * ЗАЛЕЖНОСТІ: Node EventTarget/test, справжній адаптер жестів.
 * ПУБЛІЧНИЙ API: node --test.
 * ПРИНЦИП: Штучний годинник замінює лише браузерний час та DOM-метрики.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { mountNavigationGestures } from './navigation-gestures.js';

function fixture() {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map();
  const document = new EventTarget();
  class Element extends EventTarget {
    constructor() {
      super();
      this.ownerDocument = document;
      this.clientHeight = 400;
      this.scrollHeight = 1000;
      this.scrollTop = 600;
      this.disabled = false;
      this.capture = null;
    }
    matches() { return false; }
    hasPointerCapture(id) { return this.capture === id; }
    setPointerCapture(id) { this.capture = id; }
    releasePointerCapture() { this.capture = null; }
  }
  const view = new EventTarget();
  Object.assign(view, {
    // Native browsers have no Node EventTarget listener warning limit.
    AbortController: class extends AbortController {
      constructor() { super(); setMaxListeners(0, this.signal); }
    },
    HTMLElement: Element,
    performance: { now: () => now },
    getComputedStyle: () => ({ overflowY: 'auto', lineHeight: '20px' }),
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
  });
  document.defaultView = view;
  document.getSelection = () => ({ isCollapsed: true });
  const viewport = new Element();
  const handles = { previous: new Element(), next: new Element() };
  const changes = [];
  const gestures = mountNavigationGestures({ viewport, handles, canGo: () => true,
    isEnabled: () => true, onProgress() {}, onNavigate: (...args) => changes.push(args) });
  function dispatch(target, type, properties) {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    target.dispatchEvent(event);
    return event;
  }
  return { viewport, handles, changes, gestures,
    wheel(properties = {}) {
      return dispatch(viewport, 'wheel', { deltaMode: 0, deltaY: 80, deltaX: 0, ...properties });
    },
    pointer(type, properties = {}) {
      return dispatch(handles.next, type, { isPrimary: true, pointerId: 1, button: 0,
        clientX: 100, clientY: 200, ...properties });
    },
    pointerElsewhere(properties = {}) {
      return dispatch(document, 'pointerdown', { isPrimary: false, pointerId: 2, ...properties });
    },
    touch(type, points) { return dispatch(viewport, type, { touches: points }); },
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of timers) if (timer.at <= now) {
        timers.delete(id);
        timer.callback();
      }
    },
  };
}

test('an ignored event cannot turn an ordinary wheel burst into boundary navigation', () => {
  for (const ignored of [{ ctrlKey: true }, { deltaX: 200 }, { defaultPrevented: true }]) {
    const input = fixture();
    input.viewport.scrollTop = 300;
    input.wheel();
    input.viewport.scrollTop = 600;
    // defaultPrevented is read-only; use a previously cancelled event for this case.
    if (ignored.defaultPrevented) {
      const event = new Event('wheel', { cancelable: true });
      Object.assign(event, { deltaMode: 0, deltaY: 80, deltaX: 0 });
      event.preventDefault();
      input.viewport.dispatchEvent(event);
    } else input.wheel(ignored);
    input.wheel(); input.wheel(); input.wheel();
    input.advance(201);
    assert.equal(input.changes.length, 0);
    input.gestures.destroy();
  }
});

test('fresh boundary wheel confirms after idle, with a cooldown against residual momentum', () => {
  const input = fixture();
  input.wheel(); input.wheel(); input.wheel();
  assert.equal(input.changes.length, 0);
  input.advance(201);
  assert.deepEqual(input.changes, [['next', 'wheel']]);
  input.wheel(); input.wheel(); input.wheel();
  input.advance(201);
  assert.equal(input.changes.length, 1);
  input.advance(600);
  input.wheel(); input.wheel(); input.wheel();
  input.advance(201);
  assert.equal(input.changes.length, 2);
  input.gestures.destroy();
});

test('a second pointer cancels an armed handle pull', () => {
  const input = fixture();
  input.pointer('pointerdown');
  input.pointer('pointermove', { clientY: 80 });
  input.pointer('pointerdown', { pointerId: 2, isPrimary: false });
  input.pointer('pointerup', { clientY: 80 });
  assert.equal(input.changes.length, 0);
  input.gestures.destroy();
});

test('a second contact outside either handle cancels an armed pull', () => {
  const input = fixture();
  input.pointer('pointerdown');
  input.pointer('pointermove', { clientY: 80 });
  input.pointerElsewhere();
  input.pointer('pointerup', { clientY: 80 });
  assert.equal(input.changes.length, 0);
  input.gestures.destroy();
});

test('a fresh click works immediately after a cancelled drag', () => {
  const input = fixture();
  input.pointer('pointerdown');
  input.pointer('pointermove', { clientY: 80 });
  input.pointer('pointercancel');
  input.pointer('pointerdown');
  input.pointer('pointerup');
  input.pointer('click', { detail: 1 });
  assert.deepEqual(input.changes, [['next', 'button']]);
  input.gestures.destroy();
});

test('touch release commits; touchcancel and a second finger never commit', () => {
  for (const ending of ['touchend', 'touchcancel', 'multi']) {
    const input = fixture();
    input.touch('touchstart', [{ identifier: 1, clientX: 100, clientY: 200 }]);
    input.touch('touchmove', [{ identifier: 1, clientX: 100, clientY: 80 }]);
    if (ending === 'multi') {
      input.touch('touchstart', [
        { identifier: 1, clientX: 100, clientY: 80 },
        { identifier: 2, clientX: 130, clientY: 80 },
      ]);
    }
    input.touch(ending === 'multi' ? 'touchend' : ending, []);
    assert.equal(input.changes.length, ending === 'touchend' ? 1 : 0);
    input.gestures.destroy();
  }
});

test('destroy clears pending wheel confirmation and removes input listeners', () => {
  const input = fixture();
  input.wheel(); input.wheel(); input.wheel();
  input.gestures.destroy();
  input.advance(1000);
  input.wheel(); input.wheel(); input.wheel();
  input.advance(1000);
  assert.equal(input.changes.length, 0);
});

test('destroying one adapter preserves another mounted on the same document', () => {
  const input = fixture();
  const secondChanges = [];
  const Element = input.viewport.constructor;
  const secondViewport = new Element();
  const second = mountNavigationGestures({
    viewport: secondViewport, handles: { previous: new Element(), next: new Element() },
    canGo: () => true, isEnabled: () => true,
    onProgress() {}, onNavigate: (...args) => secondChanges.push(args),
  });
  input.wheel(); input.wheel(); input.wheel();
  for (let index = 0; index < 3; index++) {
    secondViewport.dispatchEvent(Object.assign(new Event('wheel', { cancelable: true }), {
      deltaMode: 0, deltaY: 80, deltaX: 0,
    }));
  }
  input.gestures.destroy();
  input.advance(201);
  assert.equal(input.changes.length, 0);
  assert.deepEqual(secondChanges, [['next', 'wheel']]);
  second.destroy();
});
