// js/glossary/glossary-modals.js

import { showModal, closeModal } from '../common/ui-modal.js';
import { getGlossaryMap } from './glossary-data.js';

/**
 * Ініціалізує обробники для модалів глосарію
 */
export function initGlossaryModals() {
    // Слухаємо кліки на кнопки "Додати" в empty state
    document.addEventListener('click', (event) => {
        const addButton = event.target.closest('.btn-add-glossary-text');
        if (addButton) {
            const itemId = addButton.dataset.itemId;
            openAddTextModal(itemId);
        }
    });

    // Слухаємо відкриття модалу для ініціалізації форми
    document.addEventListener('modal-opened', (event) => {
        if (event.detail.modalId === 'modal-add-glossary-text') {
            initAddTextModalForm(event.detail.bodyTarget);
        }
    });
}

/**
 * Відкриває модал для додавання тексту
 * @param {string} itemId - ID елемента глосарію
 */
function openAddTextModal(itemId) {
    const glossaryMap = getGlossaryMap();
    const item = glossaryMap[itemId];

    if (!item) {
        console.error('Елемент глосарію не знайдено:', itemId);
        return;
    }

    // Відкриваємо модал
    showModal('modal-add-glossary-text').then(() => {
        // Заповнюємо ID в прихованому полі
        const itemIdInput = document.getElementById('glossary-item-id');
        const textInput = document.getElementById('glossary-text-input');

        if (itemIdInput) {
            itemIdInput.value = itemId;
        }

        // Якщо текст вже є, заповнюємо його
        if (textInput && item.text) {
            textInput.value = item.text;
        }

        // Фокусуємось на текстовому полі
        if (textInput) {
            textInput.focus();
        }
    });
}

/**
 * Ініціалізує форму в модалі додавання тексту
 * @param {HTMLElement} modalBody - Тіло модалу
 */
function initAddTextModalForm(modalBody) {
    const form = modalBody.querySelector('#add-glossary-text-form');
    const saveButton = modalBody.querySelector('#save-glossary-text-btn');

    if (!form || !saveButton) return;

    // Обробник сабміту форми
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const itemId = document.getElementById('glossary-item-id')?.value;
        const glossaryText = document.getElementById('glossary-text-input')?.value;

        if (!itemId || !glossaryText) {
            alert('Заповніть всі обов\'язкові поля');
            return;
        }

        // Блокуємо кнопку
        saveButton.disabled = true;
        saveButton.innerHTML = `
            <span class="material-symbols-outlined">hourglass_empty</span>
            <span>Збереження...</span>
        `;

        try {
            // Зберігаємо в Google Sheets
            await saveGlossaryText(itemId, glossaryText);

            // Закриваємо модал редагування
            closeModal();

            // Показуємо success модал
            showSuccessModal();

        } catch (error) {
            console.error('Помилка збереження:', error);
            alert('Помилка при збереженні. Спробуйте ще раз.');

            // Розблоковуємо кнопку
            saveButton.disabled = false;
            saveButton.innerHTML = `
                <span class="material-symbols-outlined">save</span>
                <span>Зберегти</span>
            `;
        }
    });

    // Обробник кнопки інфо (перемикання на таб шаблону)
    const infoButton = modalBody.querySelector('#modal-glossary-info-tab-btn');
    const infoTabButton = modalBody.querySelector('#tab-info-button');

    if (infoButton && infoTabButton) {
        infoButton.addEventListener('click', () => {
            infoTabButton.click();
        });
    }
}

/**
 * Зберігає текст глосарію в Google Sheets
 * @param {string} itemId - ID елемента
 * @param {string} glossaryText - Текст опису
 */
async function saveGlossaryText(itemId, glossaryText) {
    const SHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
    const SHEET_GID = '90240383'; // GID для Головна

    // Формуємо дані для відправки
    const formData = new FormData();
    formData.append('sheetId', SHEET_ID);
    formData.append('sheetGid', SHEET_GID);
    formData.append('itemId', itemId);
    formData.append('columnName', 'glossary_text');
    formData.append('value', glossaryText);

    // TODO: Реалізувати серверний endpoint для оновлення Google Sheets
    // Поки що симулюємо успішне збереження
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('✅ Текст збережено для:', itemId);
            console.log('Текст:', glossaryText);
            resolve();
        }, 1000);
    });

    // Реальний код для відправки (коли буде API):
    /*
    const response = await fetch('/api/glossary/update-text', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Помилка при збереженні');
    }

    return await response.json();
    */
}

/**
 * Показує success модал з пропозицією оновити сторінку
 */
function showSuccessModal() {
    showModal('modal-glossary-success').then(() => {
        const reloadButton = document.getElementById('reload-page-btn');
        if (reloadButton) {
            reloadButton.addEventListener('click', () => {
                location.reload();
            });
        }
    });
}
