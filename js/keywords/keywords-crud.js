// js/keywords/keywords-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - CRUD OPERATIONS                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { addKeyword, updateKeyword, deleteKeyword, getKeywords } from './keywords-data.js';
import { renderKeywordsTable } from './keywords-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { renderAvatarState } from '../utils/avatar-states.js';

export async function showAddKeywordModal() {
    console.log('➕ Відкриття модального вікна для додавання ключового слова');

    await showModal('keywords-edit', null);

    const modalEl = document.querySelector('[data-modal-id="keywords-edit"]');

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Додати ключове слово';

    const deleteBtn = document.getElementById('delete-keyword');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearKeywordForm();
    await initModalSelects();

    // Ініціалізувати навігацію по секціях
    initSectionNavigation(modalEl);

    // Обробник закриття
    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-keyword');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewKeyword;
    }
}

export async function showEditKeywordModal(localId) {
    console.log(`✏️ Відкриття модального вікна для редагування ключового слова ${localId}`);

    const keywords = getKeywords();
    const keyword = keywords.find(k => k.local_id === localId);

    if (!keyword) {
        showToast('Ключове слово не знайдено', 'error');
        return;
    }

    await showModal('keywords-edit', null);

    const modalEl = document.querySelector('[data-modal-id="keywords-edit"]');

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Редагувати ключове слово';

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

    // Заповнити форму даними
    fillKeywordForm(keyword);

    // Ініціалізувати навігацію по секціях
    initSectionNavigation(modalEl);

    // Обробник закриття
    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-keyword');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateKeyword(localId);
    }
}

export async function showDeleteKeywordConfirm(localId) {
    console.log(`🗑️ Підтвердження видалення ключового слова ${localId}`);

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
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        await handleDeleteKeyword(localId);
    }
}

export async function showGlossaryModal(localId) {
    console.log(`👁️ Відкриття модального вікна глосарію для ${localId}`);

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
                containerClass: 'empty-state-container',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
        }
    }
}

async function handleSaveNewKeyword() {
    try {
        const keywordData = getFormData();

        if (!keywordData.name_uk) {
            showToast('Заповніть обов\'язкові поля (Назва)', 'error');
            return;
        }

        await addKeyword(keywordData);

        showToast('Ключове слово додано', 'success');
        closeModal();
        renderKeywordsTable();
    } catch (error) {
        console.error('❌ Помилка додавання:', error);
        showToast('Помилка додавання ключового слова', 'error');
    }
}

async function handleUpdateKeyword(localId) {
    try {
        const keywordData = getFormData();

        if (!keywordData.name_uk) {
            showToast('Заповніть обов\'язкові поля (Назва)', 'error');
            return;
        }

        await updateKeyword(localId, keywordData);

        showToast('Ключове слово оновлено', 'success');
        closeModal();
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
        characteristics_local_id: document.getElementById('keyword-characteristics-local-id')?.value.trim() || '',
        name_uk: document.getElementById('keyword-name-uk')?.value.trim() || '',
        name_ru: document.getElementById('keyword-name-ru')?.value.trim() || '',
        name_en: document.getElementById('keyword-name-en')?.value.trim() || '',
        name_lat: document.getElementById('keyword-name-lat')?.value.trim() || '',
        name_alt: document.getElementById('keyword-name-alt')?.value.trim() || '',
        trigers: document.getElementById('keyword-trigers')?.value.trim() || '',
        keywords_ua: document.getElementById('keyword-keywords-ua')?.value.trim() || '',
        keywords_ru: document.getElementById('keyword-keywords-ru')?.value.trim() || '',
        glossary_text: document.getElementById('keyword-glossary-text')?.value.trim() || ''
    };
}

function fillKeywordForm(keyword) {
    // Заповнити всі поля
    document.getElementById('keyword-local-id').value = keyword.local_id || '';
    document.getElementById('keyword-param-type-select').value = keyword.param_type || '';
    document.getElementById('keyword-parent-local-id').value = keyword.parent_local_id || '';
    document.getElementById('keyword-characteristics-local-id').value = keyword.characteristics_local_id || '';
    document.getElementById('keyword-name-uk').value = keyword.name_uk || '';
    document.getElementById('keyword-name-ru').value = keyword.name_ru || '';
    document.getElementById('keyword-name-en').value = keyword.name_en || '';
    document.getElementById('keyword-name-lat').value = keyword.name_lat || '';
    document.getElementById('keyword-name-alt').value = keyword.name_alt || '';
    document.getElementById('keyword-trigers').value = keyword.trigers || '';
    document.getElementById('keyword-keywords-ua').value = keyword.keywords_ua || '';
    document.getElementById('keyword-keywords-ru').value = keyword.keywords_ru || '';
    document.getElementById('keyword-glossary-text').value = keyword.glossary_text || '';
}

function clearKeywordForm() {
    // Очистити всі поля
    document.getElementById('keyword-local-id').value = '';
    document.getElementById('keyword-param-type-select').value = '';
    document.getElementById('keyword-parent-local-id').value = '';
    document.getElementById('keyword-characteristics-local-id').value = '';
    document.getElementById('keyword-name-uk').value = '';
    document.getElementById('keyword-name-ru').value = '';
    document.getElementById('keyword-name-en').value = '';
    document.getElementById('keyword-name-lat').value = '';
    document.getElementById('keyword-name-alt').value = '';
    document.getElementById('keyword-trigers').value = '';
    document.getElementById('keyword-keywords-ua').value = '';
    document.getElementById('keyword-keywords-ru').value = '';
    document.getElementById('keyword-glossary-text').value = '';
}

/**
 * Ініціалізувати всі кастомні селекти в модальному вікні
 */
async function initModalSelects() {
    const { reinitializeCustomSelect } = await import('../common/ui-select.js');

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

    // Заповнити param_type селект унікальними типами з даних
    const paramTypeSelect = document.getElementById('keyword-param-type-select');
    if (paramTypeSelect) {
        const keywords = getKeywords();

        // Очистити попередні опції (крім першої)
        while (paramTypeSelect.options.length > 1) {
            paramTypeSelect.remove(1);
        }

        // Отримати унікальні типи з даних
        const uniqueTypes = [...new Set(keywords.map(k => k.param_type).filter(Boolean))];
        uniqueTypes.sort();

        // Додати типи як опції
        uniqueTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            paramTypeSelect.appendChild(option);
        });

        // Ініціалізувати кастомний селект
        reinitializeCustomSelect(paramTypeSelect);
    }
}

/**
 * Ініціалізувати навігацію по секціях модалу
 * @param {HTMLElement} modalEl - Елемент модалу
 */
function initSectionNavigation(modalEl) {
    if (!modalEl) return;

    const content = modalEl.querySelector('.modal-fullscreen-content');
    const navItems = modalEl.querySelectorAll('.sidebar-nav-item');

    if (!content || navItems.length === 0) return;

    // Клік по меню - прокрутка до секції
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href')?.slice(1);
            if (!targetId) return;

            const section = modalEl.querySelector(`#${targetId}`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // При скролі - оновлювати active в меню
    const sections = modalEl.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navItems.forEach(item => {
                    item.classList.toggle('active',
                        item.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }, {
        root: content,
        threshold: 0.3
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}
