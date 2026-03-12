// js/pages/brands/lines-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - CRUD OPERATIONS                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без модалів редагування.
 * Uses generic createCrudModal factory.
 */

import { runHook } from './brands-plugins.js';
import { getBrands } from './brands-data.js';
import { getBrandLineById, addBrandLine, updateBrandLine } from './lines-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { showDeleteLineConfirm } from './lines-delete.js';
import { populateSelect, initCustomSelects } from '../../components/forms/select.js';
import { initLineLogoHandlers, setLineLogoPreview, handleRemoveLineLogo } from './lines-crud-logo.js';
import { normalizeName } from '../../utils/utils-text.js';
import { createCrudModal } from '../../components/crud/crud-main.js';
import { brandsPlugins } from './brands-plugins.js';

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function initModalComponents(preselectedBrandId = null) {
    initLineLogoHandlers();

    const modalEl = document.querySelector('[data-modal-id="line-edit-modal"]');
    if (modalEl) initCustomSelects(modalEl);

    populateBrandSelect(preselectedBrandId);
}

function populateBrandSelect(selectedBrandId = null) {
    const brands = getBrands()
        .filter(b => b.brand_status !== 'inactive')
        .sort((a, b) => (a.name_uk || '').localeCompare(b.name_uk || ''));

    populateSelect('line-brand-id',
        brands.map(b => ({ value: b.brand_id, text: b.name_uk })),
        {
            placeholder: '— Оберіть бренд —',
            selectedValue: selectedBrandId
        }
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getLineFormData() {
    return {
        brand_id: document.getElementById('line-brand-id')?.value || '',
        name_uk: document.getElementById('line-name-uk')?.value.trim() || '',
        line_logo_url: document.getElementById('line-logo-url')?.value.trim() || ''
    };
}

function fillLineForm(line) {
    const idField = document.getElementById('line-id');
    if (idField) idField.value = line.line_id || '';

    const nameField = document.getElementById('line-name-uk');
    if (nameField) nameField.value = line.name_uk || '';

    // Populate brand select with line's brand
    populateBrandSelect(line.brand_id);

    if (line.line_logo_url) {
        const brand = getBrands().find(b => b.brand_id === line.brand_id);
        const brandPart = normalizeName(brand?.name_uk || 'brand');
        const linePart = normalizeName(line.name_uk || 'line');
        const logoFileName = `${brandPart}-${linePart}.webp`;
        setLineLogoPreview(line.line_logo_url, logoFileName);
    } else {
        handleRemoveLineLogo();
    }
}

function clearLineForm() {
    const idField = document.getElementById('line-id');
    if (idField) idField.value = '';

    const brandField = document.getElementById('line-brand-id');
    if (brandField) brandField.value = '';

    const nameField = document.getElementById('line-name-uk');
    if (nameField) nameField.value = '';

    handleRemoveLineLogo();
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const crud = createCrudModal({
    modalId: 'line-edit',
    titleId: 'line-modal-title',
    deleteBtnId: 'btn-delete-line',
    saveBtnId: 'btn-save-line',
    saveCloseBtnId: 'save-close-line',
    entityName: 'Лінійка',
    addTitle: 'Нова лінійка',
    getTitle: (line) => `Редагувати: ${line.name_uk}`,
    getById: getBrandLineById,
    add: addBrandLine,
    update: updateBrandLine,
    getFormData: getLineFormData,
    fillForm: fillLineForm,
    clearForm: clearLineForm,
    initComponents: initModalComponents,
    onBeforeSave: async (currentId, data) => {
        if (!data.brand_id) {
            showToast('Оберіть бренд', 'error');
            throw new Error('Validation failed');
        }
        if (!data.name_uk) {
            showToast('Введіть назву лінійки', 'error');
            throw new Error('Validation failed');
        }
    },
    onAfterSave: (currentId) => {
        runHook(currentId ? 'onLineUpdate' : 'onLineAdd');
    },
    onDelete: (lineId) => showDeleteLineConfirm(lineId),
    plugins: brandsPlugins,
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddLineModal = crud.showAdd;
export const showEditLineModal = crud.showEdit;

export function init(state) { }
