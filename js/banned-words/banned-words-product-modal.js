// js/banned-words/banned-words-product-modal.js
// Модальне вікно для перегляду повного тексту товару з підсвіченими забороненими словами

import { bannedWordsState } from './banned-words-init.js';
import { loadProductFullData, updateProductStatus } from './banned-words-data.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { highlightText, checkTextForBannedWords } from '../utils/text-utils.js';
import { showToast } from '../common/ui-toast.js';

// Поточні дані модалу
let currentProductData = null;
// Статистика для кожного поля: { fieldName: { wordCountsMap, totalMatches } }
let fieldStats = {};

/**
 * Отримати іконку для поля на основі його назви
 */
function getFieldIcon(columnName) {
    if (columnName.startsWith('title')) return 'title';
    if (columnName.includes('description')) return 'description';
    return 'description'; // за замовчуванням
}

/**
 * Відкрити модальне вікно з повним текстом товару
 *
 * FLOW:
 * 1. Завантажити шаблон модалу (з порожніми контейнерами)
 * 2. ДИНАМІЧНО створити піли та панелі на основі перевірених колонок
 * 3. Завантажити повні дані товару з Google Sheets
 * 4. Заповнити панелі текстом з підсвічуванням ВСІХ заборонених слів
 * 5. Додати event listeners на динамічно створені піли
 *
 * @param {string} productId - ID товару
 * @param {string} sheetName - Назва аркуша
 * @param {number} rowIndex - Індекс рядка в Google Sheets
 * @param {string|string[]} columnName - Назва колонки або масив назв (для майбутніх комплексних перевірок)
 */
export async function showProductTextModal(productId, sheetName, rowIndex, columnName) {
    try {
        console.log(`📄 Відкриття модалу для товару: ${productId} (${sheetName}), колонка:`, columnName);

        // 1. Відкрити модал з шаблону (порожні контейнери)
        await showModal('product-text-view');

        // Встановити метадані
        document.getElementById('product-modal-product-id').value = productId;
        document.getElementById('product-modal-sheet-name').value = sheetName;
        document.getElementById('product-modal-row-index').value = rowIndex;

        // Додати columnName в метадані (створимо hidden input якщо потрібно)
        let columnInput = document.getElementById('product-modal-column-name');
        if (!columnInput) {
            columnInput = document.createElement('input');
            columnInput.type = 'hidden';
            columnInput.id = 'product-modal-column-name';
            document.querySelector('.modal-body').appendChild(columnInput);
        }
        // Зберігаємо як JSON якщо масив, або просто строку
        columnInput.value = Array.isArray(columnName) ? JSON.stringify(columnName) : columnName;

        // 2. ДИНАМІЧНО створити піли та панелі для перевірених колонок
        setupFieldTabs(columnName);

        // Показати loader
        showModalLoader();

        // 3. Завантажити повні дані товару
        const productData = await loadProductFullData(sheetName, rowIndex);
        currentProductData = productData;

        console.log('✅ Дані товару завантажені:', productData);

        // 4. Відрендерити модал з даними
        renderProductModal(productData, columnName);

        // 5. Ініціалізувати обробники для динамічних елементів
        initModalHandlers();

    } catch (error) {
        console.error('❌ Помилка відкриття модалу:', error);
        showToast('Помилка завантаження даних товару', 'error');
        closeModal();
    }
}

/**
 * Налаштувати таби полів - ДИНАМІЧНО створити піли та панелі для перевірених колонок
 * @param {string|string[]} columnNames - Назва колонки або масив назв (для майбутніх комплексних перевірок)
 */
function setupFieldTabs(columnNames) {
    console.log('🎯 setupFieldTabs викликано з:', columnNames);

    // Нормалізувати до масиву (для сумісності з майбутніми комплексними перевірками)
    const columnsArray = Array.isArray(columnNames) ? columnNames : [columnNames];

    const pillsContainer = document.getElementById('product-text-field-pills');
    const contentContainer = document.querySelector('.product-text-content');

    if (!pillsContainer || !contentContainer) {
        console.error('❌ КРИТИЧНО: контейнери не знайдено!');
        return;
    }

    // ОЧИСТИТИ існуючий контент
    pillsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    console.log(`📊 Створюємо ${columnsArray.length} піл(ів) динамічно`);

    // ДИНАМІЧНО створити піли та панелі для кожної колонки
    columnsArray.forEach((columnName, index) => {
        // Створити кнопку
        const button = document.createElement('button');
        button.className = 'nav-icon';
        button.dataset.field = columnName;
        if (index === 0) button.classList.add('active');

        // Використовуємо технічну назву колонки безпосередньо
        button.innerHTML = `
            <span class="material-symbols-outlined">${getFieldIcon(columnName)}</span>
            <span class="nav-icon-label">${columnName}</span>
        `;

        pillsContainer.appendChild(button);

        // Створити панель
        const panel = document.createElement('div');
        panel.className = 'product-text-panel';
        panel.dataset.field = columnName;
        if (index === 0) panel.classList.add('active');

        panel.innerHTML = `
            <div class="text-viewer" id="text-viewer-${columnName}">
                <p class="text-muted">Завантаження...</p>
            </div>
        `;

        contentContainer.appendChild(panel);

        console.log(`✅ Створено піл і панель для: ${columnName}`);
    });

    console.log(`✅ Створено ${columnsArray.length} піл(ів): ${columnsArray.join(', ')}`);
}

