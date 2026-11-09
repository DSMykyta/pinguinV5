/**
 * PINGUIN NEXT — RICH TEXT COMMANDS
 * Independent DOM Range formatting; no deprecated document.execCommand().
 * Public API: executeRichTextCommand(), getEditorSelection().
 */
const MARKS = Object.freeze({ bold: 'strong', italic: 'em', underline: 'u' });
const BLOCKS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'blockquote', 'li']);

export function getEditorSelection(surface) {
  const selection = surface.ownerDocument.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return surface.contains(range.commonAncestorContainer) ? range : null;
}

function nearestBlock(surface, node) {
  let current = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  while (current && current !== surface) {
    if (BLOCKS.has(current.localName)) return current;
    current = current.parentElement;
  }
  return null;
}

function ensureBlock(surface, range) {
  const existing = nearestBlock(surface, range.startContainer);
  if (existing) return existing;
  let node = range.startContainer;
  while (node && node !== surface && node.parentNode !== surface) node = node.parentNode;
  if (node === surface) {
    node = surface.childNodes[range.startOffset] || surface.childNodes[range.startOffset - 1];
  }
  if (!node || node === surface) {
    const blank = surface.ownerDocument.createElement('p');
    surface.append(blank);
    const nextRange = surface.ownerDocument.createRange();
    nextRange.selectNodeContents(blank);
    nextRange.collapse(true);
    surface.ownerDocument.getSelection().removeAllRanges();
    surface.ownerDocument.getSelection().addRange(nextRange);
    return blank;
  }
  if (node.nodeType === Node.ELEMENT_NODE && BLOCKS.has(node.localName)) return node;
  const block = surface.ownerDocument.createElement('p');
  node.replaceWith(block);
  block.append(node);
  return block;
}

function captureLiveSelection(surface) {
  const range = getEditorSelection(surface);
  if (!range) return null;
  return {
    startNode: range.startContainer, startOffset: range.startOffset,
    endNode: range.endContainer, endOffset: range.endOffset,
  };
}

function restoreLiveSelection(surface, saved) {
  if (!saved || !surface.contains(saved.startNode) || !surface.contains(saved.endNode)) return;
  const range = surface.ownerDocument.createRange();
  range.setStart(saved.startNode, saved.startOffset);
  range.setEnd(saved.endNode, saved.endOffset);
  const selection = surface.ownerDocument.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function replaceBlock(surface, block, tag) {
  const saved = captureLiveSelection(surface);
  const next = surface.ownerDocument.createElement(tag);
  while (block.firstChild) next.append(block.firstChild);
  block.replaceWith(next);
  restoreLiveSelection(surface, saved);
  return true;
}

function setBlock(surface, tag) {
  const range = getEditorSelection(surface);
  if (!range) return false;
  const block = ensureBlock(surface, range);
  if (!block) return false;
  if (block.localName === tag) return replaceBlock(surface, block, 'p');
  if (block.localName === 'li') return false;
  return replaceBlock(surface, block, tag);
}

function setList(surface, tag) {
  const range = getEditorSelection(surface);
  if (!range) return false;
  const block = ensureBlock(surface, range);
  if (!block) return false;
  const saved = captureLiveSelection(surface);
  if (block.localName === 'li') {
    const list = block.parentElement;
    if (!list || (list.localName !== 'ul' && list.localName !== 'ol')) return false;
    if (list.localName !== tag) {
      const replacement = surface.ownerDocument.createElement(tag);
      while (list.firstChild) replacement.append(list.firstChild);
      list.replaceWith(replacement);
    } else {
      const paragraph = surface.ownerDocument.createElement('p');
      while (block.firstChild) paragraph.append(block.firstChild);
      if (list.children.length === 1) list.replaceWith(paragraph);
      else { list.after(paragraph); block.remove(); }
    }
    restoreLiveSelection(surface, saved);
    return true;
  }
  const list = surface.ownerDocument.createElement(tag);
  const item = surface.ownerDocument.createElement('li');
  while (block.firstChild) item.append(block.firstChild);
  list.append(item);
  block.replaceWith(list);
  restoreLiveSelection(surface, saved);
  return true;
}

function toggleMark(surface, tag) {
  const range = getEditorSelection(surface);
  if (!range || range.collapsed) return false;
  const doc = surface.ownerDocument;
  const walker = doc.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
  const sections = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.nodeValue || !range.intersectsNode(node)) continue;
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.length;
    if (from < to) sections.push({ node, from, to });
  }
  if (!sections.length) return false;
  // A selected marked span can be toggled off without unwrapping unrelated nodes.
  const fullyMarked = sections.every(({ node }) => node.parentElement?.closest(tag) &&
    surface.contains(node.parentElement.closest(tag)));
  let first, last;
  for (const { node, from, to } of sections) {
    const middle = from > 0 ? node.splitText(from) : node;
    if (to - from < middle.length) middle.splitText(to - from);
    if (fullyMarked) {
      // Split the immediate mark into left / selected / right without stripping neighbors.
      const mark = middle.parentElement;
      if (mark?.localName === tag) {
        const suffix = mark.cloneNode(false);
        while (middle.nextSibling) suffix.append(middle.nextSibling);
        mark.after(middle);
        if (suffix.hasChildNodes()) middle.after(suffix);
        if (!mark.hasChildNodes()) mark.remove();
      }
    } else {
      const wrapper = doc.createElement(tag);
      middle.replaceWith(wrapper);
      wrapper.append(middle);
    }
    first ||= middle;
    last = middle;
  }
  if (first && last) {
    const selection = doc.getSelection();
    const next = doc.createRange();
    next.setStart(first, 0);
    next.setEnd(last, last.length);
    selection.removeAllRanges();
    selection.addRange(next);
  }
  return true;
}

export function executeRichTextCommand(surface, name) {
  if (MARKS[name]) return toggleMark(surface, MARKS[name]);
  if (name === 'paragraph') return setBlock(surface, 'p');
  if (name === 'heading') return setBlock(surface, 'h2');
  if (name === 'quote') return setBlock(surface, 'blockquote');
  if (name === 'bullet-list') return setList(surface, 'ul');
  if (name === 'ordered-list') return setList(surface, 'ol');
  return false;
}
