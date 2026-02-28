// js/pages/keywords/keywords-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - CRUD OPERATIONS                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { addKeyword, updateKeyword, deleteKeyword, getKeywords } from './keywords-data.js';
import { renderKeywordsTable } from './keywords-table.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-confirm.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// LEGO PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) { /* one-time setup — main orchestrates CRUD calls */ }

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let glossaryEditor = null; // UI Editor instance для глосарію
let mapperDataCache = null; // Кеш даних Mapper
export async function showAddKeywordModal() {

    await showModal('keywords-edit', null);

    const modalEl = document.querySelector('[data-modal-id="keywords-edit"]');

    const title = document.getElementById('keyword-modal-title');
    if (title) title.textContent = 'Додати дані';

    const deleteBtn = document.getElementById('delete-keyword');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearKeywordForm();
    await initModalSelects();
    initGlossaryEditor();
    initParamTypeChangeHandler();

    // Ініціалізувати навігацію по секціях
    initSectionNavigation();

    // Скинути скрол на початок
    resetModalScroll();

    // Обробник закриття
    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-keyword');
    if (saveBtn) saveBtn.onclick = () => handleSaveNewKeyword(false);

    const saveCloseBtn = document.getElementById('save-close-keyword');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveNewKeyword(true);
}

export async function showEditKeywordModal(localId) {

    const keywords = getKeywords();
    const keyword = keywords.find(k => k.local_id === localId);

    if (!keyword) {
        showToast('Ключове слово не знайдено', 'error');
        return;
    }

    await showModal('keywords-edit', null);

    const modalEl = document.querySelector('[data-modal-id="keywords-edit"]');

    const title = document.getElementById('keyword-modal-title');
    if (title) title.textContent = `Редагувати ${keyword.name_uk}`;

    const deleteBtn = document.getElementById('delete-keyword');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteKeywordConfirm(localId);
        };
    }

    // Ініціалізувати селекти та заповнити їх
    await initModalSelects();
    initGlossaryEditor();
    initParamTypeChangeHandler();

    // Заповнити форму даними (включаючи завантаження сутностей для типу)
    await fillKeywordForm(keyword);

    // Ініціалізувати навігацію по секціях
    initSectionNavigation();

    // Скинути скрол на початок
    resetModalScroll();

    // Обробник закриття
    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-keyword');
    if (saveBtn) saveBtn.onclick = () => handleUpdateKeyword(localId, false);

    const saveCloseBtn = document.getElementById('save-close-keyword');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleUpdateKeyword(localId, true);
}

