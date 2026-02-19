// js/brands/brands-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - CRUD OPERATIONS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без модалів редагування.
 *
 * Модальні вікна для додавання, редагування та видалення брендів.
 * Використовує fullscreen modal з 5 секціями:
 * - Інформація (назва, альт. назви, країна, логотип)
 * - Лінійки (таблиця лінійок бренду)
 * - Посилання (динамічний список)
 * - Маркетплейси (присутність на МП)
 * - Опис (ui-editor)
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { brandsState } from './brands-state.js';
import { addBrand, updateBrand, deleteBrand, getBrands, getBrandById } from './brands-data.js';
import { getBrandLinesByBrandId, updateBrandLine } from './lines-data.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { createHighlightEditor } from '../common/editor/editor-main.js';
import { getEditorOptions } from '../common/editor/editor-configs.js';
import { createManagedTable } from '../common/table/table-main.js';
import { escapeHtml } from '../utils/text-utils.js';
import { initPaginationCharm } from '../common/charms/pagination/pagination-main.js';
import { initRefreshCharm } from '../common/charms/charm-refresh.js';
import { initColumnsCharm } from '../common/charms/charm-columns.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { uploadBrandLogoFile, uploadBrandLogoUrl } from '../utils/api-client.js';

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
        confirmClass: 'btn-delete'
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
    initLogoHandlers();
    initSaveHandler();
    initSectionNavigation();
    initBrandStatusToggle();
}

function initBrandStatusToggle() {
    const dot = document.getElementById('brand-status-badge');
    if (!dot || dot.dataset.toggleInited) return;
    document.querySelectorAll('input[name="brand-status"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isActive = radio.value === 'active';
            dot.classList.remove('is-success', 'is-error');
            dot.classList.add(isActive ? 'is-success' : 'is-error');
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

    // Очистити попередній редактор
    container.innerHTML = '';

    if (textEditor) {
        textEditor.destroy();
        textEditor = null;
    }

    textEditor = createHighlightEditor(container, getEditorOptions('brand-description'));
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

    // Charms — один раз при відкритті модала
    const container = document.getElementById('brand-lines-container');
    if (container) {
        initPaginationCharm();
        initRefreshCharm();
        initColumnsCharm();

        container.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                const { loadBrandLines } = await import('./lines-data.js');
                await loadBrandLines();
                populateBrandLines(currentBrandId);
            })());
        });
    }
}

/**
 * Заповнити секцію лінійок бренду
 * @param {string} brandId - ID бренду
 */
