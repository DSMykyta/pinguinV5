#!/usr/bin/env node
/**
 * Pinguin Next naming guard.
 *
 * Automates a deliberately small, reliable subset of docs/conventions.md:
 * file/folder kebab-case, pg- CSS selectors, --pg- variables,
 * colors declared only in tokens.css and no HTML inline style attributes.
 * Function and domain naming still require code review.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const roots = ['src', 'docs', 'scripts', 'tests', '.github/workflows'];
const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.vercel']);
const exceptions = new Set(['README.md', '.gitignore', '.editorconfig', '.env.example']);
const filenamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.(?:test|spec|config))?\.(?:js|mjs|cjs|ts|tsx|css|html|json|md|svg|png|jpe?g|webp|gif|woff2?|ttf|ico|yml|yaml|txt)$/;
const folderPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const errors = [];
let filesChecked = 0;
let stylesChecked = 0;

async function walk(folder) {
  let entries;
  try {
    entries = await readdir(folder, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;

    const path = join(folder, entry.name);
    const label = relative(root, path).split(sep).join('/');

    if (entry.isDirectory()) {
      if (!folderPattern.test(entry.name)) {
        errors.push(label + ': folder must use lowercase kebab-case');
      }
      await walk(path);
      continue;
    }

    if (!entry.isFile()) continue;
    filesChecked += 1;

    if (!exceptions.has(entry.name) && !filenamePattern.test(entry.name)) {
      errors.push(label + ': file must use lowercase kebab-case and an allowed extension');
    }

    if (entry.name.endsWith('.css')) {
      await checkCss(path, label);
    } else if (entry.name.endsWith('.html')) {
      await checkHtml(path, label);
    }
  }
}

async function checkCss(path, label) {
  stylesChecked += 1;
  const raw = await readFile(path, 'utf8');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

  for (const match of css.matchAll(/(?<![\w-])\.([A-Za-z_][\w-]*)/g)) {
    if (!match[1].startsWith('pg-')) {
      errors.push(label + ': CSS class .' + match[1] + ' must start with pg-');
    }
  }
  for (const match of css.matchAll(/(?:var\s*\(\s*|(?:^|[;{])\s*)--([A-Za-z_][\w-]*)/gm)) {
    if (!match[1].startsWith('pg-')) {
      errors.push(label + ': CSS variable --' + match[1] + ' must start with --pg-');
    }
  }

  if (label !== 'src/styles/tokens.css' && /#[\da-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/.test(css)) {
    errors.push(label + ': raw colors belong only in src/styles/tokens.css');
  }
}

async function checkHtml(path, label) {
  const html = await readFile(path, 'utf8');
  if (/\bstyle\s*=/i.test(html)) {
    errors.push(label + ': inline HTML style= is prohibited');
  }
}

for (const directory of roots) {
  await walk(join(root, directory));
}

if (errors.length > 0) {
  console.error('Pinguin naming check failed (' + errors.length + ' issues):\n');
  for (const issue of errors) console.error('  - ' + issue);
  process.exitCode = 1;
} else {
  console.log('Pinguin conventions OK: ' + filesChecked + ' files, ' + stylesChecked + ' stylesheets checked.');
}
