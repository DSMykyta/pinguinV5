// server/ai/product-content-schema.js

// =========================================================================
// AI PRODUCT CONTENT JSON SCHEMA
// =========================================================================
// Structured Outputs schema for one bilingual product draft. The schema is
// intentionally strict: missing facts must be represented as empty strings and
// explained in manual_check_notes instead of being invented.
// =========================================================================

const localizedContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'h1',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'description_html',
    'ingredients',
    'directions',
    'warnings',
  ],
  properties: {
    h1: { type: 'string' },
    seo_title: { type: 'string' },
    seo_description: { type: 'string' },
    seo_keywords: {
      type: 'array',
      items: { type: 'string' },
    },
    description_html: { type: 'string' },
    ingredients: { type: 'string' },
    directions: { type: 'string' },
    warnings: { type: 'string' },
  },
};

const tableRowSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['row_type', 'name_ua', 'value_ua', 'name_ru', 'value_ru'],
  properties: {
    row_type: {
      type: 'string',
      enum: ['header', 'row', 'note', 'separator'],
    },
    name_ua: { type: 'string' },
    value_ua: { type: 'string' },
    name_ru: { type: 'string' },
    value_ru: { type: 'string' },
  },
};

const productContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source', 'ua', 'ru', 'table', 'manual_check_notes'],
  properties: {
    source: {
      type: 'object',
      additionalProperties: false,
      required: [
        'source_type',
        'source_url',
        'product_name_original',
        'brand',
        'packaging',
        'barcode',
        'image_urls',
      ],
      properties: {
        source_type: {
          type: 'string',
          enum: ['url', 'text', 'query'],
        },
        source_url: { type: 'string' },
        product_name_original: { type: 'string' },
        brand: { type: 'string' },
        packaging: { type: 'string' },
        barcode: { type: 'string' },
        image_urls: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    ua: localizedContentSchema,
    ru: localizedContentSchema,
    table: {
      type: 'object',
      additionalProperties: false,
      required: [
        'ua_text',
        'ru_text',
        'composition_code_ua',
        'composition_code_ru',
        'serving_notes_ua',
        'serving_notes_ru',
        'rows',
      ],
      properties: {
        ua_text: { type: 'string' },
        ru_text: { type: 'string' },
        composition_code_ua: { type: 'string' },
        composition_code_ru: { type: 'string' },
        serving_notes_ua: { type: 'string' },
        serving_notes_ru: { type: 'string' },
        rows: {
          type: 'array',
          items: tableRowSchema,
        },
      },
    },
    manual_check_notes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

module.exports = {
  productContentSchema,
};
