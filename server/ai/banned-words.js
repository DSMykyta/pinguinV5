// server/ai/banned-words.js

// =========================================================================
// AI BANNED WORDS POLICY
// =========================================================================
// Reads the existing Banned sheet for AI Magic. The data stays server-side and
// is used only to guide/sanitize generated content before it reaches the UI.
// =========================================================================

const { getValues } = require('../utils/google-sheets');

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PROMPT_CHARS = 8000;

let cachedPolicy = null;
let cachedUntil = 0;

async function loadBannedWordsPolicy() {
  const now = Date.now();
  if (cachedPolicy && cachedUntil > now) {
    return cachedPolicy;
  }

  try {
    const rows = await getValues('Banned!A:I', 'banned');
    const terms = parseBannedRows(rows);
    cachedPolicy = {
      terms,
      promptText: buildBannedWordsPrompt(terms),
      warning: '',
    };
  } catch (error) {
    cachedPolicy = {
      terms: [],
      promptText: 'The banned-words database is unavailable. Still avoid medical claims, disease names, guaranteed results, discounts, prices, and aggressive calls to buy.',
      warning: `Banned words database unavailable: ${error.message || 'unknown error'}`,
    };
  }

  cachedUntil = now + CACHE_TTL_MS;
  return cachedPolicy;
}

function parseBannedRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const headers = rows[0].map(value => String(value || '').trim().toLowerCase());
  const hasHeaders = headers.includes('name_uk') || headers.includes('name_ru');
  const indexes = hasHeaders
    ? {
      nameUk: headers.indexOf('name_uk'),
      nameRu: headers.indexOf('name_ru'),
      type: headers.indexOf('banned_type'),
      hint: headers.indexOf('banned_hint'),
    }
    : {
      nameUk: 2,
      nameRu: 3,
      type: 4,
      hint: 6,
    };

  const seen = new Set();
  const terms = [];

  for (const row of hasHeaders ? rows.slice(1) : rows) {
    if (!Array.isArray(row)) continue;

    const termValues = [
      ...splitTerms(valueAt(row, indexes.nameUk)),
      ...splitTerms(valueAt(row, indexes.nameRu)),
    ];

    for (const term of termValues) {
      const key = term.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      terms.push({
        term,
        type: valueAt(row, indexes.type),
        hint: valueAt(row, indexes.hint),
      });
    }
  }

  return terms;
}

function buildBannedWordsPrompt(terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return 'No banned-words rows are available. Avoid risky supplement wording by default.';
  }

  const lines = [
    'Banned words from the database. Do not output these terms in SEO, text, table, ingredients, directions, or warnings. Use safer hints when present:',
  ];

  for (const item of terms) {
    const line = [
      `- ${item.term}`,
      item.type ? `type: ${item.type}` : '',
      item.hint ? `safe hint: ${item.hint}` : '',
    ].filter(Boolean).join(' | ');

    if ((lines.join('\n').length + line.length + 1) > MAX_PROMPT_CHARS) {
      lines.push('- ...list truncated for prompt length; the loaded database terms still remain forbidden.');
      break;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

function sanitizeResultWithBannedWords(result, policy) {
  if (!result || !Array.isArray(policy?.terms) || policy.terms.length === 0) {
    if (policy?.warning) addManualNote(result, policy.warning);
    return result;
  }

  const violations = [];

  for (const target of collectTextTargets(result)) {
    const originalValue = target.get();
    const sanitizedValue = sanitizeText(originalValue, policy.terms, violations, target.path);
    if (sanitizedValue !== originalValue) {
      target.set(sanitizedValue);
    }
  }

  if (policy.warning) {
    addManualNote(result, policy.warning);
  }

  if (violations.length > 0) {
    addManualNote(result, `Згенерований текст очищено від заборонених слів: ${formatViolations(violations)}.`);
  }

  return result;
}

function sanitizeText(value, terms, violations, path) {
  let nextValue = String(value || '');
  if (!nextValue) return nextValue;

  for (const item of terms) {
    if (!item.term) continue;

    const regex = createTermRegex(item.term);
    if (!regex.test(nextValue)) continue;

    violations.push({ path, term: item.term });
    const replacement = item.hint || '';
    nextValue = nextValue.replace(createTermRegex(item.term), (_match, prefix, suffix) => (
      `${prefix}${replacement}${suffix}`
    ));
  }

  return nextValue
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function collectTextTargets(result) {
  const targets = [];

  for (const lang of ['ua', 'ru']) {
    const section = result[lang];
    if (!section) continue;

    for (const field of ['h1', 'seo_title', 'seo_description', 'description_html', 'ingredients', 'directions', 'warnings']) {
      targets.push({
        path: `${lang}.${field}`,
        get: () => section[field] || '',
        set: value => { section[field] = value; },
      });
    }

    targets.push({
      path: `${lang}.seo_keywords`,
      get: () => Array.isArray(section.seo_keywords) ? section.seo_keywords.join('\n') : '',
      set: value => {
        section.seo_keywords = value
          .split('\n')
          .map(item => item.trim())
          .filter(Boolean);
      },
    });
  }

  if (result.table) {
    targets.push({
      path: 'table.ua_text',
      get: () => result.table.ua_text || '',
      set: value => { result.table.ua_text = value; },
    });
    targets.push({
      path: 'table.ru_text',
      get: () => result.table.ru_text || '',
      set: value => { result.table.ru_text = value; },
    });
  }

  return targets;
}

function addManualNote(result, note) {
  if (!result || !note) return;
  if (!Array.isArray(result.manual_check_notes)) {
    result.manual_check_notes = [];
  }
  if (!result.manual_check_notes.includes(note)) {
    result.manual_check_notes.push(note);
  }
}

function formatViolations(violations) {
  return [...new Set(violations.map(item => `${item.path}: ${item.term}`))]
    .slice(0, 10)
    .join('; ');
}

function splitTerms(value) {
  return String(value || '')
    .split(/[,;\n]+/)
    .map(item => item.trim())
    .filter(item => item.length > 1);
}

function valueAt(row, index) {
  return Number.isInteger(index) && index >= 0 ? String(row[index] || '').trim() : '';
}

function createTermRegex(term) {
  const escaped = escapeRegExp(term).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'giu');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  buildBannedWordsPrompt,
  loadBannedWordsPolicy,
  parseBannedRows,
  sanitizeResultWithBannedWords,
};
