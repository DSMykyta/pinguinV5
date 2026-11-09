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

test('shared header actions switch groups without duplicating buttons', () => {
  const previous = globalThis.document;
  const elements = [];
  const createFakeElement = (tag) => {
    const attributes = new Map();
    const listeners = new Map();
    const element = {
      tag, dataset: {}, inert: false, children: [], textContent: '',
      attributes, listeners,
      className: '',
      classList: { add() {} },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      append(...items) { this.children.push(...items); },
      addEventListener(name, callback) { listeners.set(name, callback); },
      remove() { this.removed = true; },
      click() { listeners.get('click')?.(); },
    };
    elements.push(element);
    return element;
  };
  globalThis.document = {
    createElement: createFakeElement,
    createElementNS(_namespace, tag) { return createFakeElement(tag); },
  };

  try {
    const actions = [];
    let cleared = 0;
    const ui = createSelectionActions({
      single: [{value:'duplicate',label:'Дублювати'}],
      multiple:[
        {value:'archive',label:'Архівувати'},
        {value:'restore',label:'Відновити'},
      ],
      onAction: value => actions.push(value),
      onClear: () => { cleared++; },
    });
    const [counter, single, multiple, dismiss] = ui.element.children;
    assert.equal(ui.element.dataset.pgMode, 'none');
    assert.equal(ui.element.inert, true);
    assert.equal(single.inert, true);
    assert.equal(multiple.inert, true);

    ui.setSelection(['a']);
    assert.equal(ui.element.dataset.pgMode, 'single');
    assert.equal(ui.element.inert, false);
    assert.equal(counter.textContent, '1 вибрано');
    assert.equal(single.inert, false);
    assert.equal(multiple.inert, true);
    single.children[0].click();
    assert.deepEqual(actions, ['duplicate']);

    ui.setSelection(['a', 'b']);
    assert.equal(ui.element.dataset.pgMode, 'multiple');
    assert.equal(counter.textContent, '2 вибрано');
    assert.equal(single.inert, true);
    assert.equal(multiple.inert, false);
    multiple.children[0].click();
    multiple.children[1].click();
    assert.deepEqual(actions, ['duplicate','archive','restore']);

    dismiss.click();
    assert.equal(cleared, 1);
    ui.setSelection([]);
    assert.equal(ui.element.dataset.pgMode, 'none');
    assert.equal(ui.element.inert, true);
    ui.destroy();
    assert.equal(ui.element.removed, true);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
