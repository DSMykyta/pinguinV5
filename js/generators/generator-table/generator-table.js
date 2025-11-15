// js/generators/generator-table/generator-table.js

let rowCounter = 1;
let rowsContainer; // Головний контейнер для рядків
let reloadBtn;     // Кнопка перезавантаження для секції таблиць

// =========================================================================
// ОСНОВНА ФУНКЦІЯ ІНІЦІАЛІЗАЦІЇ (викликається один раз)
// =========================================================================
export function initTableGenerator() {
    rowsContainer = document.getElementById('rows-container');
    reloadBtn = document.getElementById('reload-section-tablet');

    if (!rowsContainer || !reloadBtn) {
        console.error('Не вдалося знайти контейнер для таблиць (#rows-container) або кнопку перезавантаження (#reload-section-tablet).');
        return;
    }

    setupEventListeners();
    resetTableSection();
}

// =========================================================================
// ЛОГІКА ПЕРЕЗАВАНТАЖЕННЯ (СКИДАННЯ) СЕКЦІЇ
// =========================================================================
function resetTableSection() {
    if (reloadBtn) {
        const icon = reloadBtn.querySelector('span');
        reloadBtn.style.color = 'var(--primary-color)';
        if (icon) {
            icon.style.transition = 'transform 0.5s ease';
            icon.style.transform = 'rotate(360deg)';
        }
    }

    rowsContainer.innerHTML = '';
    rowCounter = 1;

    initializeFirstRow();

    new Sortable(rowsContainer, { handle: '.move-btn', animation: 150 });

    setTimeout(() => {
        if (reloadBtn) {
            const icon = reloadBtn.querySelector('span');
            reloadBtn.style.color = 'var(--text-disabled)';
            if (icon) {
                icon.style.transform = 'none';
            }
        }
    }, 500);
}

// =========================================================================
// НАЛАШТУВАННЯ ВСІХ ОБРОБНИКІВ ПОДІЙ (ОДИН РАЗ)
// =========================================================================
function setupEventListeners() {
    reloadBtn.addEventListener('click', resetTableSection);

    const rightPanel = document.getElementById('panel-right');
    if (rightPanel) {
        rightPanel.addEventListener('click', (event) => {
            const targetButton = event.target.closest('[id]');
            if (!targetButton) return;
            switch (targetButton.id) {
                case 'add-input-btn':       createAndAppendRow();           break;
                case 'add-empty-line-btn':  initializeEmptyRow();           break;
                case 'add-ingredients-btn': addIngredientsSample();         break;
                case 'add-warning-btn':     addWarningSample();             break;
                case 'add-composition-btn': addCompositionSample();         break;
                case 'add-nutrition-btn':   addSample(getNutritionFacts()); break;
                case 'add-vitamins-btn':    addSample(getVitamins());       break;
                case 'add-aminos-btn':      addSample(getAminoAcids());     break;
                case 'result-card-html':
                    if (checkForEmptyNutritionFacts()) return;
                    copyToClipboard(generateHtmlTable(), targetButton);
                    break;
                case 'result-card-br':
                    if (checkForEmptyNutritionFacts()) return;
                    copyToClipboard(generateBrText(), targetButton);
                    break;
            }
        });
    }

    const magicApplyBtn = document.getElementById('magic-apply-btn');
    if (magicApplyBtn) {
        magicApplyBtn.addEventListener('click', () => {
            const magicText = document.getElementById('magic-text');
            const magicModal = document.getElementById('magic-modal');
            processAndFillInputs(magicText.value);
            if (magicModal) magicModal.classList.remove('is-open');
            document.body.classList.remove('is-modal-open');
        });
    }

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };
    const debouncedCalculate = debounce(calculatePercentages, 300);
    rowsContainer.addEventListener('input', debouncedCalculate);
}

// =========================================================================
// ВСІ ВАШІ ОРИГІНАЛЬНІ ДОПОМІЖНІ ФУНКЦІЇ (ПОВНИЙ СПИСОК)
// =========================================================================

