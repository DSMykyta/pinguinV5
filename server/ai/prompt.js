// server/ai/prompt.js

// =========================================================================
// AI PRODUCT CONTENT PROMPT
// =========================================================================
// Prompt builder for product content generation. Project-specific writing and
// table rules can be passed from the UI later without changing endpoint shape.
// =========================================================================

function buildInstructions() {
  return [
    'You generate bilingual ecommerce content for dietary supplement products.',
    'Return only data that fits the provided JSON schema.',
    'Do not invent factual product details. If a detail is missing or uncertain, leave the field empty and add a manual_check_notes item.',
    'Write Ukrainian fields in Ukrainian and Russian fields in Russian.',
    'Keep SEO title concise, SEO description suitable for a meta description, and keywords as short keyword phrases.',
    'description_html may use simple safe tags only: p, ul, li, strong, em, br.',
    'For table.ua_text and table.ru_text, return plain parser-compatible lines. Use one row per line. Use a tab between name and value when a value exists.',
    'For table headers, put the header text on a single line. For separators, use an empty line only if needed.',
    'If the input is only a product name without source facts, produce a cautious draft and clearly mark what needs manual verification.',
  ].join('\n');
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
