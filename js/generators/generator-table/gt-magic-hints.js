// js/generators/generator-table/gt-magic-hints.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          TABLE GENERATOR - MAGIC HINTS (ПІДКАЗКИ МАГІЧНОГО ПАРСИНГУ)     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Показує підказки (чіпи) збоку модалі магічного парсингу:
 * - Вітаміни з їх формами (B2 = Рибофлавін)
 * - Незамінні амінокислоти
 *
 * МОДУЛЬНІСТЬ:
 * Для видалення без впливу на основний функціонал:
 * 1. Видалити імпорт з gt-event-handler.js
 * 2. Видалити виклики initMagicHints()/destroyMagicHints()
 * 3. Видалити #magic-hints-sidebar з magic-modal.html
 * 4. Видалити .magic-hints-sidebar з modal-structure.css
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ІНСТРУКЦІЯ ДЛЯ ПЕРЕХОДУ НА MAPPER:
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. Додати в Mapper_Characteristics поле hint_type: "vitamin" | "essential_amino"
 * 2. Замінити VITAMIN_FORMS на динамічне завантаження з API
 * 3. Замінити ESSENTIAL_AMINO_ACIDS на фільтр з characteristics
 */

// ============================================================================
// СТАТИЧНІ ДАНІ
// ============================================================================

const VITAMIN_FORMS = {
    'A': {
        triggers: ['ретинол', 'ретиніл', 'ретинил', 'бета-каротин', 'бета каротин'],
        forms: ['Ретинол', 'Ретиніл палмітат', 'Бета-каротин']
    },
    'B1': {
        triggers: ['тіамін', 'тиамин', 'thiamine'],
        forms: ['Тіамін']
    },
    'B2': {
        triggers: ['рибофлавін', 'рибофлавин', 'riboflavin'],
        forms: ['Рибофлавін']
    },
    'B3': {
        triggers: ['ніацин', 'ниацин', 'нікотинова кислота', 'никотиновая кислота'],
        forms: ['Ніацин', 'Нікотинова кислота']
    },
    'B5': {
        triggers: ['пантотенова', 'пантотеновая', 'пантенол'],
        forms: ['Пантотенова кислота']
    },
    'B6': {
        triggers: ['піридоксин', 'пиридоксин', 'pyridoxine'],
        forms: ['Піридоксин']
    },
    'B7': {
        triggers: ['біотин', 'биотин', 'biotin'],
        forms: ['Біотин']
    },
    'B9': {
        triggers: ['фолієва', 'фолиевая', 'фолат', 'folic'],
        forms: ['Фолієва кислота', 'Фолат']
    },
    'B12': {
        triggers: ['кобаламін', 'кобаламин', 'ціанокобаламін', 'цианокобаламин'],
        forms: ['Ціанокобаламін', 'Метилкобаламін']
    },
    'C': {
        triggers: ['аскорбінова', 'аскорбиновая', 'ascorbic'],
        forms: ['Аскорбінова кислота']
    },
    'D': {
        triggers: ['холекальциферол', 'ергокальциферол', 'cholecalciferol'],
        forms: ['Холекальциферол (D3)', 'Ергокальциферол (D2)']
    },
    'E': {
        triggers: ['токоферол', 'tocopherol'],
        forms: ['Альфа-токоферол']
    },
    'K': {
        triggers: ['філохінон', 'филлохинон', 'менахінон', 'менахинон'],
        forms: ['Філохінон (K1)', 'Менахінон (K2)']
    }
};

const ESSENTIAL_AMINO_ACIDS = [
    { ua: 'гістидин', ru: 'гистидин' },
    { ua: 'ізолейцин', ru: 'изолейцин' },
    { ua: 'лейцин', ru: 'лейцин' },
    { ua: 'лізин', ru: 'лизин' },
    { ua: 'метіонін', ru: 'метионин' },
    { ua: 'фенілаланін', ru: 'фенилаланин' },
    { ua: 'треонін', ru: 'треонин' },
    { ua: 'триптофан', ru: 'триптофан' },
    { ua: 'валін', ru: 'валин' }
];

// ============================================================================
// СТАН
// ============================================================================

let hintsContainer = null;
let textareaElement = null;
let inputHandler = null;

// ============================================================================
// ОСНОВНІ ФУНКЦІЇ
// ============================================================================

export function initMagicHints() {
    hintsContainer = document.getElementById('magic-hints-sidebar');
    textareaElement = document.getElementById('magic-text');

    if (!hintsContainer || !textareaElement) return;

    inputHandler = debounce(handleTextInput, 300);
    textareaElement.addEventListener('input', inputHandler);
    textareaElement.addEventListener('paste', () => setTimeout(handleTextInput, 50));

    hintsContainer.innerHTML = '';
}

export function destroyMagicHints() {
    if (textareaElement && inputHandler) {
        textareaElement.removeEventListener('input', inputHandler);
    }
    hintsContainer = null;
    textareaElement = null;
    inputHandler = null;
}

// ============================================================================
// ЛОГІКА
// ============================================================================

function handleTextInput() {
    if (!textareaElement || !hintsContainer) return;

    const text = textareaElement.value.toLowerCase();
    if (!text.trim()) {
        hintsContainer.innerHTML = '';
        return;
    }

    const hints = [];

    // Вітаміни
    for (const [vitamin, data] of Object.entries(VITAMIN_FORMS)) {
        for (const trigger of data.triggers) {
            if (text.includes(trigger)) {
                const matchedForm = data.forms.find(f => text.includes(f.toLowerCase())) || data.forms[0];
                hints.push({
                    type: 'vitamin',
                    text: `Вітамін ${vitamin} = ${matchedForm}`
                });
                break;
            }
        }
    }

    // Незамінні амінокислоти
    for (const amino of ESSENTIAL_AMINO_ACIDS) {
        if (text.includes(amino.ua) || text.includes(amino.ru)) {
            const name = amino.ua.charAt(0).toUpperCase() + amino.ua.slice(1);
            hints.push({
                type: 'amino',
                name: name
            });
        }
    }

    renderHints(hints);
}

function renderHints(hints) {
    if (!hintsContainer) return;

    if (hints.length === 0) {
        hintsContainer.innerHTML = '';
        return;
    }

    hintsContainer.innerHTML = hints.map(hint => {
        if (hint.type === 'vitamin') {
            return `<span class="badge">${hint.text}</span>`;
        } else {
            return `<span class="severity-badge severity-medium">${hint.name} — EAA</span>`;
        }
    }).join('');
}

// ============================================================================
// УТИЛІТИ
// ============================================================================

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export const _testExports = { VITAMIN_FORMS, ESSENTIAL_AMINO_ACIDS };