function createAndAppendRow() {
    const newRow = createNewRow();
    rowsContainer.appendChild(newRow);
    return newRow;
}

function createNewRow() {
    const rowId = rowCounter++;
    const newRow = document.createElement('div');
    newRow.className = 'inputs-bloc td';
    newRow.id = `inputs-bloc-${rowId}`;
    newRow.innerHTML = `
        <button class="move-btn btn-icon" tabindex="-1"><span class="material-symbols-outlined">expand_all</span></button>
        <div class="inputs-line">
            <div class="left"><input class="input-left" placeholder="Введіть текст" autocomplete="off"></div>
            <div class="right"><input class="input-right" placeholder="Введіть текст" autocomplete="off"><span class="input-right-tool"></span></div>
        </div>
        <div class="select">
            <button class="use-attributes lil-btn" tabindex="-1"><span class="material-symbols-outlined">tune</span></button>
            <div class="attributes-dropdown u-hidden">
                <button class="option-btn option-btn-l active" data-class="td"><span>Звичайний</span></button>
                <button class="option-btn option-btn-l" data-class="th-strong"><span>Заголовок</span></button>
                <button class="option-btn option-btn-l" data-class="th"><span>Підзаголовок</span></button>
                <div class="line"></div>
                <div class="container-option-btn-sm">
                    <button class="option-btn option-btn-sm" data-class="bold"><span class="material-symbols-outlined">format_bold</span></button>
                    <button class="option-btn option-btn-sm" data-class="italic"><span class="material-symbols-outlined">format_italic</span></button>
                    <button class="option-btn option-btn-sm" data-class="h2"><span class="material-symbols-outlined">format_h2</span></button>
                    <button class="option-btn option-btn-sm" data-class="colspan2"><span class="material-symbols-outlined">fit_page</span></button>
                </div>
                <div class="line"></div>
                <button class="option-btn option-btn-l" data-class="new-table"><span>Нова таблиця</span></button>
                <div class="line"></div>
                <button class="option-btn option-btn-l" data-action="insert-above"><span>Створити вище</span></button>
                <button class="option-btn option-btn-l" data-action="insert-below"><span>Створити нижче</span></button>
                <div class="line"></div>
                <div class="switch-container">
                    <input type="radio" id="row-${rowId}" name="input-type-${rowId}" value="row" checked>
                    <label for="row-${rowId}" class="switch-label">Строка</label>
                    <input type="radio" id="field-${rowId}" name="input-type-${rowId}" value="field">
                    <label for="field-${rowId}" class="switch-label">Поле</label>
                </div>
            </div>
        </div>
        <button class="lil-btn" tabindex="-1"><span class="material-symbols-outlined">close</span></button>
    `;
    const dropdown = newRow.querySelector('.attributes-dropdown');
    const closeBtn = newRow.querySelector('.lil-btn:last-child');
    const triggerBtn = newRow.querySelector('.use-attributes');
    const closeDropdown = () => {
        dropdown.classList.add('u-hidden');
        document.removeEventListener('click', handleClickOutside);
    };
    const handleClickOutside = (event) => {
        if (!triggerBtn.contains(event.target) && !dropdown.contains(event.target)) {
            closeDropdown();
        }
    };
    triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = !dropdown.classList.contains('u-hidden');
        document.querySelectorAll('.attributes-dropdown').forEach(d => d.classList.add('u-hidden'));
        if (isVisible) {
            closeDropdown();
        } else {
            dropdown.classList.remove('u-hidden');
            document.addEventListener('click', handleClickOutside);
        }
    });
    dropdown.addEventListener('mouseleave', closeDropdown);
    closeBtn.addEventListener('click', () => { newRow.remove(); });
    dropdown.querySelectorAll('.option-btn').forEach(button => button.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = button.dataset.action;
        if (action === 'insert-above') insertRowAbove(newRow);
        else if (action === 'insert-below') insertRowBelow(newRow);
        else handleOptionClick(button, newRow);
        closeDropdown();
    }));
    dropdown.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', () => handleInputTypeSwitch(newRow, input.value)));
    dropdown.addEventListener('click', (e) => e.stopPropagation());
    return newRow;
}

