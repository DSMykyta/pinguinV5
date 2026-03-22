// js/engine/entity-crud.js

/**
 * ENTITY CRUD — Universal CRUD modal setup
 *
 * Combines createCrudModal + createFormHandler to auto-generate
 * the full CRUD lifecycle from config.
 */

import { createCrudModal } from '../components/crud/crud-main.js';
import { createFormHandler } from './entity-form.js';
import { showConfirmModal, closeModal } from '../components/modal/modal-main.js';
import { showToast } from '../components/feedback/toast.js';
import { createHighlightEditor } from '../components/editor/editor-main.js';
import { initSectionNav } from '../layout/layout-plugin-nav-sections.js';
import { initCustomSelects } from '../components/forms/select.js';

/**
 * Create a universal CRUD module for an entity
 *
 * @param {Object} config - Full entity config
 * @param {Object} data - Entity data layer (from createEntityData)
 * @param {Object} state - Page state
 * @param {Object} plugins - Plugin registry
 * @returns {{ showAdd, showEdit, getCurrentId }}
 */
export function createEntityCrud(config, data, state, plugins) {
    const { crud: crudConfig, dataSource, entityName } = config;
    if (!crudConfig) return null;

    // Create form handler from fields config
    const formHandler = createFormHandler(crudConfig.fields);

    // Initialize editors for 'editor' type fields
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

    // Initialize section navigation
    function initSectionNavigation() {
        if (!crudConfig.sectionNavId) return;
        const nav = document.getElementById(crudConfig.sectionNavId);
        const content = document.querySelector(`#modal-${crudConfig.modalId} .modal-body > main`);
        if (nav && content) initSectionNav(nav, content);
    }

    // Initialize custom selects in modal
    function initSelects() {
        const modalEl = document.getElementById(`modal-${crudConfig.modalId}`);
        if (modalEl) initCustomSelects(modalEl);
    }

    // Full modal component initialization
    async function initComponents() {
        initEditors();
        initSectionNavigation();
        initSelects();

        // Run custom init from extensions
        if (crudConfig.onInitComponents) {
            await crudConfig.onInitComponents({ formHandler, data, state });
        }
    }

    // Handle delete
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
            console.error(`[EntityCrud:${config.name}] Delete error:`, error);
            showToast(`Помилка видалення ${entityName}`, 'error');
        }
    }

    // Cleanup on modal close
    function handleCleanup() {
        formHandler.destroyEditors();
        if (crudConfig.onCleanup) {
            crudConfig.onCleanup({ formHandler, data, state });
        }
    }

    // Create the CRUD modal instance
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

    // Store reference in state for table to use
    state._crudModule = crud;

    return crud;
}
