// js/pages/keywords/keywords-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - CRUD OPERATIONS                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Uses generic createCrudModal factory.
 */

import { keywordsData, keywordsState } from './keywords-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal, showModal, closeModal } from '../../components/modal/modal-main.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { createCrudModal } from '../../components/crud/crud-main.js';

// Data functions from engine
const getKeywords = () => keywordsData.getAll();
const addKeyword = (data) => keywordsData.add(data);
const updateKeyword = (id, data) => keywordsData.update(id, data);
const deleteKeyword = (id) => keywordsData.remove(id);

// ═══════════════════════════════════════════════════════════════════════════
// LEGO PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) { /* one-time setup — main orchestrates CRUD calls */ }

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let glossaryEditor = null;
let mapperDataCache = null;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getKeywordById(localId) {
    return getKeywords().find(k => k.local_id === localId) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    await initModalSelects();
    initGlossaryEditor();
    initParamTypeChangeHandler();
    initSectionNavigation();
    resetModalScroll();
}

function initGlossaryEditor() {
    const container = document.getElementById('keyword-glossary-editor-container');
    if (!container) return;

    container.innerHTML = '';

    if (glossaryEditor) {
        glossaryEditor.destroy();
        glossaryEditor = null;
    }

    glossaryEditor = createHighlightEditor(container);
}

function initParamTypeChangeHandler() {
    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    if (!paramTypeSelect) return;

    paramTypeSelect.addEventListener('change', async (e) => {
        const type = e.target.value;
        await loadEntitiesForType(type);
    });
}

function initSectionNavigation() {
    const nav = document.getElementById('keyword-section-navigator');
    const contentArea = document.querySelector('.modal-body > main');
    initSectionNav(nav, contentArea);
}

