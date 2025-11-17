// js/keywords/keywords-crud.js

/**
 * TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
 * Q                    KEYWORDS - CRUD OPERATIONS                            Q
 * ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]
 */

import { addKeyword, updateKeyword, deleteKeyword, getKeywords } from './keywords-data.js';
import { renderKeywordsTable } from './keywords-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';

export async function showAddKeywordModal() {
    console.log('• V4:@8BBO <>40;L=>3> 2V:=0 4;O 4>4020==O :;NG>2>3> A;>20');

    await showModal('keywords-edit', null);

    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = '>40B8 :;NG>25 A;>2>';

    const deleteBtn = document.getElementById('delete-keyword');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearKeywordForm();

    const saveBtn = document.getElementById('save-keyword');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewKeyword;
    }
}

export async function showEditKeywordModal(localId) {
    console.log(` V4:@8BBO <>40;L=>3> 2V:=0 4;O @5403C20==O :;NG>2>3> A;>20 ${localId}`);

    const keywords = getKeywords();
    const keyword = keywords.find(k => k.local_id === localId);

    if (!keyword) {
        showToast(';NG>25 A;>2> =5 7=0945=>', 'error');
        return;
    }

    await showModal('keywords-edit', null);

    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = ' 5403C20B8 :;NG>25 A;>2>';

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
    console.log(`=Ñ V4B25@465==O 2840;5==O :;NG>2>3> A;>20 ${localId}`);

    const keywords = getKeywords();
    const keyword = keywords.find(k => k.local_id === localId);

    if (!keyword) {
        showToast(';NG>25 A;>2> =5 7=0945=>', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: '840;8B8 :;NG>25 A;>2>?',
        message: `8 2?52=5=V, I> E>G5B5 2840;8B8 "${keyword.name_uk}"?`,
        confirmText: '840;8B8',
        cancelText: '!:0AC20B8',
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
            showToast('0?>2=VBL >1>2\'O7:>2V ?>;O (ID B0 0720)', 'error');
            return;
        }

        await addKeyword(keywordData);

        showToast(';NG>25 A;>2> 4>40=>', 'success');
        closeModal();
        renderKeywordsTable();
    } catch (error) {
        console.error('L ><8;:0 4>4020==O:', error);
        showToast('><8;:0 4>4020==O :;NG>2>3> A;>20', 'error');
    }
}

async function handleUpdateKeyword(localId) {
    try {
        const keywordData = getFormData();

        if (!keywordData.name_uk) {
            showToast('0?>2=VBL >1>2\'O7:>2V ?>;O (0720)', 'error');
            return;
        }

        await updateKeyword(localId, keywordData);

        showToast(';NG>25 A;>2> >=>2;5=>', 'success');
        closeModal();
        renderKeywordsTable();
    } catch (error) {
        console.error('L ><8;:0 >=>2;5==O:', error);
        showToast('><8;:0 >=>2;5==O :;NG>2>3> A;>20', 'error');
    }
}

async function handleDeleteKeyword(localId) {
    try {
        await deleteKeyword(localId);

        showToast(';NG>25 A;>2> 2840;5=>', 'success');
        renderKeywordsTable();
    } catch (error) {
        console.error('L ><8;:0 2840;5==O:', error);
        showToast('><8;:0 2840;5==O :;NG>2>3> A;>20', 'error');
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
