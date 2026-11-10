#!/usr/bin/env node
/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED ICONS GUARD                                                                   ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє, що UI використовує лише спільні Material Symbols Rounded.                  ║
 * ║ ЗАЛЕЖНОСТІ: Node.js fs/path/url, src/ui/icon/material-symbols.js.                                  ║
 * ║ ПУБЛІЧНИЙ API: npm run check:icons.                                                                 ║
 * ║ ПРИНЦИП: Лише перевірка; жодних змін у вихідних файлах.                                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATERIAL_SYMBOLS } from '../src/ui/icon/material-symbols.js';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const failures = [];
let scanned = 0;
const allowedSvgBuilders = new Set([
  'ui/icon/icon.js', // Canonical factory
  'ui/section-navigator/section-navigator.js', // Progress ring, not pictogram
  'features/tools/media-library-demo.js', // Illustrative demo image thumbnails
]);

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
      await audit(full);
    }
  }
}

async function audit(file) {
  const path = relative(root, file).replaceAll('\\', '/');
  const source = await readFile(file, 'utf8');
  scanned += 1;
  const commentsRemoved = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // These are pictograms in UI when assigned directly as one-character control content.
  const glyphPattern = /(?:\.textContent\s*=|\bcontent\s*:)\s*['"`](?:×|✕|✖|✓|✔|↑|↓|↕|−|\+)['"`]/g;
  for (const hit of commentsRemoved.matchAll(glyphPattern)) {
    failures.push(path + ': font-dependent pictogram ' + hit[0] + ' — use createIcon()');
  }

  if (!allowedSvgBuilders.has(path) &&
      (/\bcreateElementNS\s*\(\s*['"`]http:\/\/www\.w3\.org\/2000\/svg/.test(commentsRemoved)
        || /<svg\b/i.test(commentsRemoved))) {
    failures.push(path + ': inline SVG icon outside the shared factory');
  }

  // Literal icon names should always resolve to the local, approved registry.
  for (const hit of commentsRemoved.matchAll(/\bcreateIcon\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    if (!Object.hasOwn(MATERIAL_SYMBOLS, hit[1])) {
      failures.push(path + ': unknown shared icon ' + hit[1]);
    }
  }

  if (path === 'ui/field/field.css' &&
      /\.pg-field__caret\s*\{[^}]*border-(?:inline|block)-(?:start|end)/s.test(commentsRemoved)) {
    failures.push(path + ': caret must use Material Symbols Rounded, not CSS borders');
  }
}

await walk(root);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Shared icons: ' + scanned + ' source files checked; Material Symbols Rounded contract satisfied.');
}
