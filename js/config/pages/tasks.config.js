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
            created_at: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
            updated_at: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
            created_by: () => window.currentUser?.username || '',
            created_by_display: () => window.currentUser?.display_name || window.currentUser?.username || '',
            updated_by: () => window.currentUser?.username || '',
            status: () => 'new',
            is_new: () => '1',
        },
    },

    table: {
        containerId: 'tasks-cards-container',
        columns: [],
        actions: [],
        _skipEngineTable: true,
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

        onInitComponents: ({ data, state }) => {
            populateCategorySelect();
            populateAssignedToSelect(state);
            initStatusBadge();
        },
    },

    page: {
        containers: ['tasks-cards-container'],
    },

    extensions: [dataLoaderExtension, cardsExtension, commentsExtension, filtersExtension, usersExtension, uiExtension],
};

// ═══════════════════════════════════════════════════════════════════════════
// CRUD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function populateCategorySelect() {
    populateSelect('task-category', [
        { value: 'терміново', text: 'Терміново' },
        { value: 'міграція', text: 'Міграція' },
        { value: 'задача', text: 'Задача' },
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

function cardsExtension({ state, plugins, data }) {

    function tasksPreFilter(tasks) {
        const { activeFilter, statusFilter, categoryFilter } = state;
        const username = window.currentUser?.username;
        return tasks.filter(task => {
            if (activeFilter === 'assigned_to_me' && task.assigned_to !== username) return false;
            if (activeFilter === 'created_by_me' && task.created_by !== username) return false;
            if (statusFilter && task.status !== statusFilter) return false;
            if (categoryFilter && task.category !== categoryFilter) return false;
            return true;
        });
    }

    function searchFilter(tasks) {
        const container = document.getElementById('tasks-cards-container');
        const input = container?._charmSearchInput;
        const query = input?.value?.trim().toLowerCase() || '';
        if (!query) return tasks;
        const searchCols = ['task_id', 'title', 'description', 'created_by_display', 'assigned_to'];
        return tasks.filter(task =>
            searchCols.some(col => String(task[col] || '').toLowerCase().includes(query))
        );
    }

    function renderCardHtml(task) {
        const username = window.currentUser?.username;
        const isAdmin = window.currentUser?.role === 'admin';
        const canEdit = task.created_by === username || isAdmin;
        const status = STATUS_TAG[task.status] || STATUS_TAG.new;
        const isNew = task.is_new === '1' && task.assigned_to === username;
        const comments = safeJsonParse(task.comments, []);
        const commentsCount = Array.isArray(comments) ? comments.length : 0;
        const dueDateStr = task.due_date ? ` · ${escapeHtml(task.due_date)}` : '';
        const assignedStr = task.assigned_to ? escapeHtml(task.assigned_to) : '';

        return `
            <div class="block" data-task-id="${escapeHtml(task.task_id)}">
                <div class="block-header" data-action="toggle-card">
                    <div class="group">
                        <h3>${escapeHtml(task.title || 'Без назви')}</h3>
                        ${isNew ? '<span class="badge c-blue">новий</span>' : ''}
                        <span class="tag ${status.color}">${status.label}</span>
                        ${task.category ? `<span class="tag">${escapeHtml(task.category)}</span>` : ''}
                    </div>
                    <div class="group">
                        <span class="body-s">${assignedStr}${dueDateStr}</span>
                        ${commentsCount > 0 ? `<span class="body-s"><span class="material-symbols-outlined">chat</span> ${commentsCount}</span>` : ''}
                        ${canEdit ? `
                            <button class="btn-icon" data-action="edit-task" data-task-id="${escapeHtml(task.task_id)}" aria-label="Редагувати">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="u-reveal">
                    <div>
                        <div class="block-list">
                            <div class="block-line">
                                <label class="block-line-label">Автор</label>
                                <span class="block-line-text">${escapeHtml(task.created_by_display || task.created_by || '—')}</span>
                            </div>
                            <div class="block-line">
                                <label class="block-line-label">Виконавець</label>
                                <span class="block-line-text">${escapeHtml(task.assigned_to || '—')}</span>
                            </div>
                            ${task.description ? `
                                <div class="block-line">
                                    <label class="block-line-label">Опис</label>
                                    <span class="block-line-text">${task.description}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="block-list" data-card-comments></div>
                        <div class="block-list">
                            <div class="content-bloc"><div class="content-line"><div class="input-box">
                                <input type="text" data-card-comment-input data-task-id="${escapeHtml(task.task_id)}" placeholder="Додати коментар...">
                                <button class="btn-icon" data-action="add-card-comment" data-task-id="${escapeHtml(task.task_id)}" aria-label="Надіслати">
                                    <span class="material-symbols-outlined">send</span>
                                </button>
                            </div></div></div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function renderCards() {
        const container = document.getElementById('tasks-cards-container');
        if (!container) return;
        let tasks = tasksPreFilter(data.getAll());
        tasks = searchFilter(tasks);
        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="body-s">Завдання не знайдено</span></div>';
            return;
        }
        container.innerHTML = `<div class="block-group">${tasks.map(renderCardHtml).join('')}</div>`;
    }

    function initClickHandlers() {
        const container = document.getElementById('tasks-cards-container');
        if (!container || container._tasksCardsInit) return;
        container._tasksCardsInit = true;

        container.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('[data-action="edit-task"]');
            if (editBtn) {
                e.stopPropagation();
                const crud = state._crudModule;
                if (crud) crud.showEdit(editBtn.dataset.taskId);
                return;
            }
            const header = e.target.closest('[data-action="toggle-card"]');
            if (header) {
                const block = header.closest('.block');
                const reveal = block?.querySelector('.u-reveal');
                if (!reveal) return;
                const isExpanding = !reveal.classList.contains('is-open');
                reveal.classList.toggle('is-open');
                if (isExpanding) {
                    const taskId = block.dataset.taskId;
                    const task = data.getById(taskId);
                    if (!task) return;
                    const username = window.currentUser?.username;
                    if (task.is_new === '1' && task.assigned_to === username) {
                        task.is_new = '0';
                        const badge = block.querySelector('.badge.c-blue');
                        if (badge) badge.remove();
                        callSheetsAPI('update', {
                            range: `${SHEET_NAME}!N${task._rowIndex}`,
                            values: [['0']],
                            spreadsheetType: 'tasks'
                        }).catch(() => {});
                    }
                    plugins.runHook('onCardExpand', task, block);
                }
                return;
            }
            const commentBtn = e.target.closest('[data-action="add-card-comment"]');
            if (commentBtn) {
                const taskId = commentBtn.dataset.taskId;
                if (taskId) plugins.runHook('onCardAddComment', taskId, commentBtn.closest('.block'));
                return;
            }
        });

        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const input = e.target.closest('[data-card-comment-input]');
            if (!input) return;
            e.preventDefault();
            const taskId = input.dataset.taskId;
            if (taskId) plugins.runHook('onCardAddComment', taskId, input.closest('.block'));
        });

        const searchInput = container._charmSearchInput;
        if (searchInput) {
            let debounce = null;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => renderCards(), 200);
            });
        }
    }

    plugins.registerHook('onInit', () => { renderCards(); initClickHandlers(); });
    plugins.registerHook('onRender', renderCards);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSION: COMMENTS
// ═══════════════════════════════════════════════════════════════════════════

function commentsExtension({ state, plugins, data }) {
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
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
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
// EXTENSION: FILTERS
// ═══════════════════════════════════════════════════════════════════════════

function filtersExtension({ state, plugins }) {
    state.activeFilter = 'all';
    state.statusFilter = null;
    state.categoryFilter = null;

    const FILTER_MAP = {
        all:                { activeFilter: 'all',            statusFilter: null },
        assigned_to_me:     { activeFilter: 'assigned_to_me', statusFilter: null },
        created_by_me:      { activeFilter: 'created_by_me',  statusFilter: null },
        status_new:         { activeFilter: null,              statusFilter: 'new' },
        status_in_progress: { activeFilter: null,              statusFilter: 'in_progress' },
        status_done:        { activeFilter: null,              statusFilter: 'done' },
    };

    plugins.registerHook('onInit', () => {
        const aside = document.querySelector('.aside-body');
        if (!aside || aside._tasksFilterInit) return;
        aside._tasksFilterInit = true;
        aside.addEventListener('click', (e) => {
            const item = e.target.closest('.panel-item[data-filter]');
            if (!item) return;
            const mapping = FILTER_MAP[item.dataset.filter];
            if (!mapping) return;
            if (mapping.activeFilter !== null) { state.activeFilter = mapping.activeFilter; state.statusFilter = null; }
            if (mapping.statusFilter !== null) { state.statusFilter = mapping.statusFilter; state.activeFilter = 'all'; }
            aside.querySelectorAll('.panel-item[data-filter]').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            plugins.runHook('onRender');
        });
    });
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

        // Check new tasks
        const username = window.currentUser?.username;
        if (username) {
            const newTasks = data.getAll().filter(t => t.is_new === '1' && t.assigned_to === username);
            if (newTasks.length > 0) {
                import('../../components/feedback/toast.js').then(({ showToast }) => {
                    showToast(`У вас ${newTasks.length} нових завдань!`, 'info');
                });
            }
        }

        // Add buttons
        setupAddButtons(state);
    });
}

function setupAddButtons(state) {
    ['btn-add-task', 'btn-add-task-aside'].forEach(btnId => {
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
