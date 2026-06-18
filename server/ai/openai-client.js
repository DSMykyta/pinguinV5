// server/ai/openai-client.js

// =========================================================================
// GEMINI GENERATECONTENT CLIENT
// =========================================================================
// Uses native fetch to avoid adding a dependency. The API key stays server-side
// and the response is constrained by a JSON schema.
// =========================================================================

const { AiConfigError, AiProviderError } = require('./errors');
const { productContentSchema } = require('./product-content-schema');
const { buildInstructions, buildUserPrompt } = require('./prompt');

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

async function generateProductContent(source) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiConfigError('GEMINI_API_KEY environment variable is required');
  }

  const model = normalizeModel(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
  const prompt = [
    buildInstructions(),
    '',
    buildUserPrompt(source),
  ].join('\n');

  const body = {
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      responseFormat: {
        text: {
          mimeType: 'application/json',
          schema: productContentSchema,
        },
      },
    },
  };

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
    throw new AiProviderError(message, response.status === 429 ? 429 : 502);
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

module.exports = {
  generateProductContent,
};
