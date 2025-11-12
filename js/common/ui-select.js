// js/common/ui-select.js
// Кастомні селекти з пошуком (спільний модуль для всього проєкту)

export function initCustomSelects(container = document) {
    container.querySelectorAll('select[data-custom-select]').forEach(selectEl => {
        if (!selectEl.closest('.custom-select-wrapper')) {
            new CustomSelect(selectEl);
        }
    });
}

export function reinitializeCustomSelect(selectElement) {
    if (!selectElement) return;
    const existingWrapper = selectElement.closest('.custom-select-wrapper');
    if (existingWrapper) {
        // Зупиняємо спостерігач перед видаленням
        if (selectElement.customSelect && selectElement.customSelect.observer) {
            selectElement.customSelect.observer.disconnect();
        }
        existingWrapper.parentNode.insertBefore(selectElement, existingWrapper);
        existingWrapper.remove();
        selectElement.style.display = '';
    }
    new CustomSelect(selectElement);
}

/**
 * Заповнити select елемент даними
 *
 * @param {string|HTMLSelectElement} selectElement - ID або елемент select
 * @param {Array<{value: string, text: string, dataset?: Object}>} items - Масив елементів для select
 * @param {Object} options - Опції
 * @param {string} options.placeholder - Текст placeholder опції (за замовчуванням '-- Оберіть --')
 * @param {boolean} options.reinit - Чи переініціалізувати custom select після заповнення (за замовчуванням true)
 * @param {string} options.selectedValue - Значення яке треба вибрати після заповнення (опціонально)
 *
 * @example
 * populateSelect('my-select', [
 *   { value: '1', text: 'Option 1' },
 *   { value: '2', text: 'Option 2', dataset: { id: '2', name: 'Opt2' } }
 * ], {
 *   placeholder: '-- Choose option --',
 *   selectedValue: '1'
 * });
 */
export function populateSelect(selectElement, items, options = {}) {
    const {
        placeholder = '-- Оберіть --',
        reinit = true,
        selectedValue = null
    } = options;

    // Отримати елемент select
    const selectEl = typeof selectElement === 'string'
        ? document.getElementById(selectElement)
        : selectElement;

    if (!selectEl) {
        console.warn(`⚠️ Select element "${selectElement}" не знайдено`);
        return;
    }

    // Очистити select і додати placeholder
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;

    // Додати всі елементи
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.text;

        // Додати dataset атрибути якщо є
        if (item.dataset) {
            Object.entries(item.dataset).forEach(([key, value]) => {
                option.dataset[key] = value;
            });
        }

        selectEl.appendChild(option);
    });

    // Встановити вибране значення якщо задано
    if (selectedValue !== null) {
        selectEl.value = selectedValue;
    }

    // Переініціалізувати custom select якщо потрібно
    if (reinit && selectEl.dataset.customSelect !== undefined) {
        reinitializeCustomSelect(selectEl);
    }
}

class CustomSelect {
    constructor(originalSelect) {
        this.originalSelect = originalSelect;
        this.originalSelect.customSelect = this;
        this.isMultiSelect = originalSelect.multiple;

        this._buildDOM();
        this._populateOptions();

        // ResizeObserver для динамічного відстеження розміру
        this.observer = new ResizeObserver(() => {
            this._updateSelection();
        });
        this.observer.observe(this.trigger);

        this._updateSelection();
        this._bindEvents();
    }

    _buildDOM() {
        this.wrapper = this._createElement('div', { class: 'custom-select-wrapper' });
        this.trigger = this._createElement('div', { class: 'custom-select-trigger' });
        this.valueContainer = this._createElement('div', { class: 'custom-select-value-container' });
        this.arrow = this._createArrowSVG();
        this.panel = this._createElement('div', { class: 'custom-select-panel' });

        // Контейнер для чіпів при переповненні
        this.overflowChipContainer = this._createElement('div', { class: 'custom-select-overflow-chips' });

        this.optionsList = this._createElement('ul', { class: 'custom-select-options', role: 'listbox' });

        this.originalSelect.style.display = 'none';
        this.originalSelect.parentNode.insertBefore(this.wrapper, this.originalSelect);

        this.trigger.appendChild(this.valueContainer);
        this.trigger.appendChild(this.arrow);
        this.wrapper.appendChild(this.trigger);
        this.wrapper.appendChild(this.panel);
        this.wrapper.appendChild(this.originalSelect);

        this.panel.appendChild(this.overflowChipContainer);

        if (Array.from(this.originalSelect.options).length > 5) {
            const searchWrapper = this._createElement('div', { class: 'custom-select-search-wrapper' });
            this.searchInput = this._createElement('input', { type: 'text', class: 'custom-select-search', placeholder: 'Пошук...' });
            searchWrapper.appendChild(this.searchInput);
            this.panel.appendChild(searchWrapper);
        }

        this.panel.appendChild(this.optionsList);
    }

