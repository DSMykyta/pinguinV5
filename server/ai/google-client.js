// server/ai/google-client.js

// =========================================================================
// GEMINI GENERATECONTENT CLIENT
// =========================================================================
// Uses native fetch to avoid adding a dependency. The API key stays server-side
// and the response is constrained by a JSON schema.
// =========================================================================

const { AiConfigError, AiProviderError } = require('./errors');
const { loadBannedWordsPolicy, sanitizeResultWithBannedWords } = require('./banned-words');
const { productContentSchema } = require('./product-content-schema');
const { buildInstructions, buildUserPrompt } = require('./prompt');

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const FALLBACK_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

async function generateProductContent(source) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiConfigError('GEMINI_API_KEY environment variable is required');
  }

  const models = getCandidateModels(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
  const bannedWordsPolicy = await loadBannedWordsPolicy();
  const prompt = [
    buildInstructions({ bannedWordsPrompt: bannedWordsPolicy.promptText }),
    '',
    buildUserPrompt(source),
  ].join('\n');

  const body = buildGeminiRequestBody(prompt);

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];

    try {
      const result = await requestProductContent({ apiKey, model, body });
      return sanitizeResultWithBannedWords(
        enforceSourceFactBoundaries(mergeSourceHints(result, source), source),
        bannedWordsPolicy,
      );
    } catch (error) {
      const isLastAttempt = index === models.length - 1;
      if (!isRetryableProviderError(error) || isLastAttempt) {
        throw error;
      }

      console.warn(`Gemini model ${model} failed transiently, trying fallback: ${error.message}`);
    }
  }

  throw new AiProviderError('Gemini request failed before a provider call was made');
}

function enforceSourceFactBoundaries(result, source) {
  if (!result || typeof result !== 'object' || source?.hasVerifiedFactText) {
    return result;
  }

  if (result.table && typeof result.table === 'object') {
    result.table.ua_text = '';
    result.table.ru_text = '';
    result.table.composition_code_ua = '';
    result.table.composition_code_ru = '';
    result.table.serving_notes_ua = '';
    result.table.serving_notes_ru = '';
    result.table.rows = [];
  }

  for (const lang of ['ua', 'ru']) {
    if (!result[lang] || typeof result[lang] !== 'object') continue;
    result[lang].ingredients = '';
    result[lang].directions = '';
    result[lang].warnings = '';
  }

  if (!Array.isArray(result.manual_check_notes)) {
    result.manual_check_notes = [];
  }

  const note = 'Склад, дозування, спосіб прийому і таблицю не заповнено: у джерелі немає перевірених фактів або сторінку не вдалося прочитати.';
  if (!result.manual_check_notes.includes(note)) {
    result.manual_check_notes.push(note);
  }

  return result;
}

function mergeSourceHints(result, source) {
  if (!result || typeof result !== 'object') return result;

  if (!result.source || typeof result.source !== 'object') {
    result.source = {};
  }

  if (!result.source.source_type) {
    result.source.source_type = source.sourceType || '';
  }

  if (!result.source.source_url && source.finalUrl) {
    result.source.source_url = source.finalUrl;
  }

  const modelImages = Array.isArray(result.source.image_urls) ? result.source.image_urls : [];
  const sourceImages = Array.isArray(source.imageUrls) ? source.imageUrls : [];
  result.source.image_urls = [...new Set([...modelImages, ...sourceImages]
    .map(value => String(value || '').trim())
    .filter(Boolean))]
    .slice(0, 12);

  return result;
}

function buildGeminiRequestBody(prompt) {
  return {
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: productContentSchema,
    },
  };
}

async function requestProductContent({ apiKey, model, body }) {
  const response = await fetch(`${GEMINI_API_BASE_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const data = parseJson(rawText, 'Gemini returned an invalid JSON envelope');

  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed with HTTP ${response.status}`;
    throw createProviderError(message, response.status);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    const blockReason = data?.promptFeedback?.blockReason;
    const finishReason = data?.candidates?.[0]?.finishReason;
    const reason = blockReason || finishReason;
    throw new AiProviderError(reason
      ? `Gemini response did not include output text: ${reason}`
      : 'Gemini response did not include output text');
  }

  return parseJson(outputText, 'Gemini returned invalid structured content');
}

function createProviderError(message, providerStatus) {
  const status = providerStatus === 429 ? 429 : providerStatus >= 500 ? 503 : 502;
  const error = new AiProviderError(message, status);
  error.providerStatus = providerStatus;
  error.retryable = isRetryableProviderStatus(providerStatus)
    || /high demand|try again later|temporar/i.test(message);
  return error;
}

function isRetryableProviderError(error) {
  return error instanceof AiProviderError && error.retryable === true;
}

function isRetryableProviderStatus(status) {
  return status === 429 || (status >= 500 && status <= 504);
}

function parseJson(value, fallbackMessage) {
  try {
    return JSON.parse(value);
  } catch {
    throw new AiProviderError(fallbackMessage);
  }
}

function extractOutputText(data) {
  if (!Array.isArray(data.candidates)) {
    return '';
  }

  for (const candidate of data.candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (typeof part.text === 'string') {
        return part.text;
      }
    }
  }

  return '';
}

function normalizeModel(model) {
  const normalized = String(model || '').replace(/^models\//, '').trim();
  if (!/^[a-zA-Z0-9_.-]+$/.test(normalized)) {
    throw new AiConfigError('GEMINI_MODEL contains unsupported characters');
  }
  return normalized;
}

function getCandidateModels(primaryModel) {
  return [...new Set([
    primaryModel,
    ...FALLBACK_GEMINI_MODELS,
  ].map(normalizeModel))];
}

module.exports = {
  generateProductContent,
};