function initializeFirstRow() {
    if (rowsContainer.children.length > 0) return;
    const firstRow = createAndAppendRow();
    const thStrongBtn = firstRow.querySelector('[data-class="th-strong"]');
    if (thStrongBtn) handleOptionClick(thStrongBtn, firstRow);
    firstRow.querySelector('.input-left').value = 'Пищевая ценность';
}

function initializeEmptyRow() {
    const newRow = createAndAppendRow();
    const newTblBtn = newRow.querySelector('[data-class="new-table"]');
    if (newTblBtn) handleOptionClick(newTblBtn, newRow);
}

function insertRowAbove(referenceRow) {
    const newRow = createNewRow();
    referenceRow.parentNode.insertBefore(newRow, referenceRow);
}

function insertRowBelow(referenceRow) {
    const newRow = createNewRow();
    referenceRow.parentNode.insertBefore(newRow, referenceRow.nextSibling);
}

function handleOptionClick(button, row) {
    const classToApply = button.dataset.class;
    const exclusiveClasses = ['td', 'th-strong', 'th', 'new-table', 'h2'];
    const isExclusive = exclusiveClasses.includes(classToApply);
    if (isExclusive) {
        if (row.classList.contains(classToApply)) {
            row.classList.remove(classToApply);
            button.classList.remove('active');
            if (!row.classList.contains('td')) {
                row.classList.add('td');
                const tdButton = row.querySelector('[data-class="td"]');
                if (tdButton) tdButton.classList.add('active');
            }
        } else {
            exclusiveClasses.forEach(cls => row.classList.remove(cls));
            row.classList.add(classToApply);
            row.querySelectorAll('.option-btn-l, [data-class="h2"]').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }
    } else {
        row.classList.toggle(classToApply);
        button.classList.toggle('active');
    }
}

function handleInputTypeSwitch(row, type) {
    ['.input-left', '.input-right'].forEach(selector => {
        const oldEl = row.querySelector(selector);
        const newEl = document.createElement(type === 'field' ? 'textarea' : 'input');
        newEl.className = oldEl.className;
        newEl.placeholder = oldEl.placeholder;
        newEl.value = oldEl.value;
        if (type === 'row') newEl.autocomplete = 'off';
        oldEl.parentNode.replaceChild(newEl, oldEl);
    });
}

function generateHtmlTable() {
    let tableHTML = '';
    let isTableOpen = false;
    rowsContainer.querySelectorAll('.inputs-bloc').forEach(row => {
        let leftInput = row.querySelector('.input-left').value;
        let rightInput = row.querySelector('.input-right').value;
        if ((row.classList.contains('added') && !rightInput.trim()) || (!row.classList.contains('new-table') && !leftInput.trim() && !rightInput.trim())) return;
        if (row.classList.contains('new-table') || row.classList.contains('h2')) {
            if (isTableOpen) { tableHTML += '</tbody></table>'; isTableOpen = false; }
            if (row.classList.contains('h2')) tableHTML += `<h2>${sanitizeText(leftInput)}</h2>`;
            return;
        }
        if (!isTableOpen) { tableHTML += '<table><tbody>'; isTableOpen = true; }
        let leftContent = sanitizeText(leftInput).replace(/\(([^)]+)\)/g, '<em>($1)</em>');
        let rightContent = sanitizeText(rightInput).replace(/\(([^)]+)\)/g, '<em>($1)</em>');
        if (row.classList.contains('italic')) {
            leftContent = `<em>${leftContent}</em>`;
            rightContent = `<em>${rightContent}</em>`;
        }
        const isTh = row.classList.contains('th-strong') || row.classList.contains('th');
        const cellTag = isTh ? 'th' : 'td';
        if (row.classList.contains('colspan2')) {
            let content = row.classList.contains('th-strong') || row.classList.contains('bold') ? `<strong>${leftContent}</strong>` : leftContent;
            tableHTML += `<tr><${cellTag} colspan="2">${content}</${cellTag}></tr>`;
        } else if (row.classList.contains('single')) {
            let content = row.classList.contains('th-strong') || row.classList.contains('bold') ? `<strong>${leftContent}</strong>` : leftContent;
            tableHTML += `<tr><${cellTag}>${content}</${cellTag}></tr>`;
        } else {
            let leftCell = row.classList.contains('th-strong') || row.classList.contains('bold') ? `<strong>${leftContent}</strong>` : leftContent;
            let rightCell = row.classList.contains('th-strong') || row.classList.contains('bold') ? `<strong>${rightContent}</strong>` : rightContent;
            tableHTML += `<tr><${cellTag}>${leftCell}</${cellTag}><${cellTag}>${rightCell}</${cellTag}></tr>`;
        }
    });
    if (isTableOpen) tableHTML += '</tbody></table>';
    return tableHTML;
}

