// server/ai/prompt.js

// =========================================================================
// AI PRODUCT CONTENT PROMPT
// =========================================================================
// Prompt builder for product content generation. Project-specific writing and
// table rules can be passed from the UI later without changing endpoint shape.
// =========================================================================

function buildInstructions(options = {}) {
  const instructions = [
    'You generate bilingual ecommerce content for dietary supplement products.',
    'Return only data that fits the provided JSON schema.',
    'Do not invent factual product details. If a detail is missing or uncertain, leave the field empty and add a manual_check_notes item.',
    'Write Ukrainian fields in Ukrainian and Russian fields in Russian.',
    'Generate all fillable non-factual fields whenever possible: source.product_name_original, source.brand when known, ua/ru h1, SEO title, SEO description, SEO keywords, and description_html.',
    'Write client-oriented text, not bureaucratic filler: clearly explain what this product is, what it is for, and what can be understood from verified facts.',
    'Avoid medical promises, disease-treatment claims, prevention claims, guaranteed results, price/discount claims, aggressive calls to buy, and manipulative marketing language.',
    'Before returning, self-check generated text for banned or risky wording. If unsure, use neutral wording like "can be part of a balanced diet", "supports normal functioning", or "nutritional support".',
    'Keep SEO title concise, SEO description suitable for a meta description, and keywords as short keyword phrases.',
    'description_html may use simple safe tags only: p, ul, li, strong, em, br.',
    'description_html must not be empty when a product name or URL hint is available. Write a cautious useful description based only on available facts.',
    'For table.ua_text and table.ru_text, return plain parser-compatible text for the existing table generator, not HTML or markdown.',
    'Table format: one row per line; nutrient name, then a single tab, then value. Example: "Vitamin C\t500 mg".',
    'Table headers must be a single line without markdown. Use "Харчова цінність" for Ukrainian nutrition facts and "Пищевая ценность" for Russian nutrition facts. Use "Інгредієнти"/"Ингредиенты" and "Склад"/"Состав" only when that source data exists.',
    'Use one empty line only to separate table blocks. Do not use pipes, bullet markers, JSON, HTML, or percent daily value columns in table text.',
    'If no supplement facts are available, leave table text empty and add a manual_check_notes item instead of inventing rows.',
    'If the input is only a product name without source facts, produce a cautious SEO and description draft and clearly mark what needs manual verification.',
    'If a URL could not be fetched but URL host/path hints are available, use those hints like a product-name query for SEO and description drafts; do not invent supplement facts, dosages, barcode, directions, warnings, or ingredients.',
  ];

  if (options.bannedWordsPrompt) {
    instructions.push(options.bannedWordsPrompt);
  }

  return instructions.join('\n');
}

function buildUserPrompt(source) {
  const parts = [
    `Input type: ${source.sourceType}`,
    `User input: ${source.userInput}`,
  ];

  if (source.finalUrl) {
    parts.push(`Fetched URL: ${source.finalUrl}`);
  }

  if (source.fetchWarning) {
    parts.push(`Fetch warning: ${source.fetchWarning}`);
  }

  if (source.rules) {
    parts.push(`User writing/table rules:\n${source.rules}`);
  }

  if (source.sourceText) {
    parts.push(`Extracted source text:\n${source.sourceText}`);
  } else {
    parts.push('No source page text is available.');
  }

  return parts.join('\n\n');
}

module.exports = {
  buildInstructions,
  buildUserPrompt,
};
