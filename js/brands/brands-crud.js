// js/brands/brands-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - CRUD OPERATIONS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Модальні вікна для додавання, редагування та видалення брендів.
 */

import { addBrand, updateBrand, deleteBrand, getBrands } from './brands-data.js';
import { renderBrandsTable } from './brands-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { highlightText, checkTextForBannedWords } from '../utils/text-utils.js';

/**
 * Генерувати новий ID для бренду (для відображення в UI)
 * @returns {string} Новий ID у форматі bran-XXXXXX (6 цифр)
 */
function generateBrandIdForUI() {
    const brands = getBrands();

    // Знайти максимальний номер
    let maxNum = 0;

    brands.forEach(brand => {
        if (brand.brand_id && brand.brand_id.startsWith('bran-')) {
            const num = parseInt(brand.brand_id.replace('bran-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    // Новий номер
    const newNum = maxNum + 1;

    // Форматувати як bran-XXXXXX (6 цифр)
    return `bran-${String(newNum).padStart(6, '0')}`;
}

/**
 * Показати модальне вікно для додавання бренду
 */
export async function showAddBrandModal() {
    console.log('➕ Відкриття модального вікна для додавання бренду');

    // Відкрити модал
    await showModal('brand-edit', null);

    // Оновити заголовок
    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = 'Додати бренд';

    // Приховати кнопку видалення (тільки для нових брендів)
    const deleteBtn = document.getElementById('delete-brand');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    // Очистити форму
    clearBrandForm();

    // Генерувати і показати новий ID
    const newId = generateBrandIdForUI();
    const idField = document.getElementById('brand-id');
    if (idField) idField.value = newId;

    // Обробник збереження
    const saveBtn = document.getElementById('save-brand');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewBrand;
    }
}

/**
 * Показати модальне вікно для редагування бренду
 * @param {string} brandId - ID бренду
 */
export async function showEditBrandModal(brandId) {
    console.log(`✏️ Відкриття модального вікна для редагування бренду ${brandId}`);

    const { getBrands } = await import('./brands-data.js');
    const brands = getBrands();
    const brand = brands.find(b => b.brand_id === brandId);

    if (!brand) {
        showToast('Бренд не знайдено', 'error');
        return;
    }

    // Відкрити модал
    await showModal('brand-edit', null);

    // Оновити заголовок
    const title = document.querySelector('#global-modal-wrapper #modal-title');
    if (title) title.textContent = 'Редагувати бренд';

    // Показати кнопку видалення
    const deleteBtn = document.getElementById('delete-brand');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteBrandConfirm(brandId);
        };
    }

    // Заповнити форму даними
    fillBrandForm(brand);

    // Обробник збереження
    const saveBtn = document.getElementById('save-brand');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateBrand(brandId);
    }
}

/**
 * Показати підтвердження видалення бренду
 * @param {string} brandId - ID бренду
 */
export async function showDeleteBrandConfirm(brandId) {
    console.log(`🗑️ Підтвердження видалення бренду ${brandId}`);

    const { getBrands } = await import('./brands-data.js');
    const brands = getBrands();
    const brand = brands.find(b => b.brand_id === brandId);

    if (!brand) {
        showToast('Бренд не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити бренд?',
        message: `Ви впевнені, що хочете видалити бренд "${brand.name_uk}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        await handleDeleteBrand(brandId);
    }
}

/**
 * Обробник збереження нового бренду
 */
async function handleSaveNewBrand() {
    console.log('💾 Збереження нового бренду...');

    const brandData = getBrandFormData();

    // Валідація
    if (!brandData.name_uk) {
        showToast('Введіть назву бренду', 'error');
        return;
    }

    try {
        await addBrand(brandData);
        showToast('Бренд успішно додано', 'success');
        closeModal();
        renderBrandsTable();
    } catch (error) {
        console.error('❌ Помилка додавання бренду:', error);
        showToast('Помилка додавання бренду', 'error');
    }
}

/**
 * Обробник оновлення бренду
 * @param {string} brandId - ID бренду
 */
async function handleUpdateBrand(brandId) {
    console.log(`💾 Оновлення бренду ${brandId}...`);

    const brandData = getBrandFormData();

    // Валідація
    if (!brandData.name_uk) {
        showToast('Введіть назву бренду', 'error');
        return;
    }

    try {
        await updateBrand(brandId, brandData);
        showToast('Бренд успішно оновлено', 'success');
        closeModal();
        renderBrandsTable();
    } catch (error) {
        console.error('❌ Помилка оновлення бренду:', error);
        showToast('Помилка оновлення бренду', 'error');
    }
}

/**
 * Обробник видалення бренду
 * @param {string} brandId - ID бренду
 */
async function handleDeleteBrand(brandId) {
    console.log(`🗑️ Видалення бренду ${brandId}...`);

    try {
        await deleteBrand(brandId);
        showToast('Бренд успішно видалено', 'success');
        renderBrandsTable();
    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        showToast('Помилка видалення бренду', 'error');
    }
}

/**
 * Отримати дані з форми
 * @returns {Object} Дані бренду
 */
function getBrandFormData() {
    return {
        name_uk: document.getElementById('brand-name-uk')?.value.trim() || '',
        names_alt: document.getElementById('brand-names-alt')?.value.trim() || '',
        country_option_id: document.getElementById('brand-country')?.value || '',
        brand_text: document.getElementById('brand-text')?.textContent.trim() || '',
        brand_site_link: document.getElementById('brand-site-link')?.value.trim() || ''
    };
}

/**
 * Заповнити форму даними бренду
 * @param {Object} brand - Бренд
 */
async function fillBrandForm(brand) {
    const idField = document.getElementById('brand-id');
    const nameField = document.getElementById('brand-name-uk');
    const namesAltField = document.getElementById('brand-names-alt');
    const countryField = document.getElementById('brand-country');
    const textViewer = document.getElementById('brand-text');
    const siteField = document.getElementById('brand-site-link');

    if (idField) idField.value = brand.brand_id || '';
    if (nameField) nameField.value = brand.name_uk || '';
    if (namesAltField) namesAltField.value = brand.names_alt || '';
    if (countryField) countryField.value = brand.country_option_id || '';

    // Виділити заборонені слова в описі
    if (textViewer && brand.brand_text) {
        await highlightBrandText(textViewer, brand.brand_text);
    } else if (textViewer) {
        textViewer.textContent = '';
    }

    if (siteField) siteField.value = brand.brand_site_link || '';
}

/**
 * Виділити заборонені слова в тексті бренду
 * @param {HTMLElement} viewer - Елемент для відображення
 * @param {string} text - Текст для перевірки
 */
async function highlightBrandText(viewer, text) {
    try {
        // Завантажити всі заборонені слова
        const { loadAllBannedWords } = await import('./banned-words/banned-words-data.js');
        const allBannedWords = await loadAllBannedWords();

        if (!allBannedWords || allBannedWords.length === 0) {
            viewer.textContent = text;
            return;
        }

        // Перевірити текст на заборонені слова
        const foundWords = checkTextForBannedWords(text, allBannedWords);

        if (foundWords.length > 0) {
            // Виділити знайдені слова
            const wordsToHighlight = foundWords.map(f => f.word);
            const highlightedText = highlightText(text, wordsToHighlight, 'highlight-banned-word');
            viewer.innerHTML = highlightedText;
        } else {
            viewer.textContent = text;
        }
    } catch (error) {
        console.error('❌ Помилка виділення заборонених слів:', error);
        viewer.textContent = text;
    }
}

/**
 * Очистити форму
 */
function clearBrandForm() {
    const idField = document.getElementById('brand-id');
    const nameField = document.getElementById('brand-name-uk');
    const namesAltField = document.getElementById('brand-names-alt');
    const countryField = document.getElementById('brand-country');
    const textViewer = document.getElementById('brand-text');
    const siteField = document.getElementById('brand-site-link');

    if (idField) idField.value = '';
    if (nameField) nameField.value = '';
    if (namesAltField) namesAltField.value = '';
    if (countryField) countryField.value = '';
    if (textViewer) textViewer.textContent = '';
    if (siteField) siteField.value = '';
}

