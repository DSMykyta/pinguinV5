// js/pages/brands/brands-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - CRUD (МОДАЛ)                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — модал бренду: відкриття, заповнення, збереження.
 * Uses generic createCrudModal factory.
 *
 * Секції модала винесені в окремі файли:
 *   brands-crud-alt-names.js  — альтернативні назви
 *   brands-crud-links.js     — посилання
 *   brands-crud-logo.js      — логотип
 *   brands-crud-lines.js     — таблиця лінійок
 *   brands-delete.js         — видалення бренду
 */

import { registerHook } from './brands-plugins.js';
import { addBrand, updateBrand, getBrands, getBrandById } from './brands-data.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { getOptions, loadOptions } from '../../data/entities-data.js';
import { populateSelect, reinitializeCustomSelect } from '../../components/forms/select.js';
import { initSectionNav, destroySectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { createCrudModal } from '../../components/crud/crud-main.js';
import { brandsPlugins } from './brands-plugins.js';

// Секції модала
import { initAltNamesHandlers, getAltNames, setAltNames } from './brands-crud-alt-names.js';
import { initLinksHandlers, getLinks, setLinks } from './brands-crud-links.js';
import { initLogoHandlers, setLogoPreview, handleRemoveLogo } from './brands-crud-logo.js';
import { normalizeName } from '../../utils/utils-text.js';
import { initBrandLinesSection, populateBrandLines, commitPendingLineChanges, discardPendingLineChanges } from './brands-crud-lines.js';
import { showDeleteBrandConfirm } from './brands-delete.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditor = null;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initTextEditor();
    initAltNamesHandlers();
    initLinksHandlers();
    initBrandLinesSection(() => crud.getCurrentId());
    initLogoHandlers();
    initSectionNavigation();
    initBrandStatusToggle();
    await populateCountrySelect();
}

/**
 * Заповнити select країни опціями з char-000002
 */
async function populateCountrySelect() {
    const COUNTRY_CHAR_ID = 'char-000002';

    try {
        if (getOptions().length === 0) await loadOptions();

        const options = getOptions().filter(o => o.characteristic_id === COUNTRY_CHAR_ID);

        options.sort((a, b) => {
            const orderDiff = (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0);
            if (orderDiff !== 0) return orderDiff;
            return (a.value_ua || '').localeCompare(b.value_ua || '', 'uk');
        });

        populateSelect('brand-country',
            options.map(o => ({ value: o.id, text: o.value_ua || o.id })),
            { placeholder: '— Оберіть країну —' }
        );
    } catch (e) {
        console.warn('⚠️ Не вдалось завантажити опції країн:', e);
    }
}

function initBrandStatusToggle() {
    const dot = document.getElementById('brand-status-badge');
    if (!dot || dot.dataset.toggleInited) return;
    document.querySelectorAll('input[name="brand-status"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isActive = radio.value === 'active';
            dot.classList.remove('c-green', 'c-red');
            dot.classList.add(isActive ? 'c-green' : 'c-red');
            dot.title = isActive ? 'Активний' : 'Неактивний';
        });
    });
    dot.dataset.toggleInited = '1';
}

function initTextEditor() {
    const container = document.getElementById('brand-text-editor-container');
    if (!container) return;

    container.innerHTML = '';

    if (textEditor) {
        textEditor.destroy();
        textEditor = null;
    }

    textEditor = createHighlightEditor(container);
}

