// js/pages/products/products-crud-variants.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ВАРІАНТИ                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція варіантів у модалі товару.
 * Вкладена таблиця: артикул, назва, ціна, штрихкод, вага, залишок.
 * Повноцінний модал variant-edit для редагування варіантів.
 *
 * Суб-модулі:
 *   products-crud-variant-names.js   — резолвінг назв варіантів
 *   products-crud-variant-chars.js   — характеристики блоку 8 + spec
 *   products-crud-variant-pending.js — pending варіанти (accordion)
 */

import { getVariantsByProductId, getVariantById, addProductVariant, updateProductVariant, deleteProductVariant } from './variants-data.js';
import { getProductById } from './products-data.js';
import {
    registerActionHandlers,
    initActionHandlers,
} from '../../components/actions/actions-main.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { runHook, applyFilter } from './products-plugins.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { initVariantPhotoSection, setVariantPhotoUrls, clearVariantPhotos } from './products-crud-variant-photos.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';

// Sub-modules
import { resolveVariantName, resolveNameFromCharsAndSpecs, computeVariantGeneratedNames, displayName } from './products-crud-variant-names.js';
import { renderVariantCharacteristics, getVariantCharsData, buildExpandContent, onVariantExpand, readRowFormValues, getVariantColumns, renderExistingVariantCharacteristics, renderPendingVariantCharacteristics } from './products-crud-variant-chars.js';
import { addPendingVariant, updatePendingVariant, getPendingVariantById, renderPendingList, commitPendingVariantChanges, discardPendingVariantChanges } from './products-crud-variant-pending.js';

// Re-exports (used by products-crud.js)
export { commitPendingVariantChanges, discardPendingVariantChanges, populateProductVariants };
export { renderPendingVariantCharacteristics } from './products-crud-variant-chars.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _getCurrentProductId = null;
let _currentVariantId = null;

// Pending mode (new product, variants not yet saved)
let _pendingMode = false;
let _pendingEditId = null;

// Managed table (existing variants)
let _variantsManagedTable = null;
let _actionCleanup = null;

// Editors
let _compCodeEditorUa = null;
let _compCodeEditorRu = null;
let _compNotesEditorUa = null;
let _compNotesEditorRu = null;
let _productTextEditorUa = null;
let _productTextEditorRu = null;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати секцію варіантів
 * @param {Function} getProductIdFn - Функція для отримання поточного productId
 */
