// js/entities/entities-marketplace-admin.js
// Управління маркетплейсами (адмін-панель)

import { getMarketplaces, getMpColumns, addEntity, getSheetMetadata, loadAllEntitiesData } from './entities-data.js';
import { createMarketplaceSheets, deleteMarketplaceSheets } from './entities-sheets.js';
import { showModal } from '../common/ui-modal.js';
import { initCustomSelects } from '../common/ui-select.js';

let currentMarketplace = null; // Поточний МП для редагування колонок

/**
 * Ініціалізація адмін-панелі маркетплейсів
 */
export function initMarketplaceAdmin() {
    console.log('🛒 Ініціалізація адмін-панелі маркетплейсів...');

    // Прив'язати кнопку "Маркетплейси" в header
    const btnMarketplaceAdmin = document.getElementById('btn-marketplace-admin');
    if (btnMarketplaceAdmin) {
        console.log('✅ Кнопка "Маркетплейси" знайдена, додаємо обробник...');
        btnMarketplaceAdmin.addEventListener('click', () => {
            console.log('🖱️ Клік на кнопку "Маркетплейси"');
            openMarketplaceAdminModal();
        });
    } else {
        console.error('❌ Кнопка btn-marketplace-admin не знайдена!');
    }

    // Слухати подію відкриття модалок для ініціалізації обробників
    document.addEventListener('modal-opened', handleModalOpened);
}

/**
 * Відкрити адмін-модалку через глобальну систему модалок
 */
function openMarketplaceAdminModal() {
    console.log('📂 Відкриття адмін-модалки маркетплейсів...');
    showModal('modal-marketplace-admin');
}

/**
 * Відкрити модалку додавання маркетплейсу
 */
function openAddMarketplaceModal() {
    console.log('📂 Відкриття модалки додавання маркетплейсу...');
    showModal('modal-add-marketplace');
}

/**
 * Відкрити модалку редагування маркетплейсу
 */
function openEditMarketplaceModal(marketplace) {
    console.log('✏️ Відкриття модалки редагування маркетплейсу:', marketplace);

    // Відкрити модалку додавання (використовуємо ту саму форму)
    showModal('modal-add-marketplace');

    // Почекати поки модалка відкриється і заповнити поля
    setTimeout(() => {
        const mpId = marketplace.marketplace_id || marketplace.mp_id;
        const mpName = marketplace.display_name || marketplace.mp_name;
        const primaryColor = marketplace.primary_color || '#00A046';
        const iconSvg = marketplace.icon_svg || '';

        // Заповнити поля форми
        const mpIdInput = document.getElementById('mp-id');
        const mpNameInput = document.getElementById('mp-name');
        const primaryColorInput = document.getElementById('mp-primary-color');
        const primaryColorHexInput = document.getElementById('mp-primary-color-hex');
        const logoUrlInput = document.getElementById('mp-logo-url');

        if (mpIdInput) {
            mpIdInput.value = mpId;
            mpIdInput.disabled = true; // ID не можна змінювати
        }
        if (mpNameInput) mpNameInput.value = mpName;
        if (primaryColorInput) primaryColorInput.value = primaryColor;
        if (primaryColorHexInput) primaryColorHexInput.value = primaryColor;
        if (logoUrlInput) logoUrlInput.value = iconSvg;

        // Сховати праву частину з конфігурацією колонок (тільки для редагування)
        const formRight = document.querySelector('.mp-form-right');
        if (formRight) formRight.style.display = 'none';

        // Змінити layout на одноколонковий
        const formLayout = document.querySelector('.mp-form-layout');
        if (formLayout) {
            formLayout.style.gridTemplateColumns = '1fr';
        }

        // Змінити заголовок та текст кнопки
        const modalTitle = document.querySelector('.modal-title');
        const submitBtn = document.querySelector('#add-marketplace-form button[type="submit"]');

        if (modalTitle) modalTitle.textContent = 'Редагувати маркетплейс';
        if (submitBtn) {
            submitBtn.innerHTML = `
                <span class="material-symbols-outlined">save</span>
                Зберегти зміни
            `;
        }

        console.log('📝 Форма заповнена для редагування');
    }, 200);
}

