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

// ═══════════════════════════════════════════════════════════════════════════
// NUTRITION AUTOFILL — з таблиці складу → Decimal характеристики
// ═══════════════════════════════════════════════════════════════════════════

const NUTRIENT_KEYWORDS = [
    { nutrient: 'Белок',     keywords: ['білк', 'протеїн', 'белк', 'protein'] },
    { nutrient: 'Жиры',      keywords: ['жир', 'fat'] },
    { nutrient: 'Углеводы',  keywords: ['вуглевод', 'углевод', 'carb'] },
    { nutrient: 'Калории',   keywords: ['калор', 'енерг', 'energy', 'kcal'] },
];

/**
 * Парсити HTML-таблицю складу → serving size + нутрієнти
 */
function parseNutritionTable(html) {
    if (!html || !html.includes('<table')) return null;

    const div = document.createElement('div');
    div.innerHTML = html;

    const rows = div.querySelectorAll('tr');
    if (rows.length === 0) return null;

    let servingG = 100;
    const nutrients = {};

    for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 0) continue;

        const leftText = (cells[0]?.textContent || '').trim();
        const rightText = (cells[1]?.textContent || '').trim();

        // Serving size: "Пищевая ценность | 33 грамм"
        if (/пищев|харчов|nutrition|serving/i.test(leftText)) {
            const m = rightText.match(/([\d.,]+)\s*(г|грам|g)/i);
            if (m) servingG = parseFloat(m[1].replace(',', '.')) || 100;
            continue;
        }

        const name = leftText.replace(/^[\s-]+/, '').trim();
        if (!name) continue;

        const valMatch = rightText.match(/([\d.,]+)\s*(г|g|мг|mg|ккал|kcal)/i);
        if (!valMatch) continue;

        let value = parseFloat(valMatch[1].replace(',', '.'));
        if (isNaN(value)) continue;

        if (/^(мг|mg)$/i.test(valMatch[2])) value /= 1000;

        const normalized = normalizeNutrient(name);
        if (normalized) nutrients[normalized] = value;
    }

    return { servingG, nutrients };
}

function normalizeNutrient(name) {
    const l = name.toLowerCase();
    if (/калори|энергет|енергет|kcal|energy/i.test(l)) return 'Калории';
    if (/бел(ок|ки|ков)|білок|білк|protein/i.test(l)) return 'Белок';
    if (/жир|fat/i.test(l) && !/транс|насыщ|насич/i.test(l)) return 'Жиры';
    if (/углевод|вуглевод|carb/i.test(l)) return 'Углеводы';
    return null;
}

function findMatchingChar(nutrientKey, chars) {
    const mapping = NUTRIENT_KEYWORDS.find(m => m.nutrient === nutrientKey);
    if (!mapping) return null;
    return chars.find(c => {
        const nameL = (c.name_ua || '').toLowerCase();
        return mapping.keywords.some(kw => nameL.includes(kw));
    }) || null;
}

/**
 * Автозаповнити Decimal-характеристики з таблиці харчової цінності
 */
export async function autofillFromNutritionTable() {
    const { getCompCodeEditorRu } = await import('./products-crud.js');
    const editor = getCompCodeEditorRu();
    const html = editor?.getValue() || '';

    if (!html || !html.includes('<table')) {
        showToast('Таблиця складу порожня', 'warning');
        return;
    }

    const parsed = parseNutritionTable(html);
    if (!parsed || Object.keys(parsed.nutrients).length === 0) {
        showToast('Не вдалося знайти нутрієнти в таблиці', 'warning');
        return;
    }

    const categoryId = document.getElementById('product-category')?.value;
    if (!categoryId) {
        showToast('Оберіть категорію', 'warning');
        return;
    }

    const { getCharacteristics } = await import('../mapper/mapper-data-own.js');
    const allChars = getCharacteristics();
    const categoryChars = allChars.filter(c => {
        if (c.block_number !== '2') return false;
        if (c.type !== 'Decimal') return false;
        if (c.is_global === 'TRUE' || c.is_global === true) return true;
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });

    if (categoryChars.length === 0) {
        showToast('Немає Decimal-характеристик для цієї категорії', 'info');
        return;
    }

    const { servingG, nutrients } = parsed;
    let filled = 0;

    for (const [nutrientKey, rawValue] of Object.entries(nutrients)) {
        const char = findMatchingChar(nutrientKey, categoryChars);
        if (!char) continue;

        const input = document.querySelector(`input[data-char-id="${char.id}"]`);
        if (!input) continue;

        // Не перезаписувати заповнені
        if (input.value && input.value !== '0') continue;

        const per100 = servingG === 100 ? rawValue : (rawValue / servingG) * 100;
        input.value = Math.round(per100 * 100) / 100;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        filled++;
    }

    if (filled > 0) {
        showToast(`Заповнено ${filled} характеристик(у)`, 'success');
    } else {
        showToast('Усі поля вже заповнені або не знайдено відповідностей', 'info');
    }
}

/**
 * Додати кнопку авто-заповнення в header блоку 2 ("Яке Це?")
 * Викликати після renderCharacteristicsForCategory()
 */
export function injectNutritionAutofillButton() {
    const section = document.getElementById('section-product-block-2');
    if (!section) return;

    const header = section.querySelector('.section-header .section-name');
    if (!header || header.querySelector('.nutrition-autofill-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'btn-icon nutrition-autofill-btn';
    btn.title = 'Заповнити з таблиці складу';
    btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span>';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        autofillFromNutritionTable();
    });

    header.appendChild(btn);
}