export function initVariantsSection(getProductIdFn) {
    _getCurrentProductId = getProductIdFn;

    const addBtn = document.getElementById('btn-add-product-variant');
    if (addBtn) {
        addBtn.onclick = () => {
            const productId = _getCurrentProductId?.();
            if (!productId) {
                showPendingVariantModal(null);
            } else {
                showAddVariantModal();
            }
        };
    }

    // Event delegation for pending variant edit clicks
    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) {
        accordion.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-pending-edit]');
            if (editBtn) {
                showPendingVariantModal(editBtn.dataset.pendingEdit);
            }
        });
    }

    // Новий товар → створити 1 дефолтний pending варіант
    if (!getProductIdFn()) {
        addPendingVariant({ status: 'active' });
        renderPendingList();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('product-variants', {
    edit: (rowId) => showEditVariantModal(rowId),
    delete: (rowId) => handleDeleteVariant(rowId),
});

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE (existing variants)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заповнити таблицю варіантів для існуючого товару
 * @param {string} productId
 */
async function populateProductVariants(productId) {
    const container = document.getElementById('product-variants-container');
    if (!container) return;

    // Hide accordion (pending), show main container
    const accordion = document.getElementById('product-variants-accordion');
    if (accordion) accordion.style.display = 'none';
    container.style.display = '';

    const variants = getVariantsByProductId(productId);
    const product = getProductById(productId);
    const productName = product?.generated_short_ua || '';

    // Transform data for table
    const tableData = variants.map(v => ({
        ...v,
        product_name: productName,
        variant_display: displayName(v.name_ua) || displayName(resolveNameFromCharsAndSpecs(v.variant_chars, v.spec_ua, v.spec_ru).ua),
    }));

    if (_variantsManagedTable) {
        _variantsManagedTable.updateData(tableData);
    } else {
        _variantsManagedTable = createManagedTable({
            container: 'product-variants-container',
            columns: getVariantColumns(col).map(c => ({
                ...c,
                searchable: ['product_name', 'variant_display'].includes(c.id),
                checked: true,
            })),
            data: tableData,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: () => '',
                getRowId: (row) => row.variant_id,
                emptyState: { message: 'Варіанти не знайдено' },
                withContainer: false,
                onAfterRender: (cont) => {
                    if (_actionCleanup) _actionCleanup();
                    _actionCleanup = initActionHandlers(cont, 'product-variants');
                },
                plugins: {
                    sorting: {
                        columnTypes: {
                            product_name: 'string',
                            variant_display: 'string',
                            price: 'number',
                            old_price: 'number',
                            stock: 'number',
                        }
                    },
                    expandable: {
                        renderContent: (row) => buildExpandContent(row),
                        renderFooterLeft: (row) => _renderVariantFooterLeft(row),
                        closeCellHeader: 'Власні дані',
                        renderCloseCellContent: (row) => _renderCloseCellContent(row),
                        onExpand: (rowEl, row) => onVariantExpand(rowEl, row),
                        onSave: (rowEl) => _handleRowSave(rowEl),
                        onOpenFull: (_rowEl, row) => showEditVariantModal(row.variant_id),
                    }
                }
            },
            pageSize: null,
            checkboxPrefix: 'product-variants'
        });

        initColumnsCharm();
    }

    // Render block 8 characteristics for each existing variant
    if (product?.category_id) {
        await renderExistingVariantCharacteristics(product.category_id, variants);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE SAVE (expandable plugin callback)
// ═══════════════════════════════════════════════════════════════════════════

async function _handleRowSave(rowEl) {
    const variantId = rowEl.dataset.rowId;
    if (!variantId) return;

    const formData = readRowFormValues(rowEl);

    // Resolve variant name from chars + per-char specs
    const resolved = resolveNameFromCharsAndSpecs(formData.variant_chars, formData.spec_ua, formData.spec_ru);
    formData.name_ua = resolved.ua;
    formData.name_ru = resolved.ru;

    // Compute generated names
    const productId = _getCurrentProductId?.();
    if (productId) {
        const genNames = computeVariantGeneratedNames(productId, resolved.ua, resolved.ru);
        Object.assign(formData, genNames);
    }

    try {
        await updateProductVariant(variantId, formData);
        showToast('Варіант оновлено', 'success');

        if (productId) populateProductVariants(productId);
    } catch (error) {
        console.error('Помилка збереження варіанту:', error);
        showToast('Помилка збереження варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER LEFT (expandable plugin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Згенерувати теги «Власні дані» варіанту (склад/опис/вага)
 * @param {Object} row - дані варіанту
 * @returns {string} HTML тегів
 */
function _buildOwnDataTags(row) {
    const tags = [];
    if (row.composition_code_ua || row.composition_code_ru) {
        tags.push('<span class="tag c-secondary">склад</span>');
    }
    if (row.product_text_ua || row.product_text_ru) {
        tags.push('<span class="tag c-secondary">опис</span>');
    }
    if (row.weight) {
        tags.push('<span class="tag c-secondary">вага</span>');
    }
    if (row.composition_notes_ua || row.composition_notes_ru) {
        tags.push('<span class="tag c-secondary">порція</span>');
    }
    return tags.join('');
}

/**
 * Рендер лівої частини підвалу — теги власних даних
 */
function _renderVariantFooterLeft(row) {
    return _buildOwnDataTags(row);
}

/**
 * Рендер контенту close-комірки (теги при закритому стані)
 */
function _renderCloseCellContent(row) {
    return _buildOwnDataTags(row);
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модал додавання варіанту (існуючий товар)
 */
async function showAddVariantModal() {
    const productId = _getCurrentProductId?.();
    if (!productId) return;

    _currentVariantId = null;
    _pendingMode = false;
    _pendingEditId = null;

    await showModal('variant-edit', null);

    const title = document.getElementById('variant-modal-title');
    if (title) title.textContent = 'Новий варіант';

    clearVariantForm();
    clearVariantPhotos();
    initVariantEditors();
    initVariantPhotoSection();
    const productIdField = document.getElementById('variant-product-id');
    if (productIdField) productIdField.value = productId;

    await renderVariantCharacteristics(productId, {}, {});
    initVariantSaveHandler();
    initSectionNavigation();
}

/**
 * Показати модал для pending варіанту (новий товар)
 * @param {string|null} pendingId — null = новий, інакше = редагування
 */
async function showPendingVariantModal(pendingId) {
    _pendingMode = true;
    _pendingEditId = pendingId;
    _currentVariantId = null;

    await showModal('variant-edit', null);

    const title = document.getElementById('variant-modal-title');
    const existing = pendingId ? getPendingVariantById(pendingId) : null;

    if (title) title.textContent = existing ? 'Редагувати варіант' : 'Новий варіант';

    clearVariantForm();
    clearVariantPhotos();
    initVariantEditors();
    initVariantPhotoSection();

    // Fill form if editing existing pending variant
    if (existing) {
        fillVariantForm(existing);
    }

    // categoryIdOverride from product form
    const categoryId = document.getElementById('product-category')?.value || '';
    await renderVariantCharacteristics(null, existing?.variant_chars || {}, existing || {}, categoryId);

    initVariantSaveHandler();
    initSectionNavigation();
}

/**
 * Показати модал редагування варіанту
 * @param {string} variantId
 */
export async function showEditVariantModal(variantId) {
    const variant = getVariantById(variantId);
    if (!variant) {
        showToast('Варіант не знайдено', 'error');
        return;
    }

    _currentVariantId = variantId;

    await showModal('variant-edit', null);

    const title = document.getElementById('variant-modal-title');
    if (title) title.textContent = `Редагувати ${displayName(variant.name_ua) || variant.variant_id}`;

    initVariantEditors();
    initVariantPhotoSection();
    fillVariantForm(variant);
    await renderVariantCharacteristics(variant.product_id, variant.variant_chars || {}, variant);
    initVariantSaveHandler();
    initSectionNavigation();
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITORS
// ═══════════════════════════════════════════════════════════════════════════

function initVariantEditors() {
    // Склад (composition code)
    const compCodeUa = document.getElementById('variant-composition-code-ua-editor');
    if (compCodeUa) {
        compCodeUa.innerHTML = '';
        if (_compCodeEditorUa) { _compCodeEditorUa.destroy(); _compCodeEditorUa = null; }
        _compCodeEditorUa = createHighlightEditor(compCodeUa);
    }
    const compCodeRu = document.getElementById('variant-composition-code-ru-editor');
    if (compCodeRu) {
        compCodeRu.innerHTML = '';
        if (_compCodeEditorRu) { _compCodeEditorRu.destroy(); _compCodeEditorRu = null; }
        _compCodeEditorRu = createHighlightEditor(compCodeRu);
    }

    // 1 порція (composition notes)
    const compNotesUa = document.getElementById('variant-composition-notes-ua-editor');
    if (compNotesUa) {
        compNotesUa.innerHTML = '';
        if (_compNotesEditorUa) { _compNotesEditorUa.destroy(); _compNotesEditorUa = null; }
        _compNotesEditorUa = createHighlightEditor(compNotesUa);
    }
    const compNotesRu = document.getElementById('variant-composition-notes-ru-editor');
    if (compNotesRu) {
        compNotesRu.innerHTML = '';
        if (_compNotesEditorRu) { _compNotesEditorRu.destroy(); _compNotesEditorRu = null; }
        _compNotesEditorRu = createHighlightEditor(compNotesRu);
    }

    // Опис (product text)
    const prodTextUa = document.getElementById('variant-product-text-ua-editor');
    if (prodTextUa) {
        prodTextUa.innerHTML = '';
        if (_productTextEditorUa) { _productTextEditorUa.destroy(); _productTextEditorUa = null; }
        _productTextEditorUa = createHighlightEditor(prodTextUa);
    }
    const prodTextRu = document.getElementById('variant-product-text-ru-editor');
    if (prodTextRu) {
        prodTextRu.innerHTML = '';
        if (_productTextEditorRu) { _productTextEditorRu.destroy(); _productTextEditorRu = null; }
        _productTextEditorRu = createHighlightEditor(prodTextRu);
    }
}

function destroyVariantEditors() {
    if (_compCodeEditorUa) { _compCodeEditorUa.destroy(); _compCodeEditorUa = null; }
    if (_compCodeEditorRu) { _compCodeEditorRu.destroy(); _compCodeEditorRu = null; }
    if (_compNotesEditorUa) { _compNotesEditorUa.destroy(); _compNotesEditorUa = null; }
    if (_compNotesEditorRu) { _compNotesEditorRu.destroy(); _compNotesEditorRu = null; }
    if (_productTextEditorUa) { _productTextEditorUa.destroy(); _productTextEditorUa = null; }
    if (_productTextEditorRu) { _productTextEditorRu.destroy(); _productTextEditorRu = null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════════════════════

function clearVariantForm() {
    const fields = [
        'variant-id', 'variant-product-id',
        'variant-article', 'variant-price', 'variant-old-price', 'variant-barcode', 'variant-weight',
        'variant-stock', 'variant-image-url'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const statusRadio = document.querySelector('input[name="variant-status"][value="active"]');
    if (statusRadio) statusRadio.checked = true;

    const charsContainer = document.getElementById('variant-characteristics-container');
    if (charsContainer) charsContainer.innerHTML = '';
}

function fillVariantForm(variant) {
    const idField = document.getElementById('variant-id');
    if (idField) idField.value = variant.variant_id || '';

    const productIdField = document.getElementById('variant-product-id');
    if (productIdField) productIdField.value = variant.product_id || '';

    const articleField = document.getElementById('variant-article');
    if (articleField) articleField.value = variant.article || '';

    const idDisplay = document.getElementById('variant-id-display');
    if (idDisplay) idDisplay.value = variant.variant_id || '';

    const price = document.getElementById('variant-price');
    if (price) price.value = variant.price || '';

    const oldPrice = document.getElementById('variant-old-price');
    if (oldPrice) oldPrice.value = variant.old_price || '';

    const barcode = document.getElementById('variant-barcode');
    if (barcode) barcode.value = variant.barcode || '';

    const weight = document.getElementById('variant-weight');
    if (weight) weight.value = variant.weight || '';

    const stock = document.getElementById('variant-stock');
    if (stock) stock.value = variant.stock || '';

    // Фото: JSON масив або одиночний URL
    const rawImageUrl = variant.image_url || '';
    let photoUrls = [];
    if (rawImageUrl) {
        try {
            const parsed = JSON.parse(rawImageUrl);
            if (Array.isArray(parsed)) photoUrls = parsed;
            else photoUrls = [rawImageUrl];
        } catch {
            photoUrls = [rawImageUrl];
        }
    }
    setVariantPhotoUrls(photoUrls);

    const statusRadio = document.querySelector(`input[name="variant-status"][value="${variant.status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    // Editors
    if (_compCodeEditorUa) _compCodeEditorUa.setValue(variant.composition_code_ua || '');
    if (_compCodeEditorRu) _compCodeEditorRu.setValue(variant.composition_code_ru || '');
    if (_compNotesEditorUa) _compNotesEditorUa.setValue(variant.composition_notes_ua || '');
    if (_compNotesEditorRu) _compNotesEditorRu.setValue(variant.composition_notes_ru || '');
    if (_productTextEditorUa) _productTextEditorUa.setValue(variant.product_text_ua || '');
    if (_productTextEditorRu) _productTextEditorRu.setValue(variant.product_text_ru || '');
}

function getVariantFormData() {
    return {
        product_id: document.getElementById('variant-product-id')?.value.trim() || '',
        article: document.getElementById('variant-article')?.value.trim() || '',
        price: document.getElementById('variant-price')?.value.trim() || '',
        old_price: document.getElementById('variant-old-price')?.value.trim() || '',
        barcode: document.getElementById('variant-barcode')?.value.trim() || '',
        weight: document.getElementById('variant-weight')?.value.trim() || '',
        stock: document.getElementById('variant-stock')?.value.trim() || '',
        image_url: document.getElementById('variant-image-url')?.value.trim() || '',
        status: document.querySelector('input[name="variant-status"]:checked')?.value || 'active',
        variant_chars: getVariantCharsData(),
        composition_code_ua: _compCodeEditorUa ? _compCodeEditorUa.getValue() : '',
        composition_code_ru: _compCodeEditorRu ? _compCodeEditorRu.getValue() : '',
        composition_notes_ua: _compNotesEditorUa ? _compNotesEditorUa.getValue() : '',
        composition_notes_ru: _compNotesEditorRu ? _compNotesEditorRu.getValue() : '',
        product_text_ua: _productTextEditorUa ? _productTextEditorUa.getValue() : '',
        product_text_ru: _productTextEditorRu ? _productTextEditorRu.getValue() : '',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function initSectionNavigation() {
    const nav = document.getElementById('variant-section-navigator');
    const contentArea = document.querySelector('.modal-body > main');
    initSectionNav(nav, contentArea);
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

function initVariantSaveHandler() {
    const saveBtn = document.getElementById('btn-save-variant');
    if (saveBtn) saveBtn.onclick = () => handleSaveVariant(false);

    const saveCloseBtn = document.getElementById('save-close-variant');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveVariant(true);
}

async function handleSaveVariant(shouldClose = true) {
    let formData = getVariantFormData();

    // Пропускаємо через фільтри (плагін ваги перехопить і запише char-000022)
    formData = applyFilter('onBeforeVariantSave', formData);

    // Авто-генерація name_ua/name_ru: resolveVariantName вже враховує per-char spec
    const autoName = resolveVariantName();
    formData.name_ua = autoName.ua;
    formData.name_ru = autoName.ru;

    // ── Pending mode: зберегти в пам'ять, не в API ──
    if (_pendingMode) {
        if (_pendingEditId) {
            updatePendingVariant(_pendingEditId, formData);
            showToast('Варіант оновлено', 'success');
        } else {
            addPendingVariant(formData);
            showToast('Варіант додано', 'success');
        }
        renderPendingList();
        if (shouldClose) closeModal();
        _pendingMode = false;
        _pendingEditId = null;
        return;
    }

    // ── Normal mode: API ──
    const productId = formData.product_id;

    // Обчислити згенеровані назви (додаємо formData.weight як 4-й параметр)
    const genNames = computeVariantGeneratedNames(productId, formData.name_ua, formData.name_ru, formData.weight);
    Object.assign(formData, genNames);

    try {
        if (_currentVariantId) {
            await updateProductVariant(_currentVariantId, formData);
            showToast('Варіант оновлено', 'success');
            runHook('onVariantUpdate', _currentVariantId);
        } else {
            const newVariant = await addProductVariant(formData);
            _currentVariantId = newVariant?.variant_id || null;
            showToast('Варіант додано', 'success');
            runHook('onVariantAdd', newVariant);
        }

        // Оновити таблицю варіантів у модалі товару
        if (productId) populateProductVariants(productId);

        if (shouldClose) closeModal();
    } catch (error) {
        console.error('Помилка збереження варіанту:', error);
        showToast('Помилка збереження варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════

async function handleDeleteVariant(variantId) {
    const variant = getVariantById(variantId);
    if (!variant) return;

    // Guard: не можна видалити останній варіант товару
    const productId = _getCurrentProductId?.() || variant.product_id;
    if (productId) {
        const siblings = getVariantsByProductId(productId);
        if (siblings.length <= 1) {
            showToast('Потрібен хоча б один варіант', 'warning');
            return;
        }
    }

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'варіант',
        name: displayName(variant.name_ua) || variant.variant_id,
    });
    if (!confirmed) return;

    try {
        await deleteProductVariant(variantId);
        showToast(`Варіант ${displayName(variant.name_ua) || variant.variant_id} видалено`, 'success');
        runHook('onVariantDelete', variantId);
        if (productId) populateProductVariants(productId);
    } catch (error) {
        showToast('Помилка видалення варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Очистити стан варіантів (при закритті модалу товару)
 */
export function cleanupVariantState() {
    _currentVariantId = null;
    _pendingMode = false;
    _pendingEditId = null;

    destroyVariantEditors();
    clearVariantPhotos();

    if (_variantsManagedTable) {
        _variantsManagedTable = null;
    }
    if (_actionCleanup) {
        _actionCleanup = null;
    }
}
