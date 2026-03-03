// js/pages/products/products-crud-hierarchy.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ІЄРАРХІЯ PARENT-CHILD (СПІЛЬНА)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Спільна логіка ієрархічних характеристик для товарів і варіантів.
 * Сканує опції, знаходить parent-child зв'язки, авто-заповнює батька,
 * фільтрує дочірні опції при зміні батька.
 *
 * Використовується:
 *   products-crud-characteristics.js — блоки 1-6, 9 (data-char-id)
 *   products-crud-variant-chars.js   — блок 8 (data-vchar-id)
 */

import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// PARENT-CHILD MAP (generic, no hardcoded IDs)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Сканує опції характеристик. Якщо опція має parent_option_id →
 * знаходить батьківську характеристику. Повертає Map<childCharId, parentCharId>.
 * Видалив характеристику → map порожній. Жодних захардкоджених ID.
 */
export function buildParentChildMap(chars, options) {
    const childToParent = new Map();
    const optionById = new Map();
    options.forEach(o => optionById.set(o.id, o));

    const charIds = new Set(chars.map(c => c.id));

    for (const o of options) {
        if (!o.parent_option_id || !charIds.has(o.characteristic_id)) continue;
        const parentOpt = optionById.get(o.parent_option_id);
        if (!parentOpt || !charIds.has(parentOpt.characteristic_id)) continue;

        const childCharId = o.characteristic_id;
        const parentCharId = parentOpt.characteristic_id;
        if (childCharId === parentCharId) continue;

        if (!childToParent.has(childCharId)) {
            childToParent.set(childCharId, parentCharId);
        }
    }

    return childToParent;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT-CHILD LISTENERS (auto-fill + cascading filter)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати event delegation для parent-child зв'язків
 * @param {HTMLElement} container - контейнер з select-ами
 * @param {string} [selectorAttr='data-char-id'] - атрибут селектора ('data-char-id' або 'data-vchar-id')
 */
export function initParentChildListeners(container, selectorAttr = 'data-char-id') {
    container.addEventListener('change', (e) => {
        const select = e.target.closest(`select[${selectorAttr}]`);
        if (!select) return;

        // Child changed → авто-заповнити батька
        if (select.dataset.parentCharId) {
            autoFillParent(container, select, selectorAttr);
        }

        // Parent changed → фільтрувати дітей
        if (select.dataset.parentOf) {
            const childCharIds = select.dataset.parentOf.split(',');
            childCharIds.forEach(childCharId => {
                const childSelect = container.querySelector(`select[${selectorAttr}="${childCharId}"]`);
                if (childSelect) filterChildOptions(childSelect, select.value);
            });
        }
    });
}

function autoFillParent(container, childSelect, selectorAttr) {
    const parentCharId = childSelect.dataset.parentCharId;
    if (!parentCharId) return;

    const selectedOption = childSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;

    const parentOptionId = selectedOption.dataset.parentOptionId;
    if (!parentOptionId) return;

    const parentSelect = container.querySelector(`select[${selectorAttr}="${parentCharId}"]`);
    if (!parentSelect || parentSelect.value === parentOptionId) return;

    parentSelect.value = parentOptionId;
    parentSelect.dispatchEvent(new Event('change', { bubbles: true }));

    if (parentSelect.customSelect) {
        parentSelect.customSelect._updateSelection();
    }

    const parentOptText = parentSelect.selectedOptions[0]?.textContent || '';
    showToast(`${parentOptText} обрано автоматично`, 'info');
}

/**
 * Фільтрувати дочірні опції за обраним батьком
 * @param {HTMLSelectElement} childSelect
 * @param {string} parentOptionId
 */
export function filterChildOptions(childSelect, parentOptionId) {
    const customSelect = childSelect.customSelect;
    if (!customSelect) return;

    // Toggle custom select rendered options
    customSelect.optionsList.querySelectorAll('.custom-select-option').forEach(optEl => {
        const nativeOpt = Array.from(childSelect.options).find(o => o.value === optEl.dataset.value);
        if (nativeOpt?.dataset.parentOptionId) {
            const show = !parentOptionId || nativeOpt.dataset.parentOptionId === parentOptionId;
            optEl.style.display = show ? '' : 'none';
        }
    });

    // Toggle optgroup labels — ховати коли всі дочірні опції приховані
    customSelect.optionsList.querySelectorAll('.custom-select-group-label').forEach(label => {
        let hasVisible = false;
        let next = label.nextElementSibling;
        while (next && next.classList.contains('custom-select-option-grouped')) {
            if (next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
        }
        label.style.display = hasVisible ? '' : 'none';
    });

    // Якщо обраний варіант не з цієї групи → очистити
    if (parentOptionId && childSelect.value) {
        const selectedOpt = childSelect.querySelector(`option[value="${childSelect.value}"]`);
        if (selectedOpt?.dataset.parentOptionId && selectedOpt.dataset.parentOptionId !== parentOptionId) {
            childSelect.value = '';
            childSelect.dispatchEvent(new Event('change', { bubbles: true }));
            customSelect._updateSelection();
        }
    }
}
