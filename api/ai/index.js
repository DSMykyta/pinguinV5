// api/ai/index.js

// =========================================================================
// AI API - UNIFIED ENDPOINT
// =========================================================================
// PURPOSE:
// Server-side AI generation for the Instruments page. Keeps AI secrets out
// of the browser and routes all AI actions through one Vercel Function.
//
// ENDPOINT:
// - POST /api/ai { action: 'generateProductContent', input, sourceText?, rules? }
//
// SECURITY:
// - OPTIONS stays open through corsMiddleware.
// - POST requires a valid access JWT with write permissions.
// - URL source fetching uses server/utils/safe-url-fetch to avoid SSRF.
// =========================================================================

const { corsMiddleware } = require('../../server/utils/cors');
const { authenticateAccount } = require('../../server/accounts');
const { CAPABILITIES } = require('../../server/access-policy');
const { AiConfigError, AiInputError, AiProviderError } = require('../../server/ai/errors');
const { readProductSource } = require('../../server/ai/source-reader');
const { generateProductContent } = require('../../server/ai/google-client');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!await authenticateAccount(req, res, { capability: CAPABILITIES.SHEETS_WRITE })) return;

  try {
    const { action } = req.body || {};

    if (action !== 'generateProductContent') {
      return res.status(400).json({ error: 'Invalid AI action' });
    }

    const source = await readProductSource(req.body);
    const result = await generateProductContent(source);

    return res.status(200).json({
      result,
      meta: {
        sourceType: source.sourceType,
        finalUrl: source.finalUrl,
        fetchWarning: source.fetchWarning,
        imageUrls: source.imageUrls,
      },
    });
  } catch (error) {
    if (error instanceof AiInputError || error instanceof AiConfigError || error instanceof AiProviderError) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    console.error('AI API error:', error);
    return res.status(500).json({
      error: 'AI request failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = corsMiddleware(handler);
