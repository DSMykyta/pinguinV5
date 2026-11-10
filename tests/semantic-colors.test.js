/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SEMANTIC BUTTON COLORS                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевірка API, кольорових ролей та контрасту light/dark.    ║
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert/strict, node:fs, shared button.js.   ║
 * ║ ПУБЛІЧНИЙ API: node --test tests/semantic-colors.test.js.               ║
 * ║ ПРИНЦИП: Без браузера; геометрію/візуал окремо перевіряє Playwright.     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setButtonColor, createIconButton } from '../src/ui/button/button.js';

const tones = ['main', 'secondary', 'tertiary', 'danger', 'warning', 'success', 'info'];
const tokenSource = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const buttonCss = readFileSync(new URL('../src/ui/button/button.css', import.meta.url), 'utf8');
const darkIndex = tokenSource.indexOf(":root[data-theme='dark']");
const blocks = {
  light: tokenSource.slice(0, darkIndex),
  dark: tokenSource.slice(darkIndex),
};

function token(theme, name) {
  const line = blocks[theme].match(new RegExp('--pg-tone-' + name + ':\\s*([^;]+);'));
  assert.ok(line, theme + ' missing token --pg-tone-' + name);
  const value = line[1].trim();
  const alias = value.match(/^var\\(--(pg-tone-[a-z-]+)\\)$/);
  return alias ? token(theme, alias[1].slice('pg-tone-'.length)) : value;
}

function hex(color) {
  assert.match(color, /^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
}

function luminance(color) {
  const channels = hex(color).map(v => v / 255).map(v =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function blend(foreground, background, opacity) {
  const fg = hex(foreground), bg = hex(background);
  const rgb = fg.map((value, i) => Math.round(value * opacity + bg[i] * (1 - opacity)));
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

test('7 legacy hues are present and soft/solid/hover maintain readable contrast', () => {
  assert.notEqual(darkIndex, -1);
  for (const theme of ['light', 'dark']) {
    const surface = theme === 'dark' ? '#282828' : '#ffffff';
    for (const role of tones) {
      const base = token(theme, role + '-base');
      const softInk = token(theme, role + '-on-soft');
      const solid = token(theme, role + '-solid');
      const solidInk = token(theme, role + '-on-solid');
      const soft = blend(base, surface, theme === 'dark' ? 0.11 : 0.10);
      const hover = blend(base, surface, 0.16);
      assert.ok(contrast(softInk, soft) >= 4.5, theme + '/' + role + ' soft contrast');
      assert.ok(contrast(softInk, hover) >= 4.5, theme + '/' + role + ' hover contrast');
      assert.ok(contrast(solidInk, solid) >= 4.5, theme + '/' + role + ' solid contrast');
      assert.match(blocks[theme], new RegExp('--pg-tone-' + role + '-soft: color-mix'));
    }
  }
});

test('all semantic role selectors and four appearances use one shared style owner', () => {
  for (const role of tones) assert.ok(buttonCss.includes("data-pg-tone='" + role + "'"));
  for (const appearance of ['soft', 'solid', 'outline', 'ghost']) {
    assert.ok(buttonCss.includes("data-pg-appearance='" + appearance + "'"));
  }
  assert.doesNotMatch(buttonCss, /--_pg-/);
});

test('setButtonColor applies, changes and clears two independent color dimensions', () => {
  const button = { dataset: {} };
  assert.equal(setButtonColor(button, { tone: 'danger', appearance: 'soft' }), button);
  assert.deepEqual(button.dataset, { pgTone: 'danger', pgAppearance: 'soft' });
  setButtonColor(button, { tone: 'warning', appearance: 'solid' });
  assert.deepEqual(button.dataset, { pgTone: 'warning', pgAppearance: 'solid' });
  assert.throws(() => setButtonColor(button, { tone: 'not-a-role' }), TypeError);
  assert.throws(() => setButtonColor(button, { tone: 'danger', appearance: 'bad' }), TypeError);
  assert.throws(() => setButtonColor(button, { appearance: 'soft' }), TypeError);
  setButtonColor(button, {});
  assert.deepEqual(button.dataset, {});
});

test('shared mini IconButton keeps geometry variant independent of tone', () => {
  const previous = globalThis.document;
  const createElement = () => {
    const classes = new Set();
    return {
      dataset: {}, classes, children: [],
      classList: { add(value) { classes.add(value); } },
      setAttribute() {}, addEventListener() {},
      append(child) { this.children.push(child); },
    };
  };
  globalThis.document = { createElement, createElementNS: createElement };
  try {
    const button = createIconButton({
      label: 'Видалити', icon: 'x', variant: 'mini', tone: 'danger',
    });
    assert.equal(button.className, 'pg-icon-button');
    assert.ok(button.classes.has('pg-mini-button'));
    assert.equal(button.dataset.pgTone, 'danger');
    assert.equal(button.dataset.pgAppearance, 'ghost');
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
