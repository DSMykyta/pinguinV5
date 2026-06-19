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
const MAX_IMAGE_URLS = 12;
const HTML_FETCH_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
  'Accept-Language': 'en-US,en;q=0.9,uk;q=0.8,ru;q=0.7',
  'Accept-Encoding': 'identity',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

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
    imageUrls: [],
  };

  if (pastedText) {
    const baseUrl = isLikelyUrl(userInput) ? userInput : 'https://example.invalid/';
    const pageSignals = extractPageSignals(pastedText, baseUrl);
    source.imageUrls = pageSignals.imageUrls.slice(0, MAX_IMAGE_URLS);
    source.sourceText = mergeText(source.sourceText, pageSignals.text);
    source.sourceText = mergeText(source.sourceText, htmlToReadableText(pastedText));
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
      headers: HTML_FETCH_HEADERS,
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

    const html = fetched.buffer.toString('utf8');
    const pageSignals = extractPageSignals(html, fetched.finalUrl);
    const fetchedText = htmlToReadableText(html);
    source.imageUrls = uniqueStrings([
      ...source.imageUrls,
      ...pageSignals.imageUrls,
    ]).slice(0, MAX_IMAGE_URLS);
    source.sourceText = mergeText(source.sourceText, pageSignals.text);
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

function extractPageSignals(html, finalUrl) {
  const blocks = [];
  const imageUrls = [];

  const meta = extractMetaTags(html);
  const metaTitle = meta['og:title'] || meta['twitter:title'];
  const metaDescription = meta.description || meta['og:description'] || meta['twitter:description'];

  if (metaTitle) blocks.push(`Meta title: ${metaTitle}`);
  if (metaDescription) blocks.push(`Meta description: ${metaDescription}`);

  imageUrls.push(
    meta['og:image'],
    meta['og:image:secure_url'],
    meta['twitter:image'],
  );

  for (const product of extractJsonLdProducts(html)) {
    const lines = [];
    if (product.name) lines.push(`Product name: ${product.name}`);
    if (product.brand) lines.push(`Brand: ${product.brand}`);
    if (product.description) lines.push(`Description: ${product.description}`);
    if (product.sku) lines.push(`SKU: ${product.sku}`);
    if (product.gtin) lines.push(`Barcode/GTIN: ${product.gtin}`);
    if (lines.length) blocks.push(`Structured product data:\n${lines.join('\n')}`);
    imageUrls.push(...product.images);
  }

  const embedded = extractEmbeddedJsonSignals(html);
  if (embedded.text) blocks.push(`Embedded product data:\n${embedded.text}`);
  imageUrls.push(...embedded.imageUrls);
  imageUrls.push(...extractImageTags(html));

  return {
    text: blocks.join('\n\n'),
    imageUrls: uniqueStrings(imageUrls)
      .map(url => resolvePageUrl(url, finalUrl))
      .filter(Boolean),
  };
}

function extractMetaTags(html) {
  const meta = {};
  const pattern = /<meta\b[^>]*>/gi;
  const tags = String(html || '').match(pattern) || [];

  for (const tag of tags) {
    const key = getHtmlAttribute(tag, 'property') || getHtmlAttribute(tag, 'name');
    const content = getHtmlAttribute(tag, 'content');
    if (!key || !content) continue;
    meta[key.toLowerCase()] = decodeBasicEntities(content);
  }

  return meta;
}

function extractJsonLdProducts(html) {
  const products = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = pattern.exec(String(html || ''))) !== null) {
    const rawJson = decodeBasicEntities(match[1]).trim();
    if (!rawJson) continue;

    try {
      collectProductNodes(JSON.parse(rawJson), products);
    } catch {
      // Ignore invalid JSON-LD blocks; the readable HTML fallback still applies.
    }
  }

  return products;
}

function collectProductNodes(node, products) {
  if (!node) return;

  if (Array.isArray(node)) {
    node.forEach(item => collectProductNodes(item, products));
    return;
  }

  if (typeof node !== 'object') return;

  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some(value => String(value || '').toLowerCase() === 'product')) {
    products.push(normalizeProductNode(node));
  }

  collectProductNodes(node['@graph'], products);
}

