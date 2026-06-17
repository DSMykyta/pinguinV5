// js/generators/generator-image/gim-selection.js

/**
 * MODULE: Image Tool Selection
 *
 * Owns batch-selection state for the image tool.
 * Rendering code asks this module to change selection state, then redraws rows.
 */

import { getImageDom } from './gim-dom.js';
import { getImageState } from './gim-state.js';

export function setImageSelected(id, isSelected) {
    const imageState = getImageState();

    if (isSelected) {
        imageState.selectedIds.add(id);
    } else {
        imageState.selectedIds.delete(id);
    }

    syncSelectAllControl();
}

export function setAllImagesSelected(isSelected) {
    const imageState = getImageState();
    imageState.selectedIds.clear();

    if (isSelected) {
        imageState.files.forEach(item => imageState.selectedIds.add(item.id));
    }

    syncSelectAllControl();
}

export function syncSelectAllControl() {
    const dom = getImageDom();
    const imageState = getImageState();
    const total = imageState.files.length;
    const selected = imageState.files.reduce((count, item) => (
        imageState.selectedIds.has(item.id) ? count + 1 : count
    ), 0);

    dom.selectAllWrap?.classList.toggle('u-hidden', total === 0);
    if (!dom.selectAll) return;

    dom.selectAll.checked = total > 0 && selected === total;
    dom.selectAll.indeterminate = selected > 0 && selected < total;
}
