// js/generators/generator-image/gim-logic.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - MAIN INITIALIZATION                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Ініціалізація інструменту обробки зображень та налаштування обробників подій.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - initImageToolLogic() - Головна функція ініціалізації
 */

import { getImageDom } from './gim-dom.js';
import { resetState, getImageState } from './gim-state.js';
import { setupFileHandlers } from './gim-loader.js';
import { updateResizeProportions, updateCanvasProportions, applyTransformation } from './gim-transformer.js';
import { handleSave } from './gim-saver.js';
import { updateCanvasDisplay } from './gim-renderer.js';
import { showToast } from '../../common/ui-toast.js';
import { initCustomSelects } from '../../common/ui-select.js';
import { closeModal } from '../../common/ui-modal.js';
import { debounce } from '../../utils/common-utils.js';

/**
 * Ініціалізація DOM, завантаження зображень та обробка подій
 */
export function initImageToolLogic() {
    const dom = getImageDom();
    if (!dom.imageInput) return;

    const asidePanel = dom.outputFormat.closest('.panel-fragment');
    if (asidePanel) {
        initCustomSelects(asidePanel);
    }

    resetState();
    setupFileHandlers();
    setupToolHandlers();

    document.body.addEventListener('click', (e) => {
        const confirmBtn = e.target.closest('#confirm-clear-action');
        if (confirmBtn) {
            const activePanel = document.querySelector('#panel-right .panel-fragment.is-active');
            if (activePanel && activePanel.id === 'aside-image-tool') {
                const icon = dom.reloadBtn.querySelector('.material-symbols-outlined');
                dom.reloadBtn.disabled = true;
                icon?.classList.add('is-spinning');
                resetState();
                showToast('Інструмент очищено', 'info');
                setTimeout(() => {
                    dom.reloadBtn.disabled = false;
                    icon?.classList.remove('is-spinning');
                }, 500);
                closeModal();
            }
        }
    });

    window.addEventListener('resize', () => {
        const imageState = getImageState();
        const activeItem = imageState.files.find(f => f.id === imageState.activeId);
        if (activeItem) {
            debounce(() => updateCanvasDisplay(activeItem.image), 100)();
        }
    });

    console.log('✅ Логіка Image Tool ініціалізована (v2).');
}

/**
 * Налаштовує обробники інструментів в Aside
 */
function setupToolHandlers() {
    const dom = getImageDom();

    if (dom.modeSwitchContainer) {
        dom.modeSwitchContainer.addEventListener('change', (e) => {
            const input = e.target;
            if (input.name === 'gim-mode-select') {
                const mode = input.value;
                dom.modeResizeContent.classList.toggle('u-hidden', !(mode === 'resize'));
                dom.modeCanvasContent.classList.toggle('u-hidden', !(mode === 'canvas'));
            }
        });
    }

    dom.resizeWidth.addEventListener('input', updateResizeProportions);
    dom.resizeHeight.addEventListener('input', updateResizeProportions);
    dom.canvasWidth.addEventListener('input', updateCanvasProportions);
    dom.canvasHeight.addEventListener('input', updateCanvasProportions);

    dom.applyResizeBtn.addEventListener('click', () => {
        applyTransformation('resize');
    });
    dom.applyCanvasBtn.addEventListener('click', () => {
        applyTransformation('canvas');
    });

    dom.saveBtn.addEventListener('click', handleSave);
}