function populateBrandLines(brandId) {
    const container = document.getElementById('brand-lines-container');
    if (!container) return;

    const allData = getBrandLinesByBrandId(brandId) || [];

    const managed = createManagedTable({
        container: 'brand-lines-container',
        columns: [
            {
                id: 'line_id', label: 'ID', sortable: true, searchable: true, checked: true,
                className: 'cell-m',
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: 'name_uk', label: 'Назва', sortable: true, searchable: true, checked: true,
                className: 'cell-l',
                render: (value, row) => escapeHtml(value || row.line_id || '-')
            },
            {
                id: '_unlink', label: ' ', sortable: false, searchable: false, checked: true,
                className: 'cell-xs',
                render: (value, row) => `
                    <button class="btn-icon" data-row-id="${escapeHtml(row.line_id)}" data-action="unlink" data-tooltip="Відв'язати від бренду">
                        <span class="material-symbols-outlined">link_off</span>
                    </button>
                `
            }
        ],
        data: allData,

        searchInputId: 'brand-lines-search',
        checkboxPrefix: 'brand-lines',
        pageSize: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => `
                <button class="btn-icon" data-row-id="${row.line_id}" data-action="edit" data-tooltip="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `,
            emptyState: { message: 'Лінійки відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                cont.querySelectorAll('[data-action="edit"]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const lineId = btn.dataset.rowId;
                        if (lineId) {
                            const { showEditLineModal } = await import('./lines-crud.js');
                            await showEditLineModal(lineId);
                        }
                    });
                });

                cont.querySelectorAll('[data-action="unlink"]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const lineId = btn.dataset.rowId;
                        if (!lineId) return;

                        const line = managed.getFilteredData().find(l => l.line_id === lineId);
                        const lineName = line?.name_uk || lineId;

                        const confirmed = await showConfirmModal({
                            title: 'Відв\'язати лінійку?',
                            message: `Ви впевнені, що хочете відв'язати лінійку "${lineName}" від цього бренду?`,
                            confirmText: 'Відв\'язати',
                            cancelText: 'Скасувати',
                            confirmClass: 'btn-warning'
                        });

                        if (confirmed) {
                            try {
                                await updateBrandLine(lineId, { brand_id: '' });
                                showToast('Лінійку відв\'язано від бренду', 'success');
                                populateBrandLines(brandId);
                            } catch (error) {
                                console.error('❌ Помилка відв\'язування лінійки:', error);
                                showToast('Помилка відв\'язування лінійки', 'error');
                            }
                        }
                    });
                });
            },
            plugins: {
                sorting: {
                    columnTypes: { line_id: 'id-text', name_uk: 'string' }
                }
            }
        }
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
    row.className = 'content-bloc';

    if (isEmpty) {
        row.innerHTML = `
            <div class="content-line">
                <div class="input-box">
                    <input type="text" value="" placeholder="Альтернативна назва">
                </div>
            </div>
        `;
        row.dataset.empty = 'true';
    } else {
        row.innerHTML = `
            <div class="content-line">
                <div class="input-box">
                    <input type="text" value="${escapeHtml(value)}" placeholder="Альтернативна назва">
                </div>
                <button type="button" class="btn-icon ci-remove" data-tooltip="Видалити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
        row.querySelector('.ci-remove').onclick = () => row.remove();
    }

    const input = row.querySelector('input');

    input.addEventListener('blur', () => {
        const val = input.value.trim();
        if (val && row.dataset.empty === 'true') {
            delete row.dataset.empty;
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-icon ci-remove';
            deleteBtn.title = 'Видалити';
            deleteBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
            deleteBtn.onclick = () => row.remove();
            row.querySelector('.content-line').appendChild(deleteBtn);

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
    const emptyRow = container.querySelector('.content-bloc[data-empty="true"]');
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

    const inputs = container.querySelectorAll('.content-bloc input');
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
    row.className = 'content-bloc';
    row.innerHTML = `
        <div class="content-line">
            <div class="input-box">
                <input type="text" value="${escapeHtml(link.name)}" placeholder="ua, de...">
            </div>
            <div class="separator-v"></div>
            <div class="input-box large">
                <input type="url" value="${escapeHtml(link.url)}" placeholder="https://...">
            </div>
        </div>
        <button type="button" class="btn-icon ci-action" data-tooltip="Відкрити">
            <span class="material-symbols-outlined">open_in_new</span>
        </button>
        <button type="button" class="btn-icon ci-remove" data-tooltip="Видалити">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    // Обробники
    row.querySelector('.ci-action').onclick = () => {
        const url = row.querySelector('input[type="url"]').value.trim();
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            showToast('Введіть URL', 'warning');
        }
    };

    row.querySelector('.ci-remove').onclick = async () => {
        const linkName = row.querySelector('input[type="text"]').value.trim() || 'це посилання';
        const confirmed = await showConfirmModal({
            title: 'Видалити посилання?',
            message: `Ви впевнені, що хочете видалити "${linkName}"?`,
            confirmText: 'Видалити',
            cancelText: 'Скасувати',
            confirmClass: 'btn-delete'
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

    const rows = container.querySelectorAll('.content-bloc');
    return Array.from(rows)
        .map(row => ({
            name: row.querySelector('input[type="text"]')?.value.trim() || '',
            url: row.querySelector('input[type="url"]')?.value.trim() || ''
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

    const hasLinks = container.querySelectorAll('.content-bloc').length > 0;
    if (!hasLinks && !emptyState.innerHTML.trim()) {
        emptyState.innerHTML = renderAvatarState('empty', { message: 'Посилання відсутні', size: 'medium', containerClass: 'empty-state', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true });
    }
    emptyState.classList.toggle('u-hidden', hasLinks);
}

/**
 * Ініціалізувати обробники завантаження логотипу:
 * - Drop zone drag-and-drop
 * - Drop zone click → file input
 * - URL input + кнопка завантаження
 * - Кнопка видалення логотипу
 */
function initLogoHandlers() {
    const dropzone = document.getElementById('brand-logo-dropzone');
    const fileInput = document.getElementById('brand-logo-file-input');
    const urlField = document.getElementById('brand-logo-url-field');
    const urlBtn = document.getElementById('btn-upload-from-url');
    const removeBtn = document.getElementById('btn-remove-brand-logo');
    const btnIcon = urlBtn?.querySelector('.material-symbols-outlined');

    if (!dropzone || !urlField) return;

    // Зміна іконки кнопки залежно від вмісту поля
    function updateButtonIcon() {
        if (!btnIcon) return;
        const hasUrl = urlField.value.trim().length > 0;
        btnIcon.textContent = hasUrl ? 'download' : 'upload';
        urlBtn.dataset.tooltip = hasUrl ? 'Завантажити з URL' : 'Вибрати файл';
    }

    urlField.addEventListener('input', updateButtonIcon);

    // Розумна кнопка: є URL → завантажити, пусто → file picker
    urlBtn?.addEventListener('click', () => {
        const url = urlField.value.trim();
        if (url) {
            uploadLogoWithConfirm(() => handleLogoUrlUpload(url));
        } else {
            uploadLogoWithConfirm(() => fileInput?.click());
        }
    });

    // Вибір файлу (з підтвердженням заміни)
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Підтвердження вже було перед click(), тому завантажуємо одразу
            handleLogoFileUpload(file);
        }
        fileInput.value = '';
    });

    // Drag-and-drop на content-line
    const inputsLine = dropzone.querySelector('.content-line');
    if (inputsLine) {
        inputsLine.addEventListener('dragover', (e) => {
            e.preventDefault();
            inputsLine.classList.add('drag-over');
        });

        inputsLine.addEventListener('dragleave', () => {
            inputsLine.classList.remove('drag-over');
        });

        inputsLine.addEventListener('drop', (e) => {
            e.preventDefault();
            inputsLine.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) uploadLogoWithConfirm(() => handleLogoFileUpload(file));
        });
    }

    // Enter в URL полі
    urlField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            urlBtn?.click();
        }
    });

    // Видалення логотипу
    removeBtn?.addEventListener('click', handleRemoveLogo);
}

