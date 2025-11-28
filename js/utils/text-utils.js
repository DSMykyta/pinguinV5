// js/utils/text-utils.js
// Утиліти для роботи з текстом

// Константи для word boundaries (кирилиця + латиниця)
const WORD_BOUNDARY_CHARS_LOWER = 'а-яїієґёa-z';
const WORD_BOUNDARY_CHARS_ALL = 'а-яїієґёa-zА-ЯЇІЄҐЁA-Z';

/**
 * Створити regex для пошуку слова з word boundaries (не захоплює boundaries)
 * @param {string} escapedWord - Екранований термін для пошуку
 * @param {string} flags - Прапорці regex (за замовчуванням 'gi')
 * @returns {RegExp} Регулярний вираз
 */
function createWordBoundaryRegex(escapedWord, flags = 'gi') {
    return new RegExp(`(?<![${WORD_BOUNDARY_CHARS_LOWER}])${escapedWord}(?![${WORD_BOUNDARY_CHARS_LOWER}])`, flags);
}

/**
 * Створити regex для пошуку слова з word boundaries (захоплює boundaries для заміни)
 * @param {string} escapedWord - Екранований термін для пошуку
 * @param {string} flags - Прапорці regex (за замовчуванням 'gi')
 * @returns {RegExp} Регулярний вираз з групами захоплення $1 (prefix), $2 (word), $3 (suffix)
 */
function createWordBoundaryRegexWithCapture(escapedWord, flags = 'gi') {
    return new RegExp(`(^|[^${WORD_BOUNDARY_CHARS_ALL}])(${escapedWord})($|[^${WORD_BOUNDARY_CHARS_ALL}])`, flags);
}

/**
 * Екранувати спецсимволи для regex
 * @param {string} str - Рядок для екранування
 * @returns {string} Екранований рядок
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Екранувати HTML символи для безпечного відображення
 * @param {string|number} text - Текст для екранування
 * @returns {string} Екранований текст
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Перевірити текст на наявність заборонених слів
 * @param {string} text - Текст для перевірки
 * @param {string[]} bannedWords - Масив заборонених слів
 * @returns {Array} Масив знайдених слів з позиціями
 * @example
 * checkTextForBannedWords('Текст з поганим словом', ['поганим'])
 * // [{word: 'поганим', count: 1, positions: [10]}]
 */
export function checkTextForBannedWords(text, bannedWords) {
    const found = [];

    if (!text || !text.trim()) return found;
    if (!bannedWords || bannedWords.length === 0) return found;

    // Видаляємо HTML теги
    const cleanText = text.replace(/<[^>]*>/g, ' ');

    // Дедуплікація заборонених слів
    const uniqueWords = [...new Set(bannedWords.map(w =>
        typeof w === 'string' ? w.toLowerCase().trim() : ''
    ))].filter(Boolean);

    if (uniqueWords.length === 0) return found;

    // Підрахунок входжень - надійний метод без "з'їдання" границь
    const wordCounts = new Map();

    // Приводимо текст до нижнього регістру для пошуку
    const lowerText = cleanText.toLowerCase();

    // Рахуємо кожне слово окремо (надійніше ніж один regex)
    for (const word of uniqueWords) {
        const escapedWord = escapeRegex(word);
        const wordRegex = createWordBoundaryRegex(escapedWord);
        const matches = lowerText.match(wordRegex);
        if (matches && matches.length > 0) {
            wordCounts.set(word, matches.length);
        }
    }

    // Формуємо результат
    wordCounts.forEach((count, word) => {
        found.push({
            word: word,
            count: count,
            positions: []
        });
    });

    return found;
}

/**
 * Отримати фрагмент тексту з контекстом навколо позиції
 * @param {string} text - Повний текст
 * @param {number} position - Позиція в тексті
 * @param {number} contextLength - Довжина контексту з кожного боку (за замовчуванням 50)
 * @returns {string} Фрагмент тексту з контекстом
 * @example
 * getTextFragment('Довгий текст з поганим словом всередині', 16, 10)
 * // '...текст з поганим словом...'
 */
export function getTextFragment(text, position, contextLength = 50) {
    if (!text || position < 0) return '';

    // Видалити HTML теги для чистого тексту
    const cleanText = text.replace(/<[^>]*>/g, ' ');

    const start = Math.max(0, position - contextLength);
    const end = Math.min(cleanText.length, position + contextLength);

    let fragment = cleanText.substring(start, end);

    // Додати ... якщо фрагмент не з початку/кінця
    if (start > 0) fragment = '...' + fragment;
    if (end < cleanText.length) fragment = fragment + '...';

    return fragment;
}

/**
 * Підсвітити знайдені слова в тексті
* @param {string} text - Оригінальний текст
 * @param {string[]} searchTerms - Слова для підсвітки
 * @param {string} highlightClass - CSS клас для підсвітки (за замовчуванням 'highlight')
 * @returns {string} HTML з підсвіченими словами
 * @example
 * highlightText('Текст з важливим словом', ['важливим'])
 * // 'Текст з <span class="highlight">важливим</span> словом'
 */
