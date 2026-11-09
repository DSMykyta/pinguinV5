import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIAL_SYMBOLS } from '../src/ui/icon/material-symbols.js';
import { createIcon } from '../src/ui/icon/icon.js';

test('Material Symbols registry contains the existing public aliases', () => {
  const required = [
    'house', 'panel-left', 'panel-right', 'search', 'sliders',
    'sun', 'moon', 'monitor', 'code', 'layers', 'table-2',
    'layout-grid', 'file-text', 'plus', 'pencil', 'ellipsis',
    'x', 'check-circle', 'info', 'triangle-alert', 'circle-alert',
    'pin', 'pin-off', 'external-link',
  ];
  assert.equal(Object.keys(MATERIAL_SYMBOLS).length, required.length);
  for (const name of required) {
    assert.match(MATERIAL_SYMBOLS[name], /<path\b/);
    assert.doesNotMatch(MATERIAL_SYMBOLS[name], /<script\b|on\w+=/i);
  }
});

test('existing createIcon API returns a local, accessible SVG using Google geometry', () => {
  const prior = globalThis.document;
  globalThis.document = {
    createElementNS(namespace, tagName) {
      assert.equal(namespace, 'http://www.w3.org/2000/svg');
      assert.equal(tagName, 'svg');
      const attrs = new Map();
      const classes = [];
      return {
        attrs, classes,
        setAttribute(name, value) { attrs.set(name, value); },
        classList: { add(name) { classes.push(name); } },
        innerHTML: '',
      };
    },
  };
  try {
    const icon = createIcon('pencil');
    assert.equal(icon.attrs.get('viewBox'), '0 -960 960 960');
    assert.equal(icon.attrs.get('fill'), 'currentColor');
    assert.equal(icon.attrs.get('aria-hidden'), 'true');
    assert.equal(icon.attrs.get('focusable'), 'false');
    assert.ok(icon.classes.includes('pg-icon'));
    assert.equal(icon.innerHTML, MATERIAL_SYMBOLS.pencil);
    assert.throws(() => createIcon('unknown'), /Unknown icon/);
  } finally {
    if (prior === undefined) delete globalThis.document;
    else globalThis.document = prior;
  }
});
