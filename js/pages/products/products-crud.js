// js/pages/products/products-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - CRUD (МОДАЛ)                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — модал товару: відкриття, заповнення, збереження.
 *
 * Секції модала винесені в окремі файли:
 *   products-crud-characteristics.js — характеристики (за категорією)
 *   products-crud-variants.js        — варіанти товару
 *   products-crud-photos.js          — фото товару
 *   products-delete.js               — видалення товару
 */

import { registerProductsPlugin, runHook } from './products-plugins.js';
import { productsState } from './products-state.js';
import { addProduct, updateProduct, getProducts, getProductById } from './products-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { getBrands, loadBrands } from '../brands/brands-data.js';
import { getBrandLines, loadBrandLines } from '../brands/lines-data.js';
import { getCategories, loadCategories } from '../mapper/mapper-data-own.js';
import { populateSelect, reinitializeCustomSelect } from '../../components/forms/select.js';
import { getCharacteristicsData } from './products-crud-characteristics.js';
import { generateSeoTitle, generateSeoDescription, generateSeoKeywords } from '../../generators/generator-seo/gse-generators.js';
import { fetchData as fetchSeoData, getTriggersData } from '../../generators/generator-seo/gse-data.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditorUa = null;
let textEditorRu = null;
let compCodeEditorUa = null;
let compCodeEditorRu = null;
let compNotesEditorUa = null;
let compNotesEditorRu = null;
let currentProductId = null;

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання товару
 */
export async function showAddProductModal() {
    currentProductId = null;

    await showModal('product-edit', null);

    const title = document.getElementById('product-modal-title');
    if (title) title.textContent = 'Новий товар';

    const deleteBtn = document.getElementById('btn-delete-product');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearProductForm();
    _seoToasted.clear();
    fetchSeoData();
    await initModalComponents();

    runHook('onModalOpen', null);
}

/**
 * Показати модальне вікно для редагування товару
 * @param {string} productId - ID товару
 */
export async function showEditProductModal(productId) {
    const product = getProductById(productId);
    if (!product) {
        showToast('Товар не знайдено', 'error');
        return;
    }

    currentProductId = productId;

    await showModal('product-edit', null);

    const title = document.getElementById('product-modal-title');
    if (title) title.textContent = `Редагувати ${product.generated_short_ua || product.name_ua}`;

    const deleteBtn = document.getElementById('btn-delete-product');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = async () => {
            const { showDeleteProductConfirm } = await import('./products-delete.js');
            showDeleteProductConfirm(productId);
        };
    }

    await initModalComponents();
    fillProductForm(product);

    // Завантажити характеристики
    try {
        const { renderCharacteristicsForCategory } = await import('./products-crud-characteristics.js');
        const blocks = await renderCharacteristicsForCategory(product.category_id, product.characteristics);
        await updateCharacteristicsNav(blocks);
        initSectionNavigation();
    } catch { /* ignore if not loaded */ }

    // Завантажити варіанти
    try {
        const { populateProductVariants } = await import('./products-crud-variants.js');
        populateProductVariants(productId);
    } catch { /* ignore if not loaded */ }

    // Завантажити фото
    try {
        const { initPhotoSection, setPhotoUrls } = await import('./products-crud-photos.js');
        initPhotoSection();
        const urls = safeJsonParseArray(product.image_url);
        setPhotoUrls(urls);
    } catch { /* ignore if not loaded */ }

    runHook('onModalOpen', product);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initTextEditors();
    initSaveHandler();
    initSectionNavigation();
    initProductStatusToggle();
    initNameGenerationListeners();
    await populateBrandSelect();
    await populateCategorySelect();
    initCategoryChangeHandler();
    initBrandChangeHandler();

    try {
        const { initAutofill } = await import('./products-crud-autofill.js');
        initAutofill();
    } catch { /* ignore */ }

    try {
        const { initPhotoSection } = await import('./products-crud-photos.js');
        initPhotoSection();
    } catch { /* ignore */ }

    try {
        const { initVariantsSection } = await import('./products-crud-variants.js');
        initVariantsSection(() => currentProductId);
    } catch { /* ignore */ }
}

/**
 * Заповнити select бренду
 */
