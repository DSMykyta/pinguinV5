// js/components/page/page-entity-crud.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE ENTITY CRUD — Універсальний CRUD модал            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Поєднує createCrudModal + createFormHandler для               ║
 * ║  автоматичного CRUD lifecycle з конфігурації.                            ║
 * ║                                                                          ║
 * ║  🎯 Використання:                                                        ║
 * ║  Викликається автоматично з page-entity.js — не імпортувати напряму.    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createCrudModal } from '../crud/crud-main.js';
import { createFormHandler } from './page-entity-form.js';
import { showConfirmModal, closeModal } from '../modal/modal-main.js';
import { showToast } from '../feedback/toast.js';
import { createHighlightEditor } from '../editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { initCustomSelects } from '../forms/select.js';

/**
 * Створити CRUD модуль для сутності
 *
 * @param {Object} config — Повна конфігурація сутності
 * @param {Object} data — Data layer (з createEntityData)
 * @param {Object} state — State об'єкт
 * @param {Object} plugins — Plugin registry
 * @returns {{ showAdd, showEdit, getCurrentId }}
 */
export function createEntityCrud(config, data, state, plugins) {
    const { crud: crudConfig, dataSource, entityName } = config;
    if (!crudConfig) return null;

    const formHandler = createFormHandler(crudConfig.fields);

    function initEditors() {
        const editorFields = crudConfig.fields.filter(f => f.type === 'editor');
        editorFields.forEach(f => {
            const container = document.getElementById(f.domId);
            if (container) {
                const editor = createHighlightEditor(container, { initialValue: '' });
                formHandler.setEditor(f.domId, editor);
            }
        });
    }

    function initSectionNavigation() {
        if (!crudConfig.sectionNavId) return;
        const nav = document.getElementById(crudConfig.sectionNavId);
        const content = document.querySelector(`#modal-${crudConfig.modalId} .modal-body > main`);
        if (nav && content) initSectionNav(nav, content);
    }

    function initSelects() {
        const modalEl = document.getElementById(`modal-${crudConfig.modalId}`);
        if (modalEl) initCustomSelects(modalEl);
    }

    async function initComponents() {
        initEditors();
        initSectionNavigation();
        initSelects();

        if (crudConfig.onInitComponents) {
            await crudConfig.onInitComponents({ formHandler, data, state });
        }
    }

    async function handleDelete(entityId) {
        const deleteConfig = crudConfig.deleteConfirm || {};
        const entity = data.getById(entityId);
        const displayName = entity
            ? (entity[deleteConfig.nameField] || entityId)
            : entityId;

        const confirmed = await showConfirmModal({
            action: deleteConfig.action || 'видалити',
            entity: deleteConfig.entity || entityName,
            name: displayName
        });

        if (!confirmed) return;

        try {
            await data.remove(entityId);
            showToast(`${entityName} ${entityId} видалено`, 'success');
            closeModal();
            plugins.runHook('onRender');
        } catch (error) {
            console.error(`[${config.name}] Помилка видалення:`, error);
            showToast(`Помилка видалення ${entityName}`, 'error');
        }
    }

    function handleCleanup() {
        formHandler.destroyEditors();
        if (crudConfig.onCleanup) {
            crudConfig.onCleanup({ formHandler, data, state });
        }
    }

    const crud = createCrudModal({
        modalId: crudConfig.modalId,
        titleId: crudConfig.titleId,
        deleteBtnId: crudConfig.deleteBtnId,
        saveBtnId: crudConfig.saveBtnId,
        saveCloseBtnId: crudConfig.saveCloseBtnId,
        entityName,
        addTitle: crudConfig.addTitle || `Новий ${entityName}`,
        getTitle: crudConfig.getTitle || ((entity) => entity[dataSource.idField] || entityName),
        getId: (entity) => entity?.[dataSource.idField] || null,
        getById: (id) => data.getById(id),
        add: (formData) => data.add(formData),
        update: (id, formData) => data.update(id, formData),
        getFormData: formHandler.getFormData,
        fillForm: formHandler.fillForm,
        clearForm: formHandler.clearForm,
        initComponents,
        onDelete: handleDelete,
        onCleanup: handleCleanup,
        plugins,
    });

    state._crudModule = crud;

    return crud;
}
