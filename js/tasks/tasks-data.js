// js/tasks/tasks-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - DATA MANAGEMENT                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для задач.
 * Використовує CSV export для читання (мінімізація Vercel API запитів).
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * СТРУКТУРА КОЛОНОК Tasks (Google Sheets):
 * ┌─────────┬────────────────────┬─────────────────────────────────────────┐
 * │ Колонка │ Поле               │ Формат                                  │
 * ├─────────┼────────────────────┼─────────────────────────────────────────┤
 * │ A       │ id                 │ task-XXXXXX                             │
 * │ B       │ title              │ текст                                   │
 * │ C       │ description        │ текст (Markdown)                        │
 * │ D       │ type               │ task | info | script | reference        │
 * │ E       │ status             │ todo | in_progress | done | archived    │
 * │ F       │ priority           │ low | medium | high | urgent            │
 * │ G       │ created_by         │ user_id автора                          │
 * │ H       │ assigned_to        │ user_id виконавця (пусто = собі)        │
 * │ I       │ created_at         │ ISO datetime                            │
 * │ J       │ updated_at         │ ISO datetime                            │
 * │ K       │ due_date           │ YYYY-MM-DD (опціонально)                │
 * │ L       │ tags               │ теги через кому                         │
 * │ M       │ code_snippet       │ текст (код/скрипт)                      │
 * │ N       │ comments           │ JSON [{user, text, date}]               │
 * └─────────┴────────────────────┴─────────────────────────────────────────┘
 */

import { tasksState } from './tasks-state.js';
import { callSheetsAPI } from '../utils/api-client.js';

