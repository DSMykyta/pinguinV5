// js/pages/tasks/tasks-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — STATE                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔒 ЯДРО — Стан модуля завдань.
 *
 * СТРУКТУРА КОЛОНОК Tasks (Google Sheets):
 * A: task_id | B: title | C: description | D: category | E: status
 * F: created_by | G: assigned_to | H: due_date | I: created_at
 * J: updated_at | K: updated_by | L: comments | M: created_by_display | N: is_new
 */

import { createPageState } from '../../components/page/page-state.js';

export const tasksState = createPageState({
    searchColumns: ['task_id', 'title', 'description', 'created_by_display', 'assigned_to'],
    visibleColumns: ['task_id', 'title', 'category', 'status', 'created_by_display', 'assigned_to', 'due_date'],

    custom: {
        tasks: [],
        _dataLoaded: false,

        // Фільтри
        activeFilter: 'all',
        statusFilter: null,
        categoryFilter: null,

        // Юзери
        usersMap: {},
        usersList: [],
    }
});