async function populateBrandSelect() {
    try {
        let brands = getBrands();
        if (brands.length === 0) {
            await loadBrands();
            brands = getBrands();
        }

        // Завантажити лінійки якщо ще не завантажені
        if (getBrandLines().length === 0) {
            await loadBrandLines();
        }

        brands.sort((a, b) => (a.name_uk || '').localeCompare(b.name_uk || '', 'uk'));

        populateSelect('product-brand',
            brands.map(b => ({ value: b.brand_id, text: b.name_uk || b.brand_id })),
            { placeholder: '— Оберіть бренд —' }
        );
    } catch (e) {
        console.warn('⚠️ Не вдалось завантажити бренди:', e);
    }
}

/**
 * Заповнити select категорії
 */
async function populateCategorySelect() {
    try {
        let categories = getCategories();
        if (categories.length === 0) {
            await loadCategories();
            categories = getCategories();
        }

        categories.sort((a, b) => (a.name_ua || '').localeCompare(b.name_ua || '', 'uk'));

        populateSelect('product-category',
            categories.map(c => ({ value: c.id, text: c.name_ua || c.id })),
            { placeholder: '— Оберіть категорію —' }
        );
    } catch (e) {
        console.warn('⚠️ Не вдалось завантажити категорії:', e);
    }
}

/**
 * Заповнити select лінійки за обраним брендом
 */
function populateLineSelect(brandId) {
    const lines = getBrandLines().filter(l => l.brand_id === brandId);
    lines.sort((a, b) => (a.name_uk || '').localeCompare(b.name_uk || '', 'uk'));

    populateSelect('product-line',
        lines.map(l => ({ value: l.line_id, text: l.name_uk || l.line_id })),
        { placeholder: '— Оберіть лінійку —' }
    );
}

/**
 * Обробник зміни бренду — перезавантажує лінійки
 */
function initBrandChangeHandler() {
    const brandSelect = document.getElementById('product-brand');
    if (!brandSelect || brandSelect.dataset.changeInited) return;

    brandSelect.addEventListener('change', () => {
        populateLineSelect(brandSelect.value);
        reinitializeCustomSelect(document.getElementById('product-line'));
    });

    brandSelect.dataset.changeInited = '1';
}

/**
 * Обробник зміни категорії — перезавантажує характеристики
 */
function initCategoryChangeHandler() {
    const catSelect = document.getElementById('product-category');
    if (!catSelect || catSelect.dataset.changeInited) return;

    catSelect.addEventListener('change', async () => {
        try {
            const { renderCharacteristicsForCategory } = await import('./products-crud-characteristics.js');
            const blocks = await renderCharacteristicsForCategory(catSelect.value, {});
            await updateCharacteristicsNav(blocks);
            initSectionNavigation();

            const { runAutofillAfterRender } = await import('./products-crud-autofill.js');
            runAutofillAfterRender();
        } catch { /* ignore */ }
    });

    catSelect.dataset.changeInited = '1';
}

function initProductStatusToggle() {
    const badge = document.getElementById('product-status-badge');
    if (!badge || badge.dataset.toggleInited) return;

    document.querySelectorAll('input[name="product-status"]').forEach(radio => {
        radio.addEventListener('change', () => {
            badge.classList.remove('c-green', 'c-yellow', 'c-red');
            if (radio.value === 'active') {
                badge.classList.add('c-green');
            } else if (radio.value === 'draft') {
                badge.classList.add('c-yellow');
            } else {
                badge.classList.add('c-red');
            }
        });
    });

    badge.dataset.toggleInited = '1';
}

/**
 * Ініціалізувати текстові редактори
 */
function initTextEditors() {
    // Опис товару
    const containerUa = document.getElementById('product-text-ua-editor-container');
    if (containerUa) {
        containerUa.innerHTML = '';
        if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
        textEditorUa = createHighlightEditor(containerUa);
        // SEO description при зміні тексту (через hook системи едітора)
        textEditorUa.getState()?.registerHook('onInput', updateSeoForCreate);
    }

    const containerRu = document.getElementById('product-text-ru-editor-container');
    if (containerRu) {
        containerRu.innerHTML = '';
        if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }
        textEditorRu = createHighlightEditor(containerRu);
        textEditorRu.getState()?.registerHook('onInput', updateSeoForCreate);
    }

    // Код складу
    const compCodeUa = document.getElementById('product-composition-code-ua-editor');
    if (compCodeUa) {
        compCodeUa.innerHTML = '';
        if (compCodeEditorUa) { compCodeEditorUa.destroy(); compCodeEditorUa = null; }
        compCodeEditorUa = createHighlightEditor(compCodeUa);
    }

    const compCodeRu = document.getElementById('product-composition-code-ru-editor');
    if (compCodeRu) {
        compCodeRu.innerHTML = '';
        if (compCodeEditorRu) { compCodeEditorRu.destroy(); compCodeEditorRu = null; }
        compCodeEditorRu = createHighlightEditor(compCodeRu);
    }

    // 1 порція (br charm)
    const compNotesUa = document.getElementById('product-composition-notes-ua-editor');
    if (compNotesUa) {
        compNotesUa.innerHTML = '';
        if (compNotesEditorUa) { compNotesEditorUa.destroy(); compNotesEditorUa = null; }
        compNotesEditorUa = createHighlightEditor(compNotesUa);
    }

    const compNotesRu = document.getElementById('product-composition-notes-ru-editor');
    if (compNotesRu) {
        compNotesRu.innerHTML = '';
        if (compNotesEditorRu) { compNotesEditorRu.destroy(); compNotesEditorRu = null; }
        compNotesEditorRu = createHighlightEditor(compNotesRu);
    }
}

