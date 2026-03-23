// js/pages/tasks/tasks-cards.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — CARD RENDERING                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Рендер завдань як .block картки з .u-reveal expand/collapse.          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTasks, getTaskById, markTaskAsRead } from './tasks-data.js';
import { tasksState } from './tasks-state.js';
import { registerHook, runHook } from './tasks-plugins.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { safeJsonParse } from '../../utils/utils-json.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_TAG = {
    new:         { label: 'Нове',      color: 'c-yellow' },
    in_progress: { label: 'В роботі',  color: 'c-blue' },
    done:        { label: 'Готово',     color: 'c-green' },
    cancelled:   { label: 'Скасовано', color: 'c-red' },
};

// ═══════════════════════════════════════════════════════════════════════════
// PRE-FILTER
// ═══════════════════════════════════════════════════════════════════════════

function tasksPreFilter(data) {
    const { activeFilter, statusFilter, categoryFilter } = tasksState;
    const username = window.currentUser?.username;

    return data.filter(task => {
        if (activeFilter === 'assigned_to_me' && task.assigned_to !== username) return false;
        if (activeFilter === 'created_by_me' && task.created_by !== username) return false;
        if (statusFilter && task.status !== statusFilter) return false;
        if (categoryFilter && task.category !== categoryFilter) return false;
        return true;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH FILTER
// ═══════════════════════════════════════════════════════════════════════════

function searchFilter(tasks) {
    const container = document.getElementById('tasks-cards-container');
    const input = container?._charmSearchInput;
    const query = input?.value?.trim().toLowerCase() || '';
    if (!query) return tasks;

    const searchCols = tasksState.searchColumns || [];
    return tasks.filter(task =>
        searchCols.some(col => String(task[col] || '').toLowerCase().includes(query))
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER CARD HTML
// ═══════════════════════════════════════════════════════════════════════════

function renderCardHtml(task) {
    const username = window.currentUser?.username;
    const isAdmin = window.currentUser?.role === 'admin';
    const isAuthor = task.created_by === username;
    const canEdit = isAuthor || isAdmin;

    const status = STATUS_TAG[task.status] || STATUS_TAG.new;
    const isNew = task.is_new === '1' && task.assigned_to === username;

    // Comments count
    const comments = safeJsonParse(task.comments, []);
    const commentsCount = Array.isArray(comments) ? comments.length : 0;

    // Header info
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
                    ${commentsCount > 0 ? `<span class="body-s"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">chat</span> ${commentsCount}</span>` : ''}
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
                        ${task.created_at ? `
                            <div class="block-line">
                                <label class="block-line-label">Створено</label>
                                <span class="block-line-text">${escapeHtml(task.created_at)}</span>
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
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER ALL CARDS
// ═══════════════════════════════════════════════════════════════════════════

export function renderTaskCards() {
    const container = document.getElementById('tasks-cards-container');
    if (!container) return;

    let tasks = tasksPreFilter(getTasks());
    tasks = searchFilter(tasks);

    if (tasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="body-s">Завдання не знайдено</span></div>';
        return;
    }

    container.innerHTML = `<div class="block-group">${tasks.map(renderCardHtml).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════════════════════════════════════

function initClickHandlers() {
    const container = document.getElementById('tasks-cards-container');
    if (!container || container._tasksCardsInit) return;
    container._tasksCardsInit = true;

    container.addEventListener('click', async (e) => {
        // Edit button
        const editBtn = e.target.closest('[data-action="edit-task"]');
        if (editBtn) {
            e.stopPropagation();
            const taskId = editBtn.dataset.taskId;
            const { showEditTaskModal } = await import('./tasks-crud.js');
            showEditTaskModal(taskId);
            return;
        }

        // Toggle card expand/collapse
        const header = e.target.closest('[data-action="toggle-card"]');
        if (header) {
            const block = header.closest('.block');
            const reveal = block?.querySelector('.u-reveal');
            if (!reveal) return;

            const isExpanding = !reveal.classList.contains('is-open');
            reveal.classList.toggle('is-open');

            if (isExpanding) {
                const taskId = block.dataset.taskId;
                const task = getTaskById(taskId);
                if (!task) return;

                // Mark as read
                const username = window.currentUser?.username;
                if (task.is_new === '1' && task.assigned_to === username) {
                    await markTaskAsRead(taskId);
                    const badge = block.querySelector('.badge.c-blue');
                    if (badge) badge.remove();
                }

                // Render comments
                runHook('onCardExpand', task, block);
            }
            return;
        }

        // Add comment from card
        const commentBtn = e.target.closest('[data-action="add-card-comment"]');
        if (commentBtn) {
            const taskId = commentBtn.dataset.taskId;
            if (taskId) runHook('onCardAddComment', taskId, commentBtn.closest('.block'));
            return;
        }
    });

    // Enter on comment input
    container.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const input = e.target.closest('[data-card-comment-input]');
        if (!input) return;
        e.preventDefault();
        const taskId = input.dataset.taskId;
        if (taskId) runHook('onCardAddComment', taskId, input.closest('.block'));
    });

    // Search input listener
    const searchInput = container._charmSearchInput;
    if (searchInput) {
        let debounce = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => renderTaskCards(), 200);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onInit', () => {
        renderTaskCards();
        initClickHandlers();
    });
    registerHook('onRender', () => {
        renderTaskCards();
    });
}