/**
 * Обробник події відкриття модалки
 */
function handleModalOpened(event) {
    const { modalId, bodyTarget } = event.detail;

    if (modalId === 'modal-marketplace-admin') {
        // Оновити список маркетплейсів
        renderMarketplacesList();
        // Оновити dropdown маркетплейсів
        populateMarketplacesDropdown();
        // Ініціалізувати обробники подій для адмін-модалки
        initMarketplaceAdminEvents(bodyTarget);
    }

    if (modalId === 'modal-add-marketplace') {
        // Ініціалізувати обробники для модалки додавання
        initAddMarketplaceEvents(bodyTarget);
    }
}

/**
 * Ініціалізувати події адмін-модалки
 */
function initMarketplaceAdminEvents(container) {
    if (!container) return;

    // Ініціалізувати кастомні селекти
    initCustomSelects();

    // Перемикання табів
    container.querySelectorAll('.admin-tab-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab || e.target.dataset.subtab;
            if (!tabName) return;

            // Визначити, це головний таб чи підтаб
            const isSubtab = e.target.dataset.subtab !== undefined;
            const tabContainer = isSubtab ? e.target.closest('#columns-config-container') : container;

            // Деактивувати всі таби в цій групі
            const tabLinks = tabContainer.querySelectorAll(isSubtab ? '[data-subtab]' : '.admin-tabs > .admin-tab-link');
            const tabContents = tabContainer.querySelectorAll(isSubtab ? '[id^="subtab-"]' : '[id^="tab-"]');

            tabLinks.forEach(link => link.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');

            // Активувати обраний таб
            e.target.classList.add('active');
            const targetContent = tabContainer.querySelector(`#${isSubtab ? 'subtab' : 'tab'}-${tabName}`);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        });
    });

    // Кнопка "Додати маркетплейс"
    const addBtn = container.querySelector('#add-marketplace-btn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddMarketplaceModal);
    }

    // Вибір маркетплейсу для налаштування колонок
    const mpSelect = container.querySelector('#columns-mp-select');
    if (mpSelect) {
        mpSelect.addEventListener('change', (e) => {
            const mpId = e.target.value;
            if (mpId) {
                currentMarketplace = mpId;
                showColumnsConfig(mpId);
            } else {
                hideColumnsConfig();
            }
        });
    }

    // Кнопки додавання колонок
    container.querySelectorAll('.add-column-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const entityType = e.currentTarget.dataset.entityType;
            openAddColumnDialog(currentMarketplace, entityType);
        });
    });
}

/**
 * Відобразити список маркетплейсів
 */