/**
 * Отримати назву бренду з форми (для іменування файлу)
 */
function getCurrentBrandName() {
    return document.getElementById('brand-name-uk')?.value.trim() || 'brand';
}

/**
 * Завантажити логотип з файлу (file input або drag-and-drop)
 * @param {File} file
 */
async function handleLogoFileUpload(file) {
    const dropzone = document.getElementById('brand-logo-dropzone');
    if (!dropzone) return;

    // Валідація типу (будь-яке зображення — конвертується в WebP на сервері)
    if (!file.type.startsWith('image/')) {
        showToast('Файл не є зображенням', 'error');
        return;
    }

    // Валідація розміру (4 MB)
    if (file.size > 4 * 1024 * 1024) {
        showToast('Файл занадто великий. Максимум 4 MB', 'error');
        return;
    }

    dropzone.classList.add('is-loading');

    try {
        const brandName = getCurrentBrandName();
        const result = await uploadBrandLogoFile(file, brandName);

        dropzone.classList.remove('is-loading');
        dropzone.classList.add('is-success');
        setTimeout(() => dropzone.classList.remove('is-success'), 2000);

        setLogoPreview(result.thumbnailUrl);
        showToast('Логотип завантажено', 'success');
    } catch (error) {
        console.error('❌ Помилка завантаження логотипу:', error);
        dropzone.classList.remove('is-loading');
        dropzone.classList.add('is-error');
        setTimeout(() => dropzone.classList.remove('is-error'), 2000);
        showToast('Помилка завантаження логотипу', 'error');
    }
}

/**
 * Завантажити логотип з URL
 * @param {string} url
 */
