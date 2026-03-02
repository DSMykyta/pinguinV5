// js/pages/products/products-crud-variants.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ВАРІАНТИ                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція варіантів у модалі товару.
 * Вкладена таблиця: SKU, назва, ціна, штрихкод, вага, залишок.
 * Повноцінний модал variant-edit для редагування варіантів.
 */

import { getVariantsByProductId, getVariantById, addProductVariant, updateProductVariant, deleteProductVariant } from './variants-data.js';
import { getProductById } from './products-data.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { getCharacteristics, getOptions, loadCharacteristics, loadOptions, getCategories } from '../mapper/mapper-data-own.js';
import { getBrands } from '../brands/brands-data.js';
import { getBrandLines } from '../brands/lines-data.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { runHook } from './products-plugins.js';
import { buildShortName, buildFullName, buildVariantFullName } from './products-crud.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _variantsManagedTable = null;
let _actionCleanup = null;
let _getCurrentProductId = null;
let _currentVariantId = null;

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
        addBtn.onclick = () => showAddVariantModal();
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
// TABLE
// ═══════════════════════════════════════════════════════════════════════════

function getVariantColumns() {
    return [
        col('variant_id', 'ID', 'tag', { span: 1 }),
        col('sku', 'SKU', 'text', { span: 2 }),
        col('name_ua', 'Назва', 'name', { span: 4 }),
        col('price', 'Ціна', 'text', { span: 1, align: 'right' }),
        col('stock', 'Залишок', 'text', { span: 1, align: 'right' }),
        col('status', 'Статус', 'status-dot', { span: 2 }),
    ];
}

/**
 * Заповнити таблицю варіантів для товару
 * @param {string} productId
 */