/**
 * Показати loader в модалі
 */
function showModalLoader() {
    // Панелі вже створені з текстом "Завантаження..." в setupFieldTabs()
    // Ця функція залишена для сумісності
    const viewers = document.querySelectorAll('.text-viewer');
    if (viewers.length > 0) {
        console.log(`📊 Loader вже показаний для ${viewers.length} панелей`);
    }
}

/**
 * Відрендерити модал з даними товару
 * @param {Object} productData - Повні дані товару
 * @param {string|string[]} columnNames - Назва колонки або масив назв колонок що перевірялись
 */
function renderProductModal(productData, columnNames) {
    console.log('🎨 Рендеримо модал з даними:', productData);

    // Нормалізувати до масиву
    const columnsArray = Array.isArray(columnNames) ? columnNames : [columnNames];

    // Встановити заголовок (використовуємо titleRos або titleUkr, що є в наявності)
    const titleElement = document.getElementById('product-modal-title');
    const idElement = document.getElementById('product-modal-id');

    if (!titleElement || !idElement) {
        console.error('❌ Не знайдено елементи заголовку модалу!');
        return;
    }

    const displayTitle = productData.titleRos || productData.titleUkr || 'Товар';
    titleElement.textContent = displayTitle;
    idElement.textContent = `ID: ${productData.id}`;

    // Отримати ВСІ заборонені слова (обидві мови) для підсвічування
    const allBannedWordsRaw = bannedWordsState.bannedWords.flatMap(w =>
        [...w.name_uk_array, ...w.name_ru_array]
    );

    // ДЕДУПЛІКАЦІЯ: одне слово може бути в кількох рядках таблиці banned, але рахуємо як одне
    const allBannedWords = [...new Set(allBannedWordsRaw.map(w => w.toLowerCase()))];

    console.log(`🔍 Пошук серед ${allBannedWords.length} унікальних заборонених слів (було ${allBannedWordsRaw.length})`);


    // Мапінг полів модалу до полів Google Sheets
    const fieldMapping = {
        'titleUkr': productData.titleUkr || productData.title_ukr || '',
        'titleRos': productData.titleRos || productData.title_ros || '',
        'descriptionUkr': productData.descriptionUkr || productData.description_ukr || '',
        'descriptionRos': productData.descriptionRos || productData.description_ros || '',
        'short_descriptionUkr': productData.short_descriptionUkr || productData.shortDescriptionUkr || '',
        'short_descriptionRos': productData.short_descriptionRos || productData.shortDescriptionRos || ''
    };

    console.log('📦 Доступні дані товару:', Object.keys(productData));
    console.log('📋 Field mapping:', fieldMapping);

    // Очистити попередню статистику
    fieldStats = {};

    // Рендеримо ТІЛЬКИ ті поля що в columnsArray
    columnsArray.forEach(field => {
        const text = fieldMapping[field] || '';
        const viewer = document.getElementById(`text-viewer-${field}`);

        if (!viewer) {
            console.warn(`⚠️ Не знайдено viewer для поля: ${field}`);
            return;
        }

        if (!text || !text.trim()) {
            viewer.innerHTML = '<p class="text-muted">Немає даних</p>';
            fieldStats[field] = { wordCountsMap: new Map(), totalMatches: 0 };
            return;
        }

        // Перевірити текст на ВСІ заборонені слова
        const foundWords = checkTextForBannedWords(text, allBannedWords);

        // Статистика для цього конкретного поля
        let wordCountsMap = new Map();
        let totalMatches = 0;

        if (foundWords.length > 0) {
            // Є заборонені слова - підсвітити їх ВСІ
            const wordsToHighlight = foundWords.map(f => f.word);
            const highlightedText = highlightText(text, wordsToHighlight, 'highlight-banned-word');

            viewer.innerHTML = highlightedText;

            // Підрахувати статистику для ЦЬОГО поля
            foundWords.forEach(f => {
                const wordKey = f.word.toLowerCase();
                const currentCount = wordCountsMap.get(wordKey) || 0;
                wordCountsMap.set(wordKey, currentCount + f.count);
                totalMatches += f.count;
            });

            console.log(`🔴 Поле ${field}: знайдено ${foundWords.length} слів, ${totalMatches} входжень`);
        } else {
            // Немає заборонених слів - просто показати текст
            viewer.textContent = text;
            console.log(`✅ Поле ${field}: заборонених слів не знайдено`);
        }

        // Зберегти статистику для цього поля
        fieldStats[field] = { wordCountsMap, totalMatches };
    });

    // Показати статистику для ПЕРШОГО (активного) поля
    const firstField = columnsArray[0];
    updateModalStats(firstField);
}

/**
 * Оновити статистику модалу для конкретного поля
 * @param {string} fieldName - Назва поля
 */