async function handleLogoUrlUpload(url) {
    const dropzone = document.getElementById('brand-logo-dropzone');
    if (!dropzone) return;

    dropzone.classList.add('is-loading');

    try {
        const brandName = getCurrentBrandName();
        const result = await uploadBrandLogoUrl(url, brandName);

        dropzone.classList.remove('is-loading');
        dropzone.classList.add('is-success');
        setTimeout(() => dropzone.classList.remove('is-success'), 2000);

        setLogoPreview(result.thumbnailUrl);

        // Очистити URL поле
        const urlField = document.getElementById('brand-logo-url-field');
        if (urlField) urlField.value = '';

        showToast('Логотип завантажено з URL', 'success');
    } catch (error) {
        console.error('❌ Помилка завантаження з URL:', error);
        dropzone.classList.remove('is-loading');
        dropzone.classList.add('is-error');
        setTimeout(() => dropzone.classList.remove('is-error'), 2000);
        showToast('Помилка завантаження з URL', 'error');
    }
}

/**
 * Видалити логотип (очистити preview)
 */
function handleRemoveLogo() {
    const hiddenInput = document.getElementById('brand-logo-url');
    if (hiddenInput) hiddenInput.value = '';

    const preview = document.getElementById('brand-logo-preview');
    if (preview) preview.classList.add('u-hidden');
}

/**
 * Перевірити чи є вже логотип
 * @returns {boolean}
 */
function hasExistingLogo() {
    return !!document.getElementById('brand-logo-url')?.value.trim();
}

/**
 * Завантажити логотип з підтвердженням заміни
 * @param {Function} uploadFn - Функція завантаження
 */
async function uploadLogoWithConfirm(uploadFn) {
    if (hasExistingLogo()) {
        const confirmed = await showConfirmModal(
            'Замінити логотип?',
            'Поточний логотип буде замінено новим.'
        );
        if (!confirmed) return;
    }
    await uploadFn();
}

/**
 * Показати preview логотипу (інпут залишається видимим)
 * @param {string} thumbnailUrl - Публічний URL зображення
 */
function setLogoPreview(thumbnailUrl) {
    const preview = document.getElementById('brand-logo-preview');
    const previewImg = document.getElementById('brand-logo-preview-img');
    const hiddenInput = document.getElementById('brand-logo-url');

    // Оновити hidden input (зберігається в Google Sheets)
    if (hiddenInput) hiddenInput.value = thumbnailUrl;

    // Показати preview (інпут НЕ ховається — для заміни)
    if (previewImg) previewImg.src = thumbnailUrl;
    if (preview) preview.classList.remove('u-hidden');
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

    // Статус dot
    const statusBadge = document.getElementById('brand-status-badge');
    if (statusBadge) {
        const isActive = brand.brand_status !== 'inactive';
        statusBadge.classList.remove('is-success', 'is-error');
        statusBadge.classList.add(isActive ? 'is-success' : 'is-error');
        statusBadge.title = isActive ? 'Активний' : 'Неактивний';
    }

    // Посилання
    setLinks(brand.brand_links);

    // Текст
    if (textEditor) {
        textEditor.setValue(brand.brand_text || '');
    }

    // Mapper option ID
    const mapperIdField = document.getElementById('brand-mapper-option-id');
    if (mapperIdField) mapperIdField.value = brand.mapper_option_id || '';

    // Logo URL
    const logoUrlField = document.getElementById('brand-logo-url');
    if (logoUrlField) logoUrlField.value = brand.brand_logo_url || '';

    // Показати preview якщо є URL, інакше dropzone
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

    // Статус dot
    const statusBadge = document.getElementById('brand-status-badge');
    if (statusBadge) {
        statusBadge.classList.remove('is-success', 'is-error');
        statusBadge.classList.add('is-success');
        statusBadge.title = 'Активний';
    }

    // Посилання
    setLinks([]);

    // Mapper option ID
    const mapperIdField = document.getElementById('brand-mapper-option-id');
    if (mapperIdField) mapperIdField.value = '';

    // Logo URL
    const logoUrlField = document.getElementById('brand-logo-url');
    if (logoUrlField) logoUrlField.value = '';
    handleRemoveLogo();

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


// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Оновити таблицю лінійок в модалі, коли лінійку додано/оновлено/видалено
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