/**
 * Ініціалізувати обробник збереження
 */
function initSaveHandler() {
    const saveBtn = document.getElementById('btn-save-product');
    if (saveBtn) saveBtn.onclick = () => handleSaveProduct(false);

    const saveCloseBtn = document.getElementById('save-close-product');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveProduct(true);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION NAVIGATION — фіксовані + динамічні
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати навігацію по секціях
 */
function initSectionNavigation() {
    const nav = document.getElementById('product-section-navigator');
    const contentArea = document.querySelector('.modal-fullscreen-content');
    initSectionNav(nav, contentArea);
}

/**
 * Оновити sidebar nav — додати/видалити посилання на блоки характеристик
 * @param {string[]} blockNumbers - масив номерів блоків
 */
async function updateCharacteristicsNav(blockNumbers) {
    const navContainer = document.getElementById('product-nav-characteristics');
    if (!navContainer) return;

    // Імпортуємо назви блоків
    await import('./products-crud-characteristics.js').then(({ BLOCK_NAMES }) => {
        const icons = {
            '1': 'scale', '2': 'category', '3': 'group',
            '4': 'target', '5': 'public', '6': 'local_shipping', '9': 'more_horiz',
        };

        let html = '';
        (blockNumbers || []).forEach(blockNum => {
            const name = BLOCK_NAMES[blockNum] || `Блок ${blockNum}`;
            const icon = icons[blockNum] || 'tune';
            html += `
                <a href="#section-product-block-${blockNum}" class="btn-icon expand touch" aria-label="${name}">
                    <span class="material-symbols-outlined">${icon}</span>
                    <span class="btn-icon-label">${name}</span>
                </a>
            `;
        });

        navContainer.innerHTML = html;
    }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати дані з форми
 */
function getProductFormData() {
    const characteristics = getCharacteristicsData();

    // Фото — JSON array
    let imageUrl = '';
    try {
        const photosGrid = document.getElementById('product-photos-grid');
        if (photosGrid && photosGrid._getPhotoUrls) {
            const urls = photosGrid._getPhotoUrls();
            imageUrl = urls.length > 0 ? JSON.stringify(urls) : '';
        } else {
            imageUrl = document.getElementById('product-image-url')?.value.trim() || '';
        }
    } catch {
        imageUrl = document.getElementById('product-image-url')?.value.trim() || '';
    }

    const v = (id) => document.getElementById(id)?.value.trim() || '';

    return {
        brand_id: v('product-brand'),
        line_id: v('product-line'),
        category_id: v('product-category'),
        text_before_ua: v('product-text-before-ua'),
        text_before_ru: v('product-text-before-ru'),
        name_ua: v('product-name-ua'),
        name_ru: v('product-name-ru'),
        label_ua: v('product-label-ua'),
        label_ru: v('product-label-ru'),
        detail_ua: v('product-detail-ua'),
        detail_ru: v('product-detail-ru'),
        variation_ua: v('product-variation-ua'),
        variation_ru: v('product-variation-ru'),
        text_after_ua: v('product-text-after-ua'),
        text_after_ru: v('product-text-after-ru'),
        generated_short_ua: v('product-generated-short-ua'),
        generated_short_ru: v('product-generated-short-ru'),
        generated_full_ua: v('product-generated-full-ua'),
        generated_full_ru: v('product-generated-full-ru'),
        url: v('product-url'),
        composition_code_ua: compCodeEditorUa ? compCodeEditorUa.getValue() : '',
        composition_code_ru: compCodeEditorRu ? compCodeEditorRu.getValue() : '',
        composition_notes_ua: compNotesEditorUa ? compNotesEditorUa.getValue() : '',
        composition_notes_ru: compNotesEditorRu ? compNotesEditorRu.getValue() : '',
        product_text_ua: textEditorUa ? textEditorUa.getValue() : '',
        product_text_ru: textEditorRu ? textEditorRu.getValue() : '',
        characteristics,
        image_url: imageUrl,
        seo_title_ua: v('product-seo-title-ua'),
        seo_title_ru: v('product-seo-title-ru'),
        seo_description_ua: v('product-seo-desc-ua'),
        seo_description_ru: v('product-seo-desc-ru'),
        seo_keywords_ua: v('product-seo-keywords-ua'),
        seo_keywords_ru: v('product-seo-keywords-ru'),
        status: document.querySelector('input[name="product-status"]:checked')?.value || 'draft',
    };
}

/**
 * Заповнити форму даними товару
 */
function fillProductForm(product) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    set('product-id', product.product_id);
    set('product-name-ua', product.name_ua);
    set('product-name-ru', product.name_ru);
    set('product-text-before-ua', product.text_before_ua);
    set('product-text-before-ru', product.text_before_ru);
    set('product-label-ua', product.label_ua);
    set('product-label-ru', product.label_ru);
    set('product-detail-ua', product.detail_ua);
    set('product-detail-ru', product.detail_ru);
    set('product-variation-ua', product.variation_ua);
    set('product-variation-ru', product.variation_ru);
    set('product-text-after-ua', product.text_after_ua);
    set('product-text-after-ru', product.text_after_ru);

    // Бренд
    const brandField = document.getElementById('product-brand');
    if (brandField) {
        brandField.value = product.brand_id || '';
        reinitializeCustomSelect(brandField);
    }

    // Лінійка (потрібно спочатку заповнити options за брендом)
    if (product.brand_id) {
        populateLineSelect(product.brand_id);
    }
    const lineField = document.getElementById('product-line');
    if (lineField) {
        lineField.value = product.line_id || '';
        reinitializeCustomSelect(lineField);
    }

    // Категорія
    const catField = document.getElementById('product-category');
    if (catField) {
        catField.value = product.category_id || '';
        reinitializeCustomSelect(catField);
    }

    // Статус
    const statusRadio = document.querySelector(`input[name="product-status"][value="${product.status || 'draft'}"]`);
    if (statusRadio) statusRadio.checked = true;

    const statusBadge = document.getElementById('product-status-badge');
    if (statusBadge) {
        statusBadge.textContent = product.product_id || '';
        statusBadge.classList.remove('c-green', 'c-yellow', 'c-red');
        if (product.status === 'active') {
            statusBadge.classList.add('c-green');
        } else if (product.status === 'archived') {
            statusBadge.classList.add('c-red');
        } else {
            statusBadge.classList.add('c-yellow');
        }
    }

    // SEO
    const seoTitleUa = document.getElementById('product-seo-title-ua');
    if (seoTitleUa) seoTitleUa.value = product.seo_title_ua || '';

    const seoTitleRu = document.getElementById('product-seo-title-ru');
    if (seoTitleRu) seoTitleRu.value = product.seo_title_ru || '';

    const seoDescUa = document.getElementById('product-seo-desc-ua');
    if (seoDescUa) seoDescUa.value = product.seo_description_ua || '';

    const seoDescRu = document.getElementById('product-seo-desc-ru');
    if (seoDescRu) seoDescRu.value = product.seo_description_ru || '';

    const seoKeywordsUa = document.getElementById('product-seo-keywords-ua');
    if (seoKeywordsUa) seoKeywordsUa.value = product.seo_keywords_ua || '';

    const seoKeywordsRu = document.getElementById('product-seo-keywords-ru');
    if (seoKeywordsRu) seoKeywordsRu.value = product.seo_keywords_ru || '';

    // Зображення (hidden field для backward compat)
    const imageUrlField = document.getElementById('product-image-url');
    if (imageUrlField) imageUrlField.value = product.image_url || '';

    // Склад (редактори)
    if (compCodeEditorUa) compCodeEditorUa.setValue(product.composition_code_ua || '');
    if (compCodeEditorRu) compCodeEditorRu.setValue(product.composition_code_ru || '');
    if (compNotesEditorUa) compNotesEditorUa.setValue(product.composition_notes_ua || '');
    if (compNotesEditorRu) compNotesEditorRu.setValue(product.composition_notes_ru || '');

    // Тексти
    if (textEditorUa) textEditorUa.setValue(product.product_text_ua || '');
    if (textEditorRu) textEditorRu.setValue(product.product_text_ru || '');

    // URL (readonly, вже збережений)
    set('product-url', product.url);

    // Оновити згенеровані назви
    updateGeneratedNames();
}

/**
 * Очистити форму
 */
function clearProductForm() {
    const fields = [
        'product-id', 'product-name-ua', 'product-name-ru',
        'product-text-before-ua', 'product-text-before-ru',
        'product-label-ua', 'product-label-ru',
        'product-detail-ua', 'product-detail-ru',
        'product-variation-ua', 'product-variation-ru',
        'product-text-after-ua', 'product-text-after-ru',
        'product-generated-short-ua', 'product-generated-short-ru',
        'product-generated-full-ua', 'product-generated-full-ru',
        'product-url',
        'product-image-url',
        'product-seo-title-ua', 'product-seo-title-ru',
        'product-seo-desc-ua', 'product-seo-desc-ru',
        'product-seo-keywords-ua', 'product-seo-keywords-ru'
    ];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const brandField = document.getElementById('product-brand');
    if (brandField) { brandField.value = ''; reinitializeCustomSelect(brandField); }

    const lineField = document.getElementById('product-line');
    if (lineField) {
        populateSelect('product-line', [], { placeholder: '— Оберіть лінійку —' });
        reinitializeCustomSelect(lineField);
    }

    const catField = document.getElementById('product-category');
    if (catField) { catField.value = ''; reinitializeCustomSelect(catField); }

    const statusRadio = document.querySelector('input[name="product-status"][value="draft"]');
    if (statusRadio) statusRadio.checked = true;

    const statusBadge = document.getElementById('product-status-badge');
    if (statusBadge) {
        statusBadge.textContent = '';
        statusBadge.classList.remove('c-green', 'c-yellow', 'c-red');
        statusBadge.classList.add('c-yellow');
    }

    if (compCodeEditorUa) compCodeEditorUa.setValue('');
    if (compCodeEditorRu) compCodeEditorRu.setValue('');
    if (compNotesEditorUa) compNotesEditorUa.setValue('');
    if (compNotesEditorRu) compNotesEditorRu.setValue('');
    if (textEditorUa) textEditorUa.setValue('');
    if (textEditorRu) textEditorRu.setValue('');

    // Очистити характеристики
    const charsSections = document.getElementById('product-characteristics-sections');
    if (charsSections) charsSections.innerHTML = '';

    const charsEmpty = document.getElementById('product-characteristics-empty');
    if (charsEmpty) charsEmpty.classList.remove('u-hidden');

    // Очистити nav характеристик
    updateCharacteristicsNav([]);

    // Очистити фото
    try {
        import('./products-crud-photos.js').then(({ clearPhotos }) => {
            clearPhotos();
        }).catch(() => {});
    } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// NAME GENERATION (авто-формування назв)
// ═══════════════════════════════════════════════════════════════════════════

const NAME_FIELDS = [
    'product-text-before-ua', 'product-text-before-ru',
    'product-name-ua', 'product-name-ru',
    'product-label-ua', 'product-label-ru',
    'product-detail-ua', 'product-detail-ru',
    'product-variation-ua', 'product-variation-ru',
    'product-text-after-ua', 'product-text-after-ru',
];

/**
 * Ініціалізувати слухачів для авто-генерації назв + SEO (при створенні)
 */
function initNameGenerationListeners() {
    const onFieldChange = () => {
        updateGeneratedNames();
        updateSeoForCreate();
    };

    NAME_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.nameGenInited) {
            el.addEventListener('input', onFieldChange);
            el.dataset.nameGenInited = '1';
        }
    });

    // Бренд, лінійка, категорія теж впливають на назву
    ['product-brand', 'product-line', 'product-category'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.nameGenInited) {
            el.addEventListener('change', onFieldChange);
            el.dataset.nameGenInited = '1';
        }
    });
}

