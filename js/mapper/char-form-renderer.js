// js/mapper/char-form-renderer.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║               CHARACTERISTIC FORM RENDERER                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Рендерить динамічну форму характеристик товару на основі               ║
 * ║  конфігурації з БД: sort_order, col_size, type, block_number.           ║
 * ║                                                                          ║
 * ║  GRID СИСТЕМА (12-колонкова):                                            ║
 * ║  col_size=1 → span 12 (100%, повна ширина)                              ║
 * ║  col_size=2 → span 6  (50%, половина)                                   ║
 * ║  col_size=3 → span 4  (33.3%, третина)                                  ║
 * ║  col_size=4 → span 3  (25%, чверть)                                     ║
 * ║  col_size=6 → span 2  (16.7%, шоста)                                    ║
 * ║                                                                          ║
 * ║  ТИПИ ПОЛІВ:                                                             ║
 * ║  TextInput    → <input type="text">                                      ║
 * ║  MultiText    → <input type="text"> (з тегами)                           ║
 * ║  Decimal      → <input type="number" step="0.01">                        ║
 * ║  Integer      → <input type="number" step="1">                           ║
 * ║  TextArea     → <textarea>                                               ║
 * ║  List         → <select> (одне значення)                                 ║
 * ║  ComboBox     → <select> (з можливістю введення)                         ║
 * ║  ListValues   → <select multiple>                                        ║
 * ║  CheckBoxGroup → чекбокси                                                ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - renderCharacteristicsForm(container, characteristics, options)         ║
 * ║  - getCharacteristicsFormValues(container)                               ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - char-grid.css (CSS grid класи)                                        ║
 * ║  - form-group.css (.group.column)                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../utils/text-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VALID_COL_SIZES = ['1', '2', '3', '4', '6'];
const DEFAULT_COL_SIZE = '2';

/**
 * Маппінг block_number → назва блоку
 */
