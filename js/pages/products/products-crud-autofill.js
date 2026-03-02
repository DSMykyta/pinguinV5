// js/pages/products/products-crud-autofill.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — AUTOFILL                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Автозаповнення характеристик товару при виборі бренду.
 * Rule-based: кожне правило = 1 рядок у AUTOFILL_RULES.
 *
 * Логіка:
 * - Заповнює тільки порожні поля
 * - Якщо юзер змінив поле вручну — більше не підставляє
 * - Toast: "{toastText} обрано автоматично"
 */

import { getBrandById } from '../brands/brands-data.js';
import { reinitializeCustomSelect } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════

const AUTOFILL_RULES = [
    {
        id: 'brand-country',
        sourceField: 'country_option_id',
        targetCharId: 'char-000002',
        toastText: 'Країна реєстрації бренду',
    },
    // Нові правила додавати тут:
    // { id: 'brand-xxx', sourceField: '...', targetCharId: 'char-XXXXXX', toastText: '...' },
];

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const _touchedFields = new Set();

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function initAutofill() {
    _touchedFields.clear();

    // Трекінг ручних змін — делегований listener
    const container = document.getElementById('product-characteristics-sections');
    if (container && !container.dataset.autofillTouchInit) {
        container.dataset.autofillTouchInit = '1';
        container.addEventListener('change', (e) => {
            const charEl = e.target.closest('[data-char-id]');
            if (charEl) _touchedFields.add(charEl.dataset.charId);
        });
    }

    // Listener на зміну бренду
    const brandSelect = document.getElementById('product-brand');
    if (brandSelect && !brandSelect.dataset.autofillInit) {
        brandSelect.dataset.autofillInit = '1';
        brandSelect.addEventListener('change', () => {
            runBrandRules(brandSelect.value);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════

function runBrandRules(brandId) {
    if (!brandId) return;

    const brand = getBrandById(brandId);
    if (!brand) return;

    for (const rule of AUTOFILL_RULES) {
        const value = brand[rule.sourceField];
        if (!value) continue;
        applyRule(rule, value);
    }
}

function applyRule(rule, value) {
    const { targetCharId, toastText } = rule;

    if (_touchedFields.has(targetCharId)) return;

    const field = document.getElementById(`product-char-${targetCharId}`);
    if (!field) return;
    if (field.value) return;

    field.value = value;

    if (field.tagName === 'SELECT') {
        reinitializeCustomSelect(field);
    }

    if (toastText) {
        showToast(`${toastText} обрано автоматично`, 'info');
    }
}

/**
 * Викликати після рендеру характеристик (wizard flow / зміна категорії).
 * Бренд вже обраний — застосувати правила до нових полів.
 */
export function runAutofillAfterRender() {
    const brandSelect = document.getElementById('product-brand');
    if (!brandSelect?.value) return;
    runBrandRules(brandSelect.value);
}
