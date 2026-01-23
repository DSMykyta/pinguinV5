// js/generators/generator-table/gt-magic-hints.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          TABLE GENERATOR - MAGIC HINTS (ПІДКАЗКИ МАГІЧНОГО ПАРСИНГУ)     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Модуль для відображення інформаційних підказок (чіпів) збоку модалі
 * магічного парсингу. Показує вітаміни з їх формами та незамінні амінокислоти.
 *
 * МОДУЛЬНІСТЬ:
 * Цей файл можна безпечно видалити без впливу на основний функціонал.
 * Для цього потрібно:
 * 1. Видалити імпорт з gt-event-handler.js
 * 2. Видалити виклик initMagicHints() та destroyMagicHints()
 * 3. Видалити контейнер #magic-hints-sidebar з magic-modal.html
 * 4. Видалити стилі .magic-hints-* з modal-structure.css
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ІНСТРУКЦІЯ ДЛЯ ПЕРЕХОДУ НА MAPPER (МАЙБУТНЄ):
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Поточна структура Mapper в Google Sheets:
 *
 * Mapper_Characteristics (вітаміни як характеристики):
 * | id         | name_ua    | parent_option_id |
 * | char-000010| Вітамін А  | opt-000045       |
 *
 * Mapper_Options (форми вітамінів):
 * | id         | characteristic_id | value_ua           |
 * | opt-000049 | char-000010       | Ретиніл палмітат   |
 * | opt-000050 | char-000010       | Ретиніл ацетат     |
 *
 * Для переходу на динамічне завантаження:
 *
 * 1. Додати в Mapper_Characteristics поле `hint_type`:
 *    - "vitamin" - для вітамінів
 *    - "essential_amino" - для незамінних амінокислот
 *
 * 2. Замінити VITAMIN_FORMS на функцію:
 *    async function loadVitaminForms() {
 *      const characteristics = await fetchMapperCharacteristics();
 *      const options = await fetchMapperOptions();
 *      return characteristics
 *        .filter(c => c.hint_type === 'vitamin')
 *        .map(c => ({
 *          vitamin: c.name_ua,
 *          forms: options
 *            .filter(o => o.characteristic_id === c.id)
 *            .map(o => o.value_ua)
 *        }));
 *    }
 *
 * 3. Замінити ESSENTIAL_AMINO_ACIDS на:
 *    async function loadEssentialAminoAcids() {
 *      const characteristics = await fetchMapperCharacteristics();
 *      return characteristics
 *        .filter(c => c.hint_type === 'essential_amino')
 *        .map(c => c.name_ua.toLowerCase());
 *    }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// СТАТИЧНІ ДАНІ (замінити на Mapper в майбутньому)
// ============================================================================

/**
 * Вітаміни та їх форми
 * Структура: vitamin → { triggers: [...], forms: [...] }
 * triggers - слова для пошуку в тексті (lowercase)
 * forms - офіційні назви форм для відображення
 */