const BLOCK_NAMES = {
    '1': 'Скільки там?',
    '2': 'Який він?',
    '3': 'Кому це?',
    '4': 'Навіщо це?',
    '5': 'Звідки це?',
    '6': 'Куди відправляти?',
    '8': 'Варіант',
    '9': 'Інше'
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерить форму характеристик в контейнер
 *
 * @param {HTMLElement|string} container - DOM елемент або ID контейнера
 * @param {Array} characteristics - масив характеристик (з sort_order, col_size, type, block_number)
 * @param {Array} options - масив опцій (для List/ComboBox/ListValues/CheckBoxGroup)
 * @param {Object} [values={}] - поточні значення полів { charId: value }
 * @returns {{ getValues: Function, destroy: Function }}
 */
export function renderCharacteristicsForm(container, characteristics, options, values = {}) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return null;

    // Сортуємо по sort_order, потім по id як fallback
    const sorted = [...characteristics].sort((a, b) => {
        const sortA = parseInt(a.sort_order) || 9999;
        const sortB = parseInt(b.sort_order) || 9999;
        if (sortA !== sortB) return sortA - sortB;
        return (a.id || '').localeCompare(b.id || '');
    });

    // Групуємо по block_number
    const blocks = groupByBlock(sorted);

    // Рендеримо
    el.innerHTML = '';

    for (const [blockNum, chars] of blocks) {
        const blockEl = renderBlock(blockNum, chars, options, values);
        el.appendChild(blockEl);
    }

    return {
        getValues: () => getCharacteristicsFormValues(el),
        destroy: () => { el.innerHTML = ''; }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Групуємо характеристики по block_number
 * Зберігаємо порядок сортування всередині кожного блоку
 */
function groupByBlock(sortedChars) {
    const blocks = new Map();

    for (const char of sortedChars) {
        const block = char.block_number || '9';
        if (!blocks.has(block)) {
            blocks.set(block, []);
        }
        blocks.get(block).push(char);
    }

    return blocks;
}

/**
 * Рендерить один блок (секцію) з характеристиками
 */
function renderBlock(blockNum, chars, options, values) {
    const section = document.createElement('section');
    section.className = 'char-form-block';
    section.dataset.block = blockNum;

    // Заголовок блоку
    const blockName = BLOCK_NAMES[blockNum] || `Блок ${blockNum}`;
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <div class="section-name-block">
            <div class="section-name">
                <h2 class="title-l section-upper">${escapeHtml(blockName)}</h2>
            </div>
        </div>
    `;
    section.appendChild(header);

    // Grid контейнер
    const grid = document.createElement('div');
    grid.className = 'char-grid';

    for (const char of chars) {
        const field = renderField(char, options, values[char.id]);
        grid.appendChild(field);
    }

    section.appendChild(grid);
    return section;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерить одне поле характеристики
 */
function renderField(char, allOptions, currentValue) {
    const colSize = VALID_COL_SIZES.includes(String(char.col_size))
        ? String(char.col_size)
        : DEFAULT_COL_SIZE;

    const wrapper = document.createElement('div');
    wrapper.className = `group column char-col-${colSize}`;
    wrapper.dataset.charId = char.id;

    // Label
    const label = document.createElement('label');
    label.className = 'label-l';
    label.setAttribute('for', `char-field-${char.id}`);
    label.textContent = char.name_ua || char.id;
    if (char.unit) {
        const unitSpan = document.createElement('span');
        unitSpan.className = 'label-unit';
        unitSpan.textContent = ` (${char.unit})`;
        label.appendChild(unitSpan);
    }
    wrapper.appendChild(label);

    // Input element based on type
    const charOptions = allOptions.filter(o => o.characteristic_id === char.id);
    const input = createInput(char, charOptions, currentValue);
    wrapper.appendChild(input);

    return wrapper;
}

/**
 * Створює input елемент відповідного типу
 */
function createInput(char, charOptions, currentValue) {
    const type = char.type || 'TextInput';
    const id = `char-field-${char.id}`;
    const value = currentValue ?? '';

    switch (type) {
        case 'TextInput':
        case 'MultiText':
            return createTextInput(id, value, char);

        case 'Decimal':
            return createNumberInput(id, value, '0.01');

        case 'Integer':
            return createNumberInput(id, value, '1');

        case 'TextArea':
            return createTextArea(id, value);

        case 'List':
            return createSelect(id, charOptions, value, false);

        case 'ComboBox':
            return createSelect(id, charOptions, value, false);

        case 'ListValues':
            return createSelect(id, charOptions, value, true);

        case 'CheckBoxGroup':
            return createCheckboxGroup(id, charOptions, value);

        default:
            return createTextInput(id, value, char);
    }
}

/**
 * TextInput / MultiText
 */
function createTextInput(id, value, char) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.className = 'input-main';
    input.value = value;
    input.placeholder = char.name_ua || '';
    return input;
}

/**
 * Decimal / Integer
 */
function createNumberInput(id, value, step) {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.className = 'input-main';
    input.value = value;
    input.step = step;
    input.placeholder = '0';
    return input;
}

/**
 * TextArea
 */
function createTextArea(id, value) {
    const textarea = document.createElement('textarea');
    textarea.id = id;
    textarea.className = 'input-main';
    textarea.value = value;
    textarea.rows = 3;
    return textarea;
}

/**
 * List / ComboBox / ListValues
 */
function createSelect(id, charOptions, currentValue, multiple) {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'input-main';
    if (multiple) select.multiple = true;

    // Пустий option для single select
    if (!multiple) {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '— Оберіть —';
        select.appendChild(emptyOpt);
    }

    const selectedValues = multiple && currentValue
        ? String(currentValue).split(',').map(v => v.trim())
        : [String(currentValue)];

    for (const opt of charOptions) {
        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = opt.value_ua || opt.id;
        if (selectedValues.includes(opt.id)) {
            option.selected = true;
        }
        select.appendChild(option);
    }

    return select;
}

/**
 * CheckBoxGroup
 */
function createCheckboxGroup(id, charOptions, currentValue) {
    const container = document.createElement('div');
    container.className = 'checkbox-group';
    container.id = id;

    const selectedValues = currentValue
        ? String(currentValue).split(',').map(v => v.trim())
        : [];

    for (const opt of charOptions) {
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = id;
        checkbox.value = opt.id;
        if (selectedValues.includes(opt.id)) {
            checkbox.checked = true;
        }

        const span = document.createElement('span');
        span.textContent = opt.value_ua || opt.id;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    }

    return container;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALUES EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зібрати всі значення з форми характеристик
 * @param {HTMLElement} container - контейнер форми
 * @returns {Object} { charId: value }
 */
export function getCharacteristicsFormValues(container) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return {};

    const values = {};

    el.querySelectorAll('[data-char-id]').forEach(wrapper => {
        const charId = wrapper.dataset.charId;
        const input = wrapper.querySelector('input, select, textarea');

        if (!input) {
            // CheckboxGroup
            const checkboxGroup = wrapper.querySelector('.checkbox-group');
            if (checkboxGroup) {
                const checked = Array.from(checkboxGroup.querySelectorAll('input:checked'))
                    .map(cb => cb.value);
                values[charId] = checked.join(',');
            }
            return;
        }

        if (input.tagName === 'SELECT' && input.multiple) {
            const selected = Array.from(input.selectedOptions).map(o => o.value);
            values[charId] = selected.join(',');
        } else {
            values[charId] = input.value;
        }
    });

    return values;
}
