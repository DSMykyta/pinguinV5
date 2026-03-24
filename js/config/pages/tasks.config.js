// js/config/pages/tasks.config.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITY CONFIG — ЗАВДАННЯ                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Конфігурація сутності для page-entity.js                               ║
 * ║  Приватна таблиця → завантаження через API замість CSV                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { safeJsonParse } from '../../utils/utils-json.js';
import { populateSelect } from '../../components/forms/select.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'Tasks';
const COLUMN_IDS = [
    'task_id', 'title', 'description', 'category', 'status',
    'created_by', 'assigned_to', 'due_date', 'created_at',
    'updated_at', 'updated_by', 'comments', 'created_by_display', 'is_new'
];

function localNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

const STATUS_TAG = {
    new:         { label: 'Нове',      color: 'c-yellow' },
    in_progress: { label: 'В роботі',  color: 'c-blue' },
    done:        { label: 'Готово',     color: 'c-green' },
    cancelled:   { label: 'Скасовано', color: 'c-red' },
};


// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export default {
    name: 'tasks',
    entityName: 'Завдання',

    dataSource: {
        spreadsheetType: 'tasks',
        sheetName: SHEET_NAME,
        sheetGid: '2095262750',
        idField: 'task_id',
        idPrefix: 'task-',
        stateKey: 'tasks',
        columns: COLUMN_IDS,
        autoFields: {
            created_at: () => localNow(),
            updated_at: () => localNow(),
            created_by: () => window.currentUser?.username || '',
            created_by_display: () => window.currentUser?.display_name || window.currentUser?.username || '',
            updated_by: () => window.currentUser?.username || '',
            status: () => 'new',
            is_new: () => '1',
        },
    },

    table: {
        containerId: 'tasks-cards-container',
        columns: [
            { id: 'title', label: 'Назва', type: 'name', span: 4, sortable: true },
            {
                id: 'created_by_display', label: 'Від', type: 'text', span: 2, sortable: true, filterable: true,
                render: (value, row) => {
                    const v = value === '—' ? (row.created_by || '') : (value || '');
                    return escapeHtml(v);
                }
            },
            {
                id: 'assigned_to', label: 'Для', type: 'text', span: 2, sortable: true, filterable: true,
                render: (value) => escapeHtml(value || '')
            },
            {
                id: 'category', label: 'Тип', type: 'text', span: 2, sortable: true, filterable: true,
                render: (value) => value
                    ? `<span class="tag c-tertiary">${escapeHtml(value)}</span>`
                    : ''
            },
            {
                id: 'status', label: 'Статус', span: 1, sortable: true, filterable: true,
                render: (value) => {
                    const s = STATUS_TAG[value] || STATUS_TAG.new;
                    return `<span class="tag ${s.color}">${s.label}</span>`;
                }
            },
        ],
        searchColumns: ['task_id', 'title', 'description', 'created_by_display', 'assigned_to'],
        emptyMessage: 'Завдання не знайдено',
        actions: ['edit'],
        rowActions: (row) => {
            const username = window.currentUser?.username;
            const isNew = row.is_new === '1' && row.assigned_to === username;
            return isNew ? '<span class="dot c-blue"></span>' : '';
        },
    },

    crud: {
        modalId: 'task-edit',
        titleId: 'task-modal-title',
        deleteBtnId: 'btn-delete-task',
        saveBtnId: 'btn-save-task',
        saveCloseBtnId: 'save-close-task',
        addTitle: 'Нове завдання',
        getTitle: (task) => task.title || 'Завдання',
        sectionNavId: 'task-section-navigator',
        deleteConfirm: { action: 'видалити', entity: 'завдання', nameField: 'title' },

        fields: [
            { domId: 'task-id', field: 'task_id', readonly: true },
            { domId: 'task-title', field: 'title' },
            { domId: 'task-category', field: 'category', type: 'select' },
            { domId: 'task-assigned-to', field: 'assigned_to', type: 'select' },
            { domId: 'task-due-date', field: 'due_date' },
            { domId: 'task-status', field: 'status', type: 'radio', default: 'new' },
            { domId: 'task-description-editor', field: 'description', type: 'editor' },
            { domId: 'task-created-by', field: 'created_by_display', readonly: true, default: '—' },
            { domId: 'task-created-at', field: 'created_at', readonly: true, default: '—' },
            { domId: 'task-updated-at', field: 'updated_at', readonly: true, default: '—' },
            { domId: 'task-updated-by', field: 'updated_by', readonly: true, default: '—' },
        ],

        onInitComponents: ({ state }) => {
            populateCategorySelect();
            populateAssignedToSelect(state);
            initStatusBadge();
        },
    },

    page: {
        containers: ['tasks-cards-container'],
    },

    extensions: [dataLoaderExtension, cardsExtension, commentsExtension, usersExtension, uiExtension],
};

