// js/brands/brands-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - CRUD OPERATIONS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без модалів редагування.
 *
 * Модальні вікна для додавання, редагування та видалення брендів.
 * Використовує fullscreen modal з 4 секціями:
 * - Інформація (назва, альт. назви, країна)
 * - Посилання (динамічний список)
 * - Текст (ui-editor)
 * - Налаштування (статус, логотип, mapper)
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { brandsState } from './brands-state.js';
import { addBrand, updateBrand, deleteBrand, getBrands, getBrandById } from './brands-data.js';
import { getBrandLinesByBrandId } from './lines-data.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { createHighlightEditor } from '../common/editor/editor-main.js';
import { renderPseudoTable } from '../common/ui-table.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditor = null; // UI Editor instance
let currentBrandId = null; // ID бренду, що редагується (null = новий)

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання бренду
 */
export async function showAddBrandModal() {
    console.log('➕ Відкриття модального вікна для додавання бренду');

    currentBrandId = null;

    await showModal('brand-edit', null);

    // Заголовок
    const title = document.getElementById('brand-modal-title');
    if (title) title.textContent = 'Новий бренд';

    // Приховати кнопку видалення
    const deleteBtn = document.getElementById('btn-delete-brand');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    // Очистити форму
    clearBrandForm();

    // Ініціалізувати компоненти
    initModalComponents();

    // Згенерувати ID (для відображення)
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
    console.log(`✏️ Відкриття модального вікна для редагування бренду ${brandId}`);

    const brand = getBrandById(brandId);
    if (!brand) {
        showToast('Бренд не знайдено', 'error');
        return;
    }

    currentBrandId = brandId;

    await showModal('brand-edit', null);

    // Заголовок з назвою бренду
    const title = document.getElementById('brand-modal-title');
    if (title) title.textContent = `Редагувати ${brand.name_uk}`;

    // Показати кнопку видалення
    const deleteBtn = document.getElementById('btn-delete-brand');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteBrandConfirm(brandId);
        };
    }

    // Ініціалізувати компоненти
    initModalComponents();

    // Заповнити форму даними
    fillBrandForm(brand);

    // Заповнити секцію лінійок
    populateBrandLines(brandId);

    runHook('onModalOpen', brand);
}

/**
 * Показати підтвердження видалення бренду
 * @param {string} brandId - ID бренду
 */