export function highlightText(text, searchTerms, highlightClass = 'highlight') {
    // ВИПРАВЛЕНО: Логіка для уникнення вкладених тегів + word boundaries
    if (!text || !searchTerms || searchTerms.length === 0) return escapeHtml(text);

    // 1. Отримуємо унікальні, непусті терміни
    const uniqueTerms = [...new Set(searchTerms.filter(Boolean))];
    if (uniqueTerms.length === 0) return escapeHtml(text);

    // 2. Сортуємо від найдовшого до найкоротшого (щоб "препарати" знайшлося раніше за "препарат")
    uniqueTerms.sort((a, b) => b.length - a.length);

    // 3. Створюємо єдиний RegExp з word boundaries (як в checkTextForBannedWords)
    const regexBody = uniqueTerms
        .map(term => escapeRegex(term))
        .join('|');

    const regex = createWordBoundaryRegexWithCapture(regexBody);

    // 4. Екрануємо HTML в оригінальному тексті
    const escapedText = escapeHtml(text);

    // 5. Виконуємо заміну з збереженням boundaries ($1 та $3)
    const result = escapedText.replace(regex, `$1<span class="${highlightClass}">$2</span>$3`);

    return result;
    // КІНЕЦЬ ВИПРАВЛЕННЯ
}

/**
 * Обрізати текст до максимальної довжини
 * @param {string} text - Текст для обрізання
 * @param {number} maxLength - Максимальна довжина
 * @param {string} ellipsis - Символ ellipsis (за замовчуванням '...')
 * @returns {string} Обрізаний текст
 * @example
 * truncateText('Дуже довгий текст який треба обрізати', 20)
 * // 'Дуже довгий текст...'
 */
export function truncateText(text, maxLength, ellipsis = '...') {
    if (!text || text.length <= maxLength) return text;

    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Нормалізувати текст для пошуку (видалити зайві пробіли, привести до нижнього регістру)
 * @param {string} text - Текст для нормалізації
 * @returns {string} Нормалізований текст
 * @example
 * normalizeSearchText('  Текст   З   Пробілами  ')
 * // 'текст з пробілами'
 */
export function normalizeSearchText(text) {
    if (!text) return '';

    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Видалити HTML теги з тексту
 * @param {string} html - HTML текст
 * @returns {string} Чистий текст без тегів
 * @example
 * stripHtmlTags('<p>Текст <strong>з тегами</strong></p>')
 * // 'Текст з тегами'
 */
export function stripHtmlTags(html) {
    if (!html) return '';

    return html.replace(/<[^>]*>/g, '');
}

/**
 * Витягти контекст навколо знайденого забороненого слова з підсвічуванням
 * @param {string} text - Повний текст
 * @param {string} bannedWord - Заборонене слово
 * @param {number} contextLength - Довжина контексту з кожного боку (за замовчуванням 40)
 * @returns {string} HTML фрагмент з підсвіченим словом або null якщо слово не знайдено
 * @example
 * extractContextWithHighlight('Це текст з забороненим словом всередині', 'забороненим', 15)
 * // '...текст з <span class="highlight-banned-word">забороненим</span> словом...'
 */
export function extractContextWithHighlight(text, bannedWord, contextLength = 40) {
    if (!text || !bannedWord) return null;

    // Видалити HTML теги для чистого тексту
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const lowerText = cleanText.toLowerCase();
    const lowerWord = bannedWord.toLowerCase();

    // Знайти позицію слова (з урахуванням меж слів)
    const escapedWord = escapeRegex(lowerWord);
    const regex = createWordBoundaryRegexWithCapture(escapedWord, 'i');
    const match = lowerText.match(regex);

    if (!match) return null;

    // Знайти фактичну позицію слова (після prefix boundary)
    const wordStart = match.index + match[1].length;
    const wordEnd = wordStart + bannedWord.length;

    // Визначити межі фрагменту
    let start = Math.max(0, wordStart - contextLength);
    let end = Math.min(cleanText.length, wordEnd + contextLength);

    // Спробувати вирівняти по словах для кращої читабельності
    if (start > 0) {
        const spaceIndex = cleanText.lastIndexOf(' ', start);
        if (spaceIndex > 0 && spaceIndex > start - 20) {
            start = spaceIndex + 1;
        }
    }

    if (end < cleanText.length) {
        const spaceIndex = cleanText.indexOf(' ', end);
        if (spaceIndex !== -1 && spaceIndex < end + 20) {
            end = spaceIndex;
        }
    }

    // Витягти фрагмент
    let fragment = cleanText.substring(start, end);

    // Додати елліпсис
    const prefix = start > 0 ? '...' : '';
    const suffix = end < cleanText.length ? '...' : '';

    // Екранувати HTML
    fragment = escapeHtml(fragment);

    // Підсвітити заборонене слово з word boundaries
    const fragmentRegex = createWordBoundaryRegexWithCapture(escapedWord);
    fragment = fragment.replace(fragmentRegex, '$1<span class="highlight-banned-word">$2</span>$3');

    return prefix + fragment + suffix;
}