// Конфігурація таблиці Tasks
const SPREADSHEET_ID = '1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls';
const SHEET_NAME = 'Tasks';
const SHEET_GID = '2095262750';

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ (через Vercel API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити всі задачі через API
 * @returns {Promise<Array>} Масив задач
 */
export async function loadTasks() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEET_NAME}!A:N`,
            spreadsheetType: 'users'
        });

        // Backend повертає масив напряму, а не {values: [...]}
        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних в Tasks');
            tasksState.tasks = [];
            return tasksState.tasks;
        }

        // Пропустити заголовок, парсити дані
        const dataRows = result.slice(1);

        // Трансформувати дані (зберігаємо оригінальний індекс для _rowIndex)
        tasksState.tasks = dataRows
            .map((row, index) => ({
                id: row[0] || '',
                title: row[1] || '',
                description: row[2] || '',
                type: row[3] || 'task',
                status: row[4] || 'todo',
                priority: row[5] || 'medium',
                created_by: row[6] || '',
                assigned_to: row[7] || '',
                created_at: row[8] || '',
                updated_at: row[9] || '',
                due_date: row[10] || '',
                tags: row[11] || '',
                code_snippet: row[12] || '',
                comments: parseComments(row[13]),
                _rowIndex: index + 2 // +2 бо заголовок + 1-based indexing
            }))
            .filter(task => task.id); // Тільки рядки з ID

        return tasksState.tasks;
    } catch (error) {
        console.error('❌ Помилка завантаження задач:', error);
        throw error;
    }
}

/**
 * Завантажити список користувачів для мультиселекту
 * @returns {Promise<Array>} Масив користувачів {id, username, display_name, avatar}
 */
export async function loadUsers() {
    try {
        const result = await callSheetsAPI('get', {
            range: 'Users!A:H',
            spreadsheetType: 'users'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('⚠️ Немає даних в Users');
            tasksState.users = [];
            return tasksState.users;
        }

        // Пропустити заголовок
        const dataRows = result.slice(1);

        // Трансформувати дані (без пароля!)
        tasksState.users = dataRows
            .filter(row => row[0]) // Тільки рядки з ID
            .map(row => ({
                id: row[0] || '',
                username: row[1] || '',
                role: row[3] || 'viewer',
                display_name: row[6] || row[1] || '', // fallback to username
                avatar: row[7] || ''
            }));

        return tasksState.users;
    } catch (error) {
        console.error('❌ Помилка завантаження користувачів:', error);
        return [];
    }
}

/**
 * Отримати список користувачів
 * @returns {Array} Масив користувачів
 */
export function getUsers() {
    return tasksState.users || [];
}

/**
 * Отримати задачі з state
 * @returns {Array} Масив задач
 */
export function getTasks() {
    return tasksState.tasks || [];
}

/**
 * Знайти задачу за ID
 * @param {string} taskId - ID задачі
 * @returns {Object|null} Задача або null
 */
export function getTaskById(taskId) {
    return tasksState.tasks.find(t => t.id === taskId) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ФІЛЬТРАЦІЯ ЗАДАЧ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи користувач є в списку виконавців
 * @param {string} assignedTo - Рядок з ID через кому
 * @param {string} userId - ID користувача
 * @returns {boolean}
 */
function isUserAssigned(assignedTo, userId) {
    if (!assignedTo || !userId) return false;
    const assignees = assignedTo.split(',').map(id => id.trim());
    return assignees.includes(userId);
}

/**
 * Перевірити чи є інші виконавці крім автора
 * @param {string} assignedTo - Рядок з ID через кому
 * @param {string} creatorId - ID автора
 * @returns {boolean}
 */
function hasOtherAssignees(assignedTo, creatorId) {
    if (!assignedTo) return false;
    const assignees = assignedTo.split(',').map(id => id.trim());
    return assignees.some(id => id && id !== creatorId);
}

/**
 * Отримати задачі для поточного табу
 * @returns {Array} Відфільтровані задачі
 */
export function getTasksForCurrentTab() {
    const { tasks, activeTab, currentUserId, searchQuery, filters } = tasksState;

    if (!currentUserId) return [];

    let filtered = [...tasks];

    // Фільтр по табу
    switch (activeTab) {
        case 'my':
            // Мої задачі - створені мною (для контролю) АБО призначені мені
            filtered = filtered.filter(t =>
                t.created_by === currentUserId ||
                isUserAssigned(t.assigned_to, currentUserId)
            );
            break;
        case 'inbox':
            // Вхідні - призначені мені іншими (не мої)
            filtered = filtered.filter(t =>
                isUserAssigned(t.assigned_to, currentUserId) &&
                t.created_by !== currentUserId
            );
            break;
        case 'sent':
            // Вихідні - я створив і призначив іншим
            filtered = filtered.filter(t =>
                t.created_by === currentUserId &&
                hasOtherAssignees(t.assigned_to, currentUserId)
            );
            break;
    }

    // Фільтр по статусу
    if (filters.status.length > 0) {
        filtered = filtered.filter(t => filters.status.includes(t.status));
    }

    // Фільтр по пріоритету
    if (filters.priority.length > 0) {
        filtered = filtered.filter(t => filters.priority.includes(t.priority));
    }

    // Фільтр по типу
    if (filters.type.length > 0) {
        filtered = filtered.filter(t => filters.type.includes(t.type));
    }

    // Пошук
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(t =>
            t.title?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query) ||
            t.tags?.toLowerCase().includes(query) ||
            t.id?.toLowerCase().includes(query)
        );
    }

    return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════
// УТИЛІТИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Парсити JSON коментарів з колонки
 * @param {string} jsonStr - JSON рядок коментарів
 * @returns {Array} Масив коментарів [{user, text, date}]
 */
function parseComments(jsonStr) {
    if (!jsonStr) return [];
    try {
        const parsed = JSON.parse(jsonStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Серіалізувати коментарі в JSON
 * @param {Array} comments - Масив коментарів
 * @returns {string} JSON рядок
 */
function serializeComments(comments) {
    if (!comments || comments.length === 0) return '';
    return JSON.stringify(comments);
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD ОПЕРАЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Генерувати новий ID для задачі
 * @returns {string} Новий ID у форматі task-XXXXXX (6 цифр)
 */
function generateTaskId() {
    let maxNum = 0;

    tasksState.tasks.forEach(task => {
        if (task.id && task.id.startsWith('task-')) {
            const num = parseInt(task.id.replace('task-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    const newNum = maxNum + 1;
    return `task-${String(newNum).padStart(6, '0')}`;
}

/**
 * Підготувати рядок для збереження в Google Sheets
 * @param {Object} task - Об'єкт задачі
 * @returns {Array} Масив значень для рядка
 */
function prepareTaskRow(task) {
    return [
        task.id || '',                          // A: id
        task.title || '',                       // B: title
        task.description || '',                 // C: description
        task.type || 'task',                    // D: type
        task.status || 'todo',                  // E: status
        task.priority || 'medium',              // F: priority
        task.created_by || '',                  // G: created_by
        task.assigned_to || '',                 // H: assigned_to
        task.created_at || '',                  // I: created_at
        task.updated_at || '',                  // J: updated_at
        task.due_date || '',                    // K: due_date
        task.tags || '',                        // L: tags
        task.code_snippet || '',                // M: code_snippet
        serializeComments(task.comments)        // N: comments
    ];
}

/**
 * Додати нову задачу
 * @param {Object} taskData - Дані задачі
 * @returns {Promise<Object>} Додана задача
 */
export async function addTask(taskData) {
    try {
        const newId = generateTaskId();
        const now = new Date().toISOString();

        const newTask = {
            id: newId,
            title: taskData.title || '',
            description: taskData.description || '',
            type: taskData.type || 'task',
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            created_by: tasksState.currentUserId,
            assigned_to: taskData.assigned_to || '',
            created_at: now,
            updated_at: now,
            due_date: taskData.due_date || '',
            tags: taskData.tags || '',
            code_snippet: taskData.code_snippet || '',
            _rowIndex: tasksState.tasks.length + 2
        };

        const newRow = prepareTaskRow(newTask);

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:N`,
            values: [newRow],
            spreadsheetType: 'users'
        });

        tasksState.tasks.push(newTask);

        return newTask;
    } catch (error) {
        console.error('❌ Помилка додавання задачі:', error);
        throw error;
    }
}