function initSectionNavigation() {
    const nav = document.getElementById('brand-section-navigator');
    const contentArea = document.querySelector('.modal-body > main');
    initSectionNav(nav, contentArea);
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getBrandFormData() {
    return {
        name_uk: document.getElementById('brand-name-uk')?.value.trim() || '',
        names_alt: getAltNames(),
        country_option_id: document.getElementById('brand-country')?.value.trim() || '',
        brand_text: textEditor ? textEditor.getValue() : '',
        brand_status: document.querySelector('input[name="brand-status"]:checked')?.value || 'active',
        brand_links: getLinks(),
        mapper_option_id: document.getElementById('brand-mapper-option-id')?.value.trim() || '',
        brand_logo_url: document.getElementById('brand-logo-url')?.value.trim() || ''
    };
}

function fillBrandForm(brand) {
    const idField = document.getElementById('brand-id');
    if (idField) idField.value = brand.brand_id || '';

    const nameField = document.getElementById('brand-name-uk');
    if (nameField) nameField.value = brand.name_uk || '';

    setAltNames(brand.names_alt);

    const countryField = document.getElementById('brand-country');
    if (countryField) {
        countryField.value = brand.country_option_id || '';
        reinitializeCustomSelect(countryField);
    }

    const statusRadio = document.querySelector(`input[name="brand-status"][value="${brand.brand_status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    const statusBadge = document.getElementById('brand-status-badge');
    if (statusBadge) {
        const isActive = brand.brand_status !== 'inactive';
        statusBadge.classList.remove('c-green', 'c-red');
        statusBadge.classList.add(isActive ? 'c-green' : 'c-red');
        statusBadge.title = isActive ? 'Активний' : 'Неактивний';
    }

    setLinks(brand.brand_links);

    if (textEditor) {
        textEditor.setValue(brand.brand_text || '');
    }

    const mapperIdField = document.getElementById('brand-mapper-option-id');
    if (mapperIdField) mapperIdField.value = brand.mapper_option_id || '';

    const logoUrlField = document.getElementById('brand-logo-url');
    if (logoUrlField) logoUrlField.value = brand.brand_logo_url || '';

    if (brand.brand_logo_url) {
        const logoFileName = `${normalizeName(brand.name_uk || 'brand')}.webp`;
        setLogoPreview(brand.brand_logo_url, logoFileName);
    } else {
        handleRemoveLogo();
    }

    // Populate lines for edit mode
    const currentId = crud.getCurrentId();
    if (currentId) populateBrandLines(currentId);
}

function clearBrandForm() {
    const idField = document.getElementById('brand-id');
    if (idField) idField.value = '';

    const nameField = document.getElementById('brand-name-uk');
    if (nameField) nameField.value = '';

    setAltNames([]);

    const countryField = document.getElementById('brand-country');
    if (countryField) countryField.value = '';

    const statusRadio = document.querySelector('input[name="brand-status"][value="active"]');
    if (statusRadio) statusRadio.checked = true;

    const statusBadge = document.getElementById('brand-status-badge');
    if (statusBadge) {
        statusBadge.classList.remove('c-green', 'c-red');
        statusBadge.classList.add('c-green');
        statusBadge.title = 'Активний';
    }

    setLinks([]);

    const mapperIdField = document.getElementById('brand-mapper-option-id');
    if (mapperIdField) mapperIdField.value = '';

    const logoUrlField = document.getElementById('brand-logo-url');
    if (logoUrlField) logoUrlField.value = '';
    handleRemoveLogo();

    const linesContainer = document.getElementById('brand-lines-container');
    if (linesContainer) linesContainer.innerHTML = '';

    const linesEmpty = document.getElementById('brand-lines-empty');
    if (linesEmpty) linesEmpty.classList.remove('u-hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function generateBrandIdForUI() {
    const brands = getBrands();
    let maxNum = 0;

    brands.forEach(brand => {
        if (brand.brand_id && brand.brand_id.startsWith('bran-')) {
            const num = parseInt(brand.brand_id.replace('bran-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const newNum = maxNum + 1;
    const newId = `bran-${String(newNum).padStart(6, '0')}`;

    const idField = document.getElementById('brand-id');
    if (idField) idField.value = newId;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const crud = createCrudModal({
    modalId: 'brand-edit',
    titleId: 'brand-modal-title',
    deleteBtnId: 'btn-delete-brand',
    saveBtnId: 'btn-save-brand',
    saveCloseBtnId: 'save-close-brand',
    entityName: 'Бренд',
    addTitle: 'Новий бренд',
    getTitle: (brand) => `Редагувати ${brand.name_uk}`,
    getById: getBrandById,
    add: addBrand,
    update: updateBrand,
    getFormData: getBrandFormData,
    fillForm: fillBrandForm,
    clearForm: clearBrandForm,
    initComponents: initModalComponents,
    generateId: generateBrandIdForUI,
    onDelete: (brandId) => showDeleteBrandConfirm(brandId),
    onAfterSave: async (currentId) => {
        if (currentId) await commitPendingLineChanges();
    },
    onCleanup: () => {
        destroySectionNav(document.getElementById('brand-section-navigator'));
        if (textEditor) { textEditor.destroy(); textEditor = null; }
        discardPendingLineChanges();
    },
    plugins: brandsPlugins,
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddBrandModal = crud.showAdd;
export const showEditBrandModal = crud.showEdit;
export const refreshBrandModal = crud.refreshModal;
export const getCurrentBrandId = crud.getCurrentId;

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerHook('onLineAdd', () => {
        const id = crud.getCurrentId();
        if (id) populateBrandLines(id);
    });

    registerHook('onLineUpdate', () => {
        const id = crud.getCurrentId();
        if (id) populateBrandLines(id);
    });

    registerHook('onLineDelete', () => {
        const id = crud.getCurrentId();
        if (id) populateBrandLines(id);
    });
}