const VITAMIN_FORMS = {
    'A': {
        triggers: ['ретинол', 'ретиніл', 'ретинил', 'бета-каротин', 'бета каротин', 'каротиноїд', 'каротиноид'],
        forms: ['Ретинол', 'Ретиніл палмітат', 'Ретиніл ацетат', 'Бета-каротин']
    },
    'B1': {
        triggers: ['тіамін', 'тиамин', 'thiamine', 'thiamin'],
        forms: ['Тіамін', 'Тіамін гідрохлорид', 'Бенфотіамін']
    },
    'B2': {
        triggers: ['рибофлавін', 'рибофлавин', 'riboflavin'],
        forms: ['Рибофлавін', 'Рибофлавін-5-фосфат']
    },
    'B3': {
        triggers: ['ніацин', 'ниацин', 'нікотинова кислота', 'никотиновая кислота', 'нікотинамід', 'никотинамид', 'niacin'],
        forms: ['Ніацин', 'Нікотинова кислота', 'Нікотинамід']
    },
    'B5': {
        triggers: ['пантотенова', 'пантотеновая', 'пантенол', 'd-пантенол', 'pantothenic'],
        forms: ['Пантотенова кислота', 'D-пантенол', 'Кальцій пантотенат']
    },
    'B6': {
        triggers: ['піридоксин', 'пиридоксин', 'pyridoxine', 'піридоксаль', 'пиридоксаль'],
        forms: ['Піридоксин', 'Піридоксин гідрохлорид', 'Піридоксаль-5-фосфат']
    },
    'B7': {
        triggers: ['біотин', 'биотин', 'biotin', 'вітамін h', 'витамин h'],
        forms: ['Біотин', 'D-біотин']
    },
    'B9': {
        triggers: ['фолієва', 'фолиевая', 'фолат', 'folic', 'folate', 'метилфолат', 'метилфолат'],
        forms: ['Фолієва кислота', 'Фолат', 'Метилфолат', '5-MTHF']
    },
    'B12': {
        triggers: ['кобаламін', 'кобаламин', 'cobalamin', 'ціанокобаламін', 'цианокобаламин', 'метилкобаламін', 'метилкобаламин'],
        forms: ['Ціанокобаламін', 'Метилкобаламін', 'Аденозилкобаламін']
    },
    'C': {
        triggers: ['аскорбінова', 'аскорбиновая', 'ascorbic', 'аскорбат', 'ascorbate'],
        forms: ['Аскорбінова кислота', 'Аскорбат натрію', 'Аскорбат кальцію']
    },
    'D': {
        triggers: ['холекальциферол', 'ергокальциферол', 'cholecalciferol', 'ergocalciferol', 'кальциферол'],
        forms: ['Холекальциферол (D3)', 'Ергокальциферол (D2)']
    },
    'E': {
        triggers: ['токоферол', 'tocopherol', 'токотрієнол', 'tocotrienol'],
        forms: ['Альфа-токоферол', 'Токоферол ацетат', 'Змішані токофероли']
    },
    'K': {
        triggers: ['філохінон', 'филлохинон', 'phylloquinone', 'менахінон', 'менахинон', 'menaquinone'],
        forms: ['Філохінон (K1)', 'Менахінон-4 (MK-4)', 'Менахінон-7 (MK-7)']
    }
};

/**
 * Незамінні амінокислоти (9 штук)
 * Організм не може синтезувати самостійно, потрібно отримувати з їжею
 */
const ESSENTIAL_AMINO_ACIDS = [
    { ua: 'гістидин', ru: 'гистидин', en: 'histidine' },
    { ua: 'ізолейцин', ru: 'изолейцин', en: 'isoleucine' },
    { ua: 'лейцин', ru: 'лейцин', en: 'leucine' },
    { ua: 'лізин', ru: 'лизин', en: 'lysine' },
    { ua: 'метіонін', ru: 'метионин', en: 'methionine' },
    { ua: 'фенілаланін', ru: 'фенилаланин', en: 'phenylalanine' },
    { ua: 'треонін', ru: 'треонин', en: 'threonine' },
    { ua: 'триптофан', ru: 'триптофан', en: 'tryptophan' },
    { ua: 'валін', ru: 'валин', en: 'valine' }
];

// ============================================================================
// СТАН МОДУЛЯ
// ============================================================================

let hintsContainer = null;
let textareaElement = null;
let inputHandler = null;

// ============================================================================
// ОСНОВНІ ФУНКЦІЇ
// ============================================================================

/**
 * Ініціалізує систему підказок для модалі магічного парсингу
 * Викликається при відкритті модалі
 */
export function initMagicHints() {
    hintsContainer = document.getElementById('magic-hints-sidebar');
    textareaElement = document.getElementById('magic-text');

    if (!hintsContainer || !textareaElement) {
        console.warn('[MagicHints] Контейнер або textarea не знайдено');
        return;
    }

    // Додаємо слухач введення з debounce
    inputHandler = debounce(handleTextInput, 300);
    textareaElement.addEventListener('input', inputHandler);

    // Також обробляємо paste подію
    textareaElement.addEventListener('paste', () => {
        setTimeout(() => handleTextInput(), 50);
    });

    // Початковий стан - порожній
    renderHints([]);
}

