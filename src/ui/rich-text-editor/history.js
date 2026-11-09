/**
 * PINGUIN NEXT — RICH TEXT HISTORY & SELECTION
 * Local to each editor instance; no global document store.
 */
function pathFromRoot(root, node) {
  const path = [];
  for (let current = node; current && current !== root; current = current.parentNode) {
    const parent = current.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
  }
  return path;
}

function point(root, node, offset) {
  const path = pathFromRoot(root, node);
  return path === null ? null : { path, offset };
}

export function captureSelection(root) {
  const selection = root.ownerDocument.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  return {
    start: point(root, range.startContainer, range.startOffset),
    end: point(root, range.endContainer, range.endOffset),
  };
}

function resolvePoint(root, saved) {
  let node = root;
  for (const index of saved.path) {
    node = node.childNodes[Math.min(index, node.childNodes.length - 1)] || node;
  }
  const limit = node.nodeType === Node.TEXT_NODE ? node.nodeValue.length : node.childNodes.length;
  return { node, offset: Math.min(saved.offset, limit) };
}

export function restoreSelection(root, saved) {
  if (!saved?.start || !saved?.end) return;
  const selection = root.ownerDocument.getSelection();
  const range = root.ownerDocument.createRange();
  const start = resolvePoint(root, saved.start);
  const end = resolvePoint(root, saved.end);
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch { /* A browser rewrite invalidated the point; retain focus. */ }
}

export function createEditorHistory({ read, apply, limit = 100 }) {
  let entries = [{ ...read(), selection: null }];
  let cursor = 0;
  function record() {
    const next = read();
    if (entries[cursor].html === next.html) {
      entries[cursor].selection = next.selection;
      return;
    }
    entries = entries.slice(0, cursor + 1);
    entries.push(next);
    if (entries.length > limit) entries.shift();
    cursor = entries.length - 1;
  }
  return Object.freeze({
    record,
    undo() { if (cursor > 0) { cursor--; apply(entries[cursor]); return true; } return false; },
    redo() { if (cursor < entries.length - 1) { cursor++; apply(entries[cursor]); return true; } return false; },
    canUndo: () => cursor > 0,
    canRedo: () => cursor < entries.length - 1,
  });
}
