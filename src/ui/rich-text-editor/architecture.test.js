/**
 * PINGUIN NEXT — RICH TEXT MODULE BOUNDARY TEST
 * Optional views may not import each other or the composition root.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('optional views do not reference sibling modules', () => {
  for (const name of ['toolbar', 'mirror', 'stats']) {
    const source = readFileSync(fileURLToPath(new URL('./' + name + '.js', import.meta.url)), 'utf8');
    for (const other of ['toolbar', 'mirror', 'stats', 'rich-text-editor']) {
      assert.doesNotMatch(source, new RegExp("from\\s+['\"]\\./" + other + "\\.js['\"]"), name);
    }
  }
});