// ═══════════════════════════════════════════════════════════════════════════
// CRUD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function populateCategorySelect() {
    populateSelect('task-category', [
        { value: 'терміново', text: 'Терміново' },
        { value: 'міграція', text: 'Міграція' },
        { value: 'задача', text: 'Задача' },
        { value: "пам'ятка", text: "Пам'ятка" },
    ], { placeholder: '— Оберіть —' });
}

function populateAssignedToSelect(state) {
    const users = state.usersList || [];
    populateSelect('task-assigned-to',
        users.map(u => ({ value: u.username, text: u.display_name || u.username })),
        { placeholder: '— Оберіть —' }
    );
}

function initStatusBadge() {
    const statusSwitch = document.getElementById('task-status-switch');
    if (!statusSwitch || statusSwitch._statusInit) return;
    statusSwitch._statusInit = true;
    statusSwitch.addEventListener('change', () => {
        const badge = document.getElementById('task-status-badge');
        if (!badge) return;
        const status = document.querySelector('input[name="task-status"]:checked')?.value || 'new';
        badge.classList.remove('c-green', 'c-yellow', 'c-red', 'c-blue');
        badge.classList.add(STATUS_TAG[status]?.color || 'c-yellow');
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION: DATA LOADER (private spreadsheet — override CSV with API)
// ═══════════════════════════════════════════════════════════════════════════

function dataLoaderExtension({ state, data, config }) {
    config.page = config.page || {};
    config.page.dataLoaders = [
        () => loadTasksViaApi(state, data),
        () => loadUsersForTasks(state),
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION: CARDS
// ═══════════════════════════════════════════════════════════════════════════

function cardsExtension({ state, plugins, data, config }) {

    // Expandable — u-reveal content for each row
    config.table.expandable = {
        showSaveButton: false,
        showOpenFullButton: false,
        renderCloseCellContent: () =>
            `<button class="btn-icon flip" data-action="toggle-expand" aria-label="Розгорнути">
                <span class="material-symbols-outlined">expand_more</span>
            </button>`,
        renderContent: (row) => {
            const uid = row.task_id || Math.random().toString(36).slice(2);
            const currentStatus = row.status || 'new';
            const statusRadios = Object.entries(STATUS_TAG).map(([key, s]) =>
                `<input type="radio" id="st-${key}-${uid}" name="st-${uid}" value="${key}"${key === currentStatus ? ' checked' : ''}>` +
                `<label for="st-${key}-${uid}" class="switch-label">${s.label}</label>`
            ).join('');
            return `
            <div class="switch switch-fit switch-compact" data-status-switch>
                ${statusRadios}
            </div>
            <div class="grid">
                <div class="col-8">
                    ${row.description ? `<div class="rich-editor-content">${row.description}</div>` : ''}
                </div>
                <div class="col-4">
                    <label class="label-l">Коментарі</label>
                    <div data-card-comments></div>
                    <div class="content-bloc"><div class="content-line"><div class="input-box">
                        <input type="text" data-card-comment-input placeholder="Коментар...">
                        <button class="btn-icon" data-action="add-card-comment" aria-label="Надіслати">
                            <span class="material-symbols-outlined">send</span>
                        </button>
                    </div></div></div>
                </div>
            </div>`;
        },
    };

    // Перехоплюємо expand-edit → модал (capture phase, до expandable plugin)
    plugins.registerHook('onInit', () => {
        const container = document.getElementById('tasks-cards-container');
        if (!container || container._tasksClickInit) return;
        container._tasksClickInit = true;

        // Edit button → modal (capture phase перехоплює до expandable plugin)
        container.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-action="expand-edit"]');
            if (!editBtn) return;
            e.stopImmediatePropagation();
            const row = editBtn.closest('.pseudo-table-row');
            if (!row) return;
            const crud = state._crudModule;
            if (crud) crud.showEdit(row.dataset.rowId);
        }, true);

        // Решта кліків (bubble phase)
        container.addEventListener('click', (e) => {
            // Add comment
            if (e.target.closest('[data-action="add-card-comment"]')) {
                const row = e.target.closest('.pseudo-table-row');
                if (!row) return;
                plugins.runHook('onCardAddComment', row.dataset.rowId, row);
                return;
            }
            // Toggle expand — chevron button
            const toggleBtn = e.target.closest('[data-action="toggle-expand"]');
            if (toggleBtn) {
                const row = toggleBtn.closest('.pseudo-table-row');
                if (!row) return;
                const reveal = row.querySelector('.u-reveal');
                if (!reveal) return;
                const isOpen = reveal.classList.toggle('is-open');
                toggleBtn.classList.toggle('open', isOpen);
                if (isOpen) {
                    const task = data.getById(row.dataset.rowId);
                    if (task) {
                        const username = window.currentUser?.username;
                        if (task.is_new === '1' && task.assigned_to === username) {
                            task.is_new = '0';
                            callSheetsAPI('update', {
                                range: `${SHEET_NAME}!N${task._rowIndex}`,
                                values: [['0']],
                                spreadsheetType: 'tasks'
                            }).catch(() => {});
                        }
                        plugins.runHook('onCardExpand', task, row);
                    }
                }
                return;
            }
        });

        // Status switch — змінює статус завдання
        container.addEventListener('change', async (e) => {
            const radio = e.target;
            if (!radio.closest('[data-status-switch]')) return;
            const row = radio.closest('.pseudo-table-row');
            if (!row) return;
            const taskId = row.dataset.rowId;
            const newStatus = radio.value;
            try {
                await data.update(taskId, { status: newStatus, updated_at: localNow(), updated_by: window.currentUser?.username || '' });
                const statusCell = row.querySelector('.pseudo-table-cell .tag');
                if (statusCell) {
                    const s = STATUS_TAG[newStatus] || STATUS_TAG.new;
                    statusCell.className = `tag ${s.color}`;
                    statusCell.textContent = s.label;
                }
                const { showToast } = await import('../../components/feedback/toast.js');
                showToast(`Статус: ${STATUS_TAG[newStatus]?.label}`, 'success');
            } catch (err) {
                console.error('Помилка зміни статусу:', err);
            }
        });

        // Enter in comment input
        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const input = e.target.closest('[data-card-comment-input]');
            if (!input) return;
            e.preventDefault();
            const row = input.closest('.pseudo-table-row');
            if (!row) return;
            plugins.runHook('onCardAddComment', row.dataset.rowId, row);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION: COMMENTS
// ═══════════════════════════════════════════════════════════════════════════

function commentsExtension({ plugins, data }) {
    let _currentTaskId = null;

    function renderCommentsIntoContainer(task, container) {
        if (!container) return;
        const comments = safeJsonParse(task.comments, []);
        if (!Array.isArray(comments) || comments.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="body-s">Коментарів поки немає</span></div>';
            return;
        }
        container.innerHTML = comments.map(c => `
            <div class="content-bloc-container spaced">
                <div class="content-bloc">
                    <div class="content-line panel">
                        <div class="group column">
                            <div class="group">
                                <span class="label-l">${escapeHtml(c.display_name || c.author || '')}</span>
                                <span class="body-s">${escapeHtml(c.created_at || '')}</span>
                            </div>
                            <span class="body-m">${escapeHtml(c.text || '')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function addComment(taskId, contextEl) {
        const input = contextEl
            ? contextEl.querySelector('[data-card-comment-input]')
            : document.getElementById('task-comment-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const task = data.getById(taskId);
        if (!task) return;
        const comments = safeJsonParse(task.comments, []);
        if (!Array.isArray(comments)) return;
        const now = localNow();
        comments.push({
            author: window.currentUser?.username || '',
            display_name: window.currentUser?.display_name || window.currentUser?.username || '',
            text,
            created_at: now
        });
        try {
            await data.update(taskId, { comments: JSON.stringify(comments) });
            input.value = '';
            if (contextEl) {
                renderCommentsIntoContainer(task, contextEl.querySelector('[data-card-comments]'));
            } else {
                renderCommentsIntoContainer(task, document.getElementById('task-comments-container'));
            }
            const { showToast } = await import('../../components/feedback/toast.js');
            showToast('Коментар додано', 'success');
        } catch (error) {
            console.error('Помилка додавання коментаря:', error);
        }
    }

    plugins.registerHook('onModalOpen', (task) => {
        if (task) {
            _currentTaskId = task.task_id;
            renderCommentsIntoContainer(task, document.getElementById('task-comments-container'));
        }
        const btn = document.getElementById('btn-add-comment');
        const input = document.getElementById('task-comment-input');
        if (btn && !btn._commentsInit) {
            btn._commentsInit = true;
            btn.addEventListener('click', () => { if (_currentTaskId) addComment(_currentTaskId, null); });
        }
        if (input && !input._commentsInit) {
            input._commentsInit = true;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && _currentTaskId) { e.preventDefault(); addComment(_currentTaskId, null); }
            });
        }
    });

    plugins.registerHook('onModalClose', () => { _currentTaskId = null; });
    plugins.registerHook('onCardExpand', (task, block) => {
        renderCommentsIntoContainer(task, block.querySelector('[data-card-comments]'));
    });
    plugins.registerHook('onCardAddComment', (taskId, block) => { addComment(taskId, block); });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION: USERS
// ═══════════════════════════════════════════════════════════════════════════

function usersExtension({ state }) {
    state.usersList = [];
    state.usersMap = {};
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION: UI
// ═══════════════════════════════════════════════════════════════════════════

function uiExtension({ state, plugins, data }) {
    plugins.registerHook('onInit', () => {
        const container = document.getElementById('tasks-cards-container');
        if (container && !container._tasksRefreshInit) {
            container._tasksRefreshInit = true;
            container.addEventListener('charm:refresh', (e) => {
                const refreshTask = (async () => {
                    await loadTasksViaApi(state, data);
                    plugins.runHook('onRender');
                    const { showToast } = await import('../../components/feedback/toast.js');
                    showToast('Дані оновлено', 'success');
                })();
                if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
            });
        }

        // Add button (aside FAB only)
        setupAddButtons(state);

        // Expand/collapse all
        setupExpandCollapse();
    });
}

function setupExpandCollapse() {
    const expandBtn = document.getElementById('btn-expand-all');
    const collapseBtn = document.getElementById('btn-collapse-all');
    const container = document.getElementById('tasks-cards-container');
    if (expandBtn && !expandBtn._init) {
        expandBtn._init = true;
        expandBtn.addEventListener('click', () => {
            container?.querySelectorAll('[data-action="toggle-expand"]').forEach(btn => {
                const row = btn.closest('.pseudo-table-row');
                const reveal = row?.querySelector('.u-reveal');
                if (reveal && !reveal.classList.contains('is-open')) btn.click();
            });
        });
    }
    if (collapseBtn && !collapseBtn._init) {
        collapseBtn._init = true;
        collapseBtn.addEventListener('click', () => {
            container?.querySelectorAll('[data-action="toggle-expand"]').forEach(btn => {
                const row = btn.closest('.pseudo-table-row');
                const reveal = row?.querySelector('.u-reveal');
                if (reveal && reveal.classList.contains('is-open')) btn.click();
            });
        });
    }
}

function setupAddButtons(state) {
    ['btn-add-task-aside'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (!btn || btn._tasksAddInit) return;
        btn._tasksAddInit = true;
        btn.addEventListener('click', () => {
            const crud = state._crudModule;
            if (crud) crud.showAdd();
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM DATA LOADER (private spreadsheet — API instead of CSV)
// ═══════════════════════════════════════════════════════════════════════════

async function loadTasksViaApi(state, data) {
    const result = await callSheetsAPI('get', {
        range: `${SHEET_NAME}!A:N`,
        spreadsheetType: 'tasks'
    });

    if (!result || result.length <= 1) {
        state.tasks = [];
        state._dataLoaded = true;
        return;
    }

    const rows = result.slice(1);
    const username = window.currentUser?.username;
    const isAdmin = window.currentUser?.role === 'admin';

    state.tasks = rows
        .map((row, index) => {
            const record = {};
            COLUMN_IDS.forEach((key, i) => {
                record[key] = (row[i] != null ? String(row[i]).trim() : '');
            });
            record._rowIndex = index + 2;
            return record;
        })
        .filter(task => {
            if (isAdmin) return true;
            if (!username) return false;
            return task.created_by === username || task.assigned_to === username;
        });

    state._dataLoaded = true;
}

async function loadUsersForTasks(state) {
    try {
        const sheetNames = ['Users', 'Sheet1', 'Лист1', 'Аркуш1', 'users'];
        let result = null;
        for (const sheetName of sheetNames) {
            try {
                result = await callSheetsAPI('get', { range: `${sheetName}!A1:H`, spreadsheetType: 'users' });
                if (result && result.length > 0) break;
            } catch (e) { /* next */ }
        }
        if (!result || result.length <= 1) return;

        const headers = result[0];
        const usernameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'username');
        const displayNameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'display_name');

        const usersList = [];
        for (let i = 1; i < result.length; i++) {
            const row = result[i];
            const username = usernameIdx >= 0 ? row[usernameIdx]?.trim() : '';
            const displayName = displayNameIdx >= 0 ? row[displayNameIdx]?.trim() : '';
            if (username || displayName) {
                usersList.push({ username, display_name: displayName });
            }
        }
        state.usersList = usersList;
    } catch (error) {
        console.error('❌ Помилка завантаження юзерів:', error);
    }
}

// Export loaders for page config override
export { loadTasksViaApi, loadUsersForTasks };
