// js/entities/entities-events.js
// Обробка подій UI для сутностей

import { entitiesState, setupColumnCheckboxes, updateStats } from './entities-init.js';
import { renderTable } from './entities-render.js';
import { loadAllEntitiesData } from './entities-data.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initEntityEvents() {
    console.log('🎯 Ініціалізація обробників подій...');

    // Обробка кліків на таби
    initTabSwitching();

    // Обробка кнопок в header
    initHeaderButtons();

    // Обробка кнопок в footer
    initFooterButtons();

    // Обробка чекбоксів вибору рядків
    initRowSelection();

    // Обробка подвійного кліку для редагування
    initRowDoubleClick();
}

/**
 * Перемикання табів
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tabTarget;
            if (!tabId) return;

            // Оновити активні класи кнопок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Оновити активні класи контенту
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));

            const activeContent = document.querySelector(`[data-tab-content="${tabId}"]`);
            if (activeContent) {
                activeContent.classList.add('active');
            }

            // Оновити state
            entitiesState.currentTab = tabId;
            entitiesState.selectedIds.clear();

            // Оновити чекбокси колонок для нового табу
            setupColumnCheckboxes(tabId);

            // Відрендерити таблицю
            renderTable(tabId);

            console.log(`📑 Перемкнуто на таб: ${tabId}`);
        });
    });
}

/**
 * Кнопки в header
 */
function initHeaderButtons() {
    // Кнопка "Оновити дані"
    const btnRefreshData = document.getElementById('refresh-data-btn');
    if (btnRefreshData) {
        btnRefreshData.addEventListener('click', async () => {
            console.log('🔄 Оновлюємо дані...');
            try {
                await loadAllEntitiesData();
                renderTable(entitiesState.currentTab);
                console.log('✅ Дані оновлені');
            } catch (error) {
                console.error('❌ Помилка оновлення:', error);
                alert('Помилка оновлення даних');
            }
        });
    }

    // Кнопка "Маркетплейси" - обробник в entities-marketplace-admin.js

    // Кнопка "Додати"
    const btnAddEntity = document.getElementById('btn-add-entity');
    if (btnAddEntity) {
        btnAddEntity.addEventListener('click', () => {
            const entityType = entitiesState.currentTab;
            console.log(`➕ Додаємо новий ${entityType}...`);
            // TODO: Відкрити модалку додавання
            alert(`Додати ${entityType} (в розробці)`);
        });
    }
}

/**
 * Кнопки в footer
 */
function initFooterButtons() {
    // Імпорт
    const btnImport = document.getElementById('btn-import');
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            console.log('📥 Імпорт...');
            alert('Імпорт (в розробці)');
        });
    }

    // Експорт
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            console.log('📤 Експорт...');
            alert('Експорт (в розробці)');
        });
    }

    // Видалити
    const btnDelete = document.getElementById('btn-delete');
    if (btnDelete) {
        btnDelete.addEventListener('click', () => {
            const selectedIds = Array.from(entitiesState.selectedIds);
            if (selectedIds.length === 0) return;

            const confirmed = confirm(`Видалити ${selectedIds.length} елементів?`);
            if (confirmed) {
                console.log('🗑️ Видаляємо:', selectedIds);
                // TODO: Реалізувати видалення
                alert('Видалення (в розробці)');
            }
        });
    }

    // Поєднати
    const btnMerge = document.getElementById('btn-merge');
    if (btnMerge) {
        btnMerge.addEventListener('click', () => {
            const selectedIds = Array.from(entitiesState.selectedIds);
            if (selectedIds.length < 2) {
                alert('Виберіть принаймні 2 елементи для поєднання');
                return;
            }

            console.log('🔀 Поєднуємо:', selectedIds);
            alert('Поєднання (в розробці)');
        });
    }
}

/**
 * Вибір рядків через чекбокси
 */
function initRowSelection() {
    const mainContent = document.querySelector('.tabbed-page');
    if (!mainContent) return;

    // Делегування події на контейнер
    mainContent.addEventListener('change', (e) => {
        const target = e.target;

        // Select All в header
        if (target.classList.contains('header-select-all')) {
            const tableBody = target.closest('.pseudo-table').querySelector('.pseudo-table-body');
            const checkboxes = tableBody.querySelectorAll('.row-checkbox');

            checkboxes.forEach(cb => {
                cb.checked = target.checked;
                const id = cb.dataset.id;
                if (target.checked) {
                    entitiesState.selectedIds.add(id);
                } else {
                    entitiesState.selectedIds.delete(id);
                }
            });

            updateButtonStates();
            updateStats();
        }

        // Окремий чекбокс рядка
        if (target.classList.contains('row-checkbox')) {
            const id = target.dataset.id;
            if (target.checked) {
                entitiesState.selectedIds.add(id);
            } else {
                entitiesState.selectedIds.delete(id);
            }

            updateButtonStates();
            updateStats();
            updateHeaderCheckbox();
        }
    });
}

/**
 * Подвійний клік для редагування
 */
function initRowDoubleClick() {
    const mainContent = document.querySelector('.tabbed-page');
    if (!mainContent) return;

    mainContent.addEventListener('dblclick', (e) => {
        const row = e.target.closest('.pseudo-table-row');
        if (!row) return;

        const entityType = row.dataset.entityType;
        const id = row.dataset.id;

        console.log(`✏️ Редагуємо ${entityType} з ID: ${id}`);
        // TODO: Відкрити модалку редагування
        alert(`Редагувати ${entityType}: ${id} (в розробці)`);
    });
}

/**
 * Оновити стан кнопок (enabled/disabled)
 */
function updateButtonStates() {
    const selectedCount = entitiesState.selectedIds.size;

    const btnDelete = document.getElementById('btn-delete');
    const btnMerge = document.getElementById('btn-merge');

    if (btnDelete) {
        btnDelete.disabled = selectedCount === 0;
    }

    if (btnMerge) {
        btnMerge.disabled = selectedCount < 2;
    }
}

/**
 * Оновити стан header checkbox (select all)
 */
function updateHeaderCheckbox() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    const headerCheckbox = activeTab.querySelector('.header-select-all');
    const checkboxes = activeTab.querySelectorAll('.row-checkbox');

    if (!headerCheckbox || checkboxes.length === 0) return;

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);

    headerCheckbox.checked = allChecked;
    headerCheckbox.indeterminate = someChecked && !allChecked;
}
