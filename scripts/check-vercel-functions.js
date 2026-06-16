// scripts/check-vercel-functions.js

// =========================================================================
// VERCEL FUNCTION LIMIT CHECK
// =========================================================================
// Fails CI before deploy when api/**/*.js would exceed Vercel Hobby's
// 12 Serverless Functions limit after applying .vercelignore directory rules.
// =========================================================================

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');
const LIMIT = Number.parseInt(process.env.VERCEL_FUNCTION_LIMIT || '12', 10);

function main() {
  const ignoreRules = readVercelIgnore();
  const apiFiles = listJavaScriptFiles(API_DIR)
    .map(file => normalizeRelativePath(path.relative(ROOT, file)))
    .filter(file => !isIgnored(file, ignoreRules));

  if (apiFiles.length > LIMIT) {
    console.error(`Vercel function limit exceeded: ${apiFiles.length}/${LIMIT}`);
    apiFiles.forEach(file => console.error(`- ${file}`));
    process.exit(1);
  }

  console.log(`Vercel function count OK: ${apiFiles.length}/${LIMIT}`);
  apiFiles.forEach(file => console.log(`- ${file}`));
}

function readVercelIgnore() {
  const filePath = path.join(ROOT, '.vercelignore');
  if (!fs.existsSync(filePath)) return [];

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function listJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function isIgnored(file, rules) {
  return rules.some(rule => {
    const normalizedRule = normalizeRelativePath(rule);

    if (normalizedRule.endsWith('/')) {
      return file.startsWith(normalizedRule);
    }
    return file === normalizedRule;
  });
}

function normalizeRelativePath(value) {
  return value.replace(/\\/g, '/');
}

main();