function generateBrText() {
    let textHTML = '';
    rowsContainer.querySelectorAll('.inputs-bloc').forEach(row => {
        if (row.classList.contains('new-table')) { textHTML += '<br>'; return; }
        let leftInput = row.querySelector('.input-left').value;
        let rightInput = row.querySelector('.input-right').value;
        if ((row.classList.contains('added') && !rightInput.trim()) || (!leftInput.trim() && !rightInput.trim())) return;
        if (leftInput.match(/Харчова цінність|Пищевая ценность/gi)) leftInput = '';
        const sanitizedLeft = sanitizeText(leftInput);
        let line;
        if (row.classList.contains('h2') || row.classList.contains('colspan2') || row.classList.contains('single')) {
            line = sanitizedLeft;
        } else {
            const sanitizedRight = sanitizeText(rightInput);
            line = `${sanitizedLeft} ${sanitizedRight}`.trim();
        }
        if (row.classList.contains('h2') || row.classList.contains('bold') || row.classList.contains('th-strong') || row.classList.contains('th')) {
            line = `<strong>${line}</strong>`;
        }
        if (line) textHTML += line + '<br>';
    });
    return textHTML;
}

function checkForEmptyNutritionFacts(silent = false) {
    const nutritionRow = Array.from(rowsContainer.querySelectorAll('.inputs-bloc')).find(row => row.querySelector('.input-left').value.match(/Харчова цінність|Пищевая ценность/gi));
    if (nutritionRow && !nutritionRow.querySelector('.input-right').value.trim()) {
        if (!silent) alert('Обов\'язкове поле "Пищевая ценность" не заповнено!');
        return true;
    }
    return false;
}

function addSample(items) {
    items.forEach(item => {
        const newRow = createAndAppendRow();
        newRow.classList.add('added');
        newRow.querySelector('.input-left').value = item;
    });
}

function addIngredientsSample() {
    initializeEmptyRow();
    const headerRow = createAndAppendRow();
    handleOptionClick(headerRow.querySelector('[data-class="th-strong"]'), headerRow);
    headerRow.querySelector('.input-left').value = 'Ингредиенты';
    headerRow.classList.add('single');
    const fieldRow = createAndAppendRow();
    handleInputTypeSwitch(fieldRow, 'field');
    fieldRow.classList.add('single');
}

function addWarningSample() {
    initializeEmptyRow();
    const fieldRow = createAndAppendRow();
    handleInputTypeSwitch(fieldRow, 'field');
    handleOptionClick(fieldRow.querySelector('[data-class="bold"]'), fieldRow);
    fieldRow.classList.add('single');
}

function addCompositionSample() {
    initializeEmptyRow();
    const fieldRow = createAndAppendRow();
    handleInputTypeSwitch(fieldRow, 'field');
    handleOptionClick(fieldRow.querySelector('[data-class="bold"]'), fieldRow);
    fieldRow.classList.add('single');
    fieldRow.querySelector('.input-left').value = 'Состав может незначительно отличаться в зависимости от вкуса';
}