export async function showDeleteBrandConfirm(brandId) {
    console.log(`🗑️ Підтвердження видалення бренду ${brandId}`);

    const brand = getBrandById(brandId);
    if (!brand) {
        showToast('Бренд не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити бренд?',
        message: `Ви впевнені, що хочете видалити бренд "${brand.name_uk}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        await handleDeleteBrand(brandId);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати компоненти модалу
 */
function initModalComponents() {
    initTextEditor();
    initAltNamesHandlers();
    initLinksHandlers();
    initBrandLinesHandler();
    initSaveHandler();
    initSectionNavigation();
}

/**
 * Ініціалізувати текстовий редактор
 */
function initTextEditor() {
    const container = document.getElementById('brand-text-editor-container');
    if (!container) return;

    // Очистити попередній редактор
    container.innerHTML = '';

    if (textEditor) {
        textEditor.destroy();
        textEditor = null;
    }

    textEditor = createHighlightEditor(container, {
        validation: false,      // БЕЗ перевірки заборонених слів
        showStats: false,       // БЕЗ статистики
        showFindReplace: false, // БЕЗ Find & Replace
        initialValue: '',
        placeholder: 'Введіть опис бренду...',
        minHeight: 300
    });
}

/**
 * Ініціалізувати обробники альтернативних назв
 * Додає перший порожній інпут
 */
function initAltNamesHandlers() {
    ensureEmptyAltNameInput();
}

/**
 * Ініціалізувати обробники посилань
 */
function initLinksHandlers() {
    const addBtn = document.getElementById('btn-add-link');
    if (addBtn) {
        addBtn.onclick = () => addLinkRow({ name: '', url: '' });
    }
}

/**
 * Ініціалізувати обробник лінійок бренду
 */
function initBrandLinesHandler() {
    const addBtn = document.getElementById('btn-add-brand-line');
    if (addBtn) {
        addBtn.onclick = async () => {
            // Відкрити модал створення лінійки з попередньо обраним брендом
            const { showAddLineModal } = await import('./lines-crud.js');
            showAddLineModal(currentBrandId);
        };
    }
}

/**
 * Заповнити секцію лінійок бренду
 * @param {string} brandId - ID бренду
 */
function populateBrandLines(brandId) {
    const container = document.getElementById('brand-lines-container');
    const emptyState = document.getElementById('brand-lines-empty');
    const countEl = document.getElementById('brand-lines-count');
    if (!container) return;

    const lines = getBrandLinesByBrandId(brandId);

    // Оновлюємо counter
    if (countEl) countEl.textContent = lines?.length || '';

    // Приховуємо empty state, таблиця сама покаже пустий стан
    if (emptyState) emptyState.classList.add('u-hidden');

    // Рендеримо таблицю як на основних табах
    renderPseudoTable(container, {
        data: lines || [],
        columns: [
            {
                id: 'line_id',
                label: 'ID',
                sortable: true,
                className: 'cell-id',
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: 'name_uk',
                label: 'Назва',
                sortable: true,
                className: 'cell-name',
                render: (value, row) => escapeHtml(value || row.line_id || '-')
            }
        ],
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-edit-line" data-line-id="${row.line_id}" data-tooltip="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
        emptyState: { message: 'Лінійки відсутні' },
        withContainer: false
    });

    // Обробники для редагування
    container.querySelectorAll('.btn-edit-line').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const lineId = btn.dataset.lineId;
            if (lineId) {
                const { showEditLineModal } = await import('./lines-crud.js');
                await showEditLineModal(lineId);
            }
        });
    });
}

/**
 * Ініціалізувати обробник збереження
 */
function initSaveHandler() {
    const saveBtn = document.getElementById('btn-save-brand');
    if (saveBtn) {
        saveBtn.onclick = handleSaveBrand;
    }
}

/**
 * Ініціалізувати навігацію по секціях
 */
function initSectionNavigation() {
    const nav = document.getElementById('brand-section-navigator');
    const contentArea = document.querySelector('.modal-fullscreen-content');
    if (!nav || !contentArea) return;

    const navLinks = nav.querySelectorAll('.sidebar-nav-item');
    const sections = contentArea.querySelectorAll('section[id]');

    // Клік по навігації
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Оновити активний пункт
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Скролити до секції
            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll spy - оновлення активного пункту при прокрутці
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
// АЛЬТЕРНАТИВНІ НАЗВИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати інпут для альтернативної назви
 * @param {string} value - Значення
 * @param {boolean} isEmpty - Чи це порожній інпут (без кнопки видалення)
 */
function addAltNameInput(value = '', isEmpty = false) {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'dynamic-input-row';

    if (isEmpty) {
        // Порожній інпут без кнопки видалення
        row.innerHTML = `
            <input type="text" class="input-main alt-name-input" value="" placeholder="Альтернативна назва">
        `;
        row.dataset.empty = 'true';
    } else {
        // Заповнений інпут з кнопкою видалення
        row.innerHTML = `
            <input type="text" class="input-main alt-name-input" value="${escapeHtml(value)}" placeholder="Альтернативна назва">
            <button type="button" class="btn-icon btn-remove-alt-name" data-tooltip="Видалити">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        row.querySelector('.btn-remove-alt-name').onclick = () => row.remove();
    }

    const input = row.querySelector('.alt-name-input');

    // При blur - перевірити чи заповнений
    input.addEventListener('blur', () => {
        const val = input.value.trim();
        if (val && row.dataset.empty === 'true') {
            // Був порожній, став заповнений — додати кнопку видалення
            delete row.dataset.empty;
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-icon btn-remove-alt-name';
            deleteBtn.title = 'Видалити';
            deleteBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
            deleteBtn.onclick = () => row.remove();
            row.appendChild(deleteBtn);

            // Додати новий порожній інпут
            ensureEmptyAltNameInput();
        }
    });

    container.appendChild(row);
}

/**
 * Переконатися що є порожній інпут в кінці
 */
function ensureEmptyAltNameInput() {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return;

    // Перевірити чи є порожній
    const emptyRow = container.querySelector('.dynamic-input-row[data-empty="true"]');
    if (!emptyRow) {
        addAltNameInput('', true);
    }
}

/**
 * Отримати всі альтернативні назви
 * @returns {string[]} Масив назв
 */
function getAltNames() {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return [];

    const inputs = container.querySelectorAll('.alt-name-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(v => v);
}

/**
 * Встановити альтернативні назви
 * @param {string[]} names - Масив назв
 */
function setAltNames(names) {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return;

    container.innerHTML = '';

    if (Array.isArray(names) && names.length > 0) {
        names.forEach(name => addAltNameInput(name, false));
    }

    // Додати порожній інпут в кінці
    ensureEmptyAltNameInput();
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОСИЛАННЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати рядок посилання
 * @param {Object} link - { name, url }
 */
function addLinkRow(link = { name: '', url: '' }) {
    const container = document.getElementById('brand-links-container');
    const emptyState = document.getElementById('brand-links-empty');
    if (!container) return;

    // Сховати empty state
    if (emptyState) emptyState.classList.add('u-hidden');

    const row = document.createElement('div');
    row.className = 'brand-link-row';
    row.innerHTML = `
        <div class="brand-link-inputs">
            <input type="text" class="link-name" value="${escapeHtml(link.name)}" placeholder="ua, de...">
            <input type="url" class="link-url" value="${escapeHtml(link.url)}" placeholder="https://...">
        </div>
        <button type="button" class="btn-icon btn-open-link" data-tooltip="Відкрити">
            <span class="material-symbols-outlined">open_in_new</span>
        </button>
        <button type="button" class="btn-icon btn-remove-link" data-tooltip="Видалити">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    // Обробники
    row.querySelector('.btn-open-link').onclick = () => {
        const url = row.querySelector('.link-url').value.trim();
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            showToast('Введіть URL', 'warning');
        }
    };

    row.querySelector('.btn-remove-link').onclick = async () => {
        const linkName = row.querySelector('.link-name').value.trim() || 'це посилання';
        const confirmed = await showConfirmModal({
            title: 'Видалити посилання?',
            message: `Ви впевнені, що хочете видалити "${linkName}"?`,
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            row.remove();
            updateLinksEmptyState();
        }
    };

    container.appendChild(row);
}

/**
 * Отримати всі посилання
 * @returns {Array<{name: string, url: string}>} Масив посилань
 */
function getLinks() {
    const container = document.getElementById('brand-links-container');
    if (!container) return [];

    const rows = container.querySelectorAll('.brand-link-row');
    return Array.from(rows)
        .map(row => ({
            name: row.querySelector('.link-name')?.value.trim() || '',
            url: row.querySelector('.link-url')?.value.trim() || ''
        }))
        .filter(link => link.url); // Тільки з URL
}

/**
 * Встановити посилання
 * @param {Array<{name: string, url: string}>} links - Масив посилань
 */
function setLinks(links) {
    const container = document.getElementById('brand-links-container');
    if (!container) return;

    container.innerHTML = '';

    if (Array.isArray(links)) {
        links.forEach(link => addLinkRow(link));
    }

    updateLinksEmptyState();
}

/**
 * Оновити стан empty state для посилань
 */
function updateLinksEmptyState() {
    const container = document.getElementById('brand-links-container');
    const emptyState = document.getElementById('brand-links-empty');
    if (!container || !emptyState) return;

    const hasLinks = container.querySelectorAll('.brand-link-row').length > 0;
    emptyState.classList.toggle('u-hidden', hasLinks);
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати дані з форми
 * @returns {Object} Дані бренду
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
 * @param {Object} brand - Бренд
 */
function fillBrandForm(brand) {
    // ID
    const idField = document.getElementById('brand-id');
    if (idField) idField.value = brand.brand_id || '';

    // Назва
    const nameField = document.getElementById('brand-name-uk');
    if (nameField) nameField.value = brand.name_uk || '';

    // Альтернативні назви
    setAltNames(brand.names_alt);

    // Країна
    const countryField = document.getElementById('brand-country');
    if (countryField) countryField.value = brand.country_option_id || '';

    // Статус
    const statusRadio = document.querySelector(`input[name="brand-status"][value="${brand.brand_status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    // Статус badge
    const statusBadge = document.getElementById('brand-status-badge');
    if (statusBadge) {
        statusBadge.textContent = brand.brand_status === 'inactive' ? 'Неактивний' : 'Активний';
        statusBadge.className = `badge ${brand.brand_status === 'inactive' ? 'badge-warning' : 'badge-success'}`;
    }

    // Посилання
    setLinks(brand.brand_links);

    // Текст
    if (textEditor) {
        textEditor.setValue(brand.brand_text || '');
    }

    // Mapper option ID (зарезервовано)
    const mapperIdField = document.getElementById('brand-mapper-option-id');
    if (mapperIdField) mapperIdField.value = brand.mapper_option_id || '';

    // Відображення mapper ID
    const mapperIdDisplay = document.getElementById('brand-mapper-id-display');
    if (mapperIdDisplay) mapperIdDisplay.textContent = brand.mapper_option_id || '—';

    // Logo URL (зарезервовано)
    const logoUrlField = document.getElementById('brand-logo-url');
    if (logoUrlField) logoUrlField.value = brand.brand_logo_url || '';
}

/**
 * Очистити форму
 */
function clearBrandForm() {
    // ID
    const idField = document.getElementById('brand-id');
    if (idField) idField.value = '';

    // Назва
    const nameField = document.getElementById('brand-name-uk');
    if (nameField) nameField.value = '';

    // Альтернативні назви
    setAltNames([]);

    // Країна
    const countryField = document.getElementById('brand-country');
    if (countryField) countryField.value = '';

    // Статус
    const statusRadio = document.querySelector('input[name="brand-status"][value="active"]');
    if (statusRadio) statusRadio.checked = true;

    // Статус badge
    const statusBadge = document.getElementById('brand-status-badge');
    if (statusBadge) {
        statusBadge.textContent = 'Активний';
        statusBadge.className = 'badge badge-success';
    }

    // Посилання
    setLinks([]);

    // Mapper option ID (зарезервовано)
    const mapperIdField = document.getElementById('brand-mapper-option-id');
    if (mapperIdField) mapperIdField.value = '';

    // Відображення mapper ID
    const mapperIdDisplay = document.getElementById('brand-mapper-id-display');
    if (mapperIdDisplay) mapperIdDisplay.textContent = '—';

    // Logo URL (зарезервовано)
    const logoUrlField = document.getElementById('brand-logo-url');
    if (logoUrlField) logoUrlField.value = '';

    // Лінійки - очистити для нового бренду
    const linesContainer = document.getElementById('brand-lines-container');
    if (linesContainer) linesContainer.innerHTML = '';

    const linesEmpty = document.getElementById('brand-lines-empty');
    if (linesEmpty) linesEmpty.classList.remove('u-hidden');

    // Текст - буде очищено при ініціалізації редактора
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обробник збереження бренду
 */
async function handleSaveBrand() {
    console.log('💾 Збереження бренду...');

    const brandData = getBrandFormData();

    // Валідація
    if (!brandData.name_uk) {
        showToast('Введіть назву бренду', 'error');
        return;
    }

    try {
        if (currentBrandId) {
            // Оновлення
            await updateBrand(currentBrandId, brandData);
            showToast('Бренд успішно оновлено', 'success');
            runHook('onBrandUpdate', currentBrandId, brandData);
        } else {
            // Створення
            const newBrand = await addBrand(brandData);
            showToast('Бренд успішно додано', 'success');
            runHook('onBrandAdd', newBrand);
        }

        closeModal();
        runHook('onModalClose');
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка збереження бренду:', error);
        showToast('Помилка збереження бренду', 'error');
    }
}

/**
 * Обробник видалення бренду
 * @param {string} brandId - ID бренду
 */
async function handleDeleteBrand(brandId) {
    console.log(`🗑️ Видалення бренду ${brandId}...`);

    try {
        await deleteBrand(brandId);
        showToast('Бренд успішно видалено', 'success');
        runHook('onBrandDelete', brandId);
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        showToast('Помилка видалення бренду', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Генерувати новий ID для бренду (для відображення в UI)
 * @returns {string} Новий ID у форматі bran-XXXXXX
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

/**
 * Екранувати HTML
 * @param {string} str - Рядок
 * @returns {string} Екранований рядок
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Цей файл — плагін, тому не потрібно реєструвати хуки
// Експортуємо функції для виклику з інших модулів

console.log('[Brands CRUD] Плагін завантажено');
