// js/pages/products/products-polling.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       PRODUCTS POLLING                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Періодичне опитування Products та ProductVariants          ║
 * ║                кожні 20 сек                                              ║
 * ║                                                                          ║
 * ║  Виявляє зміни зроблені іншими користувачами:                           ║
 * ║  ├── Оновлює стейт (productsState.products / productVariants)           ║
 * ║  ├── Перерендерює таблиці                                               ║
 * ║  └── Показує toast повідомлення                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPolling } from '../../utils/polling.js';
import { productsState } from './products-state.js';
import { loadProducts } from './products-data.js';
import { loadProductVariants } from './variants-data.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { PRODUCTS_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

// ── Fetch helpers (без побічних ефектів — тільки повертають дані) ──

const PRODUCTS_GID = '0';
const VARIANTS_SHEET = 'ProductVariants';

async function fetchProducts() {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${PRODUCTS_SPREADSHEET_ID}/export?format=csv&gid=${PRODUCTS_GID}&_t=${Date.now()}`;
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) return [];

    const csvText = await response.text();
    if (typeof Papa === 'undefined') return [];

    const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (!data || data.length === 0) return [];

    return data.map((row, i) => ({
        product_id: row.product_id || '',
        article: row.article || '',
        brand_id: row.brand_id || '',
        line_id: row.line_id || '',
        category_id: row.category_id || '',
        name_ua: row.name_ua || '',
        label_ua: row.label_ua || '',
        variation_ua: row.variation_ua || '',
        status: row.status || 'draft',
        image_url: row.image_url || '',
        updated_at: row.updated_at || '',
        _rowIndex: i + 2,
    }));
}

async function fetchVariants() {
    const result = await callSheetsAPI('get', {
        range: `${VARIANTS_SHEET}!A:Q`,
        spreadsheetType: 'products',
    });

    if (!result || !Array.isArray(result) || result.length <= 1) return [];

    return result.slice(1).map((row, i) => ({
        variant_id: row[0] || '',
        product_id: row[1] || '',
        article: row[2] || '',
        name_ua: row[3] || '',
        price: row[9] || '',         // J: price (shifted +4)
        status: row[15] || 'active', // P: status (shifted +4)
        _rowIndex: i + 2,
    }));
}

// ── Fingerprint helpers ──

function normalizeJson(val) {
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'string' && val.trim().startsWith('[')) {
        try { return JSON.stringify(JSON.parse(val)); } catch { /* ignore */ }
    }
    return val || '';
}

function productFp(p) {
    return `${p.product_id}|${p.name_ua}|${p.label_ua}|${p.variation_ua}|${p.brand_id}|${p.category_id}|${p.status}|${p.updated_at}`;
}

function variantFp(v) {
    return `${v.variant_id}|${v.product_id}|${v.article}|${v.name_ua}|${v.price}|${v.status}`;
}

function contentFingerprint(items, itemFp) {
    return items.map(itemFp).sort().join('\n');
}

// ── Refresh helpers ──

async function refreshData() {
    await Promise.allSettled([loadProducts(), loadProductVariants()]);
    const { renderProductsTable } = await import('./products-table.js');
    const { runHook } = await import('./products-plugins.js');
    renderProductsTable();
    runHook('onRender');
}

// ── BroadcastChannel — миттєве сповіщення інших вкладок ──

const channel = new BroadcastChannel('products-changes');

channel.onmessage = async (event) => {
    const type = event.data?.type;

    if (type === 'product-deleted') {
        await refreshData();
        const { getCurrentProductId } = await import('./products-crud.js');
        const { closeModal } = await import('../../components/modal/modal-main.js');
        const { showToast } = await import('../../components/feedback/toast.js');
        const openProductId = getCurrentProductId();
        if (openProductId && openProductId === event.data.productId) {
            closeModal();
            showToast('Товар видалено іншим користувачем', 'info');
        }
        polling.resetSnapshots();
        return;
    }

    if (type !== 'products-changed') return;
    console.log('📡 BroadcastChannel: отримано сповіщення про зміни товарів');
    await refreshData();

    const { refreshProductModal, getCurrentProductId } = await import('./products-crud.js');
    const changedProductId = event.data.productId;
    const openProductId = getCurrentProductId();

    if (openProductId && changedProductId && openProductId === changedProductId) {
        refreshProductModal();
    }

    polling.resetSnapshots();
};

/**
 * Сповістити інші вкладки про збереження
 * @param {string} [productId] — ID товару що змінився
 */
export function notifyChange(productId) {
    channel.postMessage({ type: 'products-changed', productId, timestamp: Date.now() });
}

/**
 * Сповістити інші вкладки про видалення товару
 * @param {string} productId — ID видаленого товару
 */
export function notifyDelete(productId) {
    channel.postMessage({ type: 'product-deleted', productId, timestamp: Date.now() });
}

// ── Polling instance ──

const polling = createPolling({
    interval: 20_000,
    sources: [
        {
            name: 'products',
            fetch: fetchProducts,
            getState: () => productsState.products,
            setState: () => { /* onChanged робить loadProducts() з правильним парсингом */ },
            fingerprint: (items) => contentFingerprint(items, productFp),
        },
        {
            name: 'productVariants',
            fetch: fetchVariants,
            getState: () => productsState.productVariants,
            setState: () => { /* onChanged робить loadProductVariants() з правильним парсингом */ },
            fingerprint: (items) => contentFingerprint(items, variantFp),
        },
    ],
    async onChanged() {
        console.log('🔄 Polling: виявлено зміни в товарах/варіантах');
        await refreshData();

        // Оновити відкритий модал, якщо є
        const { refreshProductModal, getCurrentProductId } = await import('./products-crud.js');
        if (getCurrentProductId()) {
            refreshProductModal();
        }
    },
});

// ── Re-export ──

export const startPolling = polling.start;
export const stopPolling = polling.stop;
export const pausePolling = polling.pause;
export const resumePolling = polling.resume;
export const resetSnapshots = polling.resetSnapshots;
