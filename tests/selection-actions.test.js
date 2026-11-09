import test from 'node:test';
import assert from 'node:assert/strict';
import { getSelectionMode, createSelectionActions } from '../src/ui/selection-actions/selection-actions.js';

test('selection state changes only at 0, 1 and 2+ rows', () => {
  assert.equal(getSelectionMode(0), 'none');
  assert.equal(getSelectionMode(1), 'single');
  assert.equal(getSelectionMode(2), 'multiple');
  assert.equal(getSelectionMode(25), 'multiple');
  assert.throws(() => getSelectionMode(-1), RangeError);
  assert.throws(() => getSelectionMode(1.5), RangeError);
});

test('header actions reuse shared reveal, swap groups and stay outside flex flow', () => {
  const previousDocument = globalThis.document;
  const previousHTMLElement = globalThis.HTMLElement;
  let doc;
  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.dataset = {};
      this.hidden = false;
      this.inert = false;
      this.children = [];
      this.textContent = '';
      this.attributes = new Map();
      this.listeners = new Map();
      this.ownerDocument = doc;
      this.isConnected = true;
      this.classList = { add() {} };
    }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    append(...items) { this.children.push(...items); }
    addEventListener(key, callback) { this.listeners.set(key, callback); }
    removeEventListener(key) { this.listeners.delete(key); }
    getBoundingClientRect() { return { height: 40 }; }
    contains(target) { return this === target || this.children.some(
      child => child.contains?.(target),
    ); }
    remove() { this.removed = true; }
    click() { this.listeners.get('click')?.(); }
  }
  doc = {
    defaultView: {
      matchMedia: () => ({ matches: true }),
      clearTimeout() {},
    },
    activeElement: null,
    createElement: tag => new FakeElement(tag),
    createElementNS: (_ns, tag) => new FakeElement(tag),
  };
  globalThis.document = doc;
  globalThis.HTMLElement = FakeElement;
  try {
    const actions = [];
    let cleared = 0;
    const ui = createSelectionActions({
      single: [{ value: 'duplicate', label: 'Дублювати' }],
      multiple: [
        { value: 'archive', label: 'Архівувати' },
        { value: 'restore', label: 'Відновити' },
      ],
      onAction: value => actions.push(value),
      onClear: () => { cleared++; },
    });
    const [counter, single, multiple, dismiss] = ui.element.children;

    assert.equal(ui.element.dataset.pgMode, 'none');
    assert.equal(ui.element.dataset.pgRevealDirection, 'top');
    assert.equal(ui.element.dataset.pgState, 'hidden');
    assert.equal(ui.element.hidden, true);
    assert.equal(ui.element.inert, true);
    assert.equal(single.hidden, true);
    assert.equal(multiple.hidden, true);

    ui.setSelection(['a']);
    assert.equal(ui.element.dataset.pgMode, 'single');
    assert.equal(ui.element.dataset.pgState, 'visible');
    assert.equal(ui.element.hidden, false);
    assert.equal(counter.textContent, '1 вибрано');
    assert.equal(single.hidden, false);
    assert.equal(multiple.hidden, true);
    single.children[0].click();
    assert.deepEqual(actions, ['duplicate']);

    ui.setSelection(['a', 'b']);
    assert.equal(ui.element.dataset.pgMode, 'multiple');
    assert.equal(counter.textContent, '2 вибрано');
    assert.equal(ui.element.dataset.pgState, 'visible');
    assert.equal(single.hidden, true);
    assert.equal(multiple.hidden, false);
    multiple.children[0].click();
    multiple.children[1].click();
    assert.deepEqual(actions, ['duplicate', 'archive', 'restore']);

    dismiss.click();
    assert.equal(cleared, 1);
    ui.setSelection([]);
    assert.equal(ui.element.dataset.pgState, 'hidden');
    assert.equal(ui.element.hidden, true);
    assert.equal(ui.element.inert, true);
    ui.destroy();
    assert.equal(ui.element.removed, true);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previousHTMLElement;
  }
});
