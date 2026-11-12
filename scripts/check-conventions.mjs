#!/usr/bin/env node
/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CONVENTIONS GUARD                                                                   ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє іменування й CSS-контракти.                                                 ║
 * ║ ЗАЛЕЖНОСТІ: Node.js fs/path.                                                                       ║
 * ║ ПУБЛІЧНИЙ API: npm run check:naming.                                                               ║
 * ║ ПРИНЦИП: Ніколи не переписує вихідні файли.                                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Pinguin Next naming guard.
 *
 * Automates a deliberately small, reliable subset of docs/conventions.md:
 * file/folder kebab-case, pg- CSS selectors, --pg- variables,
 * colors declared only in tokens.css, component CSS ownership and no HTML inline styles.
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

// These components own their styles. Cross-component selectors belong in their
// own CSS files, never in the global Shell stylesheet.
const cssOwnerByPrefix = new Map([
  ['pg-page', 'src/ui/page/page.css'],
  ['pg-search', 'src/shell/search/search.css'],
  ['pg-tabs', 'src/ui/tabs/tabs.css'],
  ['pg-aside', 'src/shell/aside/aside.css'],
  ['pg-sidebar', 'src/shell/sidebar/sidebar.css'],
  ['pg-route-message', 'src/shell/route-message.css'],
  ['pg-data-row', 'src/ui/data-row/data-row.css'],
  ['pg-icon-button', 'src/ui/button/button.css'],
  ['pg-mini-button', 'src/ui/button/button.css'],
  ['pg-button', 'src/ui/button/button.css'],
  ['pg-toast', 'src/ui/toast/toast.css'],
  ['pg-dialog', 'src/ui/dialog/dialog.css'],
  ['pg-input', 'src/ui/input/input.css'],
  ['pg-rich-text-editor', 'src/ui/rich-text-editor/rich-text-editor.css'],
  ['pg-section-navigator', 'src/ui/section-navigator/section-navigator.css'],
  ['pg-tools-section-navigator-demo', 'src/features/tools/section-navigator-demo.css'],
  ['pg-tools-input-demo', 'src/features/tools/input-demo.css'],
  ['pg-tools-dialog-demo', 'src/features/tools/dialog-demo.css'],
  ['pg-tools-toast-demo', 'src/features/tools/toast-demo.css'],
]);
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

  // Button registry is deliberately finite: new CSS variants require a design
  // review, an approved entry here, and a per-variant header in button.css.
  if (label === 'src/ui/button/button.css') {
    const approved = new Set([
      'pg-icon-button', 'pg-icon-button--corner', 'pg-mini-button',
      'pg-button', 'pg-button--primary', 'pg-button--secondary',
      'pg-button--outline', 'pg-button--destructive', 'pg-button--compact',
      'pg-button--pill', 'pg-button--page', 'pg-button--step',
      'pg-button--tool', 'pg-button--list-item', 'pg-button--nav-item', 'pg-button--chip-remove',
      'pg-button--chip-more', 'pg-button--plain', 'pg-button--quiet',
      'pg-button--square', 'pg-button--group',
    ]);
    const inSelectors = new Set(
      [...css.matchAll(/\.((?:pg-button|pg-icon-button)(?:--[a-z0-9-]+)?|pg-mini-button)(?=[\s.#:[{,])/g)]
        .map(match => match[1]),
    );
    const headers = new Map();
    const required = ['ПРИЗНАЧЕННЯ:', 'НАВІЩО:', 'ДЕ:', 'ГЕОМЕТРІЯ:', 'СТАНИ:', 'МЕЖА:'];
    for (const match of raw.matchAll(/\/\*[\s\S]*?\*\//g)) {
      const comment = match[0];
      const type = comment.match(/(?:^|\n)\s*\*\s*(?:║\s*)?ТИП:\s*\.(pg-(?:button|icon-button|mini-button)[\w-]*)/);
      if (!type) continue;
      if (headers.has(type[1])) {
        errors.push(label + ': duplicated header for .' + type[1]);
      }
      headers.set(type[1], comment);
      for (const field of required) {
        if (!comment.includes(field)) {
          errors.push(label + ': .' + type[1] + ' header lacks ' + field);
        }
      }
    }
    for (const type of inSelectors) {
      if (!approved.has(type)) {
        errors.push(label + ': new button type .' + type +
          ' needs explicit design review and registration; do not create one-off skins');
      }
      if (!headers.has(type)) {
        errors.push(label + ': button style .' + type +
          ' lacks its own purpose/usage/state header');
      }
    }
    for (const type of approved) {
      if (!inSelectors.has(type) || !headers.has(type)) {
        errors.push(label + ': approved button type .' + type + ' has no CSS or header');
      }
    }
    for (const type of headers.keys()) {
      if (!inSelectors.has(type)) {
        errors.push(label + ': stale button header for unused .' + type);
      }
    }
  }

  if (/\.pg-aside__pin\b/.test(css)) {
    errors.push(label + ': deprecated aside pin skin is forbidden; use shared .pg-mini-button');
  }

  // Role selectors describe placement and state semantics, not new button skins.
  // Every ordinary button appearance belongs to src/ui/button/button.css.
  if (label !== 'src/ui/button/button.css') {
    const buttonRoles = [
      'pg-menu__trigger', 'pg-menu__item', 'pg-dialog__button',
      'pg-selection-actions__action', 'pg-pagination__button',
      'pg-number-field__step', 'pg-image-field__choose',
      'pg-image-field__replace', 'pg-image-field__remove',
      'pg-rich-text-editor__action', 'pg-toast__action', 'pg-toast__close',
      'pg-listbox__select-all', 'pg-listbox__chip-remove',
      'pg-listbox__more', 'pg-collection-view__sort',
      'pg-tools-field-demo__help', 'pg-input__clear',
      'pg-tag-field__remove',
    ];
    const skinProperties = new Set([
      'background', 'background-color', 'border', 'border-color', 'border-radius',
      'color', 'box-shadow', 'font-size', 'font-weight', 'transition', 'filter',
    ]);
    for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      // A menu checkmark is semantic decoration; a rich-text mark is typography.
      if (selector.includes('::after')) continue;
      const role = buttonRoles.find(name =>
        new RegExp('\\.' + name + '(?![\\w-])').test(selector));
      if (!role) continue;
      const props = [...declarations.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)]
        .map(match => match[1])
        .filter(property => skinProperties.has(property));
      if (props.length) {
        errors.push(label + ': .' + role + ' styles ' + props.join(', ') +
          ' locally; use shared src/ui/button/button.css variant');
      }
    }
  }

  for (const [prefix, owner] of cssOwnerByPrefix) {
    // Group owns only spatial geometry of existing pg-button--group controls;
    // color/hover/selected skins remain in button.css.
    if (label === 'src/ui/button-group/button-group.css' && prefix === 'pg-button') continue;
    if (label !== owner && new RegExp('\\.' + prefix + '(?:__|--|\\b)').test(css)) {
      errors.push(label + ': component .' + prefix + ' must be styled only in ' + owner);
    }
  }

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
