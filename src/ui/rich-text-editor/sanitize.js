/**
 * PINGUIN NEXT — RICH TEXT HTML BOUNDARY
 * Purpose: Whitelist HTML on import, paste, mirror and export.
 * Dependency: DOMPurify. Public API: sanitizeEditorHtml.
 * Important: Server-side validation/sanitizing remains mandatory on persistence.
 */
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'hr',
];
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'];

export function sanitizeEditorHtml(html) {
  return DOMPurify.sanitize(String(html ?? ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
