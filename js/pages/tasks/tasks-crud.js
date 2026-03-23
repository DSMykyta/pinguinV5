// js/pages/tasks/tasks-crud.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — CRUD (MODAL)                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTasks, getTaskById, addTask, updateTask, deleteTask, markTaskAsRead } from './tasks-data.js';
import { tasksState } from './tasks-state.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal, closeModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { runHook } from './tasks-plugins.js';
import { createCrudModal } from '../../components/crud/crud-main.js';
import { tasksPlugins } from './tasks-plugins.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let descriptionEditor = null;

const DEFAULTS = {
    category: ['терміново', 'міграція', 'задача']
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getDynamicOptions(fieldName, currentValue = '') {
    const fromData = getTasks()
        .map(item => String(item[fieldName] || '').trim())
        .filter(Boolean);
    if (currentValue) fromData.push(String(currentValue).trim());
    return [...new Set([...(DEFAULTS[fieldName] || []), ...fromData])].sort((a, b) => a.localeCompare(b));
}

function v(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL INIT
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initDescriptionEditor();
    initSectionNavigation();
    populateSelects();
    initStatusToggle();
}

function initDescriptionEditor() {
    const container = document.getElementById('task-description-editor');
    if (container) {
        descriptionEditor = createHighlightEditor(container, { initialValue: '' });
    }
}

function initSectionNavigation() {
    const nav = document.getElementById('task-section-navigator');
    const content = document.querySelector('[data-modal-id="task-edit"] .modal-body > main');
    if (nav && content) initSectionNav(nav, content);
}

function populateSelects() {
    // Category
    const catEl = document.getElementById('task-category');
    if (catEl) {
        const options = getDynamicOptions('category');
        catEl.innerHTML = '<option value="">— Оберіть —</option>' +
            options.map(val => `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`).join('');
    }

    // Assigned to (users)
    const assignEl = document.getElementById('task-assigned-to');
    if (assignEl) {
        const users = tasksState.usersList || [];
        assignEl.innerHTML = '<option value="">— Оберіть —</option>' +
            users.map(u => {
                const label = u.display_name ? `${u.display_name} (${u.username})` : u.username;
                return `<option value="${escapeHtml(u.username)}">${escapeHtml(label)}</option>`;
            }).join('');
    }

    const modalEl = document.querySelector('[data-modal-id="task-edit"]');
    if (modalEl) initCustomSelects(modalEl);
}

function initStatusToggle() {
    const statusSwitch = document.getElementById('task-status-switch');
    if (!statusSwitch) return;

    statusSwitch.addEventListener('change', () => {
        updateStatusBadge();
    });
}

function updateStatusBadge() {
    const badge = document.getElementById('task-status-badge');
    if (!badge) return;

    const status = document.querySelector('input[name="task-status"]:checked')?.value || 'new';
    badge.textContent = crud.getCurrentId() || '';
    badge.classList.remove('c-green', 'c-yellow', 'c-red', 'c-blue');

    if (status === 'done') badge.classList.add('c-green');
    else if (status === 'in_progress') badge.classList.add('c-blue');
    else if (status === 'cancelled') badge.classList.add('c-red');
    else badge.classList.add('c-yellow');
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

function applyPermissions(task) {
    const isAuthor = task.created_by === window.currentUser?.username;
    const isAdmin = window.currentUser?.role === 'admin';
    const canEdit = isAuthor || isAdmin;

    // Inputs
    ['task-title', 'task-category', 'task-assigned-to', 'task-due-date'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (canEdit) {
            el.removeAttribute('disabled');
            el.removeAttribute('readonly');
        } else {
            if (el.tagName === 'SELECT') el.setAttribute('disabled', '');
            else el.setAttribute('readonly', '');
        }
    });

    // Description editor
    const editorContainer = document.getElementById('task-description-editor');
    if (editorContainer) {
        if (!canEdit) editorContainer.setAttribute('readonly', '');
        else editorContainer.removeAttribute('readonly');
    }

    // Status switch
    const statusSwitch = document.getElementById('task-status-switch');
    if (statusSwitch) {
        statusSwitch.querySelectorAll('input').forEach(input => {
            input.disabled = !canEdit;
        });
    }

    // Save / delete buttons
    ['btn-save-task', 'save-close-task'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('u-hidden', !canEdit);
    });

    const deleteBtn = document.getElementById('btn-delete-task');
    if (deleteBtn && !canEdit) deleteBtn.classList.add('u-hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
// FILL / CLEAR FORM
// ═══════════════════════════════════════════════════════════════════════════

async function fillTaskForm(task) {
    set('task-id', task.task_id);
    set('task-title', task.title);
    set('task-category', task.category);
    set('task-assigned-to', task.assigned_to);
    set('task-due-date', task.due_date);
    set('task-created-by', task.created_by_display || task.created_by || '—');
    set('task-created-at', task.created_at || '—');
    set('task-updated-by', task.updated_by || '—');
    set('task-updated-at', task.updated_at || '—');

    // Status radio
    const statusRadio = document.querySelector(`input[name="task-status"][value="${task.status || 'new'}"]`);
    if (statusRadio) statusRadio.checked = true;

    updateStatusBadge();

    // Editor
    if (descriptionEditor) descriptionEditor.setValue(task.description || '');

    // Permissions
    applyPermissions(task);

    // Mark as read if assigned_to is current user and is_new
    const username = window.currentUser?.username;
    if (task.assigned_to === username && task.is_new === '1') {
        await markTaskAsRead(task.task_id);
        runHook('onRender');
    }

    // Render comments via hook
    runHook('onModalFill', task);
}

function clearTaskForm() {
    ['task-id', 'task-title', 'task-category', 'task-assigned-to', 'task-due-date'].forEach(id => set(id, ''));

    set('task-created-by', '—');
    set('task-created-at', '—');
    set('task-updated-by', '—');
    set('task-updated-at', '—');

    const statusRadio = document.querySelector('input[name="task-status"][value="new"]');
    if (statusRadio) statusRadio.checked = true;

    const badge = document.getElementById('task-status-badge');
    if (badge) badge.textContent = '';

    if (descriptionEditor) descriptionEditor.setValue('');

    // Reset permissions for new task (author = current user)
    ['task-title', 'task-category', 'task-assigned-to', 'task-due-date'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
    });

    ['btn-save-task', 'save-close-task'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('u-hidden');
    });

    // Clear comments
    const commentsContainer = document.getElementById('task-comments-container');
    if (commentsContainer) commentsContainer.innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getTaskFormData() {
    return {
        title: v('task-title'),
        category: v('task-category'),
        assigned_to: v('task-assigned-to'),
        due_date: v('task-due-date'),
        status: document.querySelector('input[name="task-status"]:checked')?.value || 'new',
        description: descriptionEditor ? descriptionEditor.getValue() : '',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const crud = createCrudModal({
    modalId: 'task-edit',
    titleId: 'task-modal-title',
    deleteBtnId: 'btn-delete-task',
    saveBtnId: 'btn-save-task',
    saveCloseBtnId: 'save-close-task',
    entityName: 'Завдання',
    addTitle: 'Нове завдання',
    getTitle: (task) => task.title || `Завдання ${task.task_id}`,
    getId: (t) => t?.task_id || null,
    getById: getTaskById,
    add: addTask,
    update: updateTask,
    getFormData: getTaskFormData,
    fillForm: fillTaskForm,
    clearForm: clearTaskForm,
    initComponents: initModalComponents,
    onDelete: async (taskId) => {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'завдання',
            name: taskId
        });
        if (!confirmed) return;
        try {
            await deleteTask(taskId);
            showToast(`Завдання ${taskId} видалено`, 'success');
            closeModal();
            runHook('onRender');
        } catch (error) {
            console.error('Помилка видалення завдання:', error);
            showToast('Помилка видалення завдання', 'error');
        }
    },
    onCleanup: () => {
        if (descriptionEditor) { descriptionEditor.destroy(); descriptionEditor = null; }
    },
    plugins: tasksPlugins,
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddTaskModal = crud.showAdd;
export const showEditTaskModal = crud.showEdit;
export const getCurrentTaskId = crud.getCurrentId;