export async function showDeleteKeywordConfirm(localId) {

    const keywords = getKeywords();
    const keyword = keywords.find(k => k.local_id === localId);

    if (!keyword) {
        showToast('Ключове слово не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити ключове слово?',
        message: `Ви впевнені, що хочете видалити "${keyword.name_uk}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'danger'
    });

    if (confirmed) {
        await handleDeleteKeyword(localId);
    }
}

export async function showGlossaryModal(localId) {

    const keywords = getKeywords();
    const keyword = keywords.find(k => k.local_id === localId);

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

async function handleSaveNewKeyword(shouldClose = true) {
    try {
        const keywordData = getFormData();

        if (!keywordData.name_uk) {
            showToast('Заповніть обов\'язкові поля (Назва)', 'error');
            return;
        }

        await addKeyword(keywordData);

        showToast('Ключове слово додано', 'success');
        if (shouldClose) closeModal();
        renderKeywordsTable();
    } catch (error) {
        console.error('❌ Помилка додавання:', error);
        showToast('Помилка додавання ключового слова', 'error');
    }
}

async function handleUpdateKeyword(localId, shouldClose = true) {
    try {
        const keywordData = getFormData();

        if (!keywordData.name_uk) {
            showToast('Заповніть обов\'язкові поля (Назва)', 'error');
            return;
        }

        await updateKeyword(localId, keywordData);

        showToast('Ключове слово оновлено', 'success');
        if (shouldClose) closeModal();
        renderKeywordsTable();
    } catch (error) {
        console.error('❌ Помилка оновлення:', error);
        showToast('Помилка оновлення ключового слова', 'error');
    }
}

async function handleDeleteKeyword(localId) {
    try {
        await deleteKeyword(localId);

        showToast('Ключове слово видалено', 'success');
        renderKeywordsTable();
    } catch (error) {
        console.error('❌ Помилка видалення:', error);
        showToast('Помилка видалення ключового слова', 'error');
    }
}

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
    // Заповнити всі поля
    document.getElementById('keyword-local-id').value = keyword.local_id || '';
    document.getElementById('keyword-name-uk').value = keyword.name_uk || '';
    document.getElementById('keyword-name-ru').value = keyword.name_ru || '';
    document.getElementById('keyword-name-en').value = keyword.name_en || '';
    document.getElementById('keyword-name-lat').value = keyword.name_lat || '';
    document.getElementById('keyword-name-alt').value = keyword.name_alt || '';
    document.getElementById('keyword-trigers').value = keyword.trigers || '';
    document.getElementById('keyword-keywords-ua').value = keyword.keywords_ua || '';
    document.getElementById('keyword-keywords-ru').value = keyword.keywords_ru || '';

    // Встановити тип параметра і оновити селект
    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    const { reinitializeCustomSelect } = await import('../../components/forms/select.js');

    if (paramTypeSelect && keyword.param_type) {
        paramTypeSelect.value = keyword.param_type;
        // Оновити кастомний селект типу
        reinitializeCustomSelect(paramTypeSelect);

        // Завантажити сутності для цього типу
        await loadEntitiesForType(keyword.param_type);

        // Встановити значення entity
        const entitySelect = document.getElementById('keyword-entity-id');
        if (entitySelect && keyword.entity_identity_id) {
            entitySelect.value = keyword.entity_identity_id;
            // Оновити кастомний селект
            reinitializeCustomSelect(entitySelect);
        }
    }

    // Встановити батьківський елемент
    const parentSelect = document.getElementById('keyword-parent-local-id');
    if (parentSelect && keyword.parent_local_id) {
        parentSelect.value = keyword.parent_local_id;
        reinitializeCustomSelect(parentSelect);
    }

    // Заповнити редактор глосарію
    if (glossaryEditor) {
        glossaryEditor.setValue(keyword.glossary_text || '');
    }
}

function clearKeywordForm() {
    // Очистити всі поля
    const localIdEl = document.getElementById('keyword-local-id');
    if (localIdEl) localIdEl.value = '';

    const paramTypeEl = document.getElementById('keyword-param-type-select');
    if (paramTypeEl) paramTypeEl.value = '';

    const parentEl = document.getElementById('keyword-parent-local-id');
    if (parentEl) parentEl.value = '';

    const entityEl = document.getElementById('keyword-entity-id');
    if (entityEl) {
        // Скинути до початкового стану
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

    // Очистити редактор глосарію
    if (glossaryEditor) {
        glossaryEditor.setValue('');
    }
}

/**
 * Ініціалізувати текстовий редактор для глосарію
 */
function initGlossaryEditor() {
    const container = document.getElementById('keyword-glossary-editor-container');
    if (!container) return;

    // Очистити попередній редактор
    container.innerHTML = '';

    if (glossaryEditor) {
        glossaryEditor.destroy();
        glossaryEditor = null;
    }

    glossaryEditor = createHighlightEditor(container);
}

/**
 * Ініціалізувати обробник зміни типу параметра
 */
function initParamTypeChangeHandler() {
    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    if (!paramTypeSelect) return;

    paramTypeSelect.addEventListener('change', async (e) => {
        const type = e.target.value;
        await loadEntitiesForType(type);
    });
}

/**
 * Завантажити сутності з Mapper для вибраного типу
 */
async function loadEntitiesForType(type) {
    const entitySelect = document.getElementById('keyword-entity-id');
    if (!entitySelect) return;

    const { reinitializeCustomSelect } = await import('../../components/forms/select.js');

    // Очистити попередні опції
    entitySelect.innerHTML = '';

    // Якщо тип не обраний або marketing/other - вимкнути select
    if (!type || type === 'marketing' || type === 'other') {
        entitySelect.innerHTML = '<option value="">-- Не застосовується --</option>';
        entitySelect.disabled = true;
        reinitializeCustomSelect(entitySelect);
        return;
    }

    // Завантажити дані з Mapper (якщо ще не завантажено)
    if (!mapperDataCache) {
        try {
            const { mapperState } = await import('../mapper/mapper-state.js');
            const { loadMapperData } = await import('../mapper/mapper-data.js');

            // Перевіряємо чи є дані
            if (!mapperState.categories?.length) {
                await loadMapperData();
            }

            mapperDataCache = mapperState;
        } catch (error) {
            console.warn('⚠️ Не вдалося завантажити дані Mapper:', error);
            entitySelect.innerHTML = '<option value="">-- Помилка завантаження --</option>';
            entitySelect.disabled = true;
            reinitializeCustomSelect(entitySelect);
            return;
        }
    }

    // Вибрати відповідний масив даних
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

    // Заповнити select
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

/**
 * Ініціалізувати всі кастомні селекти в модальному вікні
 */
async function initModalSelects() {
    const { reinitializeCustomSelect } = await import('../../components/forms/select.js');

    // Ініціалізувати селект типу параметра
    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    if (paramTypeSelect) {
        reinitializeCustomSelect(paramTypeSelect);
    }

    // Ініціалізувати селект сутності (спочатку вимкнений)
    const entitySelect = document.getElementById('keyword-entity-id');
    if (entitySelect) {
        entitySelect.disabled = true;
        reinitializeCustomSelect(entitySelect);
    }

    // Заповнити parent_local_id селект
    const parentSelect = document.getElementById('keyword-parent-local-id');
    if (parentSelect) {
        const keywords = getKeywords();

        // Очистити попередні опції (крім першої)
        while (parentSelect.options.length > 1) {
            parentSelect.remove(1);
        }

        // Додати всі keywords як опції
        keywords.forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword.local_id;
            option.textContent = keyword.name_uk;
            parentSelect.appendChild(option);
        });

        // Ініціалізувати кастомний селект
        reinitializeCustomSelect(parentSelect);
    }
}

/**
 * Скинути скрол модалу на початок та активувати першу секцію
 */
function resetModalScroll() {
    const contentArea = document.querySelector('.modal-fullscreen-content');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }

    // Активувати перший пункт навігації
    const nav = document.getElementById('keyword-section-navigator');
    if (nav) {
        const navLinks = nav.querySelectorAll('.btn-icon.expand.touch[href]');
        navLinks.forEach((link, index) => {
            link.classList.toggle('active', index === 0);
        });
    }
}

/**
 * Ініціалізувати навігацію по секціях модалу
 */
function initSectionNavigation() {
    const nav = document.getElementById('keyword-section-navigator');
    const contentArea = document.querySelector('.modal-fullscreen-content');
    if (!nav || !contentArea) return;

    const navLinks = nav.querySelectorAll('.btn-icon.expand.touch[href]');
    const sections = contentArea.querySelectorAll('section[id]');

    // Клік по навігації
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Оновити активний пункт
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Скролити до секції
            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}
