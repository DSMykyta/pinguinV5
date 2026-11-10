/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT HTML BOUNDARY                                                              ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Native DOM allowlist; no npm dependencies or executable user HTML.                     ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: parseSafeHtml(), serializeSafeHtml()                                                 ║
 * ║ ПРИНЦИП: Public API: parseSafeHtml(), serializeSafeHtml().                                          ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const ALLOWED_TAGS = new Set([
  'p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'hr',
]);
const DISCARD_TAGS = new Set([
  'script', 'style', 'iframe', 'frame', 'object', 'embed', 'svg', 'math',
  'template', 'noscript', 'form', 'input', 'button', 'textarea', 'select',
  'video', 'audio', 'source', 'link', 'meta', 'base', 'img',
]);

function safeHref(href) {
  if (!href) return null;
  try {
    const value = new URL(href, document.baseURI);
    return ['https:', 'http:', 'mailto:'].includes(value.protocol) ? href : null;
  } catch {
    return null;
  }
}

function copySafeNode(node, into, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    into.append(doc.createTextNode(node.nodeValue));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const tag = node.localName?.toLowerCase();
  if (DISCARD_TAGS.has(tag)) return;
  const target = ALLOWED_TAGS.has(tag) ? doc.createElement(tag) : into;
  if (tag === 'a' && target !== into) {
    const href = safeHref(node.getAttribute('href'));
    if (href) {
      target.setAttribute('href', href);
      target.setAttribute('rel', 'noopener noreferrer');
    }
  }
  for (const child of node.childNodes) copySafeNode(child, target, doc);
  if (target !== into) into.append(target);
}

function copySafeChildren(source, doc = document) {
  const fragment = doc.createDocumentFragment();
  for (const node of source.childNodes) copySafeNode(node, fragment, doc);
  return fragment;
}

export function parseSafeHtml(html, doc = document) {
  const parsed = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  return copySafeChildren(parsed.body, doc);
}

export function serializeSafeHtml(root) {
  const holder = root.ownerDocument.createElement('div');
  holder.append(copySafeChildren(root, root.ownerDocument));
  return holder.innerHTML;
}
