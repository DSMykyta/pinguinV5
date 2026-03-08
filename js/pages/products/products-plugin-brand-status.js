// js/pages/products/products-plugin-brand-status.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS — ІНТЕГРАЦІЯ СТАТУСУ БРЕНДУ (ПЛАГІН)                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ПЛАГІН (viewless)                                                       ║
 * ║  Якщо бренд вимкнений (brand_status ≠ 'active'):                        ║
 * ║  ├── Модал: switch → 1 лейбл «Бренд вимкнено» (без перемикання)        ║
 * ║  ├── Таблиця: status dot отримує tooltip «Бренд вимкнено»              ║
 * ║  └── Зберігання статусу = як є (не перезаписує)                         ║
 * ║                                                                          ║
 * ║  onModalOpen        → перевіряє бренд товару                            ║
 * ║  onVariantModalOpen → перевіряє бренд через товар/форму                 ║
 * ║  onRender           → status dots з tooltip в таблицях                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getBrandById } from '../brands/brands-data.js';
import { getProductById } from './products-data.js';
import { registerProductsPlugin } from './products-plugins.js';
import { productsState } from './products-state.js';

const ORIGINAL_HTML_ATTR = 'data-brand-original-html';

// ═══════════════════════════════════════════════════════════════════════════
// SWITCH — модалі товарів та варіантів
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Замінити switch на один лейбл «Бренд вимкнено»
 * @param {string} switchId — ID контейнера switch
 * @param {string|null} brandId
 */
function applyBrandSwitch(switchId, brandId) {
    const switchEl = document.getElementById(switchId);
    if (!switchEl) return;

    restoreSwitch(switchId);

    if (!brandId) return;

    const brand = getBrandById(brandId);
    if (!brand || brand.brand_status === 'active') return;

    // Зберігаємо оригінальний HTML
    switchEl.setAttribute(ORIGINAL_HTML_ATTR, switchEl.innerHTML);

    // Замінюємо на 1 лейбл
    switchEl.innerHTML = `
        <span class="switch-label" data-tooltip="Бренд «${brand.name_uk || brand.brand_id}» вимкнено" data-tooltip-always>
            Бренд вимкнено
        </span>
    `;
}

/**
 * Відновити switch до нормального стану
 */
function restoreSwitch(switchId) {
    const switchEl = document.getElementById(switchId);
    if (!switchEl) return;

    const original = switchEl.getAttribute(ORIGINAL_HTML_ATTR);
    if (original) {
        switchEl.innerHTML = original;
        switchEl.removeAttribute(ORIGINAL_HTML_ATTR);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE — status dots з tooltip
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Пост-обробка таблиці: додати tooltip «Бренд вимкнено» до status dots
 */
function patchStatusDots() {
    // Products table
    const productsContainer = document.getElementById('products-table-container');
    if (productsContainer) {
        patchContainerDots(productsContainer, productsState.products, 'product_id', (p) => p.brand_id);
    }

    // Variants table (main tab)
    const variantsContainer = document.getElementById('variants-table-container');
    if (variantsContainer) {
        patchContainerDots(variantsContainer, productsState.productVariants, 'variant_id', (v) => {
            const product = getProductById(v.product_id);
            return product?.brand_id;
        });
    }
}

/**
 * Пропатчити status dots в контейнері
 */
function patchContainerDots(container, dataArray, idField, getBrandId) {
    if (!container || !dataArray) return;

    // Побудувати set ID з вимкненим брендом
    const disabledIds = new Set();
    for (const item of dataArray) {
        const brandId = getBrandId(item);
        if (!brandId) continue;
        const brand = getBrandById(brandId);
        if (brand && brand.brand_status !== 'active') {
            disabledIds.add(String(item[idField]));
        }
    }

    if (disabledIds.size === 0) return;

    // Знайти рядки і додати tooltip
    container.querySelectorAll('.pseudo-table-row').forEach(row => {
        const rowId = row.dataset.rowId;
        if (!disabledIds.has(rowId)) return;

        const dot = row.querySelector('[data-column="status"] .dot');
        if (dot) {
            dot.setAttribute('data-tooltip', 'Бренд вимкнено');
            dot.setAttribute('data-tooltip-always', '');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    // Товар: модал
    registerProductsPlugin('onModalOpen', (product) => {
        const brandId = product?.brand_id || document.getElementById('product-brand')?.value || '';
        applyBrandSwitch('product-status-switch', brandId);

        // Слухаємо зміну бренду в формі
        const brandSelect = document.getElementById('product-brand');
        if (brandSelect && !brandSelect.dataset.brandStatusInited) {
            brandSelect.dataset.brandStatusInited = 'true';
            brandSelect.addEventListener('change', () => {
                applyBrandSwitch('product-status-switch', brandSelect.value);
            });
        }
    });

    // Варіант: модал
    registerProductsPlugin('onVariantModalOpen', (ctx) => {
        let brandId = ctx?.brandId || '';

        if (!brandId && ctx?.productId) {
            const product = getProductById(ctx.productId);
            brandId = product?.brand_id || '';
        }

        applyBrandSwitch('variant-status-switch', brandId);
    });

    // Таблиці: після кожного рендеру — пропатчити status dots (priority 20 — після таблиць)
    registerProductsPlugin('onRender', () => {
        patchStatusDots();
    }, 20);
}
