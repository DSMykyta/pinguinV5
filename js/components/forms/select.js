// js/components/forms/select.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          CUSTOM SELECT                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Кастомні селекти з пошуком (спільний модуль для всього проєкту)         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

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
        selectedValue = null,
        selectedValues = null // Для мультиселекту - масив значень
    } = options;

    // Отримати елемент select
    const selectEl = typeof selectElement === 'string'
        ? document.getElementById(selectElement)
        : selectElement;

    if (!selectEl) {
        console.warn(`⚠️ Select element "${selectElement}" не знайдено`);
        return;
    }

    // Очистити select
    selectEl.innerHTML = '';

    // Додати placeholder тільки для звичайного (не multiple) select
    if (!selectEl.multiple) {
        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    }

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

        // Для мультиселекту перевірити чи значення в масиві вибраних
        if (selectEl.multiple && selectedValues && selectedValues.includes(item.value)) {
            option.selected = true;
        }

        selectEl.appendChild(option);
    });

    // Встановити вибране значення якщо задано (для single select)
    if (selectedValue !== null && !selectEl.multiple) {
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
        this.hasSelectAll = originalSelect.hasAttribute('data-select-all');
        this.focusedIndex = -1; // Індекс поточного сфокусованого елемента

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

        // Search + Select All row
        const hasSearch = Array.from(this.originalSelect.options).length > 5;
        if (hasSearch) {
            const searchWrapper = this._createElement('div', { class: 'custom-select-search-wrapper' });

            if (hasSearch) {
                this.searchInput = this._createElement('input', { type: 'text', class: 'custom-select-search', placeholder: 'Пошук...' });
                searchWrapper.appendChild(this.searchInput);
            }

            if (this.isMultiSelect && this.hasSelectAll) {
                this.selectAllBtn = this._createElement('button', { type: 'button', class: 'chip' });
                this.selectAllBtn.textContent = 'Всі';
                searchWrapper.appendChild(this.selectAllBtn);
            }

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
        const allOptions = Array.from(this.originalSelect.options).filter(opt => opt.value);
        const selectedOptions = allOptions.filter(opt => opt.selected);
        const isAllSelected = allOptions.length > 0 && selectedOptions.length === allOptions.length;

        // Оновлюємо стан selected для списку
        this.optionsList.querySelectorAll('.custom-select-option').forEach(customOpt => {
            const isSelected = selectedOptions.some(selOpt => selOpt.value === customOpt.dataset.value);
            customOpt.classList.toggle('selected', isSelected);
        });

        // Оновлюємо кнопку "Всі"
        if (this.selectAllBtn) {
            this.selectAllBtn.classList.toggle('c-main', isAllSelected);
        }

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

        // Якщо всі вибрані і є data-select-all - показати "Всі"
        if (isAllSelected && this.hasSelectAll) {
            this.valueContainer.innerHTML = '<span class="custom-select-all-text">Всі</span>';
            return;
        }

        // Smart overflow: показати скільки влазить + "+N"
        this._smartOverflowChips(selectedOptions);
    }

    /**
     * Розумне відображення чіпів з overflow
     * Показує максимум чіпів що влазять + "+N" для решти
     */
    _smartOverflowChips(selectedOptions) {
        this.valueContainer.innerHTML = '';
        this.overflowChipContainer.innerHTML = '';
        this.overflowChipContainer.style.display = 'none';

        const containerWidth = this.valueContainer.clientWidth;
        const GAP = 4; // gap між чіпами
        const MIN_CHIP_WIDTH = 40; // мінімальна ширина чіпа
        const COUNTER_WIDTH = 32; // ширина "+N" чіпа

        // Тимчасовий контейнер для вимірювання
        const measureContainer = this._createElement('div', {
            class: 'custom-select-measure-container',
            style: 'position: absolute; visibility: hidden; white-space: nowrap;'
        });
        this.wrapper.appendChild(measureContainer);

        let usedWidth = 0;
        let fittingCount = 0;
        const chips = [];
        const chipWidths = [];

        // Створюємо чіпи і вимірюємо їх ширину
        selectedOptions.forEach((option, index) => {
            const chip = this._createChip(option);
            measureContainer.appendChild(chip);
            const chipWidth = chip.offsetWidth;
            chipWidths.push(chipWidth);
            chips.push(chip);
            measureContainer.innerHTML = '';
        });

        // Видаляємо тимчасовий контейнер
        measureContainer.remove();

        // Визначаємо скільки чіпів влазить
        const totalChips = chips.length;
        let needsCounter = false;

        for (let i = 0; i < totalChips; i++) {
            const chipWidth = chipWidths[i];
            const remainingChips = totalChips - i - 1;
            const spaceNeeded = chipWidth + (usedWidth > 0 ? GAP : 0);

            // Якщо є ще чіпи після цього - резервуємо місце для лічильника
            const reservedForCounter = remainingChips > 0 ? COUNTER_WIDTH + GAP : 0;

            if (usedWidth + spaceNeeded + reservedForCounter <= containerWidth) {
                usedWidth += spaceNeeded;
                fittingCount++;
            } else {
                needsCounter = remainingChips > 0 || fittingCount === 0;
                break;
            }
        }

        // Якщо нічого не влазить - показати тільки кількість
        if (fittingCount === 0) {
            const summaryChip = this._createElement('div', { class: 'tag' });
            summaryChip.textContent = totalChips;
            this.valueContainer.appendChild(summaryChip);

            // Показати всі чіпи в overflow
            chips.forEach(chip => {
                const overflowChip = this._createChip(selectedOptions[chips.indexOf(chip)]);
                this.overflowChipContainer.appendChild(overflowChip);
            });
            this.overflowChipContainer.style.display = 'flex';
            return;
        }

        // Якщо влазить один чіп але він дуже довгий - обрізаємо з blur
        if (fittingCount === 1 && totalChips === 1 && chipWidths[0] > containerWidth - 10) {
            const chip = chips[0];
            chip.classList.add('truncated');
            chip.style.maxWidth = `${containerWidth - 20}px`; // -20 для кнопки видалення
            this.valueContainer.appendChild(chip);
            return;
        }

        // Додаємо чіпи що влазять
        for (let i = 0; i < fittingCount; i++) {
            this.valueContainer.appendChild(chips[i]);
        }

        // Додаємо лічильник якщо є більше чіпів
        const hiddenCount = totalChips - fittingCount;
        if (hiddenCount > 0) {
            const counterChip = this._createElement('div', { class: 'tag' });
            counterChip.textContent = `+${hiddenCount}`;
            this.valueContainer.appendChild(counterChip);

            // Показати приховані чіпи в overflow
            for (let i = fittingCount; i < totalChips; i++) {
                const overflowChip = this._createChip(selectedOptions[i]);
                this.overflowChipContainer.appendChild(overflowChip);
            }
            this.overflowChipContainer.style.display = 'flex';
        }
    }

    _createChip(option) {
        const tag = this._createElement('div', { class: 'tag' });

        // Логіка відображення з підтримкою ієрархії
        const shortName = option.dataset.name;
        const level = parseInt(option.dataset.level, 10);
        if (shortName && !isNaN(level)) {
            const prefix = ' / '.repeat(level);
            tag.textContent = `${prefix}${shortName}`.trim();
        } else {
            tag.textContent = option.textContent;
        }

        const removeBtn = this._createElement('button', { type: 'button', class: 'tag__remove' });
        removeBtn.innerHTML = '&times;';

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const correspondingOption = Array.from(this.originalSelect.options).find(opt => opt.value === option.value);
            if(correspondingOption) correspondingOption.selected = false;
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this._updateSelection();
        });

        tag.appendChild(removeBtn);
        return tag;
    }

    _bindEvents() {
        this.trigger.addEventListener('click', () => {
            if (this.wrapper.classList.contains('open')) {
                this._closePanel();
            } else {
                this._openPanel();
            }
        });

        this.optionsList.addEventListener('click', (e) => {
            const optionEl = e.target.closest('.custom-select-option');
            if (optionEl && 'value' in optionEl.dataset) {
                const option = Array.from(this.originalSelect.options).find(opt => opt.value === optionEl.dataset.value);
                if (this.isMultiSelect) {
                    option.selected = !option.selected;
                } else {
                    this.originalSelect.value = option.value;
                    this._closePanel();
                }
                this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
                this._updateSelection();
            }
        });

        // Кнопка "Всі"
        if (this.selectAllBtn) {
            this.selectAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const allOptions = Array.from(this.originalSelect.options).filter(opt => opt.value);
                const selectedCount = allOptions.filter(opt => opt.selected).length;
                const shouldSelectAll = selectedCount < allOptions.length;
                allOptions.forEach(opt => opt.selected = shouldSelectAll);
                this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
                this._updateSelection();
            });
        }

        document.addEventListener('click', (e) => {
            // PORTAL: Перевіряємо і wrapper і panel (бо panel може бути в body)
            if (!this.wrapper.contains(e.target) && !this.panel.contains(e.target)) {
                this._closePanel();
            }
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

        // Закриття з затримкою при виході мишки
        // PORTAL FIX: Слухаємо і на wrapper і на panel (бо panel може бути в body)
        let closeTimeout = null;

        const startCloseTimeout = () => {
            if (this.wrapper.classList.contains('open')) {
                closeTimeout = setTimeout(() => {
                    this._closePanel();
                }, 300);
            }
        };

        const cancelCloseTimeout = () => {
            if (closeTimeout) {
                clearTimeout(closeTimeout);
                closeTimeout = null;
            }
        };

        this.wrapper.addEventListener('mouseleave', startCloseTimeout);
        this.wrapper.addEventListener('mouseenter', cancelCloseTimeout);

        // PORTAL FIX: Те саме для panel (коли він в body)
        this.panel.addEventListener('mouseleave', startCloseTimeout);
        this.panel.addEventListener('mouseenter', cancelCloseTimeout);

        // При наведенні мишки - вимикаємо keyboard mode
        this.optionsList.addEventListener('mousemove', (e) => {
            const optionEl = e.target.closest('.custom-select-option');
            if (optionEl) {
                // Вимикаємо keyboard mode - тепер працює hover
                this.panel.classList.remove('keyboard-nav');
                // Скидаємо всі focused
                this.optionsList.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.remove('focused');
                });
                // Оновлюємо індекс для клавіатури (продовжить звідси)
                const visibleOptions = this._getVisibleOptions();
                this.focusedIndex = visibleOptions.indexOf(optionEl);
            }
        });

        // Обробник клавіатури
        this._keyDownHandler = (e) => this._handleKeyDown(e);
    }

    /**
     * Обробка клавіатурної навігації
     */
    _handleKeyDown(e) {
        if (!this.wrapper.classList.contains('open')) return;

        const visibleOptions = this._getVisibleOptions();
        if (visibleOptions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._moveFocus(1, visibleOptions);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this._moveFocus(-1, visibleOptions);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.focusedIndex >= 0 && this.focusedIndex < visibleOptions.length) {
                    this._selectFocusedOption(visibleOptions[this.focusedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this._closePanel();
                break;
        }
    }

    /**
     * Отримати видимі опції (не приховані пошуком)
     */
    _getVisibleOptions() {
        return Array.from(this.optionsList.querySelectorAll('.custom-select-option'))
            .filter(opt => opt.style.display !== 'none');
    }

    /**
     * Переміщення фокусу на наступний/попередній елемент
     */
    _moveFocus(direction, visibleOptions) {
        // Вмикаємо keyboard mode - відключає hover
        this.panel.classList.add('keyboard-nav');

        // Скидаємо попередній фокус
        visibleOptions.forEach(opt => opt.classList.remove('focused'));

        // Обчислюємо новий індекс
        if (this.focusedIndex === -1) {
            // Якщо фокус ще не встановлений
            this.focusedIndex = direction === 1 ? 0 : visibleOptions.length - 1;
        } else {
            this.focusedIndex += direction;

            // Циклічна навігація
            if (this.focusedIndex < 0) {
                this.focusedIndex = visibleOptions.length - 1;
            } else if (this.focusedIndex >= visibleOptions.length) {
                this.focusedIndex = 0;
            }
        }

        // Встановлюємо фокус на новий елемент
        const focusedOption = visibleOptions[this.focusedIndex];
        if (focusedOption) {
            focusedOption.classList.add('focused');
            // Прокрутка до елемента
            focusedOption.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Вибір сфокусованого елемента
     */
    _selectFocusedOption(optionEl) {
        if (!optionEl || !('value' in optionEl.dataset)) return;

        const value = optionEl.dataset.value;

        const option = Array.from(this.originalSelect.options).find(opt => opt.value === value);
        if (!option) return;

        if (this.isMultiSelect) {
            // Мультиселект - тільки toggle
            option.selected = !option.selected;
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this._updateSelection();
        } else {
            // Звичайний селект - вибрати і закрити
            this.originalSelect.value = option.value;
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this._updateSelection();
            this._closePanel();
        }
    }

    /**
     * Відкрити панель з position: fixed
     * Вирішує проблему обрізання overflow: hidden на батьківських контейнерах
     * PORTAL: Переміщуємо панель в body щоб уникнути проблем з transform на модалах
     */
    _openPanel() {
        if (this.wrapper.classList.contains('open')) return;

        const triggerRect = this.trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // PORTAL: Переміщуємо панель в body
        document.body.appendChild(this.panel);

        // Спочатку показуємо панель для отримання її розмірів
        this.panel.style.visibility = 'hidden';
        this.panel.style.display = 'flex';
        const panelHeight = this.panel.scrollHeight || 250;
        const panelWidth = triggerRect.width;

        // Визначаємо чи відкривати вгору чи вниз
        const spaceBelow = viewportHeight - triggerRect.bottom - 8;
        const spaceAbove = triggerRect.top - 8;
        const openUpward = spaceBelow < panelHeight && spaceAbove > spaceBelow;

        // Встановлюємо fixed позиціонування
        this.panel.style.position = 'fixed';
        this.panel.style.left = `${triggerRect.left}px`;
        this.panel.style.width = `${panelWidth}px`;
        this.panel.style.maxHeight = `${Math.min(250, openUpward ? spaceAbove : spaceBelow)}px`;

        if (openUpward) {
            this.panel.style.top = 'auto';
            this.panel.style.bottom = `${viewportHeight - triggerRect.top + 4}px`;
            this.wrapper.classList.add('open-upward');
        } else {
            this.panel.style.top = `${triggerRect.bottom + 4}px`;
            this.panel.style.bottom = 'auto';
            this.wrapper.classList.remove('open-upward');
        }

        // Перевіряємо чи панель не виходить за праву межу
        if (triggerRect.left + panelWidth > viewportWidth) {
            this.panel.style.left = `${viewportWidth - panelWidth - 8}px`;
        }

        this.panel.style.visibility = '';
        this.panel.style.display = '';
        this.wrapper.classList.add('open');
        // PORTAL FIX: Додаємо клас безпосередньо на panel (бо CSS селектор .wrapper.open .panel не працює коли panel в body)
        this.panel.classList.add('open');

        // Автофокус на пошук при відкритті
        if (this.searchInput) {
            setTimeout(() => this.searchInput.focus(), 0);
        }

        // Закриваємо при скролі батьківських контейнерів
        this._scrollParents = this._getScrollParents(this.wrapper);
        this._scrollHandler = () => this._closePanel();
        this._scrollParents.forEach(parent => {
            parent.addEventListener('scroll', this._scrollHandler, { passive: true });
        });
        window.addEventListener('scroll', this._scrollHandler, { passive: true });
        window.addEventListener('resize', this._scrollHandler, { passive: true });

        // Додаємо слухач клавіатури
        this.focusedIndex = -1;
        document.addEventListener('keydown', this._keyDownHandler);
    }

    /**
     * Закрити панель і скинути fixed стилі
     * PORTAL: Повертаємо панель назад до wrapper
     */
    _closePanel() {
        if (!this.wrapper.classList.contains('open')) return;

        this.wrapper.classList.remove('open');
        this.wrapper.classList.remove('open-upward');
        // PORTAL FIX: Знімаємо класи з panel
        this.panel.classList.remove('open');
        this.panel.classList.remove('keyboard-nav');

        // Скидаємо fixed стилі
        this.panel.style.position = '';
        this.panel.style.top = '';
        this.panel.style.bottom = '';
        this.panel.style.left = '';
        this.panel.style.width = '';
        this.panel.style.maxHeight = '';

        // PORTAL: Повертаємо панель назад до wrapper
        if (this.panel.parentNode === document.body) {
            this.wrapper.appendChild(this.panel);
        }

        // Скидаємо фокус з опцій
        this.optionsList.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.remove('focused');
        });
        this.focusedIndex = -1;

        // Видаляємо слухач клавіатури
        document.removeEventListener('keydown', this._keyDownHandler);

        // Видаляємо слухачі скролу
        if (this._scrollParents) {
            this._scrollParents.forEach(parent => {
                parent.removeEventListener('scroll', this._scrollHandler);
            });
            window.removeEventListener('scroll', this._scrollHandler);
            window.removeEventListener('resize', this._scrollHandler);
            this._scrollParents = null;
            this._scrollHandler = null;
        }
    }

    /**
     * Отримати всі батьківські елементи зі скролом
     */
    _getScrollParents(element) {
        const parents = [];
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
            const style = getComputedStyle(parent);
            if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
                parents.push(parent);
            }
            parent = parent.parentElement;
        }
        return parents;
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
