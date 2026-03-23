// js/pages/tasks/tasks-table.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — TABLE RENDERING                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTasks } from './tasks-data.js';
import { tasksState } from './tasks-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { registerHook } from './tasks-plugins.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { escapeHtml } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('tasks', {
    edit: async (rowId) => {
        const { showEditTaskModal } = await import('./tasks-crud.js');
        await showEditTaskModal(rowId);
    }
});

let _tasksManagedTable = null;
let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

function getColumns() {
    const username = window.currentUser?.username;

    return [
        col('task_id', 'ID', 'tag', { span: 1, sortable: true }),
        col('title', 'Назва', 'name', {
            span: 3,
            sortable: true,
            render: (value, row) => {
                const safe = escapeHtml(value || '');
                if (row.is_new === '1' && row.assigned_to === username) {
                    return `${safe} <span class="badge c-blue">новий</span>`;
                }
                return safe;
            }
        }),
        col('category', 'Категорія', 'text', { span: 1, sortable: true, filterable: true }),
        col('status', 'Статус', 'status-dot', { span: 1, sortable: true, filterable: true }),
        col('created_by_display', 'Автор', 'text', { span: 1, sortable: true }),
        col('assigned_to', 'Виконавець', 'text', { span: 1, sortable: true }),
        col('due_date', 'Дедлайн', 'code', { span: 1, sortable: true })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-FILTER
// ═══════════════════════════════════════════════════════════════════════════

function tasksPreFilter(data) {
    const { activeFilter, statusFilter, categoryFilter } = tasksState;
    const username = window.currentUser?.username;

    return data.filter(task => {
        // Aside filter
        if (activeFilter === 'assigned_to_me' && task.assigned_to !== username) return false;
        if (activeFilter === 'created_by_me' && task.created_by !== username) return false;

        // Status filter
        if (statusFilter && task.status !== statusFilter) return false;

        // Category filter
        if (categoryFilter && task.category !== categoryFilter) return false;

        return true;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initTasksTable() {
    const visibleCols = [
        'task_id', 'title', 'category', 'status',
        'created_by_display', 'assigned_to', 'due_date'
    ];

    const searchCols = [
        'task_id', 'title', 'description',
        'created_by_display', 'assigned_to'
    ];

    _tasksManagedTable = createManagedTable({
        container: 'tasks-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getTasks(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.task_id,
                context: 'tasks'
            }),
            getRowId: (row) => row.task_id,
            emptyState: { message: 'Завдання не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'tasks');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        task_id: 'string',
                        title: 'string',
                        category: 'string',
                        status: 'string',
                        created_by_display: 'string',
                        assigned_to: 'string',
                        due_date: 'string'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'category', label: 'Категорія', filterType: 'values' },
                        { id: 'status', label: 'Статус', filterType: 'values' }
                    ]
                }
            }
        },
        preFilter: tasksPreFilter,
        pageSize: null,
        checkboxPrefix: 'tasks'
    });

    tasksState.tableAPI = _tasksManagedTable.tableAPI;
    tasksState.managedTable = _tasksManagedTable;
    initColumnsCharm();
}

export function renderTasksTable() {
    if (!_tasksManagedTable) {
        if (!document.getElementById('tasks-table-container')) return;
        initTasksTable();
        return;
    }
    _tasksManagedTable.updateData(getTasks());
}

export function init() {
    registerHook('onInit', () => {
        renderTasksTable();
    });
    registerHook('onRender', () => {
        if (tasksState.managedTable) {
            tasksState.managedTable.refilter();
        }
    });
}
