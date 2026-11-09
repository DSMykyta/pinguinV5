/** UI adapters must not import other adapters, composition root, features or Shell. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('toolbar, mode, stats and paste are sibling-independent', () => {
  for (const name of ['toolbar', 'mode', 'stats', 'paste']) {
    const source = readFileSync(fileURLToPath(new URL(`./${name}.js`, import.meta.url)), 'utf8');
    for (const sibling of ['toolbar', 'mode', 'stats', 'paste', 'rich-text-editor']) {
      assert.doesNotMatch(source, new RegExp(`from\\s*['"]\\./${sibling}\\.js['"]`));
    }
    assert.doesNotMatch(source, /(?:from\s+['"][^'"]*(?:src\/shell|src\/features))/);
  }
});
