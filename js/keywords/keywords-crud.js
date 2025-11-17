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

export async function showAddKeywordModal() {
    console.log('➕ Відкриття модального вікна для додавання ключового слова');

    await showModal('keywords-edit', null);

    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = 'Додати ключове слово';

    const deleteBtn = document.getElementById('delete-keyword');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearKeywordForm();

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

    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = 'Редагувати ключове слово';

    const deleteBtn = document.getElementById('delete-keyword');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteKeywordConfirm(localId);
        };
    }

    fillKeywordForm(keyword);

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

async function handleSaveNewKeyword() {
    try {
        const keywordData = getFormData();

        if (!keywordData.local_id || !keywordData.name_uk) {
            showToast('Заповніть обов\'язкові поля (ID та Назва)', 'error');
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
        name_uk: document.getElementById('keyword-name-uk')?.value.trim() || '',
        param_type: document.getElementById('keyword-param-type')?.value.trim() || '',
        trigers: document.getElementById('keyword-trigers')?.value.trim() || '',
        keywords_ua: document.getElementById('keyword-keywords-ua')?.value.trim() || ''
    };
}

function fillKeywordForm(keyword) {
    const localIdField = document.getElementById('keyword-local-id');
    const nameUkField = document.getElementById('keyword-name-uk');
    const paramTypeField = document.getElementById('keyword-param-type');
    const trigersField = document.getElementById('keyword-trigers');
    const keywordsUaField = document.getElementById('keyword-keywords-ua');

    if (localIdField) {
        localIdField.value = keyword.local_id || '';
        localIdField.readOnly = true;
    }
    if (nameUkField) nameUkField.value = keyword.name_uk || '';
    if (paramTypeField) paramTypeField.value = keyword.param_type || '';
    if (trigersField) trigersField.value = keyword.trigers || '';
    if (keywordsUaField) keywordsUaField.value = keyword.keywords_ua || '';
}

function clearKeywordForm() {
    const localIdField = document.getElementById('keyword-local-id');
    const nameUkField = document.getElementById('keyword-name-uk');
    const paramTypeField = document.getElementById('keyword-param-type');
    const trigersField = document.getElementById('keyword-trigers');
    const keywordsUaField = document.getElementById('keyword-keywords-ua');

    if (localIdField) {
        localIdField.value = '';
        localIdField.readOnly = false;
    }
    if (nameUkField) nameUkField.value = '';
    if (paramTypeField) paramTypeField.value = '';
    if (trigersField) trigersField.value = '';
    if (keywordsUaField) keywordsUaField.value = '';
}
