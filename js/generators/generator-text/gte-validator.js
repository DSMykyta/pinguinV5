// js/generators/generator-text/gte-validator.js
import { getTextDOM } from './gte-dom.js';
import { debounce } from '../../utils/common-utils.js';
import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

// Список відсортований за алфавітом для відображення в модальному вікні
let bannedWords = [];
// Повні дані про заборонені слова (для tooltip)
let bannedWordsData = [];
let validationRegex = null;
const BANNED_WORDS_URL = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=1742878044`;

// Резервний список слів (Скорочено для стислості)
const FALLBACK_WORDS = [
    'лікує', 'лікування', 'профілактика хвороб', 'діагностика', 'профілактика',
    'запобігає хворобам', 'діагностує', 'знижує тиск', 'очищає печінку', 'очищає кров',
    'очищає', 'нормалізує гормони', 'підвищує імунітет', 'вбиває віруси', 'протипухлинний',
    'знижує холестерин', 'заспокоює нервову систему', 'відновлює хрящ', 'підвищує потенцію',
    'виліковує', 'профілактика раку', 'виявляє', 'нормалізує цукор у крові', 'детоксикація',
    'підвищує тестостерон', 'зміцнює імунну систему', 'антибактеріальний ефект', 'антираковий',
    'розширює судини', 'антидепресант', 'лікує остеохондроз', 'лікує безпліддя', 'терапія',
    'профілактика діабету', 'скринінг', 'лікує артрит', 'виводить токсини з нирок',
    'виводить токсини', 'регулює щитовидку', 'імуномодулятор', 'знищує грибок',
    'зупиняє ріст пухлини', 'запобігає інфаркту', 'покращує сон при безсонні',
    'усуває біль у спині', 'покращує ерекцію', 'лікувальний ефект', 'профілактика інсульту',
    'тест на', 'усуває біль у суглобах', 'відновлює мікрофлору кишечника', 'усуває хворобу',
    'захищає від грипу', 'покращує зір при катаракті', 'зцілює', 'профілактика онкології',
    'усуває симптоми', 'захищає від інфекцій', 'лікує гіпотиреоз', 'знижує ризик раку',
    'лікує гіпертонію', 'усуває тривогу', 'регенерує суглоби', 'захищає від covid',
    'має протизапальну дію', 'покращує стан при діабеті', 'покращує стан при', 'зменшує набряки'
];

function escapeRegExp(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Побудова регулярного виразу.
 */
function buildRegex() {
    if (bannedWords.length === 0) {
        validationRegex = null;
        return;
    }

    // ОПТИМІЗАЦІЯ: Використовуємо КОПІЮ списку для RegExp, оскільки потрібне інше сортування.
    const optimizedList = [...new Set(bannedWords)] // Унікальні слова
        .map(word => escapeRegExp(word.toLowerCase()))
        .filter(Boolean)
        // Сортування за довжиною (спадне) критичне для коректної роботи RegExp
        .sort((a, b) => b.length - a.length);

    const regexBody = optimizedList.join('|');

    try {
        // Використовуємо Unicode Property Escapes для коректного визначення меж слів з кирилицею
        validationRegex = new RegExp(`(?<!\\p{L})(${regexBody})(?!\\p{L})`, 'giu');
    } catch (error) {
        console.error("[Validator] Помилка при створенні RegExp:", error);
        validationRegex = null;
    }
}

async function fetchBannedWords() {
    try {
        if (typeof Papa === 'undefined') throw new Error('PapaParse не знайдено.');
        const response = await fetch(BANNED_WORDS_URL);
        if (!response.ok) throw new Error(`Статус: ${response.status}`);
        const csvData = await response.text();
        const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true }).data;

        // Зберігаємо повні дані для tooltip
        bannedWordsData = parsedData;

        // Розбиваємо слова з комірок
        const wordsFromSheet = [];
        parsedData.forEach(row => {
            const ukWords = (row.name_uk || '').split(',').map(s => s.trim()).filter(Boolean);
            const ruWords = (row.name_ru || '').split(',').map(s => s.trim()).filter(Boolean);
            wordsFromSheet.push(...ukWords, ...ruWords);
        });

        if (wordsFromSheet.length === 0) throw new Error('Список порожній або не знайдено колонки name_uk/name_ru.');

        // Сортуємо унікальний список за алфавітом
        bannedWords = [...new Set(wordsFromSheet)].sort((a, b) => a.localeCompare(b));

    } catch (error) {
        console.error("[Validator] Помилка завантаження:", error.message);
        bannedWords = FALLBACK_WORDS.sort((a, b) => a.localeCompare(b));
        bannedWordsData = [];
    }
    buildRegex();
}

/**
 * Перевіряє текст і рахує загальну кількість входжень та кількість по кожному слову.
 */
function validateText() {
    const dom = getTextDOM();

    const results = {
        totalCount: 0,
        wordCounts: new Map()
    };

    if (!dom.inputMarkup || !validationRegex) {
        displayValidationResults(results);
        return;
    }

    const text = dom.inputMarkup.value || '';
    
    validationRegex.lastIndex = 0;
    let match;

    while ((match = validationRegex.exec(text)) !== null) {
        if (match[1]) {
            const word = match[1].toLowerCase();
            const currentCount = results.wordCounts.get(word) || 0;
            results.wordCounts.set(word, currentCount + 1);
            results.totalCount++;
        }
    }

    displayValidationResults(results);
}

/**
 * Знаходить контейнер, який ВЖЕ ІСНУЄ в index.html.
 */
function getResultsContainer() {
    const resultsContainer = document.getElementById('gte-validation-results');
    
    if (!resultsContainer) {
        // Цей лог може бути відсутнім, якщо ініціалізація відбувається до того, як секція Текст відображена
        // console.error("[Validator] Критична помилка: Елемент #gte-validation-results не знайдено в index.html!");
    }
    return resultsContainer;
}

/**
 * Знайти інформацію про заборонене слово
 */
function findBannedWordInfo(word) {
    if (!bannedWordsData || bannedWordsData.length === 0) return null;

    const lowerWord = word.toLowerCase();

    for (const row of bannedWordsData) {
        const ukWords = (row.name_uk || '').split(',').map(s => s.trim().toLowerCase());
        const ruWords = (row.name_ru || '').split(',').map(s => s.trim().toLowerCase());

        if (ukWords.includes(lowerWord) || ruWords.includes(lowerWord)) {
            return {
                group_name_ua: row.group_name_ua || '',
                banned_explaine: row.banned_explaine || '',
                banned_hint: row.banned_hint || ''
            };
        }
    }
    return null;
}

// Tooltip елемент
let gteTooltipElement = null;

function getGteTooltipElement() {
    if (!gteTooltipElement) {
        gteTooltipElement = document.createElement('div');
        gteTooltipElement.className = 'banned-word-tooltip';
        document.body.appendChild(gteTooltipElement);
    }
    return gteTooltipElement;
}

function showGteTooltip(target, wordInfo) {
    const tooltip = getGteTooltipElement();
    let content = '';

    // Назва групи
    if (wordInfo.group_name_ua) {
        content += `<div class="tooltip-title">${wordInfo.group_name_ua}</div>`;
    }

    // Пояснення
    if (wordInfo.banned_explaine) {
        content += `<div class="tooltip-description">${wordInfo.banned_explaine}</div>`;
    }

    // Рекомендація (banned_hint)
    if (wordInfo.banned_hint) {
        content += `<div class="tooltip-hint"><strong>Рекомендація:</strong> ${wordInfo.banned_hint}</div>`;
    }

    if (!content) return;

    tooltip.innerHTML = content;

    // Позиціонувати tooltip з перевіркою меж екрану
    const rect = target.getBoundingClientRect();

    // Спочатку показати щоб отримати реальні розміри
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';
    tooltip.style.display = 'block';

    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Перевірити чи tooltip не виходить за межі екрану (знизу)
    if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
    }

    // Перевірити чи tooltip не виходить за межі екрану (справа)
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
    }

    // Не дозволити від'ємний left
    if (left < 10) {
        left = 10;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = '';
    tooltip.style.display = '';
    tooltip.classList.add('visible');
}

function hideGteTooltip() {
    if (gteTooltipElement) {
        gteTooltipElement.classList.remove('visible');
    }
}

/**
 * Оновлює відображення результатів з детальною статистикою.
 */
function displayValidationResults(results) {
    const { totalCount, wordCounts } = results;
    const resultsContainer = getResultsContainer();
    if (!resultsContainer) return;

    if (totalCount > 0) {
        const formattedList = [];
        const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [word, count] of sortedEntries) {
            formattedList.push(`<span class="chip chip-error" data-banned-word="${word}">${word} (${count})</span>`);
        }

        const wordsListString = formattedList.join(' ');
        const html = `<div class="chip-list">${wordsListString}</div>`;

        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('has-errors');

        // Додати tooltip обробники
        resultsContainer.querySelectorAll('.chip-error[data-banned-word]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const word = e.target.dataset.bannedWord;
                const wordInfo = findBannedWordInfo(word);
                if (wordInfo) {
                    showGteTooltip(e.target, wordInfo);
                }
            });
            chip.addEventListener('mouseleave', hideGteTooltip);
        });
    } else {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('has-errors');
    }
}

// --- НОВИЙ КОД ДЛЯ ОБРОБКИ МОДАЛЬНОГО ВІКНА ---

/**
 * Обробляє подію modal-opened для списку заборонених слів.
 */
function handleModalOpened(event) {
    const { modalId, bodyTarget } = event.detail;
    
    // Перевіряємо, чи це потрібне нам модальне вікно
    if (modalId !== 'banned-words-modal') return;

    // Використовуємо bodyTarget (наданий подією) для пошуку елементів всередині модального вікна
    const listContainer = bodyTarget.querySelector('#banned-words-list-container');
    const searchInput = bodyTarget.querySelector('#banned-words-search-input');
    const countElement = bodyTarget.querySelector('#banned-words-count');

    if (!listContainer || !searchInput || !countElement) {
        console.error("[Validator Modal] Не вдалося знайти елементи модального вікна.");
        return;
    }

    // Функція для рендерингу списку на основі фільтра
    const renderList = (filter = '') => {
        listContainer.innerHTML = ''; // Очищуємо список
        const normalizedFilter = filter.toLowerCase().trim();

        const filteredWords = bannedWords.filter(word => 
            word.toLowerCase().includes(normalizedFilter)
        );

        // Оновлюємо лічильник
        countElement.textContent = `${filteredWords.length} / ${bannedWords.length}`;

        if (filteredWords.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Нічого не знайдено</p>';
            return;
        }

        // Ефективний рендерінг за допомогою DocumentFragment
        const fragment = document.createDocumentFragment();

        // RegExp для підсвічування (якщо фільтр присутній)
        let highlightRegex = null;
        if (normalizedFilter) {
            try {
                // g = глобальний, i = ігнорування регістру
                highlightRegex = new RegExp(`(${escapeRegExp(normalizedFilter)})`, 'gi');
            } catch (e) {
                console.error("Invalid regex for highlight:", e);
            }
        }

        filteredWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'banned-word-item';
            
            if (highlightRegex) {
                // Застосовуємо підсвічування за допомогою тегу <mark> (стилізовано в CSS шаблону)
                item.innerHTML = word.replace(highlightRegex, '<mark>$1</mark>');
            } else {
                item.textContent = word;
            }
            
            fragment.appendChild(item);
        });
        listContainer.appendChild(fragment);
    };

    // Початковий рендер
    renderList();

    // Додаємо обробник подій для поля пошуку з debounce (оптимізація)
    searchInput.addEventListener('input', debounce(() => {
        renderList(searchInput.value);
    }, 250));

    // Фокусуємо поле пошуку при відкритті модального вікна
    // Використовуємо невелику затримку, оскільки модальне вікно може ще відображатися
    setTimeout(() => searchInput.focus(), 100);
}

// --- КІНЕЦЬ НОВОГО КОДУ ---


export async function initValidator() {
    const dom = getTextDOM();
    if (!dom.inputMarkup) return;

    await fetchBannedWords();

    // Додаємо валідацію
    const debouncedValidate = debounce(validateText, 300);
    dom.inputMarkup.addEventListener('input', debouncedValidate);

    // Додаємо слухач для події відкриття модального вікна
    document.addEventListener('modal-opened', handleModalOpened);

    validateText();
}