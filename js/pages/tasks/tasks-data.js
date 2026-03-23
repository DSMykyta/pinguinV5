// js/pages/tasks/tasks-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      TASKS — DATA                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Завантаження та CRUD через Google Sheets API                 ║
 * ║  + завантаження юзерів для dropdown assigned_to                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * СТРУКТУРА КОЛОНОК Tasks (Google Sheets):
 * ┌─────────┬─────────────────────┬─────────────────────────────────────────┐
 * │ Колонка │ Поле                │ Формат                                  │
 * ├─────────┼─────────────────────┼─────────────────────────────────────────┤
 * │ A       │ task_id             │ task-XXXXXX                             │
 * │ B       │ title               │ текст                                   │
 * │ C       │ description         │ HTML текст                              │
 * │ D       │ category            │ терміново | міграція | задача            │
 * │ E       │ status              │ new | in_progress | done | cancelled    │
 * │ F       │ created_by          │ username автора                          │
 * │ G       │ assigned_to         │ username виконавця                       │
 * │ H       │ due_date            │ YYYY-MM-DD                              │
 * │ I       │ created_at          │ YYYY-MM-DD HH:MM:SS                     │
 * │ J       │ updated_at          │ YYYY-MM-DD HH:MM:SS                     │
 * │ K       │ updated_by          │ username                                │
 * │ L       │ comments            │ JSON масив                              │
 * │ M       │ created_by_display  │ display_name автора                     │
 * │ N       │ is_new              │ 1 | 0                                   │
 * └─────────┴─────────────────────┴─────────────────────────────────────────┘
 */

import { tasksState } from './tasks-state.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { generateNextId } from '../../utils/utils-id.js';

const SHEET_NAME = 'Tasks';
const SHEET_GID = '2095262750';
const SHEET_RANGE = `${SHEET_NAME}!A:N`;
const COLUMN_IDS = [
    'task_id', 'title', 'description', 'category', 'status',
    'created_by', 'assigned_to', 'due_date', 'created_at',
    'updated_at', 'updated_by', 'comments', 'created_by_display', 'is_new'
];

function nowDateTime() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function normalizeRecord(record = {}) {
    const normalized = {};
    COLUMN_IDS.forEach((key) => {
        normalized[key] = record[key] != null ? String(record[key]).trim() : '';
    });
    return normalized;
}

function buildRow(record) {
    return COLUMN_IDS.map(key => record[key] ?? '');
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ
// ═══════════════════════════════════════════════════════════════════════════

export async function loadTasks() {
    try {
        const result = await callSheetsAPI('get', {
            range: SHEET_RANGE,
            spreadsheetType: 'tasks'
        });

        if (!result || result.length <= 1) {
            tasksState.tasks = [];
            tasksState._dataLoaded = true;
            return tasksState.tasks;
        }

        const headers = result[0];
        const rows = result.slice(1);

        const username = window.currentUser?.username;
        const isAdmin = window.currentUser?.role === 'admin';

        tasksState.tasks = rows
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

        tasksState._dataLoaded = true;
        return tasksState.tasks;
    } catch (error) {
        console.error('❌ Помилка завантаження завдань:', error);
        throw error;
    }
}

export function getTasks() {
    return tasksState.tasks || [];
}

export function getTaskById(taskId) {
    return tasksState.tasks.find(t => t.task_id === taskId) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function addTask(taskData = {}) {
    try {
        const normalized = normalizeRecord({
            ...taskData,
            task_id: generateNextId('task-', tasksState.tasks.map(t => t.task_id)),
            created_by: window.currentUser?.username || '',
            created_by_display: window.currentUser?.display_name || window.currentUser?.username || '',
            created_at: nowDateTime(),
            updated_at: nowDateTime(),
            updated_by: window.currentUser?.username || '',
            status: taskData.status || 'new',
            is_new: '1',
        });

        await callSheetsAPI('append', {
            range: SHEET_RANGE,
            values: [buildRow(normalized)],
            spreadsheetType: 'tasks'
        });

        const newEntry = {
            ...normalized,
            _rowIndex: tasksState.tasks.length + 2
        };
        tasksState.tasks.push(newEntry);
        return newEntry;
    } catch (error) {
        console.error('❌ Помилка додавання завдання:', error);
        throw error;
    }
}

export async function updateTask(taskId, updates = {}) {
    try {
        const entry = getTaskById(taskId);
        if (!entry) {
            throw new Error(`Завдання ${taskId} не знайдено`);
        }

        const merged = normalizeRecord({
            ...entry,
            ...updates,
            updated_at: nowDateTime(),
            updated_by: window.currentUser?.username || '',
        });

        await callSheetsAPI('update', {
            range: `${SHEET_NAME}!A${entry._rowIndex}:N${entry._rowIndex}`,
            values: [buildRow(merged)],
            spreadsheetType: 'tasks'
        });

        Object.assign(entry, merged);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення завдання:', error);
        throw error;
    }
}

export async function deleteTask(taskId) {
    try {
        const index = tasksState.tasks.findIndex(t => t.task_id === taskId);
        if (index === -1) {
            throw new Error(`Завдання ${taskId} не знайдено`);
        }

        const entry = tasksState.tasks[index];
        const rowIndex = entry._rowIndex;

        await callSheetsAPI('batchUpdateSpreadsheet', {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: parseInt(SHEET_GID, 10),
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }],
            spreadsheetType: 'tasks'
        });

        tasksState.tasks.splice(index, 1);
        tasksState.tasks.forEach(t => {
            if (t._rowIndex > rowIndex) t._rowIndex -= 1;
        });

        return true;
    } catch (error) {
        console.error('❌ Помилка видалення завдання:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MARK AS READ
// ═══════════════════════════════════════════════════════════════════════════

export async function markTaskAsRead(taskId) {
    try {
        const entry = getTaskById(taskId);
        if (!entry) return;

        entry.is_new = '0';

        await callSheetsAPI('update', {
            range: `${SHEET_NAME}!N${entry._rowIndex}`,
            values: [['0']],
            spreadsheetType: 'tasks'
        });
    } catch (error) {
        console.error('❌ Помилка позначення як прочитане:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ЮЗЕРІВ
// ═══════════════════════════════════════════════════════════════════════════

export async function loadUsersForTasks() {
    try {
        const sheetNames = ['Users', 'Sheet1', 'Лист1', 'Аркуш1', 'users'];
        let result = null;

        for (const sheetName of sheetNames) {
            try {
                result = await callSheetsAPI('get', {
                    range: `${sheetName}!A1:H`,
                    spreadsheetType: 'users'
                });
                if (result && result.length > 0) break;
            } catch (e) {
                // next sheet
            }
        }

        if (!result || result.length <= 1) {
            return;
        }

        const headers = result[0];
        const usernameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'username');
        const displayNameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'display_name');
        const avatarIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'avatar');

        const usersList = [];
        const usersMap = {};

        for (let i = 1; i < result.length; i++) {
            const row = result[i];
            const username = usernameIdx >= 0 ? row[usernameIdx]?.trim() : '';
            const displayName = displayNameIdx >= 0 ? row[displayNameIdx]?.trim() : '';
            const avatar = avatarIdx >= 0 ? row[avatarIdx]?.trim() : '';

            if (username || displayName) {
                usersList.push({ username, display_name: displayName });
                if (displayName && avatar) {
                    usersMap[displayName] = avatar;
                    usersMap[displayName.toLowerCase()] = avatar;
                }
            }
        }

        tasksState.usersList = usersList;
        tasksState.usersMap = usersMap;
    } catch (error) {
        console.error('❌ Помилка завантаження юзерів:', error);
    }
}
