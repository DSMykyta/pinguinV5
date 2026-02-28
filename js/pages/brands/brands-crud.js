// js/pages/brands/brands-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - CRUD (МОДАЛ)                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — модал бренду: відкриття, заповнення, збереження.
 *
 * Секції модала винесені в окремі файли:
 *   brands-crud-alt-names.js  — альтернативні назви
 *   brands-crud-links.js     — посилання
 *   brands-crud-logo.js      — логотип
 *   brands-crud-lines.js     — таблиця лінійок
 *   brands-delete.js         — видалення бренду
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { brandsState } from './brands-state.js';
import { addBrand, updateBrand, getBrands, getBrandById } from './brands-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { getOptions, loadOptions } from '../mapper/mapper-data-own.js';
import { populateSelect, reinitializeCustomSelect } from '../../components/forms/select.js';

// Секції модала
import { initAltNamesHandlers, getAltNames, setAltNames } from './brands-crud-alt-names.js';
import { initLinksHandlers, getLinks, setLinks } from './brands-crud-links.js';
import { initLogoHandlers, setLogoPreview, handleRemoveLogo } from './brands-crud-logo.js';
import { initBrandLinesSection, populateBrandLines } from './brands-crud-lines.js';
import { showDeleteBrandConfirm } from './brands-delete.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditor = null;
let currentBrandId = null;

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання бренду
 */
export async function showAddBrandModal() {
    currentBrandId = null;

    await showModal('brand-edit', null);

    const title = document.getElementById('brand-modal-title');
    if (title) title.textContent = 'Новий бренд';

    const deleteBtn = document.getElementById('btn-delete-brand');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearBrandForm();
    await initModalComponents();

    const newId = generateBrandIdForUI();
    const idField = document.getElementById('brand-id');
    if (idField) idField.value = newId;

    runHook('onModalOpen', null);
}

/**
 * Показати модальне вікно для редагування бренду
 * @param {string} brandId - ID бренду
 */
export async function showEditBrandModal(brandId) {
    const brand = getBrandById(brandId);
    if (!brand) {
        showToast('Бренд не знайдено', 'error');
        return;
    }

    currentBrandId = brandId;

    await showModal('brand-edit', null);

    const title = document.getElementById('brand-modal-title');
    if (title) title.textContent = `Редагувати ${brand.name_uk}`;

    const deleteBtn = document.getElementById('btn-delete-brand');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => showDeleteBrandConfirm(brandId);
    }

    await initModalComponents();
    fillBrandForm(brand);
    populateBrandLines(brandId);

    runHook('onModalOpen', brand);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initTextEditor();
    initAltNamesHandlers();
    initLinksHandlers();
    initBrandLinesSection(() => currentBrandId);
    initLogoHandlers();
    initSaveHandler();
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

/**
 * Ініціалізувати текстовий редактор
 */
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

/**
 * Ініціалізувати обробник збереження
 */
function initSaveHandler() {
    const saveBtn = document.getElementById('btn-save-brand');
    if (saveBtn) saveBtn.onclick = () => handleSaveBrand(false);

    const saveCloseBtn = document.getElementById('save-close-brand');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveBrand(true);
}

/**
 * Ініціалізувати навігацію по секціях
 */
function initSectionNavigation() {
    const nav = document.getElementById('brand-section-navigator');
    const contentArea = document.querySelector('.modal-fullscreen-content');
    if (!nav || !contentArea) return;

    const navLinks = nav.querySelectorAll('.btn-icon.expand.touch');
    const sections = contentArea.querySelectorAll('section[id]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const observerOptions = {
        root: contentArea,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати дані з форми
 */
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

/**
 * Заповнити форму даними бренду
 */
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
        setLogoPreview(brand.brand_logo_url);
    } else {
        handleRemoveLogo();
    }
}

/**
 * Очистити форму
 */
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
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обробник збереження бренду
 */
async function handleSaveBrand(shouldClose = true) {
    const brandData = getBrandFormData();

    try {
        if (currentBrandId) {
            await updateBrand(currentBrandId, brandData);
            showToast('Бренд успішно оновлено', 'success');
            runHook('onBrandUpdate', currentBrandId, brandData);
        } else {
            const newBrand = await addBrand(brandData);
            showToast('Бренд успішно додано', 'success');
            runHook('onBrandAdd', newBrand);
        }

        if (shouldClose) closeModal();
        runHook('onModalClose');
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка збереження бренду:', error);
        showToast('Помилка збереження бренду', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Генерувати новий ID для бренду (для відображення в UI)
 */
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
    return `bran-${String(newNum).padStart(6, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerBrandsPlugin('onLineAdd', () => {
        if (currentBrandId) {
            populateBrandLines(currentBrandId);
        }
    });

    registerBrandsPlugin('onLineUpdate', () => {
        if (currentBrandId) {
            populateBrandLines(currentBrandId);
        }
    });

    registerBrandsPlugin('onLineDelete', () => {
        if (currentBrandId) {
            populateBrandLines(currentBrandId);
        }
    });
}