function updateModalStats(fieldName) {
    const stats = fieldStats[fieldName];

    if (!stats) {
        console.warn(`⚠️ Немає статистики для поля: ${fieldName}`);
        return;
    }

    const { wordCountsMap, totalMatches } = stats;
    const totalBannedWords = wordCountsMap.size;

    console.log(`📊 Статистика для ${fieldName}: ${totalBannedWords} слів, ${totalMatches} входжень`);

    // Оновити статистику
    const bannedCountEl = document.getElementById('product-modal-banned-count');
    const matchCountEl = document.getElementById('product-modal-match-count');

    if (bannedCountEl) bannedCountEl.textContent = totalBannedWords;
    if (matchCountEl) matchCountEl.textContent = totalMatches;

    // Створити chip'и для заборонених слів з кількістю входжень
    const chipsContainer = document.getElementById('product-modal-banned-chips');
    if (chipsContainer) {
        chipsContainer.innerHTML = '';
        if (wordCountsMap.size > 0) {
            // Сортуємо за алфавітом для консистентності
            const sortedWords = Array.from(wordCountsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            sortedWords.forEach(([word, count]) => {
                const chip = document.createElement('span');
                chip.className = 'chip chip-error';
                chip.textContent = `${word} (${count})`;
                chipsContainer.appendChild(chip);
            });
        }
    }
}

/**
 * Ініціалізувати обробники подій модалу
 */
function initModalHandlers() {
    // Перемикання табів (використовуємо nav-icon)
    const buttons = document.querySelectorAll('#product-text-field-pills .nav-icon');
    const panels = document.querySelectorAll('.product-text-panel');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const field = button.dataset.field;

            // Оновити активний таб
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Показати відповідну панель
            // ВИПРАВЛЕНО: уточнено selector для пошуку тільки панелей, не кнопок
            panels.forEach(p => p.classList.remove('active'));
            const activePanel = document.querySelector(`.product-text-panel[data-field="${field}"]`);
            if (activePanel) activePanel.classList.add('active');

            // Оновити статистику для цього поля
            updateModalStats(field);
        });
    });

    // Кнопка "Позначити перевіреним"
    const markCheckedBtn = document.getElementById('product-modal-mark-checked');
    if (markCheckedBtn) {
        markCheckedBtn.addEventListener('click', handleMarkChecked);
    }

    // Кнопка "Копіювати текст"
    const copyBtn = document.getElementById('product-modal-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', handleCopyText);
    }
}

/**
 * Обробник кнопки "Позначити перевіреним"
 */
async function handleMarkChecked() {
    const productId = document.getElementById('product-modal-product-id').value;
    const sheetName = document.getElementById('product-modal-sheet-name').value;
    const columnNameRaw = document.getElementById('product-modal-column-name').value;

    if (!productId || !sheetName || !columnNameRaw) {
        console.error('❌ Відсутні метадані товару');
        return;
    }

    try {
        // Розпарсити columnName (може бути JSON масив або строка)
        let columnsArray;
        try {
            columnsArray = JSON.parse(columnNameRaw);
            if (!Array.isArray(columnsArray)) {
                columnsArray = [columnsArray];
            }
        } catch {
            columnsArray = [columnNameRaw];
        }

        console.log(`✅ Позначаємо колонки [${columnsArray.join(', ')}] товару ${productId} як перевірені`);

        // Оновити статус в Google Sheets для всіх перевірених колонок
        for (const columnName of columnsArray) {
            await updateProductStatus(sheetName, productId, columnName, 'TRUE');
        }

        const message = columnsArray.length === 1
            ? `Колонку "${columnsArray[0]}" позначено як перевірену`
            : `Колонки ${columnsArray.map(c => `"${c}"`).join(', ')} позначено як перевірені`;

        showToast(message, 'success');

        // Закрити модал
        closeModal();

        // Оновити таблицю (якщо потрібно)
        // TODO: Додати колбек для оновлення таблиці

    } catch (error) {
        console.error('❌ Помилка позначення товару:', error);
        showToast('Помилка при оновленні статусу', 'error');
    }
}

/**
 * Обробник кнопки "Копіювати текст"
 */
function handleCopyText() {
    // Знайти активну панель
    const activePanel = document.querySelector('.product-text-panel.active');
    if (!activePanel) {
        console.warn('⚠️ Немає активної панелі для копіювання');
        showToast('Немає тексту для копіювання', 'warning');
        return;
    }

    // Отримати текст з text-viewer (без HTML тегів)
    const viewer = activePanel.querySelector('.text-viewer');
    if (!viewer) {
        console.warn('⚠️ Не знайдено text-viewer');
        return;
    }

    const textToCopy = viewer.textContent || viewer.innerText;

    if (!textToCopy || !textToCopy.trim()) {
        showToast('Немає тексту для копіювання', 'warning');
        return;
    }

    // Копіювати в буфер обміну
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('✅ Текст скопійовано в буфер обміну');
            showToast('Текст скопійовано', 'success');
        })
        .catch(err => {
            console.error('❌ Помилка копіювання:', err);
            showToast('Помилка копіювання тексту', 'error');
        });
}