/**
 * Оновити задачу
 * @param {string} taskId - ID задачі
 * @param {Object} updates - Оновлення
 * @returns {Promise<Object>} Оновлена задача
 */
export async function updateTask(taskId, updates) {
    try {
        const task = tasksState.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Задача ${taskId} не знайдена`);
        }

        // Перевірка прав - тільки автор може редагувати
        if (task.created_by !== tasksState.currentUserId) {
            throw new Error('Ви не можете редагувати чужі задачі');
        }

        const now = new Date().toISOString();

        // Оновити локальний об'єкт
        const updatedTask = {
            ...task,
            title: updates.title !== undefined ? updates.title : task.title,
            description: updates.description !== undefined ? updates.description : task.description,
            type: updates.type !== undefined ? updates.type : task.type,
            status: updates.status !== undefined ? updates.status : task.status,
            priority: updates.priority !== undefined ? updates.priority : task.priority,
            assigned_to: updates.assigned_to !== undefined ? updates.assigned_to : task.assigned_to,
            due_date: updates.due_date !== undefined ? updates.due_date : task.due_date,
            tags: updates.tags !== undefined ? updates.tags : task.tags,
            code_snippet: updates.code_snippet !== undefined ? updates.code_snippet : task.code_snippet,
            updated_at: now
        };

        const range = `${SHEET_NAME}!A${task._rowIndex}:M${task._rowIndex}`;
        const updatedRow = prepareTaskRow(updatedTask);

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'users'
        });

        // Оновити state
        Object.assign(task, updatedTask);

        return task;
    } catch (error) {
        console.error('❌ Помилка оновлення задачі:', error);
        throw error;
    }
}

/**
 * Видалити задачу (тільки свої)
 * @param {string} taskId - ID задачі
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
    try {
        const taskIndex = tasksState.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new Error(`Задача ${taskId} не знайдена`);
        }

        const task = tasksState.tasks[taskIndex];

        // Перевірка прав - тільки автор може видаляти
        if (task.created_by !== tasksState.currentUserId) {
            throw new Error('Ви не можете видаляти чужі задачі');
        }

        const rowIndex = task._rowIndex;
        await callSheetsAPI('batchUpdateSpreadsheet', {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: parseInt(SHEET_GID),
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }],
            spreadsheetType: 'users'
        });

        tasksState.tasks.splice(taskIndex, 1);
        tasksState.tasks.forEach(t => { if (t._rowIndex > rowIndex) t._rowIndex--; });

    } catch (error) {
        console.error('❌ Помилка видалення задачі:', error);
        throw error;
    }
}

/**
 * Швидка зміна статусу задачі (автор або виконавець)
 * @param {string} taskId - ID задачі
 * @param {string} newStatus - Новий статус
 * @returns {Promise<Object>} Оновлена задача
 */
export async function changeTaskStatus(taskId, newStatus) {
    try {
        const task = tasksState.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Задача ${taskId} не знайдена`);
        }

        // Перевірка прав - автор або виконавець
        const isAuthor = task.created_by === tasksState.currentUserId;
        const isAssignee = isUserAssigned(task.assigned_to, tasksState.currentUserId);

        if (!isAuthor && !isAssignee) {
            throw new Error('Ви не можете змінювати статус цієї задачі');
        }

        const now = new Date().toISOString();
        task.status = newStatus;
        task.updated_at = now;

        const range = `${SHEET_NAME}!E${task._rowIndex}:J${task._rowIndex}`;
        await callSheetsAPI('update', {
            range: range,
            values: [[newStatus, task.priority, task.created_by, task.assigned_to, task.created_at, now]],
            spreadsheetType: 'users'
        });

        return task;
    } catch (error) {
        console.error('❌ Помилка зміни статусу:', error);
        throw error;
    }
}

/**
 * Додати коментар до задачі (може будь-хто з доступом)
 * @param {string} taskId - ID задачі
 * @param {string} text - Текст коментаря
 * @returns {Promise<Object>} Оновлена задача
 */
export async function addComment(taskId, text) {
    try {
        const task = tasksState.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Задача ${taskId} не знайдена`);
        }

        const newComment = {
            user: tasksState.currentUserId,
            text: text.trim(),
            date: new Date().toISOString()
        };

        const comments = [...(task.comments || []), newComment];
        task.comments = comments;

        const range = `${SHEET_NAME}!N${task._rowIndex}`;
        await callSheetsAPI('update', {
            range: range,
            values: [[serializeComments(comments)]],
            spreadsheetType: 'users'
        });

        return task;
    } catch (error) {
        console.error('❌ Помилка додавання коментаря:', error);
        throw error;
    }
}

/**
 * Перевірити чи користувач може редагувати задачу
 * @param {Object} task - Задача
 * @returns {boolean}
 */
export function canEditTask(task) {
    return task.created_by === tasksState.currentUserId;
}

/**
 * Перевірити чи користувач може змінювати статус
 * @param {Object} task - Задача
 * @returns {boolean}
 */
export function canChangeStatus(task) {
    return task.created_by === tasksState.currentUserId ||
           isUserAssigned(task.assigned_to, tasksState.currentUserId);
}
