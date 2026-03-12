// js/pages/brands/lines-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - CRUD OPERATIONS                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без модалів редагування.
 *
 * Повноекранний модал для додавання та редагування лінійок брендів.
 * Видалення — в lines-delete.js.
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { getBrands } from './brands-data.js';
import { getBrandLineById, addBrandLine, updateBrandLine } from './lines-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showDeleteLineConfirm } from './lines-delete.js';
import { populateSelect, initCustomSelects } from '../../components/forms/select.js';
import { initLineLogoHandlers, setLineLogoPreview, handleRemoveLineLogo } from './lines-crud-logo.js';
import { normalizeName } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentLineId = null;

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання лінійки
 * @param {string} [preselectedBrandId] - Попередньо обраний бренд (опціонально)
 */
export async function showAddLineModal(preselectedBrandId = null) {
    currentLineId = null;

    await showModal('line-edit', null);

    const title = document.getElementById('line-modal-title');
    if (title) title.textContent = 'Нова лінійка';

    const deleteBtn = document.getElementById('btn-delete-line');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearLineForm();
    initModalComponents();
    populateBrandSelect(preselectedBrandId);
}

/**
 * Показати модальне вікно для редагування лінійки
 * @param {string} lineId - ID лінійки
 */
export async function showEditLineModal(lineId) {
    const line = getBrandLineById(lineId);
    if (!line) {
        showToast('Лінійку не знайдено', 'error');
        return;
    }

    currentLineId = lineId;

    await showModal('line-edit', null);

    const title = document.getElementById('line-modal-title');
    if (title) title.textContent = `Редагувати: ${line.name_uk}`;

    const deleteBtn = document.getElementById('btn-delete-line');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => showDeleteLineConfirm(lineId);
    }

    initModalComponents();
    populateBrandSelect(line.brand_id);
    fillLineForm(line);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initModalComponents() {
    initSaveHandler();
    initLineLogoHandlers();

    const modalEl = document.querySelector('[data-modal-id="line-edit-modal"]');
    if (modalEl) initCustomSelects(modalEl);
}

/**
 * Ініціалізувати обробники збереження
 */
function initSaveHandler() {
    const saveBtn = document.getElementById('btn-save-line');
    if (saveBtn) saveBtn.onclick = () => handleSaveLine(false);

    const saveCloseBtn = document.getElementById('save-close-line');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveLine(true);
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заповнити select брендами
 * @param {string} [selectedBrandId] - ID обраного бренду
 */
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

/**
 * Отримати дані з форми
 * @returns {Object} Дані лінійки
 */
function getLineFormData() {
    return {
        brand_id: document.getElementById('line-brand-id')?.value || '',
        name_uk: document.getElementById('line-name-uk')?.value.trim() || '',
        line_logo_url: document.getElementById('line-logo-url')?.value.trim() || ''
    };
}

/**
 * Заповнити форму даними лінійки
 * @param {Object} line - Лінійка
 */
function fillLineForm(line) {
    const idField = document.getElementById('line-id');
    if (idField) idField.value = line.line_id || '';

    const nameField = document.getElementById('line-name-uk');
    if (nameField) nameField.value = line.name_uk || '';

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

/**
 * Очистити форму
 */
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
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обробник збереження лінійки
 * @param {boolean} shouldClose - Закрити після збереження
 */
async function handleSaveLine(shouldClose = true) {
    const lineData = getLineFormData();

    if (!lineData.brand_id) {
        showToast('Оберіть бренд', 'error');
        return;
    }

    if (!lineData.name_uk) {
        showToast('Введіть назву лінійки', 'error');
        return;
    }

    try {
        if (currentLineId) {
            await updateBrandLine(currentLineId, lineData);
            showToast('Лінійку успішно оновлено', 'success');
            runHook('onLineUpdate', currentLineId, lineData);
        } else {
            const newLine = await addBrandLine(lineData);
            showToast('Лінійку успішно додано', 'success');
            runHook('onLineAdd', newLine);
        }

        if (shouldClose) closeModal();
        runHook('onRender');
    } catch (error) {
        console.error('Помилка збереження лінійки:', error);
        showToast('Помилка збереження лінійки', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) { }
