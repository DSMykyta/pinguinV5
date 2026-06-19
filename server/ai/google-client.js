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
      return sanitizeResultWithBannedWords(result, bannedWordsPolicy);
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
