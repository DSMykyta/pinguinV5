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
    'Separate verified product facts from cautious category copy. Never present guessed details as verified facts.',
    'Do not invent factual product details such as exact ingredients, dosages, serving size, directions, warnings, barcode, or supplement facts. If a factual detail is missing or uncertain, mark it for manual verification.',
    'Write Ukrainian fields in Ukrainian and Russian fields in Russian.',
    'Generate all fillable non-factual fields whenever possible: source.product_name_original, source.brand when known, source.image_urls from extracted source image URLs, ua/ru h1, SEO title, SEO description, SEO keywords, and description_html.',
    'Write client-oriented text, not bureaucratic filler: clearly explain what this product is, who it is for, how it can fit into a daily routine, and what can be understood from verified facts or from the product name.',
    'Avoid medical promises, disease-treatment claims, prevention claims, guaranteed results, price/discount claims, aggressive calls to buy, and manipulative marketing language.',
    'Before returning, self-check generated text for banned or risky wording. If unsure, use neutral wording like "can be part of a balanced diet", "supports normal functioning", or "nutritional support".',
    'Never copy banned-word replacement instructions into the final content. Phrases like "Замінити на", "Заменить на", or "replace with" are editor instructions and must not appear in output fields.',
    'Keep SEO title concise, SEO description suitable for a meta description, and keywords as short keyword phrases.',
    'description_html may use simple safe tags only: p, h3, ul, li, strong, em, br.',
    'description_html must not be empty when a product name or URL hint is available. Write a substantial cautious draft based on the product name, verified source facts, and safe category-level context.',
    'Description structure for each language: intro paragraph with product name; h3 Features; 3-5 bullet features; 1-2 explanatory paragraphs; h3 Benefits; 3-5 neutral bullets; h3 How to use; directions paragraph.',
    'If verified directions are missing, the How to use paragraph must say to follow the label/official source and consult a specialist when relevant. Do not invent a dose.',
    'If verified directions are missing, never add typical or generic usage claims such as "usually capsules are taken with meals", "take with water", "зазвичай приймають", "під час їжі", "обычно принимают", or "во время еды".',
    'Do not output thin descriptions. Aim for 220-450 words per language when a product name or URL hint exists.',
    'For table.ua_text and table.ru_text, return plain parser-compatible text for the existing table generator, not HTML or markdown.',
    'Table text format: one row per line; nutrient name, then a single tab, then value. Example: "Vitamin C\t500 mg". Use one empty line only to separate blocks. Do not use pipes, bullets, JSON, HTML, or percent daily value columns in table text.',
    'For table.composition_code_ua and table.composition_code_ru, return ready HTML for the product "Код складу" editors. Allowed tags: h3, table, tbody, tr, th, td, strong, em, br. Use <h3>Склад</h3>/<h3>Состав</h3> and <table><tbody>...</tbody></table> when verified composition or supplement facts exist.',
    'For table.serving_notes_ua and table.serving_notes_ru, return the "1 порція" editor content only: serving size, servings per container, and active amount per serving when verified. Keep it short and factual; use <br> for line breaks if needed.',
    'If verified supplement facts, ingredients, serving size, or directions are available, table fields must contain only those known rows. Do not add guessed rows to make the table look complete.',
    'If no verified supplement facts or ingredients are available, leave table.ua_text, table.ru_text, table.composition_code_ua, table.composition_code_ru, table.serving_notes_ua, and table.serving_notes_ru as empty strings. Add a manual_check_notes item explaining that the composition must be checked from the label or pasted source text.',
    'If the input is only a product name without source facts, produce cautious SEO and description drafts, but leave all table/composition/serving fields empty and clearly mark factual gaps in manual_check_notes.',
    'If a URL could not be fetched but URL host/path hints are available, use those hints like a product-name query for h1, SEO, and full cautious description drafts; do not invent exact supplement facts, dosages, barcode, directions, warnings, or ingredients.',
    'manual_check_notes must be concise Ukrainian notes for the editor, not long English diagnostics.',
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

  if (Array.isArray(source.imageUrls) && source.imageUrls.length) {
    parts.push(`Extracted source image URLs:\n${source.imageUrls.join('\n')}`);
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
