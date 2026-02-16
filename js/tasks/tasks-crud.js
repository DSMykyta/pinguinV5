// js/tasks/tasks-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - CRUD PLUGIN                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Модальні вікна для додавання, редагування та перегляду задач.
 * Використовує систему модалок ui-modal.js.
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { tasksState } from './tasks-state.js';
import { addTask, updateTask, deleteTask, getTaskById, getUsers } from './tasks-data.js';
import { runHook, registerTasksPlugin, registerOptionalFunction } from './tasks-plugins.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects, populateSelect } from '../common/ui-select.js';
import { createHighlightEditor } from '../common/editor/editor-main.js';
import { getEditorOptions } from '../common/editor/editor-configs.js';

// Екземпляр редактора опису
let descriptionEditor = null;

// ═══════════════════════════════════════════════════════════════════════════
// ПОКАЗ МОДАЛОК
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модалку додавання задачі
 */
export async function showAddTaskModal() {
    await showModal('task-edit');

    // Чекаємо поки модал відкриється
    setTimeout(() => {
        initTaskEditModal(null);
    }, 100);
}

/**
 * Показати модалку редагування задачі
 */
export async function showEditTaskModal(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        showToast('Задачу не знайдено', 'error');
        return;
    }

    await showModal('task-edit');

    // Чекаємо поки модал відкриється
    setTimeout(() => {
        initTaskEditModal(task);
    }, 100);
}

/**
 * Показати модалку перегляду задачі
 */
export async function showTaskViewModal(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        showToast('Задачу не знайдено', 'error');
        return;
    }

    // Використаємо ту саму модалку редагування в режимі read-only
    await showModal('task-edit');

    setTimeout(() => {
        initTaskEditModal(task, true);
    }, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати модалку редагування
 * @param {Object|null} task - Задача для редагування (null = нова)
 * @param {boolean} readOnly - Режим тільки для читання
 */
function initTaskEditModal(task, readOnly = false) {
    const modal = document.getElementById('modal-task-edit');
    if (!modal) return;

    const isEdit = !!task;
    const isOwner = task ? task.created_by === tasksState.currentUserId : true;

    // Заголовок
    const title = modal.querySelector('#task-modal-title');
    if (title) {
        if (readOnly) {
            title.textContent = task?.title || 'Перегляд задачі';
        } else {
            title.textContent = isEdit ? 'Редагування задачі' : 'Нова задача';
        }
    }

    // Бейдж типу
    const typeBadge = modal.querySelector('#task-type-badge');

    // Заповнити поля (без description - він в редакторі, без assigned_to - він multiselect)
    const fields = {
        'task-id': task?.id || '',
        'task-title': task?.title || '',
        'task-type': task?.type || 'task',
        'task-priority': task?.priority || 'medium',
        'task-status': task?.status || 'todo',
        'task-due-date': task?.due_date || '',
        'task-tags': task?.tags || '',
        'task-code-snippet': task?.code_snippet || ''
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = modal.querySelector(`#${id}`);
        if (el) {
            if (el.tagName === 'SELECT') {
                el.value = value;
            } else {
                el.value = value;
            }

            // Read-only режим
            if (readOnly || (!isOwner && isEdit)) {
                el.disabled = true;
            } else {
                el.disabled = false;
            }
        }
    });

    // Заповнити мультиселект користувачів
    const users = getUsers();
    const usersItems = users.map(u => ({
        value: u.id,
        text: u.display_name || u.username
    }));

    // Парсити assigned_to з comma-separated в масив
    const selectedAssignees = task?.assigned_to
        ? task.assigned_to.split(',').map(id => id.trim()).filter(Boolean)
        : [];

    populateSelect('task-assigned-to', usersItems, {
        placeholder: '-- Оберіть виконавців --',
        selectedValues: selectedAssignees,
        reinit: true
    });

    // Disabled для read-only
    const assignedSelect = modal.querySelector('#task-assigned-to');
    if (assignedSelect && (readOnly || (!isOwner && isEdit))) {
        assignedSelect.disabled = true;
    }

    // Ініціалізувати кастомні селекти (крім assigned_to - він вже ініціалізований)
    modal.querySelectorAll('select[data-custom-select]:not(#task-assigned-to)').forEach(sel => {
        if (!sel.closest('.custom-select-wrapper')) {
            initCustomSelects(sel.parentElement);
        }
    });

    // Ініціалізувати rich editor для опису
    const editorContainer = modal.querySelector('#task-description-editor');
    if (editorContainer) {
        // Знищити попередній екземпляр
        if (descriptionEditor) {
            descriptionEditor.destroy();
            descriptionEditor = null;
        }

        const isEditable = !readOnly && (isOwner || !isEdit);

        if (isEditable) {
            descriptionEditor = createHighlightEditor(editorContainer, getEditorOptions('task-description', {
                initialValue: task?.description || '',
            }));
        } else {
            // Read-only режим - показати як текст
            editorContainer.innerHTML = `<div class="text-viewer">${task?.description || '<em>Немає опису</em>'}</div>`;
        }
    }

    // Оновити бейдж типу
    if (typeBadge) {
        const typeLabels = {
            task: 'Задача',
            info: 'Інформація',
            script: 'Скрипт',
            reference: 'Референс'
        };
        typeBadge.textContent = typeLabels[task?.type] || 'Задача';
    }

    // Кнопка збереження
    const saveBtn = modal.querySelector('#btn-save-task');
    if (saveBtn) {
        if (readOnly || (!isOwner && isEdit)) {
            saveBtn.classList.add('u-hidden');
        } else {
            saveBtn.classList.remove('u-hidden');
            saveBtn.onclick = async () => {
                await handleSave(modal, task?.id);
            };
        }
    }

    // Кнопка видалення
    const deleteBtn = modal.querySelector('#btn-delete-task');
    if (deleteBtn) {
        if (isEdit && isOwner && !readOnly) {
            deleteBtn.classList.remove('u-hidden');
            deleteBtn.onclick = async () => {
                await handleDelete(task.id);
            };
        } else {
            deleteBtn.classList.add('u-hidden');
        }
    }

    // Ініціалізувати sidebar навігацію
    initSidebarNavigation(modal);

    // Фокус на назву
    if (!readOnly) {
        const titleInput = modal.querySelector('#task-title');
        if (titleInput) titleInput.focus();
    }
}