/**
 * Побудувати коротку назву:
 * [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація]
 */
export function buildShortName(brand, line, name, label, detail, variation) {
    const mainParts = [brand, line, name, label, detail].filter(Boolean).join(' ');
    if (!variation) return mainParts;
    return mainParts ? `${mainParts}, ${variation}` : variation;
}

/**
 * Побудувати повну назву:
 * [Текст перед] [Коротка назва] [Текст після]
 */
export function buildFullName(textBefore, shortName, textAfter) {
    return [textBefore, shortName, textAfter].filter(Boolean).join(' ');
}

/**
 * Побудувати повну назву варіанту:
 * [Текст перед] [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація] - [Варіант] [Текст після]
 */
export function buildVariantFullName(textBefore, brand, line, name, label, detail, variation, variantName, textAfter) {
    const mainParts = [brand, line, name, label, detail].filter(Boolean).join(' ');
    let core = mainParts;
    if (variation) core = core ? `${core}, ${variation}` : variation;
    if (variantName) core = core ? `${core} - ${variantName}` : variantName;
    return [textBefore, core, textAfter].filter(Boolean).join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// URL SLUG
// ═══════════════════════════════════════════════════════════════════════════

const TRANSLIT_MAP = {
    'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye',
    'ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l',
    'м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
    'ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ь':'',
    'ю':'yu','я':'ya','ё':'yo','ы':'y','э':'e',
};

/**
 * Транслітерація + slug: "Optimum Nutrition 100% Whey, 907 грам" → "optimum-nutrition-100-whey-907-hram"
 */
export function slugify(text) {
    if (!text) return '';
    let result = text.toLowerCase();
    result = result.replace(/./g, ch => TRANSLIT_MAP[ch] || ch);
    result = result.replace(/[^a-z0-9]+/g, '-');
    result = result.replace(/^-+|-+$/g, '');
    return result;
}

/**
 * Перевірити унікальність URL серед товарів
 * @param {string} url - URL для перевірки
 * @param {string} [excludeProductId] - Виключити поточний товар
 * @returns {boolean} true якщо унікальний
 */
export function isProductUrlUnique(url, excludeProductId) {
    if (!url) return true;
    const products = getProducts();
    return !products.some(p =>
        p.url === url && p.product_id !== excludeProductId
    );
}

/**
 * Оновити згенеровані назви (коротка + повна)
 * Якщо "Текст перед назвою" порожній — підставляється назва категорії
 */
function updateGeneratedNames() {
    const v = (id) => document.getElementById(id)?.value.trim() || '';

    // Бренд і лінійка — частина коротної назви
    const brandSelect = document.getElementById('product-brand');
    const lineSelect = document.getElementById('product-line');
    const brandName = brandSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const lineName = lineSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const brandPart = (brandName && !brandName.startsWith('—')) ? brandName : '';
    const linePart = (lineName && !lineName.startsWith('—')) ? lineName : '';

    // Категорія — fallback для текст перед назвою
    const catSelect = document.getElementById('product-category');
    const catName = catSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const catPart = (catName && !catName.startsWith('—')) ? catName : '';

    const textBeforeUa = v('product-text-before-ua');
    const textBeforeRu = v('product-text-before-ru');
    // Якщо текст перед назвою порожній — підставити категорію
    const prefixUa = textBeforeUa || catPart;
    const prefixRu = textBeforeRu || catPart;

    // Коротка: [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація]
    const shortUaVal = buildShortName(brandPart, linePart, v('product-name-ua'), v('product-label-ua'), v('product-detail-ua'), v('product-variation-ua'));
    const shortRuVal = buildShortName(brandPart, linePart, v('product-name-ru'), v('product-label-ru'), v('product-detail-ru'), v('product-variation-ru'));

    const shortUa = document.getElementById('product-generated-short-ua');
    const shortRu = document.getElementById('product-generated-short-ru');
    if (shortUa) shortUa.value = shortUaVal;
    if (shortRu) shortRu.value = shortRuVal;

    // Повна: [Текст перед / Категорія] [Коротка] [Текст після]
    const fullUa = document.getElementById('product-generated-full-ua');
    const fullRu = document.getElementById('product-generated-full-ru');
    if (fullUa) fullUa.value = buildFullName(prefixUa, shortUaVal, v('product-text-after-ua'));
    if (fullRu) fullRu.value = buildFullName(prefixRu, shortRuVal, v('product-text-after-ru'));

    // URL slug — тільки для нових товарів (поле ще порожнє)
    const urlField = document.getElementById('product-url');
    const urlBloc = document.getElementById('product-url-bloc');
    if (urlField && !currentProductId) {
        const slug = slugify(shortUaVal);
        urlField.value = slug;
        // Перевірка унікальності в реальному часі
        if (urlBloc) {
            const unique = isProductUrlUnique(slug, null);
            const line = urlBloc.querySelector('.content-line');
            if (line) {
                if (!unique && slug) line.setAttribute('error', '');
                else line.removeAttribute('error');
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEO AUTO-GENERATION (тільки при створенні)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Авто-генерація SEO полів — тільки при створенні (currentProductId === null)
 * Використовує gse-generators.js (та ж логіка що й на index сторінці).
 * Title/Keywords: коли є бренд + назва
 * Description: коли є текст товару
 * Тригери: badge-и з matched triggers
 */
const _seoToasted = new Set();

function updateSeoForCreate() {
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
    const textUa = textEditorUa ? textEditorUa.getPlainText() : '';
    const textRu = textEditorRu ? textEditorRu.getPlainText() : '';
    const seoDescUa = document.getElementById('product-seo-desc-ua');
    const seoDescRu = document.getElementById('product-seo-desc-ru');
    if (seoDescUa && textUa) seoDescUa.value = generateSeoDescription(textUa, 'ua');
    if (seoDescRu && textRu) seoDescRu.value = generateSeoDescription(textRu, 'ru');

    if ((textUa || textRu) && !_seoToasted.has('desc')) {
        _seoToasted.add('desc');
        showToast('SEO Description згенеровано автоматично', 'info');
    }
}

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
 * Показати badge-и з matched triggers (як на index SEO сторінці)
 */
function renderSeoChips(activeTulips) {
    const container = document.getElementById('product-seo-triggers');
    if (!container) return;
    container.innerHTML = '';
    if (!activeTulips.length) return;

    const triggersData = getTriggersData();
    activeTulips.forEach(title => {
        const triggerData = triggersData.find(t => t.title === title);
        const badge = document.createElement('div');
        badge.className = 'badge c-main';
        badge.textContent = title;
        if (triggerData?.keywords?.length) {
            badge.title = triggerData.keywords.join(', ');
        }
        container.appendChild(badge);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function safeJsonParseArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
            try { return JSON.parse(trimmed); } catch { /* ignore */ }
        }
        // Одне URL — як масив з одного елемента
        if (trimmed.startsWith('http')) return [trimmed];
    }
    return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обробник збереження товару
 */
async function handleSaveProduct(shouldClose = true) {
    const productData = getProductFormData();

    // URL: для нового товару — згенерувати з короткої назви
    if (!currentProductId && !productData.url) {
        productData.url = slugify(productData.generated_short_ua);
    }

    // URL: для існуючого — зберегти оригінальний (не змінювати)
    if (currentProductId) {
        const existing = getProductById(currentProductId);
        if (existing?.url) productData.url = existing.url;
    }

    // Валідація URL: unique (required обробляється charm-required)
    if (!isProductUrlUnique(productData.url, currentProductId || null)) {
        showToast('URL адреса не унікальна — такий товар вже існує', 'error');
        const urlBloc = document.getElementById('product-url-bloc');
        const urlLine = urlBloc?.querySelector('.content-line');
        if (urlLine) urlLine.setAttribute('error', '');
        return;
    }

    try {
        if (currentProductId) {
            await updateProduct(currentProductId, productData);

            // Зберегти pending зміни варіантів
            try {
                const { commitPendingVariantChanges } = await import('./products-crud-variants.js');
                await commitPendingVariantChanges();
            } catch { /* ignore */ }

            showToast('Товар успішно оновлено', 'success');
            runHook('onProductUpdate', currentProductId, productData);
        } else {
            const newProduct = await addProduct(productData);
            currentProductId = newProduct?.product_id || null;

            // Зберегти pending варіанти (створені в UI до збереження товару)
            if (currentProductId) {
                try {
                    const { commitPendingVariantChanges } = await import('./products-crud-variants.js');
                    await commitPendingVariantChanges(currentProductId, productData);
                } catch (err) {
                    console.error('Помилка збереження варіантів:', err);
                }
            }

            showToast('Товар успішно додано', 'success');
            runHook('onProductAdd', newProduct);
        }

        if (shouldClose) closeModal();
        runHook('onModalClose');
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка збереження товару:', error);
        showToast('Помилка збереження товару', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH MODAL (для polling / BroadcastChannel)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Оновити форму модала свіжими даними зі стейту
 */
export function refreshProductModal() {
    if (!currentProductId) return;
    const product = getProductById(currentProductId);
    if (!product) return;

    const snapshot = getProductFormData();

    fillProductForm(product);

    showToast('Дані оновлено іншим користувачем', 'info', {
        duration: 8000,
        action: {
            label: 'Відмінити',
            onClick: () => _restoreSnapshot(snapshot),
        },
    });
}

function _restoreSnapshot(snapshot) {
    const set = (id, key) => { const el = document.getElementById(id); if (el) el.value = snapshot[key] || ''; };

    // Назви — всі складові
    set('product-name-ua', 'name_ua');
    set('product-name-ru', 'name_ru');
    set('product-text-before-ua', 'text_before_ua');
    set('product-text-before-ru', 'text_before_ru');
    set('product-label-ua', 'label_ua');
    set('product-label-ru', 'label_ru');
    set('product-detail-ua', 'detail_ua');
    set('product-detail-ru', 'detail_ru');
    set('product-variation-ua', 'variation_ua');
    set('product-variation-ru', 'variation_ru');
    set('product-text-after-ua', 'text_after_ua');
    set('product-text-after-ru', 'text_after_ru');

    // Selects
    const brandField = document.getElementById('product-brand');
    if (brandField) { brandField.value = snapshot.brand_id; reinitializeCustomSelect(brandField); }

    const lineField = document.getElementById('product-line');
    if (lineField) { lineField.value = snapshot.line_id; reinitializeCustomSelect(lineField); }

    const catField = document.getElementById('product-category');
    if (catField) { catField.value = snapshot.category_id; reinitializeCustomSelect(catField); }

    // Склад (редактори)
    if (compCodeEditorUa) compCodeEditorUa.setValue(snapshot.composition_code_ua || '');
    if (compCodeEditorRu) compCodeEditorRu.setValue(snapshot.composition_code_ru || '');
    if (compNotesEditorUa) compNotesEditorUa.setValue(snapshot.composition_notes_ua || '');
    if (compNotesEditorRu) compNotesEditorRu.setValue(snapshot.composition_notes_ru || '');

    // Тексти
    if (textEditorUa) textEditorUa.setValue(snapshot.product_text_ua || '');
    if (textEditorRu) textEditorRu.setValue(snapshot.product_text_ru || '');

    // Зображення
    set('product-image-url', 'image_url');

    // SEO
    ['seo-title-ua', 'seo-title-ru', 'seo-desc-ua', 'seo-desc-ru', 'seo-keywords-ua', 'seo-keywords-ru'].forEach(suffix => {
        const key = suffix.replace(/-/g, '_').replace('desc', 'description');
        const field = document.getElementById(`product-${suffix}`);
        if (field) field.value = snapshot[key] || '';
    });

    // Перерахувати згенеровані назви
    updateGeneratedNames();
}

export function getCurrentProductId() {
    return currentProductId;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerProductsPlugin('onVariantAdd', () => {
        if (currentProductId) {
            import('./products-crud-variants.js').then(({ populateProductVariants }) => {
                populateProductVariants(currentProductId);
            }).catch(() => {});
        }
    });

    registerProductsPlugin('onVariantUpdate', () => {
        if (currentProductId) {
            import('./products-crud-variants.js').then(({ populateProductVariants }) => {
                populateProductVariants(currentProductId);
            }).catch(() => {});
        }
    });

    registerProductsPlugin('onVariantDelete', () => {
        if (currentProductId) {
            import('./products-crud-variants.js').then(({ populateProductVariants }) => {
                populateProductVariants(currentProductId);
            }).catch(() => {});
        }
    });

    // Очистка при закритті модалу
    document.addEventListener('modal-closed', (e) => {
        if (e.detail?.modalId !== 'product-edit') return;
        cleanupProductModal();
    });
}

/**
 * Очистити всі ресурси модалу товару
 */
function cleanupProductModal() {
    currentProductId = null;

    if (_sectionObserver) {
        _sectionObserver.disconnect();
        _sectionObserver = null;
    }

    if (compCodeEditorUa) { compCodeEditorUa.destroy(); compCodeEditorUa = null; }
    if (compCodeEditorRu) { compCodeEditorRu.destroy(); compCodeEditorRu = null; }
    if (compNotesEditorUa) { compNotesEditorUa.destroy(); compNotesEditorUa = null; }
    if (compNotesEditorRu) { compNotesEditorRu.destroy(); compNotesEditorRu = null; }
    if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
    if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }

    try {
        import('./products-crud-variants.js').then(({ discardPendingVariantChanges }) => {
            discardPendingVariantChanges();
        }).catch(() => {});
    } catch { /* ignore */ }
}
