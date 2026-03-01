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
import { getBrandLines } from '../brands/lines-data.js';
import { getCategories, loadCategories } from '../mapper/mapper-data-own.js';
import { populateSelect, reinitializeCustomSelect } from '../../components/forms/select.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditorUa = null;
let textEditorRu = null;
let currentProductId = null;
let _sectionObserver = null;

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
    if (title) title.textContent = `Редагувати ${product.name_ua}`;

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
        updateCharacteristicsNav(blocks);
        reinitSectionObserver();
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
    await populateBrandSelect();
    await populateCategorySelect();
    initCategoryChangeHandler();
    initBrandChangeHandler();

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
            updateCharacteristicsNav(blocks);
            reinitSectionObserver();
        } catch { /* ignore */ }
    });

    catSelect.dataset.changeInited = '1';
}

function initProductStatusToggle() {
    const dot = document.getElementById('product-status-badge');
    if (!dot || dot.dataset.toggleInited) return;

    document.querySelectorAll('input[name="product-status"]').forEach(radio => {
        radio.addEventListener('change', () => {
            dot.classList.remove('c-green', 'c-yellow', 'c-red');
            if (radio.value === 'active') {
                dot.classList.add('c-green');
                dot.title = 'Активний';
            } else if (radio.value === 'draft') {
                dot.classList.add('c-yellow');
                dot.title = 'Чернетка';
            } else {
                dot.classList.add('c-red');
                dot.title = 'Архів';
            }
        });
    });

    dot.dataset.toggleInited = '1';
}

/**
 * Ініціалізувати текстові редактори
 */