    _populateOptions() {
        this.optionsList.innerHTML = '';
        Array.from(this.originalSelect.options).forEach(option => {
            if (!option.value && this.isMultiSelect) return; // Пропускаємо порожні опції в мультиселекті

            const optionEl = this._createElement('li', {
                class: 'custom-select-option',
                'data-value': option.value,
                role: 'option'
            });
            optionEl.innerHTML = option.dataset.htmlContent || option.textContent;
            this.optionsList.appendChild(optionEl);
        });
    }

    _updateSelection() {
        const selectedOptions = Array.from(this.originalSelect.options).filter(opt => opt.selected && opt.value);

        // Оновлюємо стан is-selected для списку
        this.optionsList.querySelectorAll('.custom-select-option').forEach(customOpt => {
            const isSelected = selectedOptions.some(selOpt => selOpt.value === customOpt.dataset.value);
            customOpt.classList.toggle('is-selected', isSelected);
        });

        if (!this.isMultiSelect) {
            this.valueContainer.innerHTML = selectedOptions.length > 0
                ? (selectedOptions[0].dataset.htmlContent || selectedOptions[0].textContent)
                : `<span class="custom-select-placeholder">${this.originalSelect.placeholder || 'Виберіть...'}</span>`;
            return;
        }

        // Логіка для мультиселекту
        this.valueContainer.innerHTML = '';
        this.overflowChipContainer.innerHTML = '';
        this.overflowChipContainer.style.display = 'none';

        if (selectedOptions.length === 0) {
            this.valueContainer.innerHTML = `<span class="custom-select-placeholder">${this.originalSelect.placeholder || 'Виберіть...'}</span>`;
            return;
        }

        const chips = selectedOptions.map(option => this._createChip(option));

        // Перевірка на переповнення
        chips.forEach(chip => this.valueContainer.appendChild(chip));
        const isOverflowing = this.valueContainer.scrollHeight > this.valueContainer.clientHeight;

        if (isOverflowing) {
            this.valueContainer.innerHTML = '';
            const summaryChip = this._createElement('div', { class: 'custom-select-chip is-summary' });
            summaryChip.textContent = selectedOptions.length;
            this.valueContainer.appendChild(summaryChip);

            chips.forEach(chip => this.overflowChipContainer.appendChild(chip));
            this.overflowChipContainer.style.display = 'flex';
        }
    }

    _createChip(option) {
        const chip = this._createElement('div', { class: 'custom-select-chip' });

        // Логіка відображення чіпа з підтримкою ієрархії
        const shortName = option.dataset.name;
        const level = parseInt(option.dataset.level, 10);
        if (shortName && !isNaN(level)) {
            const prefix = ' / '.repeat(level);
            chip.textContent = `${prefix}${shortName}`.trim();
        } else {
            chip.textContent = option.textContent;
        }

        const removeBtn = this._createElement('button', { type: 'button', class: 'custom-select-chip__remove' });
        removeBtn.innerHTML = '&times;';

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const correspondingOption = Array.from(this.originalSelect.options).find(opt => opt.value === option.value);
            if(correspondingOption) correspondingOption.selected = false;
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this._updateSelection();
        });

        chip.appendChild(removeBtn);
        return chip;
    }

    _bindEvents() {
        this.trigger.addEventListener('click', () => this.wrapper.classList.toggle('is-open'));

        this.optionsList.addEventListener('click', (e) => {
            const optionEl = e.target.closest('.custom-select-option');
            if (optionEl && 'value' in optionEl.dataset) {
                const option = Array.from(this.originalSelect.options).find(opt => opt.value === optionEl.dataset.value);
                if (this.isMultiSelect) {
                    option.selected = !option.selected;
                } else {
                    this.originalSelect.value = option.value;
                    this.wrapper.classList.remove('is-open');
                }
                this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
                this._updateSelection();
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) this.wrapper.classList.remove('is-open');
        });

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                this.optionsList.querySelectorAll('.custom-select-option').forEach(optEl => {
                    const text = optEl.textContent.toLowerCase();
                    optEl.style.display = text.includes(query) ? '' : 'none';
                });
            });
        }
    }

    _createArrowSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'custom-select-arrow');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M7 10l5 5 5-5z');
        svg.appendChild(path);
        return svg;
    }

    _createElement(tag, attributes = {}) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
        return element;
    }
}
