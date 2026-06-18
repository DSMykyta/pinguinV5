// server/ai/openai-client.js

// =========================================================================
// OPENAI RESPONSES CLIENT
// =========================================================================
// Uses native fetch to avoid adding a frontend/server dependency. The API key
// stays server-side and the response is constrained by a JSON schema.
// =========================================================================

const { AiConfigError, AiProviderError } = require('./errors');
const { productContentSchema } = require('./product-content-schema');
const { buildInstructions, buildUserPrompt } = require('./prompt');

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

async function generateProductContent(source) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiConfigError('OPENAI_API_KEY environment variable is required');
  }

  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-5.5',
    input: [
      {
        role: 'system',
        content: buildInstructions(),
      },
      {
        role: 'user',
        content: buildUserPrompt(source),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'ai_product_content',
        schema: productContentSchema,
        strict: true,
      },
    },
  };

  const effort = process.env.OPENAI_REASONING_EFFORT;
  if (effort) {
    body.reasoning = { effort };
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const data = parseJson(rawText, 'OpenAI returned an invalid JSON envelope');

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed with HTTP ${response.status}`;
    throw new AiProviderError(message, response.status === 429 ? 429 : 502);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new AiProviderError('OpenAI response did not include output text');
  }

  return parseJson(outputText, 'OpenAI returned invalid structured content');
}

function parseJson(value, fallbackMessage) {
  try {
    return JSON.parse(value);
  } catch {
    throw new AiProviderError(fallbackMessage);
  }
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  if (!Array.isArray(data.output)) {
    return '';
  }

  for (const item of data.output) {
    if (!Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (typeof content.text === 'string') {
        return content.text;
      }
      if (typeof content.output_text === 'string') {
        return content.output_text;
      }
    }
  }

  return '';
}

module.exports = {
  generateProductContent,
};
