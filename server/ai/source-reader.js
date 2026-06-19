// server/ai/source-reader.js

// =========================================================================
// AI SOURCE READER
// =========================================================================
// Normalizes user input for AI generation. URLs are fetched through the
// existing SSRF-safe fetch helper; plain product names stay as query input.
// =========================================================================

const { SafeUrlError, safeFetchBuffer } = require('../utils/safe-url-fetch');
const { AiInputError } = require('./errors');

const MAX_INPUT_LENGTH = 20000;
const MAX_FETCH_SIZE = 1500 * 1024;
const MAX_SOURCE_TEXT_LENGTH = 30000;

async function readProductSource(payload = {}) {
  const userInput = normalizeText(payload.input || payload.source || '');
  const pastedText = normalizeText(payload.sourceText || payload.html || '');
  const rules = normalizeText(payload.rules || '');

  if (!userInput && !pastedText) {
    throw new AiInputError('Input is required');
  }

  if (userInput.length > MAX_INPUT_LENGTH || pastedText.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new AiInputError('Input is too large');
  }

  const source = {
    userInput,
    rules,
    sourceText: '',
    sourceType: pastedText ? 'text' : 'query',
    finalUrl: '',
    fetchWarning: '',
  };

  if (pastedText) {
    source.sourceText = htmlToReadableText(pastedText);
  }

  if (isLikelyUrl(userInput)) {
    source.sourceType = 'url';
    source.finalUrl = userInput;
    source.sourceText = mergeText(source.sourceText, buildUrlFallbackText(userInput));
    await attachUrlText(source, userInput);
  }

  return source;
}

async function attachUrlText(source, input) {
  try {
    const fetched = await safeFetchBuffer(input, {
      maxSize: MAX_FETCH_SIZE,
      maxRedirects: 3,
      timeoutMs: 12000,
    });

    source.finalUrl = fetched.finalUrl;
    const contentType = String(fetched.contentType || '').toLowerCase();

    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && contentType) {
      source.fetchWarning = `Fetched content type is not text/html: ${contentType}`;
      return;
    }

    const fetchedText = htmlToReadableText(fetched.buffer.toString('utf8'));
    source.sourceText = mergeText(source.sourceText, fetchedText);
  } catch (error) {
    if (error instanceof SafeUrlError && isUnsafeUrlError(error.message)) {
      throw new AiInputError(error.message, 400);
    }

    source.fetchWarning = error.message || 'Could not fetch source URL';
  }
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function htmlToReadableText(value) {
  return decodeBasicEntities(String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(br|p|div|section|article|li|tr|td|th|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n'))
    .slice(0, MAX_SOURCE_TEXT_LENGTH);
}

function decodeBasicEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function mergeText(first, second) {
  return [first, second]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_SOURCE_TEXT_LENGTH);
}

function buildUrlFallbackText(input) {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./i, '');
    const pathHint = url.pathname
      .split('/')
      .map(decodeUrlPart)
      .map(normalizeUrlPart)
      .filter(isUsefulUrlPart)
      .join(' ');
    const searchHint = [
      url.searchParams.get('q'),
      url.searchParams.get('query'),
      url.searchParams.get('search'),
      url.searchParams.get('keyword'),
    ]
      .map(normalizeText)
      .find(Boolean);

    return [
      `URL host: ${host}`,
      pathHint ? `URL product/name hint: ${pathHint}` : '',
      searchHint ? `URL search hint: ${searchHint}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}

function decodeUrlPart(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function normalizeUrlPart(part) {
  return normalizeText(part)
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,+%()]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function isUsefulUrlPart(part) {
  const normalized = normalizeText(part).toLowerCase();
  if (!normalized || normalized.length < 2) return false;
  if (/^\d+$/.test(normalized)) return false;
  return ![
    'pr',
    'product',
    'products',
    'p',
    'shop',
    'ua',
    'uk',
    'ru',
    'en',
    'en us',
    'catalog',
  ].includes(normalized);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isUnsafeUrlError(message) {
  return [
    'Invalid URL',
    'Only http and https URLs are allowed',
    'URL credentials are not allowed',
    'Local hostnames are not allowed',
    'Private or reserved IP addresses are not allowed',
    'Hostname resolves to a private or reserved IP address',
  ].some(fragment => message.includes(fragment));
}

module.exports = {
  buildUrlFallbackText,
  htmlToReadableText,
  readProductSource,
};
