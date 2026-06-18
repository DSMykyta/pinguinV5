# AI Magic Plan

## Scope

AI Magic belongs to the Instruments page (`index.html`). Product pages stay a demo/reference for bilingual UI patterns and are not the functional entry point.

## Rollback

Keep AI Magic in isolated files:

- `api/ai/index.js`
- `server/ai/*`
- `js/generators/generator-ai-magic/*`
- `templates/modals/ai-magic-modal.html`
- `css/components/content/ai-magic.css`

If the feature misbehaves, revert the AI Magic commit and remove only those integration lines from `index.html`, `js/main-instruments.js`, `js/utils/utils-api-client.js`, `css/main.css`, and `.env.example`.

## Phase 1: Safe Shell

- Add a top navigation AI button on Instruments only.
- Add an isolated AI modal with source input, optional pasted page text, bilingual result preview, manual notes, and apply buttons.
- Use the existing modal loader and existing authenticated API client.
- Do not modify the old table `magic-modal`; it remains dedicated to the current table parser.

## Phase 2: API

- Add one Vercel function: `POST /api/ai`.
- Require a valid access JWT with editor/admin write permissions.
- Keep `OPTIONS` open through the existing CORS middleware.
- Keep `OPENAI_API_KEY` server-only.
- Use the OpenAI Responses API with Structured Outputs.
- Fetch external source URLs only through the existing SSRF-safe `safeFetchBuffer`.

## Phase 3: Apply Strategy

- Text: apply the selected language to the current Instruments text editor.
- SEO: keep bilingual output in the modal; apply selected language to the current one-language SEO fields.
- Table: AI returns parser-compatible plain text; the existing `gt-magic-parser` creates rows.
- No direct row mutation from AI code.

## Later Work

- Redesign the Instruments Text/SEO sections into native bilingual sections using the product modal pattern.
- Rethink the table UI as a bilingual composition workspace instead of forcing all output through a one-language row list.
- Add saved user rules for texts and table formatting.
