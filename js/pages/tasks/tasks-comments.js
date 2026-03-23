// js/pages/tasks/tasks-comments.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — COMMENTS                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTaskById, updateTask } from './tasks-data.js';
import { registerHook, runHook } from './tasks-plugins.js';
import { safeJsonParse } from '../../utils/utils-json.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// ADD COMMENT
// ═══════════════════════════════════════════════════════════════════════════

async function addComment(taskId, contextEl) {
    // Find comment input: either in modal or in card block
    const input = contextEl
        ? contextEl.querySelector('[data-card-comment-input]')
        : document.getElementById('task-comment-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const task = getTaskById(taskId);
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
        await updateTask(taskId, { comments: JSON.stringify(comments) });
        input.value = '';

        // Re-render comments in context
        if (contextEl) {
            const cardCommentsEl = contextEl.querySelector('[data-card-comments]');
            renderCommentsIntoContainer(task, cardCommentsEl);
        } else {
            renderCommentsIntoContainer(task, document.getElementById('task-comments-container'));
        }

        showToast('Коментар додано', 'success');
    } catch (error) {
        console.error('Помилка додавання коментаря:', error);
        showToast('Помилка додавання коментаря', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

let _currentTaskId = null;

export function init() {
    // Modal: render comments when form is filled
    registerHook('onModalFill', (task) => {
        _currentTaskId = task.task_id;
        renderCommentsIntoContainer(task, document.getElementById('task-comments-container'));
    });

    registerHook('onModalOpen', (task) => {
        const btn = document.getElementById('btn-add-comment');
        const input = document.getElementById('task-comment-input');

        if (btn && !btn._commentsInit) {
            btn._commentsInit = true;
            btn.addEventListener('click', () => {
                if (_currentTaskId) addComment(_currentTaskId, null);
            });
        }

        if (input && !input._commentsInit) {
            input._commentsInit = true;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && _currentTaskId) {
                    e.preventDefault();
                    addComment(_currentTaskId, null);
                }
            });
        }
    });

    registerHook('onModalClose', () => {
        _currentTaskId = null;
    });

    // Card: render comments when card is expanded
    registerHook('onCardExpand', (task, block) => {
        const cardCommentsEl = block.querySelector('[data-card-comments]');
        renderCommentsIntoContainer(task, cardCommentsEl);
    });

    // Card: add comment from inline input
    registerHook('onCardAddComment', (taskId, block) => {
        addComment(taskId, block);
    });
}
