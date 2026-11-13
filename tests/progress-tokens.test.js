/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED PROGRESS GEOMETRY TOKENS                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Захист від локальних px та розходжень Slider/Wave/compact controls.   ║
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert, node:fs та CSS компонентів.                    ║
 * ║ ПУБЛІЧНИЙ API: node --test tests/progress-tokens.test.js.                          ║
 * ║ ПРИНЦИП: Структурний контракт; браузерну геометрію перевіряє Playwright.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const getCss = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const tokens = getCss('../src/styles/tokens.css');
const slider = getCss('../src/ui/slider/slider.css');
const wave = getCss('../src/ui/wave-progress/wave-progress.css');
const demo = getCss('../src/features/tools/wave-progress-demo.css');

function valueOf(token) {
  const match = tokens.match(new RegExp('(?:^|\\n)\\s*' + token + ':\\s*([^;]+);'));
  assert.ok(match, 'Missing central token ' + token);
  return match[1].trim();
}
function noLiteralPx(source, path) {
  const rules = source.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(rules, /\b\d+(?:\.\d+)?px\b/, path + ' has inline size literals');
}

test('shared Slider and Wave geometry comes from variables, not per-component pixel literals', () => {
  noLiteralPx(slider, 'slider.css');
  noLiteralPx(wave, 'wave-progress.css');
  noLiteralPx(demo, 'wave-progress-demo.css');
});

test('visible Slider handle matches shared Checkbox/Mini control, not native hit target', () => {
  assert.equal(valueOf('--pg-compact-control-size'), '32px');
  assert.equal(valueOf('--pg-slider-handle-height'), 'var(--pg-compact-control-size)');
  assert.equal(valueOf('--pg-slider-hit-size'), 'var(--pg-space-12)');
  assert.equal(valueOf('--pg-space-12'), '48px');
  assert.equal(valueOf('--pg-slider-track-active-height'), 'var(--pg-space-4)');
  assert.equal(valueOf('--pg-space-4'), '16px');
  assert.equal(valueOf('--pg-slider-track-inactive-height'), 'var(--pg-track-compact-height)');
  assert.equal(valueOf('--pg-track-compact-height'), '10px');
  assert.equal(valueOf('--pg-wave-rest-height'), 'var(--pg-track-compact-height)');
  assert.equal(valueOf('--pg-progress-dot-size'), 'var(--pg-space-1)');
  assert.equal(valueOf('--pg-slider-dot-size'), 'var(--pg-progress-dot-size)');
  assert.equal(valueOf('--pg-wave-dot-size'), 'var(--pg-progress-dot-size)');
  assert.equal(valueOf('--pg-progress-dot-inset'), 'calc((var(--pg-track-compact-height) - var(--pg-progress-dot-size)) / 2)');
});

test('progress ink, tracks, wave mask period and text hierarchy share the same design tokens', () => {
  assert.equal(valueOf('--pg-color-progress-active'), 'var(--pg-color-accent)');
  assert.equal(valueOf('--pg-color-progress-inactive'), 'var(--pg-color-accent-soft)');
  for (const [css, active, inactive] of [
    [slider, '--pg-color-accent', '--pg-color-accent-soft'],
    [wave, '--pg-color-progress-active', '--pg-color-progress-inactive'],
  ]) {
    assert.match(css, new RegExp('background: var\\(' + active + '\\)'));
    assert.match(css, new RegExp('background: var\\(' + inactive + '\\)'));
  }
  assert.equal(valueOf('--pg-slider-label-size'), 'var(--pg-progress-label-size)');
  assert.match(slider, /font-weight: var\(--pg-progress-value-weight\)/);
  assert.match(demo, /font-weight: var\(--pg-progress-value-weight\)/);
  assert.match(demo, /font-size: var\(--pg-progress-label-size\)/);
  assert.match(wave, /mask-size: var\(--pg-wave-period\) 100%/);
  assert.match(wave, /mask-position: var\(--pg-wave-period\) 0/);
  assert.match(wave, /inset-inline-end: var\(--pg-progress-dot-inset\)/);
  assert.match(slider, /inset-inline-end: var\(--pg-progress-dot-inset\)/);
  assert.match(wave, /\[data-pg-state='complete'\] \.pg-wave-progress__wave/);
  assert.match(slider, /\[data-pg-edge='end'\] \.pg-slider__active/);
});
