// js/pages/products/products-crud-seo.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — АВТОГЕНЕРАЦІЯ SEO                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Авто-генерація SEO полів при створенні нового товару.
 * Title/Keywords: коли є бренд + назва.
 * Description: коли є текст товару.
 * Тригери: badge-и з matched triggers.
 */

import { generateSeoTitle, generateSeoDescription, generateSeoKeywords } from '../../generators/generator-seo/gse-generators.js';
import { fetchData as fetchSeoData, getTriggersData } from '../../generators/generator-seo/gse-data.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const _seoToasted = new Set();

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Скинути стан SEO тостів (при відкритті нового модалу)
 */
export function resetSeoState() {
    _seoToasted.clear();
}

/**
 * Завантажити дані SEO тригерів (при відкритті модалу)
 */
export { fetchSeoData };

/**
 * Авто-генерація SEO полів — тільки при створенні (currentProductId === null)
 * @param {string|null} currentProductId
 * @param {Function} getPlainTextUa - () => string, текст товару UA
 * @param {Function} getPlainTextRu - () => string, текст товару RU
 */
export function updateSeoForCreate(currentProductId, getPlainTextUa, getPlainTextRu) {
    if (currentProductId !== null) return;

    const brandSelect = document.getElementById('product-brand');
    const brandName = brandSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const brand = (brandName && !brandName.startsWith('—')) ? brandName : '';

    const v = (id) => document.getElementById(id)?.value.trim() || '';
    const nameUa = v('product-name-ua');
    const nameRu = v('product-name-ru');
    const variationUa = v('product-variation-ua');
    const variationRu = v('product-variation-ru');

    // Знайти збіг тригерів по назві товару
    const activeTulips = matchProductTriggers(nameUa || nameRu);
    renderSeoChips(activeTulips);

    // Title
    const seoTitleUa = document.getElementById('product-seo-title-ua');
    const seoTitleRu = document.getElementById('product-seo-title-ru');
    const hasTitle = brand || nameUa || nameRu;
    if (seoTitleUa && hasTitle) seoTitleUa.value = generateSeoTitle(brand, nameUa, variationUa, 'ua');
    if (seoTitleRu && hasTitle) seoTitleRu.value = generateSeoTitle(brand, nameRu, variationRu, 'ru');

    if (hasTitle && !_seoToasted.has('title')) {
        _seoToasted.add('title');
        showToast('SEO Title згенеровано автоматично', 'info');
    }

    // Keywords (base + trigger keywords)
    const seoKwUa = document.getElementById('product-seo-keywords-ua');
    const seoKwRu = document.getElementById('product-seo-keywords-ru');
    if (seoKwUa) seoKwUa.value = generateSeoKeywords(brand, nameUa, variationUa, activeTulips, 'ua');
    if (seoKwRu) seoKwRu.value = generateSeoKeywords(brand, nameRu, variationRu, activeTulips, 'ru');

    // Description — з тексту товару
    const textUa = getPlainTextUa();
    const textRu = getPlainTextRu();
    const seoDescUa = document.getElementById('product-seo-desc-ua');
    const seoDescRu = document.getElementById('product-seo-desc-ru');
    if (seoDescUa && textUa) seoDescUa.value = generateSeoDescription(textUa, 'ua');
    if (seoDescRu && textRu) seoDescRu.value = generateSeoDescription(textRu, 'ru');

    if ((textUa || textRu) && !_seoToasted.has('desc')) {
        _seoToasted.add('desc');
        showToast('SEO Description згенеровано автоматично', 'info');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти тригери що збігаються з назвою товару
 */
function matchProductTriggers(productName) {
    const triggersData = getTriggersData();
    if (!triggersData.length || !productName) return [];
    const name = productName.toLowerCase();
    return triggersData
        .filter(trigger => trigger.triggers.some(t => {
            const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`\\b${escaped}\\b`, 'i').test(name);
        }))
        .map(t => t.title);
}

/**
 * Показати badge-и з matched triggers в tulips контейнері
 */
function renderSeoChips(activeTulips) {
    const container = document.getElementById('product-trigger-titles-container');
    if (!container) return;
    container.innerHTML = '';
    if (!activeTulips.length) return;

    const triggersData = getTriggersData();
    activeTulips.forEach(title => {
        addTulip(title, true);
    });
}

/**
 * Додати tulip (badge) в контейнер активних тригерів
 */
function addTulip(title, isActive = true) {
    const container = document.getElementById('product-trigger-titles-container');
    if (!container) return;
    if (container.querySelector(`[data-title="${title}"]`)) return;

    const triggerData = getTriggersData().find(t => t.title === title);
    if (!triggerData) return;

    const tulip = document.createElement('div');
    tulip.className = isActive ? 'badge c-main' : 'badge';
    tulip.textContent = title;
    tulip.dataset.title = title;
    if (triggerData.keywords?.length) {
        tulip.title = triggerData.keywords.join(', ');
    }
    container.appendChild(tulip);
}

/**
 * Отримати активні tulips для генерації keywords
 */
export function getActiveTulips() {
    const container = document.getElementById('product-trigger-titles-container');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.badge.c-main'))
        .map(t => t.dataset.title);
}

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE TRIGGERS (пошук + кнопки — як в index SEO)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізація aside тригерів при відкритті модалу
 */
export function initSeoTriggers() {
    const triggersData = getTriggersData();
    const buttonsContainer = document.getElementById('product-triger-buttons-container');
    const searchInput = document.getElementById('product-search-triger');
    const tulipsContainer = document.getElementById('product-trigger-titles-container');

    if (!buttonsContainer) return;

    // Рендер кнопок-тригерів
    buttonsContainer.innerHTML = '';
    triggersData.forEach(trigger => {
        const button = document.createElement('button');
        button.className = 'badge';
        button.textContent = trigger.title;
        button.dataset.title = trigger.title;
        buttonsContainer.appendChild(button);
    });

    // Пошук тригерів
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            buttonsContainer.querySelectorAll('.badge').forEach(btn => {
                btn.classList.toggle('u-hidden', !btn.textContent.toLowerCase().includes(term));
            });
        });
    }

    // Клік на кнопку тригера → додати tulip
    buttonsContainer.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON' && e.target.classList.contains('badge')) {
            addTulip(e.target.dataset.title, true);
        }
    });

    // Клік на tulip → toggle active
    if (tulipsContainer) {
        tulipsContainer.addEventListener('click', e => {
            const target = e.target;
            if (target.dataset.title && target.classList.contains('badge')) {
                target.classList.toggle('c-main');
            }
        });
    }
}

/**
 * Очистити aside тригери при закритті модалу
 */
export function destroySeoTriggers() {
    const buttonsContainer = document.getElementById('product-triger-buttons-container');
    const tulipsContainer = document.getElementById('product-trigger-titles-container');
    if (buttonsContainer) buttonsContainer.innerHTML = '';
    if (tulipsContainer) tulipsContainer.innerHTML = '';
}