/**
 * Знищує систему підказок
 * Викликається при закритті модалі
 */
export function destroyMagicHints() {
    if (textareaElement && inputHandler) {
        textareaElement.removeEventListener('input', inputHandler);
    }
    hintsContainer = null;
    textareaElement = null;
    inputHandler = null;
}

// ============================================================================
// ЛОГІКА ВИЯВЛЕННЯ ТРИГЕРІВ
// ============================================================================

/**
 * Обробляє введений текст та знаходить відповідні підказки
 */
function handleTextInput() {
    if (!textareaElement || !hintsContainer) return;

    const text = textareaElement.value.toLowerCase();
    if (!text.trim()) {
        renderHints([]);
        return;
    }

    const hints = [];

    // Шукаємо вітаміни та їх форми
    for (const [vitamin, data] of Object.entries(VITAMIN_FORMS)) {
        for (const trigger of data.triggers) {
            if (text.includes(trigger)) {
                // Знаходимо яка саме форма згадана
                const matchedForm = data.forms.find(form =>
                    text.includes(form.toLowerCase())
                ) || data.forms[0];

                hints.push({
                    type: 'vitamin',
                    vitamin: `Вітамін ${vitamin}`,
                    form: matchedForm,
                    trigger: trigger
                });
                break; // Один вітамін - один чіп
            }
        }
    }

    // Шукаємо незамінні амінокислоти
    for (const amino of ESSENTIAL_AMINO_ACIDS) {
        if (text.includes(amino.ua) || text.includes(amino.ru) || text.includes(amino.en)) {
            hints.push({
                type: 'amino',
                name: amino.ua.charAt(0).toUpperCase() + amino.ua.slice(1),
                trigger: amino.ua
            });
        }
    }

    renderHints(hints);
}

// ============================================================================
// РЕНДЕРИНГ
// ============================================================================

/**
 * Рендерить чіпи підказок у sidebar
 * @param {Array} hints - Масив знайдених підказок
 */
function renderHints(hints) {
    if (!hintsContainer) return;

    if (hints.length === 0) {
        hintsContainer.innerHTML = `
            <div class="magic-hints-empty">
                <span class="material-symbols-outlined">lightbulb</span>
                <span>Підказки з'являться при введенні тексту</span>
            </div>
        `;
        hintsContainer.classList.remove('has-hints');
        return;
    }

    hintsContainer.classList.add('has-hints');

    const chipsHtml = hints.map(hint => {
        if (hint.type === 'vitamin') {
            return `
                <div class="magic-hint-chip magic-hint-vitamin" data-trigger="${hint.trigger}">
                    <span class="magic-hint-icon material-symbols-outlined">medication</span>
                    <div class="magic-hint-content">
                        <span class="magic-hint-label">${hint.vitamin}</span>
                        <span class="magic-hint-value">= ${hint.form}</span>
                    </div>
                </div>
            `;
        } else if (hint.type === 'amino') {
            return `
                <div class="magic-hint-chip magic-hint-amino" data-trigger="${hint.trigger}">
                    <span class="magic-hint-icon material-symbols-outlined">science</span>
                    <div class="magic-hint-content">
                        <span class="magic-hint-label">${hint.name}</span>
                        <span class="magic-hint-badge">Незамінна</span>
                    </div>
                </div>
            `;
        }
        return '';
    }).join('');

    hintsContainer.innerHTML = `
        <div class="magic-hints-header">
            <span class="material-symbols-outlined">info</span>
            <span>Знайдено підказок: ${hints.length}</span>
        </div>
        <div class="magic-hints-list">
            ${chipsHtml}
        </div>
    `;
}

// ============================================================================
// УТИЛІТИ
// ============================================================================

/**
 * Debounce функція для обмеження частоти викликів
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// ЕКСПОРТ ДЛЯ ТЕСТУВАННЯ (опціонально)
// ============================================================================

export const _testExports = {
    VITAMIN_FORMS,
    ESSENTIAL_AMINO_ACIDS
};
