#!/usr/bin/env node
/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FILE HEADER GUARD                                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє наявність єдиної інформативної шапки в початкових файлах проєкту.            ║
 * ║ ЗАЛЕЖНОСТІ: Node.js fs/path/url; docs/file-headers.md.                                              ║
 * ║ ПУБЛІЧНИЙ API: npm run check:headers.                                                                ║
 * ║ ПРИНЦИП: Лише читає файли; при порушенні повертає ненульовий код завершення.                         ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const roots = ['src', 'scripts', 'tests', '.github/workflows'];
const rootFiles = ['playwright.config.js', 'index.html'];
const extensions = new Set(['.js', '.mjs', '.css', '.html', '.yml', '.yaml']);
const required = ['PINGUIN NEXT', '╔', '╠', '╚', 'ПРИЗНАЧЕННЯ:', 'ЗАЛЕЖНОСТІ:', 'ПУБЛІЧНИЙ API:', 'ПРИНЦИП:'];
const errors = [];
let checked = 0;

async function walk(folder) {
  const entries = await readdir(join(root, folder), { withFileTypes: true });
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.vercel'].includes(entry.name)) await walk(path);
    } else if (entry.isFile() && extensions.has(extname(entry.name))) {
      await check(path);
    }
  }
}

function getHeader(content, extension) {
  let source = content.replace(/^\uFEFF/, '');
  if (source.startsWith('#!')) source = source.slice(source.indexOf('\n') + 1);
  if (extension === '.html') {
    source = source.replace(/^<!doctype html>\s*/i, '');
    return source.match(/^\s*<!--[\s\S]*?-->/)?.[0] ?? '';
  }
  if (extension === '.yml' || extension === '.yaml') {
    return source.match(/^(?:#[^\r\n]*(?:\r?\n|$))+/)?.[0] ?? '';
  }
  return source.match(/^\s*\/\*[\s\S]*?\*\//)?.[0] ?? '';
}

async function check(path) {
  checked += 1;
  const file = join(root, path);
  const extension = extname(file);
  const source = await readFile(file, 'utf8');
  const header = getHeader(source, extension);
  const missing = required.filter(part => !header.includes(part));
  if (missing.length) {
    errors.push(relative(root, file).split(sep).join('/') + ': немає коректної шапки (' + missing.join(', ') + ')');
  }
}

for (const folder of roots) await walk(folder);
for (const file of rootFiles) await check(file);

if (errors.length) {
  console.error('Pinguin file headers: ' + errors.length + ' порушень у ' + checked + ' файлах:\n');
  for (const error of errors) console.error('  - ' + error);
  process.exitCode = 1;
} else {
  console.log('Pinguin file headers OK: ' + checked + ' файлів перевірено.');
}