function normalizeProductNode(node) {
  const brand = typeof node.brand === 'string'
    ? node.brand
    : node.brand?.name;
  const images = Array.isArray(node.image) ? node.image : [node.image];

  return {
    name: normalizeText(node.name),
    brand: normalizeText(brand),
    description: normalizeText(node.description),
    sku: normalizeText(node.sku || node.mpn),
    gtin: normalizeText(node.gtin || node.gtin8 || node.gtin12 || node.gtin13 || node.gtin14),
    images: images.map(normalizeText).filter(Boolean),
  };
}

function extractImageTags(html) {
  const urls = [];
  const pattern = /<img\b[^>]*>/gi;
  const tags = String(html || '').match(pattern) || [];

  for (const tag of tags) {
    urls.push(getHtmlAttribute(tag, 'src'));
    const srcset = getHtmlAttribute(tag, 'srcset');
    if (srcset) {
      srcset.split(',').forEach(part => {
        const [url] = part.trim().split(/\s+/);
        urls.push(url);
      });
    }
  }

  return urls;
}

function extractEmbeddedJsonSignals(html) {
  const lines = [];
  const imageUrls = [];
  const pattern = /<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = pattern.exec(String(html || ''))) !== null) {
    const raw = decodeBasicEntities(match[1]).trim();
    if (!raw || !/^[\[{]/.test(raw)) continue;

    try {
      collectEmbeddedSignals(JSON.parse(raw), lines, imageUrls);
    } catch {
      // Ignore non-JSON scripts.
    }

    if (lines.length >= 120 && imageUrls.length >= MAX_IMAGE_URLS) break;
  }

  return {
    text: uniqueStrings(lines).slice(0, 120).join('\n'),
    imageUrls: uniqueStrings(imageUrls).slice(0, MAX_IMAGE_URLS),
  };
}

function collectEmbeddedSignals(node, lines, imageUrls, keyPath = []) {
  if (!node || lines.length >= 160) return;

  if (Array.isArray(node)) {
    node.forEach((item, index) => collectEmbeddedSignals(item, lines, imageUrls, [...keyPath, String(index)]));
    return;
  }

  if (typeof node !== 'object') return;

  for (const [key, value] of Object.entries(node)) {
    const path = [...keyPath, key];
    const keyLabel = path.join('.');

    if (typeof value === 'string') {
      const cleanValue = normalizeText(stripHtml(value));
      if (!cleanValue) continue;

      if (isLikelyImageUrl(cleanValue) || isImageKey(key)) {
        imageUrls.push(cleanValue);
      }

      if (isProductFactKey(key) || isProductFactText(cleanValue)) {
        lines.push(`${humanizeKey(keyLabel)}: ${cleanValue.slice(0, 1800)}`);
      }
    } else if (value && typeof value === 'object') {
      if (isProductFactKey(key)) {
        const compact = compactJsonValue(value);
        if (compact) lines.push(`${humanizeKey(keyLabel)}: ${compact}`);
      }
      collectEmbeddedSignals(value, lines, imageUrls, path);
    }
  }
}

function isProductFactKey(key) {
  return /supplement|nutrition|ingredient|otheringredient|suggested|direction|warning|serving|dosage|barcode|gtin|upc|sku|brand|productname|displayname|description/i.test(key);
}

function isProductFactText(value) {
  return /supplement facts|nutrition facts|other ingredients|suggested use|directions|warnings|serving size|servings per container/i.test(value);
}

function isImageKey(key) {
  return /image|thumbnail|photo|picture/i.test(key);
}

function isLikelyImageUrl(value) {
  return /^https?:\/\/\S+\.(png|jpe?g|webp|avif)(\?\S*)?$/i.test(value)
    || /^https?:\/\/(cloudinary|s3|static|images|media|cdn|cloudfront|i\d?\.|s\.|www\.)/i.test(value);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function compactJsonValue(value) {
  try {
    return JSON.stringify(value)
      .replace(/\s+/g, ' ')
      .slice(0, 1800);
  } catch {
    return '';
  }
}

function humanizeKey(key) {
  return String(key || '')
    .replace(/\.\d+\./g, '.')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getHtmlAttribute(tag, name) {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = String(tag || '').match(pattern);
  return decodeBasicEntities(match?.[2] || match?.[3] || match?.[4] || '');
}

function resolvePageUrl(value, baseUrl) {
  const raw = normalizeText(value);
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return '';

  try {
    const url = new URL(raw, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function uniqueStrings(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
