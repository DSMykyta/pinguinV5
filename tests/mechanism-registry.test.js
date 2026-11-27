/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MECHANISM REGISTRY GUARD
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє повноту реєстру активного src.
 * ║ ЗАЛЕЖНОСТІ: Node fs, path, assert, test.
 * ║ ПУБЛІЧНИЙ API: npm test.
 * ║ ПРИНЦИП: Виявляє незареєстровані й видалені файли; не підміняє семантичний огляд.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function walk(folder) {
  return readdirSync(join(root, folder), { withFileTypes: true }).flatMap(entry => {
    const path = folder + '/' + entry.name;
    return entry.isDirectory() ? walk(path) : entry.isFile() && !path.endsWith('.test.js') ? [path] : [];
  });
}
test('all active source files have exactly one registry entry', () => {
  const registry = readFileSync(join(root, 'docs/ui/mechanism-registry.md'), 'utf8');
  const listed = [...registry.matchAll(/^- `(src\/[^ `]+)`$/gm)].map(match => match[1]);
  assert.equal(new Set(listed).size, listed.length, 'duplicate source registry entry');
  assert.deepEqual(listed.sort(), walk('src').sort(), 'update mechanism registry in the same commit');
});