function resetModalScroll() {
    const contentArea = document.querySelector('.modal-body > main');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }

    const nav = document.getElementById('keyword-section-navigator');
    if (nav) {
        const navLinks = nav.querySelectorAll('.btn-icon.expand.touch[href]');
        navLinks.forEach((link, index) => {
            link.classList.toggle('active', index === 0);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getFormData() {
    return {
        local_id: document.getElementById('keyword-local-id')?.value.trim() || '',
        param_type: document.getElementById('keyword-param-type-select')?.value || '',
        parent_local_id: document.getElementById('keyword-parent-local-id')?.value || '',
        entity_identity_id: document.getElementById('keyword-entity-id')?.value || '',
        name_uk: document.getElementById('keyword-name-uk')?.value.trim() || '',
        name_ru: document.getElementById('keyword-name-ru')?.value.trim() || '',
        name_en: document.getElementById('keyword-name-en')?.value.trim() || '',
        name_lat: document.getElementById('keyword-name-lat')?.value.trim() || '',
        name_alt: document.getElementById('keyword-name-alt')?.value.trim() || '',
        trigers: document.getElementById('keyword-trigers')?.value.trim() || '',
        keywords_ua: document.getElementById('keyword-keywords-ua')?.value.trim() || '',
        keywords_ru: document.getElementById('keyword-keywords-ru')?.value.trim() || '',
        glossary_text: glossaryEditor ? glossaryEditor.getValue() : ''
    };
}

async function fillKeywordForm(keyword) {
    document.getElementById('keyword-local-id').value = keyword.local_id || '';
    document.getElementById('keyword-name-uk').value = keyword.name_uk || '';
    document.getElementById('keyword-name-ru').value = keyword.name_ru || '';
    document.getElementById('keyword-name-en').value = keyword.name_en || '';
    document.getElementById('keyword-name-lat').value = keyword.name_lat || '';
    document.getElementById('keyword-name-alt').value = keyword.name_alt || '';
    document.getElementById('keyword-trigers').value = keyword.trigers || '';
    document.getElementById('keyword-keywords-ua').value = keyword.keywords_ua || '';
    document.getElementById('keyword-keywords-ru').value = keyword.keywords_ru || '';

    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    const { reinitializeCustomSelect } = await import('../../components/forms/select.js');

    if (paramTypeSelect && keyword.param_type) {
        paramTypeSelect.value = keyword.param_type;
        reinitializeCustomSelect(paramTypeSelect);

        await loadEntitiesForType(keyword.param_type);

        const entitySelect = document.getElementById('keyword-entity-id');
        if (entitySelect && keyword.entity_identity_id) {
            entitySelect.value = keyword.entity_identity_id;
            reinitializeCustomSelect(entitySelect);
        }
    }

    const parentSelect = document.getElementById('keyword-parent-local-id');
    if (parentSelect && keyword.parent_local_id) {
        parentSelect.value = keyword.parent_local_id;
        reinitializeCustomSelect(parentSelect);
    }

    if (glossaryEditor) {
        glossaryEditor.setValue(keyword.glossary_text || '');
    }
}

function clearKeywordForm() {
    const localIdEl = document.getElementById('keyword-local-id');
    if (localIdEl) localIdEl.value = '';

    const paramTypeEl = document.getElementById('keyword-param-type-select');
    if (paramTypeEl) paramTypeEl.value = '';

    const parentEl = document.getElementById('keyword-parent-local-id');
    if (parentEl) parentEl.value = '';

    const entityEl = document.getElementById('keyword-entity-id');
    if (entityEl) {
        entityEl.innerHTML = '<option value="">-- Спочатку оберіть тип --</option>';
        entityEl.disabled = true;
    }

    const nameUkEl = document.getElementById('keyword-name-uk');
    if (nameUkEl) nameUkEl.value = '';

    const nameRuEl = document.getElementById('keyword-name-ru');
    if (nameRuEl) nameRuEl.value = '';

    const nameEnEl = document.getElementById('keyword-name-en');
    if (nameEnEl) nameEnEl.value = '';

    const nameLatEl = document.getElementById('keyword-name-lat');
    if (nameLatEl) nameLatEl.value = '';

    const nameAltEl = document.getElementById('keyword-name-alt');
    if (nameAltEl) nameAltEl.value = '';

    const trigersEl = document.getElementById('keyword-trigers');
    if (trigersEl) trigersEl.value = '';

    const keywordsUaEl = document.getElementById('keyword-keywords-ua');
    if (keywordsUaEl) keywordsUaEl.value = '';

    const keywordsRuEl = document.getElementById('keyword-keywords-ru');
    if (keywordsRuEl) keywordsRuEl.value = '';

    if (glossaryEditor) {
        glossaryEditor.setValue('');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTS
// ═══════════════════════════════════════════════════════════════════════════

async function initModalSelects() {
    const { reinitializeCustomSelect } = await import('../../components/forms/select.js');

    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    if (paramTypeSelect) {
        reinitializeCustomSelect(paramTypeSelect);
    }

    const entitySelect = document.getElementById('keyword-entity-id');
    if (entitySelect) {
        entitySelect.disabled = true;
        reinitializeCustomSelect(entitySelect);
    }

    const parentSelect = document.getElementById('keyword-parent-local-id');
    if (parentSelect) {
        const keywords = getKeywords();

        while (parentSelect.options.length > 1) {
            parentSelect.remove(1);
        }

        keywords.forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword.local_id;
            option.textContent = keyword.name_uk;
            parentSelect.appendChild(option);
        });

        reinitializeCustomSelect(parentSelect);
    }
}

async function loadEntitiesForType(type) {
    const entitySelect = document.getElementById('keyword-entity-id');
    if (!entitySelect) return;

    const { reinitializeCustomSelect } = await import('../../components/forms/select.js');

    entitySelect.innerHTML = '';

    if (!type || type === 'marketing' || type === 'other') {
        entitySelect.innerHTML = '<option value="">-- Не застосовується --</option>';
        entitySelect.disabled = true;
        reinitializeCustomSelect(entitySelect);
        return;
    }

    if (!mapperDataCache) {
        try {
            const { loadAllEntities, getCategories, getCharacteristics, getOptions } = await import('../../data/entities-data.js');

            if (!getCategories().length) {
                await loadAllEntities();
            }

            mapperDataCache = {
                categories: getCategories(),
                characteristics: getCharacteristics(),
                options: getOptions()
            };
        } catch (error) {
            console.warn('⚠️ Не вдалося завантажити дані Mapper:', error);
            entitySelect.innerHTML = '<option value="">-- Помилка завантаження --</option>';
            entitySelect.disabled = true;
            reinitializeCustomSelect(entitySelect);
            return;
        }
    }

    let entities = [];
    let labelField = 'name_ua';

    switch (type) {
        case 'category':
            entities = mapperDataCache.categories || [];
            labelField = 'name_ua';
            break;
        case 'characteristic':
            entities = mapperDataCache.characteristics || [];
            labelField = 'name_ua';
            break;
        case 'option':
            entities = mapperDataCache.options || [];
            labelField = 'value_ua';
            break;
    }

    entitySelect.disabled = false;
    entitySelect.innerHTML = '<option value="">-- Оберіть сутність --</option>';

    entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity.id;
        option.textContent = entity[labelField] || entity.id;
        entitySelect.appendChild(option);
    });

    reinitializeCustomSelect(entitySelect);
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const crud = createCrudModal({
    modalId: 'keywords-edit',
    titleId: 'keyword-modal-title',
    deleteBtnId: 'delete-keyword',
    saveBtnId: 'save-keyword',
    saveCloseBtnId: 'save-close-keyword',
    entityName: 'Ключове слово',
    addTitle: 'Додати дані',
    getTitle: (kw) => `Редагувати ${kw.name_uk}`,
    getById: getKeywordById,
    add: addKeyword,
    update: updateKeyword,
    getFormData,
    fillForm: fillKeywordForm,
    clearForm: clearKeywordForm,
    initComponents: initModalComponents,
    onBeforeSave: async (currentId, data) => {
        if (!data.name_uk) {
            showToast('Заповніть обов\'язкові поля (Назва)', 'error');
            throw new Error('Validation failed');
        }
    },
    onDelete: async (localId) => {
        const keyword = getKeywordById(localId);
        if (!keyword) return;

        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'ключове слово',
            name: keyword.name_uk,
        });
        if (!confirmed) return;

        try {
            await deleteKeyword(localId);
            showToast('Ключове слово видалено', 'success');
            closeModal();
        } catch (error) {
            console.error('❌ Помилка видалення:', error);
            showToast('Помилка видалення ключового слова', 'error');
        }
    },
    onCleanup: () => {
        if (glossaryEditor) { glossaryEditor.destroy(); glossaryEditor = null; }
    },
});


// ═══════════════════════════════════════════════════════════════════════════
// GLOSSARY MODAL (не CRUD, окрема функція)
// ═══════════════════════════════════════════════════════════════════════════

export async function showGlossaryModal(localId) {
    const keyword = getKeywordById(localId);

    if (!keyword) {
        showToast('Ключове слово не знайдено', 'error');
        return;
    }

    await showModal('glossary-view', null);

    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = `Глосарій: ${keyword.name_uk}`;

    const contentEl = document.getElementById('glossary-content');
    if (contentEl) {
        if (keyword.glossary_text && keyword.glossary_text.trim()) {
            contentEl.innerHTML = keyword.glossary_text;
        } else {
            contentEl.innerHTML = renderAvatarState('empty', {
                message: 'Текст глосарію відсутній',
                size: 'medium',
                containerClass: 'empty-state',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddKeywordModal = crud.showAdd;
export const showEditKeywordModal = crud.showEdit;
