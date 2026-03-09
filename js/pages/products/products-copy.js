// js/pages/products/products-copy.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — COPY (DUPLICATE)                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Копіювання товару: створює новий товар з даними оригіналу.
 *
 * КОПІЮЄТЬСЯ:
 *   brand_id, line_id, category_id, назви, ознака, деталь, варіація,
 *   текст перед/після, склад, опис, характеристики, фото, SEO поля.
 *
 * СКИДАЄТЬСЯ:
 *   product_id (новий), article (порожній), url (порожній — генерується при збереженні),
 *   status → draft, варіанти НЕ копіюються, дати — нові.
 */

import { getProductById, addProduct } from './products-data.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Копіювати товар за ID
 * @param {string} productId — ID товару-оригіналу
 * @returns {Promise<string|null>} — ID нового товару або null
 */
export async function copyProduct(productId) {
    const source = getProductById(productId);
    if (!source) {
        showToast('Товар не знайдено', 'error');
        return null;
    }

    const copy = {
        // Контент — копіюється
        brand_id:             source.brand_id || '',
        line_id:              source.line_id || '',
        category_id:          source.category_id || '',
        text_before_ua:       source.text_before_ua || '',
        text_before_ru:       source.text_before_ru || '',
        name_ua:              source.name_ua || '',
        name_ru:              source.name_ru || '',
        label_ua:             source.label_ua || '',
        label_ru:             source.label_ru || '',
        detail_ua:            source.detail_ua || '',
        detail_ru:            source.detail_ru || '',
        variation_ua:         source.variation_ua || '',
        variation_ru:         source.variation_ru || '',
        text_after_ua:        source.text_after_ua || '',
        text_after_ru:        source.text_after_ru || '',
        generated_short_ua:   source.generated_short_ua || '',
        generated_short_ru:   source.generated_short_ru || '',
        generated_full_ua:    source.generated_full_ua || '',
        generated_full_ru:    source.generated_full_ru || '',
        composition_code_ua:  source.composition_code_ua || '',
        composition_code_ru:  source.composition_code_ru || '',
        composition_notes_ua: source.composition_notes_ua || '',
        composition_notes_ru: source.composition_notes_ru || '',
        product_text_ua:      source.product_text_ua || '',
        product_text_ru:      source.product_text_ru || '',
        characteristics:      source.characteristics || {},
        image_url:            source.image_url || '',

        // SEO — копіюється
        seo_title_ua:         source.seo_title_ua || '',
        seo_title_ru:         source.seo_title_ru || '',
        seo_description_ua:   source.seo_description_ua || '',
        seo_description_ru:   source.seo_description_ru || '',
        seo_keywords_ua:      source.seo_keywords_ua || '',
        seo_keywords_ru:      source.seo_keywords_ru || '',

        // Скидається
        article: '',
        url: '',
        status: 'draft',
    };

    try {
        const newProduct = await addProduct(copy);
        const name = source.generated_short_ua || source.name_ua || productId;
        showToast(`Товар «${name}» скопійовано`, 'success');
        return newProduct?.product_id || null;
    } catch (error) {
        console.error('[Products] Copy error:', error);
        showToast('Помилка копіювання товару', 'error');
        return null;
    }
}