/**
 * Ініціалізувати sidebar навігацію в модалці
 */
function initSidebarNavigation(modal) {
    const navItems = modal.querySelectorAll('.sidebar-nav-item[href^="#"]');
    const contentArea = modal.querySelector('.modal-fullscreen-content');
    const sections = modal.querySelectorAll('section[id^="section-task-"]');

    if (!contentArea || sections.length === 0) return;

    // Клік по навігації
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            const targetSection = modal.querySelector(`#${targetId}`);

            if (targetSection) {
                // Оновити активний пункт
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Скролити до секції
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll spy - оновлення активного пункту при прокрутці
    const observerOptions = {
        root: contentArea,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navItems.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

// ═══════════════════════════════════════════════════════════════════════════
// ОБРОБНИКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зберегти задачу
 */
async function handleSave(modal, taskId) {
    const title = modal.querySelector('#task-title')?.value?.trim();
    if (!title) {
        showToast('Введіть назву задачі', 'warning');
        return;
    }

    // Отримати опис з редактора
    const description = descriptionEditor ? descriptionEditor.getValue() : '';

    // Отримати вибраних виконавців з мультиселекту
    const assignedSelect = modal.querySelector('#task-assigned-to');
    const assignedTo = assignedSelect
        ? Array.from(assignedSelect.selectedOptions).map(opt => opt.value).filter(Boolean).join(',')
        : '';

    const taskData = {
        title,
        description,
        type: modal.querySelector('#task-type')?.value || 'task',
        priority: modal.querySelector('#task-priority')?.value || 'medium',
        status: modal.querySelector('#task-status')?.value || 'todo',
        due_date: modal.querySelector('#task-due-date')?.value || '',
        tags: modal.querySelector('#task-tags')?.value?.trim() || '',
        code_snippet: modal.querySelector('#task-code-snippet')?.value || '',
        assigned_to: assignedTo
    };

    const saveBtn = modal.querySelector('#btn-save-task');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span><span>Збереження...</span>';
    }

    try {
        if (taskId) {
            await updateTask(taskId, taskData);
            showToast('Задачу оновлено', 'success');
            runHook('onTaskUpdate', taskId);
        } else {
            const newTask = await addTask(taskData);
            showToast('Задачу створено', 'success');
            runHook('onTaskAdd', newTask);
        }

        closeModal('task-edit');
        runHook('onRender');

    } catch (error) {
        showToast(error.message || 'Помилка збереження', 'error');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span><span>Зберегти</span>';
        }
    }
}

/**
 * Видалити задачу
 */
async function handleDelete(taskId) {
    if (!confirm('Видалити цю задачу?')) return;

    try {
        await deleteTask(taskId);
        showToast('Задачу видалено', 'success');
        runHook('onTaskDelete', taskId);
        closeModal('task-edit');
        runHook('onRender');

    } catch (error) {
        showToast(error.message || 'Помилка видалення', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

registerOptionalFunction('showAddTaskModal', showAddTaskModal);
registerOptionalFunction('showEditTaskModal', showEditTaskModal);
registerOptionalFunction('showTaskViewModal', showTaskViewModal);
