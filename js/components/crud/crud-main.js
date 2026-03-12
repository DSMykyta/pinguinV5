// js/components/crud/crud-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRUD MODAL — Generic Factory                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Фабрика CRUD модалу. Замінює повторюваний lifecycle:                   ║
 * ║  showAdd → clear → initComponents                                       ║
 * ║  showEdit → fetch → fill → initComponents                               ║
 * ║  save → getFormData → add/update → toast → close                       ║
 * ║  cleanup → destroy editors, reset state                                 ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ:                                                           ║
 * ║  const crud = createCrudModal({                                          ║
 * ║      modalId: 'brand-edit',                                              ║
 * ║      titleId: 'brand-modal-title',                                       ║
 * ║      deleteBtnId: 'btn-delete-brand',                                    ║
 * ║      saveBtnId: 'btn-save-brand',                                        ║
 * ║      saveCloseBtnId: 'save-close-brand',                                 ║
 * ║      entityName: 'Бренд',                                                ║
 * ║      getById: (id) => getBrandById(id),                                  ║
 * ║      add: (data) => addBrand(data),                                      ║
 * ║      update: (id, data) => updateBrand(id, data),                        ║
 * ║      getFormData: () => getBrandFormData(),                               ║
 * ║      fillForm: (entity) => fillBrandForm(entity),                        ║
 * ║      clearForm: () => clearBrandForm(),                                  ║
 * ║      initComponents: () => initModalComponents(),                        ║
 * ║      onDelete: (id) => showDeleteConfirm(id),                            ║
 * ║      onSaved: () => { runHook('onRender'); },                            ║
 * ║      onCleanup: () => { destroyEditors(); },                             ║
 * ║      plugins: pluginRegistry,                                            ║
 * ║  });                                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showModal, closeModal } from '../modal/modal-main.js';
import { showToast } from '../feedback/toast.js';

/**
 * Створити CRUD модал
 * @param {Object} config
 * @returns {{ showAdd, showEdit, getCurrentId, refreshModal }}
 */
export function createCrudModal(config) {
    const {
        modalId,
        titleId,
        deleteBtnId,
        saveBtnId,
        saveCloseBtnId,
        entityName = 'Запис',
        getById,
        add,
        update,
        getFormData,
        fillForm,
        clearForm,
        initComponents,
        generateId = null,
        onDelete = null,
        onBeforeSave = null,
        onAfterSave = null,
        onCleanup = null,
        plugins = null,
    } = config;

    let currentId = null;

    // ── Show Add ──
    async function showAdd() {
        currentId = null;

        await showModal(modalId, null);

        const title = document.getElementById(titleId);
        if (title) title.textContent = `${entityName}`;

        const deleteBtn = document.getElementById(deleteBtnId);
        if (deleteBtn) deleteBtn.classList.add('u-hidden');

        clearForm();
        await initComponents();

        if (generateId) {
            generateId();
        }

        initSaveHandlers();

        if (plugins) plugins.runHook('onModalOpen', null);
    }

    // ── Show Edit ──
    async function showEdit(entityId) {
        const entity = getById(entityId);
        if (!entity) {
            showToast(`${entityName} not found`, 'error');
            return;
        }

        currentId = entityId;

        await showModal(modalId, null);

        const title = document.getElementById(titleId);
        if (title) title.textContent = `${entity.name_uk || entityName}`;

        const deleteBtn = document.getElementById(deleteBtnId);
        if (deleteBtn) {
            deleteBtn.classList.remove('u-hidden');
            if (onDelete) deleteBtn.onclick = () => onDelete(entityId);
        }

        await initComponents();
        fillForm(entity);

        initSaveHandlers();

        if (plugins) plugins.runHook('onModalOpen', entity);
    }

    // ── Save ──
    async function handleSave(shouldClose = true) {
        const data = getFormData();

        try {
            if (onBeforeSave) await onBeforeSave(currentId, data);

            if (currentId) {
                await update(currentId, data);
                showToast(`${entityName} updated`, 'success');
                if (plugins) plugins.runHook('onUpdate', currentId, data);
            } else {
                const newEntity = await add(data);
                showToast(`${entityName} added`, 'success');
                if (plugins) plugins.runHook('onAdd', newEntity);
            }

            if (onAfterSave) await onAfterSave(currentId, data);

            if (shouldClose) closeModal();
            if (plugins) {
                plugins.runHook('onModalClose');
                plugins.runHook('onRender');
            }
        } catch (error) {
            console.error(`CRUD save error [${modalId}]:`, error);
            showToast(`Error saving ${entityName}`, 'error');
        }
    }

    // ── Save Handlers ──
    function initSaveHandlers() {
        const saveBtn = document.getElementById(saveBtnId);
        if (saveBtn) saveBtn.onclick = () => handleSave(false);

        const saveCloseBtn = document.getElementById(saveCloseBtnId);
        if (saveCloseBtn) saveCloseBtn.onclick = () => handleSave(true);
    }

    // ── Cleanup (on modal close) ──
    function cleanup() {
        currentId = null;
        if (onCleanup) onCleanup();
    }

    // Auto-listen for modal close
    document.addEventListener('modal-closed', (e) => {
        if (e.detail?.modalId !== modalId) return;
        cleanup();
    });

    // ── Refresh (for polling / BroadcastChannel) ──
    function refreshModal(isManual = false) {
        if (!currentId) return;
        const entity = getById(currentId);
        if (!entity) return;

        const snapshot = getFormData();
        fillForm(entity);

        if (!isManual) {
            showToast('Data updated by another user', 'info', {
                duration: 8000,
                action: {
                    label: 'Undo',
                    onClick: () => fillForm(snapshot),
                }
            });
        }
    }

    return {
        showAdd,
        showEdit,
        handleSave,
        refreshModal,
        getCurrentId: () => currentId,
    };
}
