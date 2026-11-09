/** UI adapters must not import other feature adapters or Shell. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('toolbar, mirror, stats depend only on their own internal utilities and contract', () => {
  for (const name of ['toolbar', 'mirror', 'stats']) {
    const file = fileURLToPath(new URL(`./${name}.js`, import.meta.url));
    const source = readFileSync(file, 'utf8');
    for (const sibling of ['toolbar', 'mirror', 'stats', 'rich-text-editor']) {
      assert.doesNotMatch(source, new RegExp(`from\\s*['"]\\./${sibling}\\.js['"]`));
    }
    assert.doesNotMatch(source, /(?:from\s+['"][^'"]*(?:src\/shell|src\/features))/);
  }
});