function renderMarketplacesList() {
    const tbody = document.querySelector('#marketplaces-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const marketplaces = getMarketplaces();

    if (marketplaces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Немає маркетплейсів. Додайте перший!</td></tr>';
        return;
    }

    marketplaces.forEach((mp, index) => {
        const row = document.createElement('tr');

        // Використовуємо назви колонок з Google Sheets
        const mpId = mp.marketplace_id || mp.mp_id || '';
        const mpName = mp.display_name || mp.mp_name || mpId;
        const isActive = mp.active !== 'FALSE';

        row.innerHTML = `
            <td>${mpId}</td>
            <td>${mpName}</td>
            <td><span class="badge-active">${isActive ? 'Активний' : 'Неактивний'}</span></td>
            <td class="action-cell">
                <button class="btn-icon-small" data-action="edit-mp" data-mp-id="${mpId}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-icon-small" data-action="delete-mp" data-mp-id="${mpId}" title="Видалити">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </td>
        `;

        // Обробник редагування
        const editBtn = row.querySelector('[data-action="edit-mp"]');
        editBtn.addEventListener('click', () => openEditMarketplaceModal(mp));

        // Обробник видалення
        const deleteBtn = row.querySelector('[data-action="delete-mp"]');
        deleteBtn.addEventListener('click', () => confirmDeleteMarketplace(mpId, mpName));

        tbody.appendChild(row);
    });
}

/**
 * Заповнити dropdown маркетплейсів
 */
function populateMarketplacesDropdown() {
    const select = document.getElementById('columns-mp-select');
    if (!select) {
        console.error('❌ Dropdown #columns-mp-select не знайдено');
        return;
    }

    // Очистити
    select.innerHTML = '<option value="">-- Оберіть маркетплейс --</option>';

    const marketplaces = getMarketplaces();
    console.log('📋 Заповнюємо dropdown маркетплейсів:', marketplaces);

    marketplaces.forEach(mp => {
        const mpId = mp.marketplace_id || mp.mp_id;
        const mpName = mp.display_name || mp.mp_name || mpId;

        const option = document.createElement('option');
        option.value = mpId;
        option.textContent = mpName;
        select.appendChild(option);
    });
}

/**
 * Показати налаштування колонок для МП
 */
function showColumnsConfig(mpId) {
    console.log('📊 Показуємо налаштування колонок для МП:', mpId);

    const container = document.getElementById('columns-config-container');
    if (!container) {
        console.error('❌ Контейнер columns-config-container не знайдено');
        return;
    }

    container.style.display = 'block';

    // Завантажити колонки для кожного типу сутності
    ['Categories', 'Characteristics', 'Options'].forEach(entityType => {
        console.log(`📋 Рендеримо таблицю колонок для ${entityType}`);
        renderColumnsTable(mpId, entityType);
    });
}

/**
 * Сховати налаштування колонок
 */
function hideColumnsConfig() {
    const container = document.getElementById('columns-config-container');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * Відобразити таблицю колонок
 */
function renderColumnsTable(mpId, entityType) {
    console.log(`🔍 renderColumnsTable: mpId="${mpId}", entityType="${entityType}"`);

    const tbody = document.querySelector(`#columns-${entityType}-table tbody`);
    if (!tbody) {
        console.error(`❌ Таблиця #columns-${entityType}-table tbody не знайдена`);
        return;
    }

    tbody.innerHTML = '';

    const columns = getMpColumns(mpId, entityType);
    console.log(`📊 Знайдено ${columns.length} колонок для ${mpId}/${entityType}:`, columns);

    if (columns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Немає колонок</td></tr>';
        return;
    }

    columns.forEach((col, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${col.column_name}</td>
            <td>
                <input type="text" value="${col.display_name}" class="inline-edit"
                    data-row-index="${index}" data-field="display_name">
            </td>
            <td>
                <select class="inline-edit" data-row-index="${index}" data-field="field_type">
                    <option value="text" ${col.field_type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="number" ${col.field_type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="url" ${col.field_type === 'url' ? 'selected' : ''}>URL</option>
                    <option value="select" ${col.field_type === 'select' ? 'selected' : ''}>Select</option>
                    <option value="checkbox" ${col.field_type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                </select>
            </td>
            <td>
                <input type="checkbox" ${col.required === 'TRUE' ? 'checked' : ''}
                    data-row-index="${index}" data-field="required">
            </td>
            <td class="action-cell">
                <button class="btn-icon-small" data-action="delete-column"
                    data-column="${col.column_name}" title="Видалити">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </td>
        `;

        // TODO: Додати обробники для inline редагування та видалення

        tbody.appendChild(row);
    });
}

/**
 * Відкрити діалог додавання колонки
 */
function openAddColumnDialog(mpId, entityType) {
    const columnName = prompt(`Введіть назву колонки (англійською, напр: ${mpId}_name):`);
    if (!columnName || !columnName.trim()) return;

    const displayName = prompt('Введіть назву для відображення (українською):');
    if (!displayName || !displayName.trim()) return;

    // Додати колонку в MP_Columns_Meta
    addColumnToMeta(mpId, entityType, columnName.trim(), displayName.trim());
}

/**
 * Додати колонку в MP_Columns_Meta
 */
async function addColumnToMeta(mpId, entityType, columnName, displayName) {
    try {
        await addEntity('MP_Columns_Meta', {
            mp_id: mpId,
            entity_type: entityType,
            column_name: columnName,
            display_name: displayName,
            field_type: 'text',
            required: 'FALSE'
        });

        console.log(`✅ Колонку ${columnName} додано до метаданих`);

        // Перезавантажити дані
        // TODO: Додати функцію перезавантаження
        alert('Колонка додана! Перезавантажте сторінку для оновлення.');

    } catch (error) {
        console.error('❌ Помилка додавання колонки:', error);
        alert('Помилка: ' + error.message);
    }
}

/**
 * Підтвердження видалення маркетплейсу
 */
function confirmDeleteMarketplace(mpId, mpName) {
    const confirmed = confirm(
        `Видалити маркетплейс "${mpName}"?\n\n` +
        `Це видалить:\n` +
        `• 3 листи: MP_${mpId}_Categories, MP_${mpId}_Characteristics, MP_${mpId}_Options\n` +
        `• Всі метадані колонок\n` +
        `• Всі прив'язки до сутностей\n\n` +
        `Ця дія незворотня!`
    );

    if (confirmed) {
        deleteMarketplace(mpId);
    }
}

/**
 * Видалити маркетплейс
 */
async function deleteMarketplace(mpId) {
    try {
        console.log(`🗑️ Видалення маркетплейсу: ${mpId}`);

        // Видалити 3 листи
        await deleteMarketplaceSheets(mpId);

        // TODO: Видалити з листа Marketplaces
        // TODO: Видалити метадані з MP_Columns_Meta

        alert('Маркетплейс видалено! Перезавантажте сторінку.');

    } catch (error) {
        console.error('❌ Помилка видалення маркетплейсу:', error);
        alert('Помилка: ' + error.message);
    }
}

/**
 * ========================================
 * МОДАЛКА ДОДАВАННЯ МАРКЕТПЛЕЙСУ
 * ========================================
 */

function initAddMarketplaceEvents(container) {
    if (!container) return;

    // Відновити початковий вигляд форми (на випадок якщо до цього була модалка редагування)
    const formRight = container.querySelector('.mp-form-right');
    const formLayout = container.querySelector('.mp-form-layout');
    const mpIdInput = container.querySelector('#mp-id');

    if (formRight) formRight.style.display = '';
    if (formLayout) formLayout.style.gridTemplateColumns = '400px 1fr';
    if (mpIdInput) {
        mpIdInput.value = '';
        mpIdInput.disabled = false;
    }

    // Очистити всі поля форми
    container.querySelectorAll('input:not([type="checkbox"]):not([type="color"])').forEach(input => {
        if (input.id !== 'mp-primary-color-hex') input.value = '';
    });
    container.querySelector('#mp-primary-color')?.setAttribute('value', '#00A046');
    container.querySelector('#mp-primary-color-hex')?.setAttribute('value', '#00A046');

    // Очистити таблиці колонок
    container.querySelectorAll('.column-config-row').forEach(row => row.remove());

    // Ініціалізувати кастомні селекти
    initCustomSelects();

    // Синхронізація color picker з text input
    const colorPicker = container.querySelector('#mp-primary-color');
    const colorHex = container.querySelector('#mp-primary-color-hex');

    if (colorPicker && colorHex) {
        colorPicker.addEventListener('input', (e) => {
            colorHex.value = e.target.value.toUpperCase();
        });

        colorHex.addEventListener('input', (e) => {
            const value = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                colorPicker.value = value;
            }
        });
    }

    // Перемикання табів сутностей
    container.querySelectorAll('.entity-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const entityType = e.target.dataset.entity;

            // Деактивувати всі таби
            container.querySelectorAll('.entity-tab').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.entity-config-panel').forEach(p => p.classList.remove('active'));

            // Активувати обраний
            e.target.classList.add('active');
            container.querySelector(`#config-${entityType}`)?.classList.add('active');
        });
    });

    // Додавання колонок до початкового списку
    container.querySelector('#add-categories-column-btn')?.addEventListener('click', () => {
        addInitialColumnField('mp-columns-categories', 'Categories');
    });

    container.querySelector('#add-characteristics-column-btn')?.addEventListener('click', () => {
        addInitialColumnField('mp-columns-characteristics', 'Characteristics');
    });

    container.querySelector('#add-options-column-btn')?.addEventListener('click', () => {
        addInitialColumnField('mp-columns-options', 'Options');
    });

    // Submit форми
    const form = container.querySelector('#add-marketplace-form');
    if (form) {
        form.addEventListener('submit', handleCreateMarketplace);
    }
}

function addInitialColumnField(containerId, entityType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const row = document.createElement('tr');
    row.className = 'column-config-row';
    row.innerHTML = `
        <td><input type="text" class="column-name" placeholder="mp_name" data-entity-type="${entityType}" required></td>
        <td><input type="text" class="column-display" placeholder="Назва МП" required></td>
        <td>
            <select class="column-type" data-custom-select>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="url">URL</option>
                <option value="select">Select</option>
                <option value="multiselect">Multiselect</option>
            </select>
        </td>
        <td style="text-align: center;">
            <input type="checkbox" class="column-required">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn-remove remove-column-btn" title="Видалити">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </td>
    `;

    row.querySelector('.remove-column-btn').addEventListener('click', () => {
        row.remove();
    });

    container.appendChild(row);

    // Ініціалізувати кастомний селект для щойно доданого рядка
    initCustomSelects(row);
}

async function handleCreateMarketplace(e) {
    e.preventDefault();

    const mpId = document.getElementById('mp-id').value.trim();
    const mpName = document.getElementById('mp-name').value.trim();
    const primaryColor = document.getElementById('mp-primary-color').value.trim();
    const logoUrl = document.getElementById('mp-logo-url').value.trim();

    if (!mpId || !mpName) {
        alert('Заповніть обов\'язкові поля!');
        return;
    }

    // Зібрати колонки з таблиць
    const columnsConfig = {
        Categories: [],
        Characteristics: [],
        Options: []
    };

    // Додати СИСТЕМНІ колонки для кожного типу
    const systemColumns = {
        Categories: [
            { column_name: 'local_id', display_name: 'ID запису', field_type: 'text', required: 'TRUE' },
            { column_name: 'ideal_category_id', display_name: 'ID ідеальної категорії', field_type: 'text', required: 'TRUE' }
        ],
        Characteristics: [
            { column_name: 'local_id', display_name: 'ID запису', field_type: 'text', required: 'TRUE' },
            { column_name: 'ideal_characteristic_id', display_name: 'ID ідеальної характеристики', field_type: 'text', required: 'TRUE' }
        ],
        Options: [
            { column_name: 'local_id', display_name: 'ID запису', field_type: 'text', required: 'TRUE' },
            { column_name: 'ideal_option_id', display_name: 'ID ідеальної опції', field_type: 'text', required: 'TRUE' }
        ]
    };

    // Додати системні колонки
    for (const entityType in systemColumns) {
        columnsConfig[entityType].push(...systemColumns[entityType]);
    }

    // Зібрати додаткові колонки з таблиць
    document.querySelectorAll('.column-config-row').forEach(row => {
        const nameInput = row.querySelector('.column-name');
        const displayInput = row.querySelector('.column-display');
        const typeSelect = row.querySelector('.column-type');
        const requiredCheckbox = row.querySelector('.column-required');
        const entityType = nameInput.dataset.entityType;

        const columnName = nameInput.value.trim();
        const displayName = displayInput.value.trim();

        if (columnName && displayName && entityType) {
            columnsConfig[entityType].push({
                column_name: columnName,
                display_name: displayName,
                field_type: typeSelect.value,
                required: requiredCheckbox.checked ? 'TRUE' : 'FALSE'
            });
        }
    });

    console.log('Створення маркетплейсу:', { mpId, mpName, logoUrl, columnsConfig });

    // Закрити модалку додавання і відкрити модалку адміністрування
    const closeBtn = document.querySelector('[data-modal-close]');
    if (closeBtn) closeBtn.click();

    // Відкрити модалку адміністрування для відображення прогресу
    setTimeout(() => {
        showModal('modal-marketplace-admin');
    }, 100);

    // Почекати поки модалка відкриється
    await new Promise(resolve => setTimeout(resolve, 200));

    // Показати прогрес-бар
    const progressContainer = document.getElementById('mp-creation-progress');
    const progressName = document.getElementById('progress-mp-name');
    const progressStatus = document.getElementById('progress-status');
    const progressFill = document.getElementById('progress-bar-fill');

    if (progressContainer && progressName && progressStatus && progressFill) {
        progressContainer.style.display = 'block';
        progressName.textContent = `Створення: ${mpName}`;
        progressFill.classList.add('active');
    }

    const updateProgress = (percent, status) => {
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressStatus) progressStatus.textContent = status;
    };

    try {
        // 1. Додати в лист Marketplaces (20%)
        updateProgress(20, 'Додавання маркетплейсу...');
        await addEntity('Marketplaces', {
            marketplace_id: mpId,
            display_name: mpName,
            primary_color: primaryColor,
            icon_svg: logoUrl,
            active: 'TRUE'
        });
        console.log('✅ Маркетплейс додано в Marketplaces');

        // 2. Створити 3 листи з правильними заголовками (50%)
        updateProgress(50, 'Створення аркушів...');
        const sheetsColumnsConfig = {
            categories: columnsConfig.Categories.map(col => col.column_name),
            characteristics: columnsConfig.Characteristics.map(col => col.column_name),
            options: columnsConfig.Options.map(col => col.column_name)
        };
        await createMarketplaceSheets(mpId, sheetsColumnsConfig);
        console.log('✅ Листи маркетплейсу створені');

        // 3. Додати метадані колонок (80%)
        updateProgress(80, 'Збереження конфігурації колонок...');
        const totalColumns = Object.values(columnsConfig).reduce((sum, arr) => sum + arr.length, 0);
        let processedColumns = 0;

        for (const entityType in columnsConfig) {
            for (const col of columnsConfig[entityType]) {
                await addEntity('MP_Columns_Meta', {
                    mp_id: mpId,
                    entity_type: entityType,
                    column_name: col.column_name,
                    display_name: col.display_name,
                    field_type: col.field_type,
                    required: col.required
                });
                processedColumns++;
                const progress = 80 + (processedColumns / totalColumns) * 15;
                updateProgress(progress, `Збереження колонок (${processedColumns}/${totalColumns})...`);
            }
        }
        console.log('✅ Метадані колонок додані');

        // 4. Завершено (100%)
        updateProgress(100, 'Створено успішно!');
        progressFill.classList.remove('active');

        // 5. Перезавантажити всі дані з Google Sheets
        updateProgress(100, 'Оновлення даних...');
        await loadAllEntitiesData();
        console.log('✅ Дані перезавантажені');

        // Оновити список маркетплейсів
        setTimeout(() => {
            renderMarketplacesList();
            populateMarketplacesDropdown();

            // Сховати прогрес через 2 секунди
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
            }, 2000);
        }, 500);

    } catch (error) {
        console.error('❌ Помилка створення маркетплейсу:', error);
        updateProgress(0, 'Помилка створення');
        progressFill.classList.remove('active');
        progressFill.style.background = 'var(--error, #ba1a1a)';
        alert('Помилка: ' + error.message);

        // Сховати прогрес через 3 секунди
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
            if (progressFill) {
                progressFill.style.width = '0%';
                progressFill.style.background = '';
            }
        }, 3000);
    }
}