function initTextEditors() {
    const containerUa = document.getElementById('product-text-ua-editor-container');
    if (containerUa) {
        containerUa.innerHTML = '';
        if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
        textEditorUa = createHighlightEditor(containerUa);
    }

    const containerRu = document.getElementById('product-text-ru-editor-container');
    if (containerRu) {
        containerRu.innerHTML = '';
        if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }
        textEditorRu = createHighlightEditor(containerRu);
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
    if (!nav || !contentArea) return;

    // Делегований обробник кліків на навігації
    if (!nav.dataset.navInited) {
        nav.addEventListener('click', (e) => {
            const link = e.target.closest('a.btn-icon.expand.touch');
            if (!link) return;

            e.preventDefault();
            nav.querySelectorAll('a.btn-icon.expand.touch').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('href')?.substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        nav.dataset.navInited = '1';
    }

    reinitSectionObserver();
}

/**
 * Оновити sidebar nav — додати/видалити посилання на блоки характеристик
 * @param {string[]} blockNumbers - масив номерів блоків
 */
function updateCharacteristicsNav(blockNumbers) {
    const navContainer = document.getElementById('product-nav-characteristics');
    if (!navContainer) return;

    // Імпортуємо назви блоків
    import('./products-crud-characteristics.js').then(({ BLOCK_NAMES }) => {
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

/**
 * Re-init IntersectionObserver для всіх секцій (фіксованих + динамічних)
 */
function reinitSectionObserver() {
    const nav = document.getElementById('product-section-navigator');
    const contentArea = document.querySelector('.modal-fullscreen-content');
    if (!nav || !contentArea) return;

    if (_sectionObserver) _sectionObserver.disconnect();

    const navLinks = nav.querySelectorAll('a.btn-icon.expand.touch');
    const sections = contentArea.querySelectorAll('section[id]');

    const observerOptions = {
        root: contentArea,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    _sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => _sectionObserver.observe(section));
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати дані з форми
 */
function getProductFormData() {
    let characteristics = {};
    try {
        // Збираємо характеристики напряму з DOM (синхронно)
        const container = document.getElementById('product-characteristics-sections');
        if (container) {
            // Text / number inputs
            container.querySelectorAll('input[data-char-id]').forEach(input => {
                const val = input.value.trim();
                if (val) characteristics[input.dataset.charId] = val;
            });
            // TextArea
            container.querySelectorAll('textarea[data-char-id]').forEach(textarea => {
                const val = textarea.value.trim();
                if (val) characteristics[textarea.dataset.charId] = val;
            });
            // Select
            container.querySelectorAll('select[data-char-id]').forEach(select => {
                if (select.value) characteristics[select.dataset.charId] = select.value;
            });
            // Checkbox (switch)
            container.querySelectorAll('.switch[data-char-id]').forEach(switchEl => {
                const checked = switchEl.querySelector('input:checked');
                if (checked?.value) characteristics[switchEl.dataset.charId] = checked.value;
            });
            // CheckBoxGroup
            container.querySelectorAll('[data-char-type="checkboxgroup"]').forEach(groupEl => {
                const selected = [];
                groupEl.querySelectorAll('.switch input[type="radio"]:checked').forEach(radio => {
                    if (radio.value) selected.push(radio.value);
                });
                if (selected.length > 0) characteristics[groupEl.dataset.charId] = JSON.stringify(selected);
            });
        }
    } catch { /* ignore */ }

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

    return {
        name_ua: document.getElementById('product-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('product-name-ru')?.value.trim() || '',
        brand_id: document.getElementById('product-brand')?.value.trim() || '',
        line_id: document.getElementById('product-line')?.value.trim() || '',
        category_id: document.getElementById('product-category')?.value.trim() || '',
        composition_ua: document.getElementById('product-composition-ua')?.value.trim() || '',
        composition_ru: document.getElementById('product-composition-ru')?.value.trim() || '',
        product_text_ua: textEditorUa ? textEditorUa.getValue() : '',
        product_text_ru: textEditorRu ? textEditorRu.getValue() : '',
        characteristics,
        image_url: imageUrl,
        seo_title_ua: document.getElementById('product-seo-title-ua')?.value.trim() || '',
        seo_title_ru: document.getElementById('product-seo-title-ru')?.value.trim() || '',
        seo_description_ua: document.getElementById('product-seo-desc-ua')?.value.trim() || '',
        seo_description_ru: document.getElementById('product-seo-desc-ru')?.value.trim() || '',
        seo_keywords_ua: document.getElementById('product-seo-keywords-ua')?.value.trim() || '',
        seo_keywords_ru: document.getElementById('product-seo-keywords-ru')?.value.trim() || '',
        status: document.querySelector('input[name="product-status"]:checked')?.value || 'draft',
    };
}

/**
 * Заповнити форму даними товару
 */
function fillProductForm(product) {
    const idField = document.getElementById('product-id');
    if (idField) idField.value = product.product_id || '';

    const nameUa = document.getElementById('product-name-ua');
    if (nameUa) nameUa.value = product.name_ua || '';

    const nameRu = document.getElementById('product-name-ru');
    if (nameRu) nameRu.value = product.name_ru || '';

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

    // Склад
    const compUa = document.getElementById('product-composition-ua');
    if (compUa) compUa.value = product.composition_ua || '';

    const compRu = document.getElementById('product-composition-ru');
    if (compRu) compRu.value = product.composition_ru || '';

    // Статус
    const statusRadio = document.querySelector(`input[name="product-status"][value="${product.status || 'draft'}"]`);
    if (statusRadio) statusRadio.checked = true;

    const statusBadge = document.getElementById('product-status-badge');
    if (statusBadge) {
        statusBadge.classList.remove('c-green', 'c-yellow', 'c-red');
        if (product.status === 'active') {
            statusBadge.classList.add('c-green');
            statusBadge.title = 'Активний';
        } else if (product.status === 'archived') {
            statusBadge.classList.add('c-red');
            statusBadge.title = 'Архів';
        } else {
            statusBadge.classList.add('c-yellow');
            statusBadge.title = 'Чернетка';
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

    // Тексти
    if (textEditorUa) textEditorUa.setValue(product.product_text_ua || '');
    if (textEditorRu) textEditorRu.setValue(product.product_text_ru || '');
}

/**
 * Очистити форму
 */
function clearProductForm() {
    const fields = [
        'product-id', 'product-name-ua', 'product-name-ru',
        'product-composition-ua', 'product-composition-ru',
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
        statusBadge.classList.remove('c-green', 'c-yellow', 'c-red');
        statusBadge.classList.add('c-yellow');
        statusBadge.title = 'Чернетка';
    }

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
    const nameUa = document.getElementById('product-name-ua');
    if (nameUa) nameUa.value = snapshot.name_ua;

    const nameRu = document.getElementById('product-name-ru');
    if (nameRu) nameRu.value = snapshot.name_ru;

    const brandField = document.getElementById('product-brand');
    if (brandField) { brandField.value = snapshot.brand_id; reinitializeCustomSelect(brandField); }

    const lineField = document.getElementById('product-line');
    if (lineField) { lineField.value = snapshot.line_id; reinitializeCustomSelect(lineField); }

    const catField = document.getElementById('product-category');
    if (catField) { catField.value = snapshot.category_id; reinitializeCustomSelect(catField); }

    const compUa = document.getElementById('product-composition-ua');
    if (compUa) compUa.value = snapshot.composition_ua;

    const compRu = document.getElementById('product-composition-ru');
    if (compRu) compRu.value = snapshot.composition_ru;

    if (textEditorUa) textEditorUa.setValue(snapshot.product_text_ua || '');
    if (textEditorRu) textEditorRu.setValue(snapshot.product_text_ru || '');

    const imageUrlField = document.getElementById('product-image-url');
    if (imageUrlField) imageUrlField.value = snapshot.image_url;

    ['seo-title-ua', 'seo-title-ru', 'seo-desc-ua', 'seo-desc-ru', 'seo-keywords-ua', 'seo-keywords-ru'].forEach(suffix => {
        const key = suffix.replace(/-/g, '_').replace('desc', 'description');
        const field = document.getElementById(`product-${suffix}`);
        if (field) field.value = snapshot[key] || '';
    });
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

    if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
    if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }

    try {
        import('./products-crud-variants.js').then(({ discardPendingVariantChanges }) => {
            discardPendingVariantChanges();
        }).catch(() => {});
    } catch { /* ignore */ }
}
