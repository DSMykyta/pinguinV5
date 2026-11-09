import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getSelectionMode, createSelectionActions } from '../src/ui/selection-actions/selection-actions.js';

test('selection uses none, single and multiple states', () => {
  assert.equal(getSelectionMode(0), 'none');
  assert.equal(getSelectionMode(1), 'single');
  assert.equal(getSelectionMode(2), 'multiple');
  assert.equal(getSelectionMode(25), 'multiple');
  assert.throws(() => getSelectionMode(-1), RangeError);
  assert.throws(() => getSelectionMode(1.5), RangeError);
});

test('both mode groups reuse RevealPanel, never show a cross or count for one', () => {
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
    const performed = [];
    const ui = createSelectionActions({
      single: [{ value: 'duplicate', label: 'Дублювати' }],
      multiple: [
        { value: 'archive', label: 'Архівувати' },
        { value: 'restore', label: 'Відновити' },
      ],
      onAction: value => performed.push(value),
    });
    const [single, multiple] = ui.element.children;
    assert.equal(ui.element.children.length, 2); // no dismiss button
    assert.equal(single.children.length, 1); // no selection count
    assert.equal(multiple.children.length, 3); // count plus two actions
    assert.equal(single.dataset.pgRevealDirection, 'top');
    assert.equal(multiple.dataset.pgRevealDirection, 'top');

    const expectState = (mode, singleVisible, multipleVisible) => {
      assert.equal(ui.element.dataset.pgMode, mode);
      assert.equal(single.hidden, !singleVisible);
      assert.equal(multiple.hidden, !multipleVisible);
      assert.equal(single.inert, !singleVisible);
      assert.equal(multiple.inert, !multipleVisible);
      assert.equal(ui.element.inert, mode === 'none');
    };

    expectState('none', false, false);
    ui.setSelection(['a']);
    expectState('single', true, false);
    assert.equal(single.dataset.pgState, 'visible');
    assert.equal(single.children[0].textContent, 'Дублювати');
    single.children[0].click();

    ui.setSelection(['a','b']);
    expectState('multiple', false, true);
    assert.equal(multiple.dataset.pgState, 'visible');
    assert.equal(multiple.children[0].textContent, '2 вибрано');
    multiple.children[1].click();
    multiple.children[2].click();

    ui.setSelection(['a']);
    expectState('single', true, false);
    assert.equal(single.dataset.pgState, 'visible');
    assert.equal(multiple.dataset.pgState, 'hidden');

    ui.setSelection([]);
    expectState('none', false, false);
    assert.deepEqual(performed, ['duplicate','archive','restore']);
    ui.destroy();
    assert.equal(ui.element.removed, true);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = previousHTMLElement;
  }
});

test('animated groups occupy one anchored region and do not move header controls', () => {
  const css = readFileSync(new URL('../src/ui/selection-actions/selection-actions.css', import.meta.url), 'utf8');
  const hostCss = readFileSync(new URL('../src/features/tools/data-views-demo.css', import.meta.url), 'utf8');
  const group = css.match(/\.pg-selection-actions__group\s*\{([^}]+)\}/)?.[1] ?? '';
  const root = css.match(/\.pg-selection-actions\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(root, /position:\s*absolute/);
  assert.match(root, /inset-inline-end:\s*calc\(100%/);
  assert.match(group, /position:\s*absolute/);
  assert.match(group, /inset:\s*0;/);
  assert.match(group, /width:\s*100%;/);
  assert.match(group, /justify-content:\s*flex-end;/);
  assert.doesNotMatch(group, /width:\s*max-content/);
  assert.doesNotMatch(css, /transition\s*:\s*max-width|transform:\s*translateY/);
  assert.match(hostCss, /\.pg-tools-data-views__header-actions\s*\{[^}]*position:\s*relative/);
});
