// js/pages/tasks/tasks-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - CRUD (МОДАЛ)                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — модал завдання: відкриття, заповнення, збереження.
 * Uses generic createCrudModal factory.
 */

import { registerHook } from './tasks-plugins.js';
import { tasksState } from './tasks-state.js';
import { addTask, updateTask, deleteTask, getTaskById, getTasks } from './tasks-data.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { populateSelect, reinitializeCustomSelect, initCustomSelects } from '../../components/forms/select.js';
import { initSectionNav, destroySectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { createCrudModal } from '../../components/crud/crud-main.js';
import { showConfirmModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { tasksPlugins } from './tasks-plugins.js';
import { generateNextId } from '../../utils/utils-id.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let descriptionEditor = null;

// ═══════════════════════════════════════════════════════════════════════════
// STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
    new:         'c-yellow',
    in_progress: 'c-blue',
    done:        'c-green',
    cancelled:   'c-red',
};

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initDescriptionEditor();
    initSectionNavigation();
    initStatusToggle();
    populateCategorySelect();
    populateAssignedToSelect();

    const modalEl = document.getElementById('modal-task-edit');
    if (modalEl) initCustomSelects(modalEl);
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════════════════════════════════════════

function initDescriptionEditor() {
    const container = document.getElementById('task-description-editor');
    if (!container) return;

    container.innerHTML = '';

    if (descriptionEditor) {
        descriptionEditor.destroy();
        descriptionEditor = null;
    }

    descriptionEditor = createHighlightEditor(container);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function initSectionNavigation() {
    const nav = document.getElementById('task-section-navigator');
    const contentArea = document.querySelector('#modal-task-edit .modal-body > main');
    if (nav && contentArea) initSectionNav(nav, contentArea);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS TOGGLE
// ═══════════════════════════════════════════════════════════════════════════

function initStatusToggle() {
    const statusSwitch = document.getElementById('task-status-switch');
    if (!statusSwitch || statusSwitch.dataset.toggleInited) return;
    statusSwitch.dataset.toggleInited = '1';

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
    badge.classList.add(STATUS_COLORS[status] || 'c-yellow');
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTS
// ═══════════════════════════════════════════════════════════════════════════

function populateCategorySelect() {
    populateSelect('task-category', [
        { value: 'терміново', text: 'Терміново' },
        { value: 'міграція', text: 'Міграція' },
        { value: 'задача', text: 'Задача' },
    ], { placeholder: '— Оберіть —' });
}

function populateAssignedToSelect() {
    const users = tasksState.usersList || [];
    populateSelect('task-assigned-to',
        users.map(u => ({ value: u.username, text: u.display_name || u.username })),
        { placeholder: '— Оберіть —' }
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILL / CLEAR FORM
// ═══════════════════════════════════════════════════════════════════════════

function fillTaskForm(task) {
    const idField = document.getElementById('task-id');
    if (idField) idField.value = task.task_id || '';

    const titleField = document.getElementById('task-title');
    if (titleField) titleField.value = task.title || '';

    const dueDateField = document.getElementById('task-due-date');
    if (dueDateField) dueDateField.value = task.due_date || '';

    // Selects
    const categoryField = document.getElementById('task-category');
    if (categoryField) {
        categoryField.value = task.category || '';
        reinitializeCustomSelect(categoryField);
    }

    const assignedToField = document.getElementById('task-assigned-to');
    if (assignedToField) {
        assignedToField.value = task.assigned_to || '';
        reinitializeCustomSelect(assignedToField);
    }

    // Status radio
    const statusRadio = document.querySelector(`input[name="task-status"][value="${task.status || 'new'}"]`);
    if (statusRadio) statusRadio.checked = true;

    updateStatusBadge();

    // Editor
    if (descriptionEditor) {
        descriptionEditor.setValue(task.description || '');
    }

    // Metadata (readonly)
    const createdByField = document.getElementById('task-created-by');
    if (createdByField) createdByField.value = task.created_by_display || task.created_by || '—';

    const createdAtField = document.getElementById('task-created-at');
    if (createdAtField) createdAtField.value = task.created_at || '—';

    const updatedAtField = document.getElementById('task-updated-at');
    if (updatedAtField) updatedAtField.value = task.updated_at || '—';

    const updatedByField = document.getElementById('task-updated-by');
    if (updatedByField) updatedByField.value = task.updated_by || '—';

    // Hook for comments
    tasksPlugins.runHook('onModalFill', task);
}

function clearTaskForm() {
    const idField = document.getElementById('task-id');
    if (idField) idField.value = '';

    const titleField = document.getElementById('task-title');
    if (titleField) titleField.value = '';

    const dueDateField = document.getElementById('task-due-date');
    if (dueDateField) dueDateField.value = '';

    const categoryField = document.getElementById('task-category');
    if (categoryField) categoryField.value = '';

    const assignedToField = document.getElementById('task-assigned-to');
    if (assignedToField) assignedToField.value = '';

    const statusRadio = document.querySelector('input[name="task-status"][value="new"]');
    if (statusRadio) statusRadio.checked = true;

    const badge = document.getElementById('task-status-badge');
    if (badge) badge.textContent = '';

    if (descriptionEditor) {
        descriptionEditor.setValue('');
    }

    const createdByField = document.getElementById('task-created-by');
    if (createdByField) createdByField.value = '—';

    const createdAtField = document.getElementById('task-created-at');
    if (createdAtField) createdAtField.value = '—';

    const updatedAtField = document.getElementById('task-updated-at');
    if (updatedAtField) updatedAtField.value = '—';

    const updatedByField = document.getElementById('task-updated-by');
    if (updatedByField) updatedByField.value = '—';
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getTaskFormData() {
    return {
        title: document.getElementById('task-title')?.value.trim() || '',
        description: descriptionEditor ? descriptionEditor.getValue() : '',
        category: document.getElementById('task-category')?.value.trim() || '',
        status: document.querySelector('input[name="task-status"]:checked')?.value || 'new',
        assigned_to: document.getElementById('task-assigned-to')?.value.trim() || '',
        due_date: document.getElementById('task-due-date')?.value.trim() || '',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleDeleteTask(taskId) {
    const task = getTaskById(taskId);
    const displayName = task ? (task.title || taskId) : taskId;

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'завдання',
        name: displayName
    });

    if (!confirmed) return;

    try {
        await deleteTask(taskId);
        showToast(`Завдання ${taskId} видалено`, 'success');
        closeModal();
        tasksPlugins.runHook('onRender');
    } catch (error) {
        console.error('[Tasks] Помилка видалення:', error);
        showToast('Помилка видалення завдання', 'error');
    }
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
    getTitle: (task) => task.title || 'Завдання',
    getById: getTaskById,
    add: addTask,
    update: updateTask,
    getFormData: getTaskFormData,
    fillForm: fillTaskForm,
    clearForm: clearTaskForm,
    initComponents: initModalComponents,
    onDelete: (taskId) => handleDeleteTask(taskId),
    onCleanup: () => {
        destroySectionNav(document.getElementById('task-section-navigator'));
        if (descriptionEditor) { descriptionEditor.destroy(); descriptionEditor = null; }
    },
    plugins: tasksPlugins,
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddTaskModal = crud.showAdd;
export const showEditTaskModal = crud.showEdit;

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    // No additional hooks needed — crud handles everything
}