function processAndFillInputs(text) {
    if (!text) return;
    const lines = text.split('\n');
    lines.forEach(line => {
        line = line.replace(/\d+\s*%(\*\*)?|\d+\*\*+|\*+/g, '').trim();
        if (!line) return;
        let rightCell = '', leftCell = line;
        const parenthesesMatch = line.match(/\(([^)]+)\)$/);
        if (parenthesesMatch) { rightCell = `(${parenthesesMatch[1].trim()})`.replace(/,/g, '.'); leftCell = line.slice(0, parenthesesMatch.index).trim(); }
        const valueMatch = leftCell.match(/(<\s*)?(\d+\.\d+|\d+,\d+|\d+)(?!(.*\d))(\s+[а-яА-Яa-zA-Z]+\.*\s*(?!.*\))|(?=\n|$))/);
        if (valueMatch) { let newRightCell = valueMatch[0].trim().replace(/,/g, '.'); leftCell = leftCell.slice(0, valueMatch.index).trim(); rightCell = `${newRightCell} ${rightCell}`.trim(); }
        const newRow = createAndAppendRow();
        newRow.querySelector('.input-left').value = leftCell;
        newRow.querySelector('.input-right').value = rightCell;
    });
    const magicText = document.getElementById('magic-text');
    if (magicText) magicText.value = '';
}

function getNutritionFacts() { return ["Калории", " - от жиров", "Жиры", " - насыщенные", " - транс-жиры", "Холестерин", "Углеводы", " - сахар", "Пищевые волокна", "Белок", "Соль"]; }
function getVitamins() { return ["Витамин A", "Витамин C", "Витамин D", "Витамин E", "Витамин K", "Витамин B1", "Витамин B2", "Витамин B3", "Витамин B5", "Витамин B6", "Витамин B7", "Витамин B9", "Витамин B12"]; }
function getAminoAcids() { return ["Аланин", "Аргинин", "Аспарагин", "Аспарагиновая кислота", "Цистеин", "Глутамин", "Глутаминовая кислота", "Глицин", "Гистидин", "Изолейцин", "Лейцин", "Лизин", "Метионин", "Фенилаланин", "Пролин", "Серин", "Треонин", "Триптофан", "Тирозин", "Валин"]; }

function calculatePercentages() {
    let servingWeight = 0;
    const servingRow = Array.from(rowsContainer.querySelectorAll('.inputs-bloc')).find(r => r.querySelector('.input-left').value.match(/Пищевая ценность|Харчова цінність/gi));
    if (servingRow) {
        const weightMatch = servingRow.querySelector('.input-right').value.match(/(\d+)/);
        if (weightMatch) servingWeight = parseInt(weightMatch[0], 10);
    }
    if (servingWeight === 0) {
        rowsContainer.querySelectorAll('.input-right-tool').forEach(span => { span.textContent = ''; span.classList.remove('tooltip-sm'); });
        return;
    };
    ['Жиры', 'Жири', 'Углеводы', 'Вуглеводи', 'Белок', 'Білок'].forEach(nutrient => {
        const row = Array.from(rowsContainer.querySelectorAll('.inputs-bloc')).find(r => r.querySelector('.input-left').value.includes(nutrient));
        if (row) {
            const value = parseFloat(row.querySelector('.input-right').value) || 0;
            const percentage = value > 0 ? `${Math.round((value / servingWeight) * 100)}%` : '';
            const toolSpan = row.querySelector('.input-right-tool');
            toolSpan.textContent = percentage;
            toolSpan.classList.toggle('tooltip-sm', !!percentage);
        }
    });
}

function copyToClipboard(text, cardElement) {
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextarea);
    if (cardElement) {
        const status = cardElement.querySelector('.result-status');
        const originalText = status.textContent;
        status.textContent = 'Скопійовано!';
        cardElement.classList.add('copied');
        setTimeout(() => {
            status.textContent = originalText;
            cardElement.classList.remove('copied');
        }, 2000);
    }
}

function sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/МСМ/g, "MSM").replace(/(\d+),(\d+)/g, '$1.$2');
}