export function populateProductVariants(productId) {
    const variants = getVariantsByProductId(productId);

    if (!_variantsManagedTable) {
        const container = document.getElementById('product-variants-container');
        if (!container) return;

        _variantsManagedTable = createManagedTable({
            container: 'product-variants-container',
            columns: getVariantColumns().map(c => ({
                ...c,
                searchable: ['variant_id', 'sku', 'name_ua'].includes(c.id),
                checked: true
            })),
            data: variants,
            statsId: null,
            paginationId: null,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: (row) => `
                    ${actionButton({ action: 'edit', rowId: row.variant_id, context: 'product-variants' })}
                    ${actionButton({ action: 'delete', rowId: row.variant_id, context: 'product-variants', icon: 'close' })}
                `,
                getRowId: (row) => row.variant_id,
                emptyState: { message: 'Варіанти відсутні' },
                withContainer: false,
                onAfterRender: (container) => {
                    if (_actionCleanup) _actionCleanup();
                    _actionCleanup = initActionHandlers(container, 'product-variants');
                },
                plugins: {
                    sorting: {
                        columnTypes: {
                            variant_id: 'id-text',
                            sku: 'string',
                            name_ua: 'string',
                            price: 'number',
                            stock: 'number',
                            status: 'string',
                        }
                    }
                }
            },
            preFilter: null,
            pageSize: null,
            checkboxPrefix: 'product-variants'
        });
    } else {
        _variantsManagedTable.updateData(variants);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модал додавання варіанту
 */
async function showAddVariantModal() {
    const productId = _getCurrentProductId?.();
    if (!productId) {
        showToast('Спочатку збережіть товар', 'warning');
        return;
    }

    _currentVariantId = null;

    await showModal('variant-edit', null);

    const title = document.getElementById('variant-modal-title');
    if (title) title.textContent = 'Новий варіант';

    clearVariantForm();
    const productIdField = document.getElementById('variant-product-id');
    if (productIdField) productIdField.value = productId;

    await renderVariantCharacteristics(productId, {});
    initVariantSaveHandler();
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
    if (title) title.textContent = `Редагувати ${variant.name_ua || variant.variant_id}`;

    fillVariantForm(variant);
    await renderVariantCharacteristics(variant.product_id, variant.variant_chars || {});
    initVariantSaveHandler();
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════════════════════

function clearVariantForm() {
    const fields = [
        'variant-id', 'variant-product-id', 'variant-name-ua', 'variant-name-ru',
        'variant-sku', 'variant-price', 'variant-barcode', 'variant-weight',
        'variant-stock', 'variant-image-url', 'variant-image-url-field'
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

    const nameUa = document.getElementById('variant-name-ua');
    if (nameUa) nameUa.value = variant.name_ua || '';

    const nameRu = document.getElementById('variant-name-ru');
    if (nameRu) nameRu.value = variant.name_ru || '';

    const sku = document.getElementById('variant-sku');
    if (sku) sku.value = variant.sku || '';

    const price = document.getElementById('variant-price');
    if (price) price.value = variant.price || '';

    const barcode = document.getElementById('variant-barcode');
    if (barcode) barcode.value = variant.barcode || '';

    const weight = document.getElementById('variant-weight');
    if (weight) weight.value = variant.weight || '';

    const stock = document.getElementById('variant-stock');
    if (stock) stock.value = variant.stock || '';

    const imageUrl = document.getElementById('variant-image-url');
    if (imageUrl) imageUrl.value = variant.image_url || '';

    const imageUrlField = document.getElementById('variant-image-url-field');
    if (imageUrlField) imageUrlField.value = variant.image_url || '';

    const statusRadio = document.querySelector(`input[name="variant-status"][value="${variant.status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;
}

function getVariantFormData() {
    return {
        product_id: document.getElementById('variant-product-id')?.value.trim() || '',
        name_ua: document.getElementById('variant-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('variant-name-ru')?.value.trim() || '',
        sku: document.getElementById('variant-sku')?.value.trim() || '',
        price: document.getElementById('variant-price')?.value.trim() || '',
        barcode: document.getElementById('variant-barcode')?.value.trim() || '',
        weight: document.getElementById('variant-weight')?.value.trim() || '',
        stock: document.getElementById('variant-stock')?.value.trim() || '',
        image_url: document.getElementById('variant-image-url-field')?.value.trim() ||
                   document.getElementById('variant-image-url')?.value.trim() || '',
        status: document.querySelector('input[name="variant-status"]:checked')?.value || 'active',
        variant_chars: getVariantCharsData(),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 8 CHARACTERISTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити характеристики блоку 8 (Варіант) для варіанту
 * @param {string} productId - ID товару (для отримання category_id)
 * @param {Object} savedValues - Збережені значення { char_id: value }
 */
async function renderVariantCharacteristics(productId, savedValues) {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return;

    const product = getProductById(productId);
    const categoryId = product?.category_id;

    if (!categoryId) {
        container.innerHTML = '';
        return;
    }

    let chars = getCharacteristics();
    if (chars.length === 0) {
        await loadCharacteristics();
        chars = getCharacteristics();
    }

    let options = getOptions();
    if (options.length === 0) {
        await loadOptions();
        options = getOptions();
    }

    // Фільтр: тільки блок 8 + відповідна категорія
    const block8Chars = chars.filter(c => {
        if (c.block_number !== '8') return false;
        if (c.is_global === 'TRUE' || c.is_global === true) return true;
        if (!c.category_ids) return false;
        return c.category_ids.split(',').map(id => id.trim()).includes(categoryId);
    });

    if (block8Chars.length === 0) {
        container.innerHTML = '';
        return;
    }

    block8Chars.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));

    let html = `
        <div class="grid">
            <div class="group column col-12">
                <label class="label-l">Характеристики варіанту</label>
            </div>
    `;

    block8Chars.forEach(c => {
        const charOptions = options.filter(o => o.characteristic_id === c.id);
        charOptions.sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
        const savedVal = savedValues[c.id] || '';
        const colSize = c.col_size || '4';
        html += renderVariantCharField(c, charOptions, savedVal, colSize);
    });

    html += '</div>';
    container.innerHTML = html;

    initCustomSelects(container);
}

/**
 * Рендерити поле характеристики варіанту
 */
function renderVariantCharField(char, options, savedValue, colSize) {
    const id = `variant-char-${char.id}`;
    const label = escapeHtml(char.name_ua || char.id);
    const hint = char.hint ? `<label class="label-s">${escapeHtml(char.hint)}</label>` : '';
    const unit = char.unit ? `<span class="tag c-tertiary">${escapeHtml(char.unit)}</span>` : '';

    let fieldHtml = '';

    switch (char.type) {
        case 'List':
        case 'ComboBox':
        case 'ListValues':
        case 'Select':
            fieldHtml = `
                <select id="${id}" data-custom-select data-vchar-id="${char.id}">
                    <option value="">— Оберіть —</option>
                    ${options.map(o => `<option value="${escapeHtml(o.id)}" ${savedValue === o.id ? 'selected' : ''}>${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                </select>
            `;
            break;

        case 'Integer':
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="number" step="1" id="${id}" data-vchar-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'Decimal':
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="number" step="0.01" id="${id}" data-vchar-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'TextInput':
        case 'MultiText':
        default:
            fieldHtml = `
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="input-box">
                            <input type="text" id="${id}" data-vchar-id="${char.id}"
                                value="${escapeHtml(savedValue)}"
                                placeholder="${escapeHtml(char.name_ua || '')}">
                            ${unit}
                        </div>
                    </div>
                </div>
            `;
            break;
    }

    return `
        <div class="group column col-${colSize}">
            <label for="${id}" class="label-l">${label}</label>
            ${fieldHtml}
            ${hint}
        </div>
    `;
}

/**
 * Зібрати дані характеристик варіанту
 * @returns {Object} { char_id: value }
 */
function getVariantCharsData() {
    const container = document.getElementById('variant-characteristics-container');
    if (!container) return {};

    const data = {};

    // Text / number inputs
    container.querySelectorAll('input[data-vchar-id]').forEach(input => {
        const charId = input.dataset.vcharId;
        const val = input.value.trim();
        if (val) data[charId] = val;
    });

    // Selects
    container.querySelectorAll('select[data-vchar-id]').forEach(select => {
        const charId = select.dataset.vcharId;
        const val = select.value;
        if (val) data[charId] = val;
    });

    return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT GENERATED NAMES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обчислити згенеровані назви для варіанту
 * Використовує дані товару (brand, line, name, label, detail, variation, text_before/after)
 * + назву самого варіанту
 */
function computeVariantGeneratedNames(productId, variantNameUa, variantNameRu) {
    const product = getProductById(productId);
    if (!product) return { generated_short_ua: '', generated_short_ru: '', generated_full_ua: '', generated_full_ru: '' };

    // Бренд і лінійка (назви, не ID)
    const brands = getBrands();
    const lines = getBrandLines();
    const brand = brands.find(b => b.brand_id === product.brand_id);
    const line = lines.find(l => l.line_id === product.line_id);
    const brandName = brand?.name_uk || '';
    const lineName = line?.name_uk || '';

    // Категорія — fallback для text_before
    const categories = getCategories();
    const cat = categories.find(c => c.id === product.category_id);
    const catName = cat?.name_ua || '';
    const prefixUa = product.text_before_ua || catName;
    const prefixRu = product.text_before_ru || catName;

    // Коротка варіанту: [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація] - [Варіант]
    const productShortUa = buildShortName(brandName, lineName, product.name_ua, product.label_ua, product.detail_ua, product.variation_ua);
    const productShortRu = buildShortName(brandName, lineName, product.name_ru, product.label_ru, product.detail_ru, product.variation_ru);

    const shortUa = variantNameUa ? (productShortUa ? `${productShortUa} - ${variantNameUa}` : variantNameUa) : productShortUa;
    const shortRu = variantNameRu ? (productShortRu ? `${productShortRu} - ${variantNameRu}` : variantNameRu) : productShortRu;

    // Повна варіанту: [Текст перед / Категорія] + коротка + [Текст після]
    const fullUa = buildFullName(prefixUa, shortUa, product.text_after_ua);
    const fullRu = buildFullName(prefixRu, shortRu, product.text_after_ru);

    return {
        generated_short_ua: shortUa,
        generated_short_ru: shortRu,
        generated_full_ua: fullUa,
        generated_full_ru: fullRu,
    };
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
    const formData = getVariantFormData();
    const productId = formData.product_id;

    // Обчислити згенеровані назви
    const genNames = computeVariantGeneratedNames(productId, formData.name_ua, formData.name_ru);
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

    const productId = _getCurrentProductId?.();

    try {
        await deleteProductVariant(variantId);
        showToast(`Варіант ${variant.name_ua || variant.variant_id} видалено`, 'info');
        runHook('onVariantDelete', variantId);
        if (productId) populateProductVariants(productId);
    } catch (error) {
        showToast('Помилка видалення варіанту', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING CHANGES (draft manager)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти pending зміни варіантів
 */
export async function commitPendingVariantChanges() {
    // Прямі зміни без буферизації
}

/**
 * Відкинути pending зміни
 */
export function discardPendingVariantChanges() {
    _currentVariantId = null;

    if (_variantsManagedTable) {
        _variantsManagedTable.destroy();
        _variantsManagedTable = null;
    }
    if (_actionCleanup) {
        _actionCleanup();
        _actionCleanup = null;
    }
}
