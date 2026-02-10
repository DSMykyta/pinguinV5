// js/common/table/table-filters.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - FILTERS PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Фільтри колонок (dropdown списки)                              ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Додає dropdown фільтри для колонок з filterable: true.                  ║
 * ║                                                                          ║
 * ║  ТИПИ ФІЛЬТРІВ:                                                          ║
 * ║  - values: вибір з унікальних значень колонки                            ║
 * ║  - exists: наявно / пусто                                                ║
 * ║  - contains: пошук в comma-separated значеннях                           ║
 * ║  - search: текстовий пошук                                               ║
 * ║  - range: діапазон значень (min-max)                                     ║
 * ║                                                                          ║
 * ║  РЕЖИМИ ВІДКРИТТЯ:                                                       ║
 * ║  - click: клік на іконку фільтра (за замовчуванням)                      ║
 * ║  - hover: наведення на заголовок (400ms delay, як в старій системі)      ║
 * ║                                                                          ║
 * ║  РЕЖИМИ ЗАСТОСУВАННЯ:                                                    ║
 * ║  - instantApply: true — фільтр застосовується одразу при зміні           ║
 * ║  - instantApply: false — потрібно натиснути "Застосувати" (default)       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/text-utils.js';

// Константи для hover режиму
const HOVER_SHOW_DELAY = 400;
const HOVER_HIDE_DELAY = 200;

/**
 * Плагін фільтрів
 */
export class FiltersPlugin {
    constructor(config = {}) {
        this.config = {
            filterType: 'values',         // Default filter type
            showClearButton: true,
            dropdownClass: 'table-filter-dropdown',
            triggerMode: 'click',         // 'click' | 'hover'
            instantApply: false,          // true = застосовується одразу при зміні checkbox
            onFilter: null,               // Custom callback
            ...config
        };

        this.table = null;
        this.state = null;
        this.activeDropdown = null;
        this.clickHandler = null;
        this.outsideClickHandler = null;

        // Hover state
        this.hoverState = {
            activeHeader: null,
            showTimeout: null,
            hideTimeout: null,
            isMouseOverDropdown: false
        };
    }

    /**
     * Ініціалізація плагіна
     */
    init(table, state) {
        this.table = table;
        this.state = state;

        // Додаємо обробники після рендерингу
        this.state.registerHook('onRender', () => this.attachHandlers());

        // Закриваємо dropdown при зміні даних
        this.state.registerHook('onDataChange', () => this.closeDropdown());
    }

    /**
     * Прикріпити обробники подій
     */
    attachHandlers() {
        const header = this.table.getDOM().header;
        if (!header) return;

        // Видаляємо старі обробники
        if (this.clickHandler) {
            header.removeEventListener('click', this.clickHandler);
        }

        if (this.config.triggerMode === 'hover') {
            this.setupHoverHandlers(header);
        } else {
            // Click mode — клік на filter icon
            this.clickHandler = (e) => {
                const filterIcon = e.target.closest('.filter-icon');
                if (!filterIcon) return;

                e.stopPropagation();
                const cell = filterIcon.closest('[data-filterable="true"]');
                if (!cell) return;

                const columnId = cell.dataset.column;
                this.toggleDropdown(columnId, cell);
            };

            header.addEventListener('click', this.clickHandler);
        }

        // Обробник кліку поза dropdown
        if (!this.outsideClickHandler) {
            this.outsideClickHandler = (e) => {
                if (this.activeDropdown && !this.activeDropdown.contains(e.target)) {
                    this.closeDropdown();
                }
            };
            document.addEventListener('click', this.outsideClickHandler);
        }

        // Оновлюємо індикатори активних фільтрів
        this.updateFilterIndicators();
    }

    // ==================== HOVER MODE ====================

    /**
     * Налаштувати hover обробники для filterable колонок
     */
    setupHoverHandlers(header) {
        const filterableCells = header.querySelectorAll('[data-filterable="true"]');

        filterableCells.forEach(cell => {
            if (cell.dataset.hoverSetup === 'true') return;
            cell.dataset.hoverSetup = 'true';

            const columnId = cell.dataset.column;

            cell.addEventListener('mouseenter', () => {
                // Скасуємо заплановане закриття
                if (this.hoverState.hideTimeout) {
                    clearTimeout(this.hoverState.hideTimeout);
                    this.hoverState.hideTimeout = null;
                }

                // Якщо dropdown вже відкритий для цього — не робимо нічого
                if (this.hoverState.activeHeader === cell && this.activeDropdown) return;

                // Запланувати показ з затримкою
                if (this.hoverState.showTimeout) {
                    clearTimeout(this.hoverState.showTimeout);
                }

                this.hoverState.showTimeout = setTimeout(() => {
                    this.closeDropdown();
                    this.openDropdown(columnId, cell);
                    this.hoverState.activeHeader = cell;
                    cell.classList.add('filter-hover-active');
                }, HOVER_SHOW_DELAY);
            });

            cell.addEventListener('mouseleave', (e) => {
                // Скасовуємо заплановане відкриття
                if (this.hoverState.showTimeout) {
                    clearTimeout(this.hoverState.showTimeout);
                    this.hoverState.showTimeout = null;
                }

                // Не закриваємо одразу — даємо час перейти на dropdown
                const toElement = e.relatedTarget;
                if (toElement && this.activeDropdown && this.activeDropdown.contains(toElement)) {
                    return;
                }

                this.scheduleHideDropdown();
            });
        });
    }

    /**
     * Заплановане приховування dropdown (hover mode)
     */
    scheduleHideDropdown() {
        if (this.hoverState.hideTimeout) {
            clearTimeout(this.hoverState.hideTimeout);
        }

        this.hoverState.hideTimeout = setTimeout(() => {
            if (!this.hoverState.isMouseOverDropdown) {
                this.closeDropdown();
            }
        }, HOVER_HIDE_DELAY);
    }

    // ==================== DROPDOWN MANAGEMENT ====================

    /**
     * Перемкнути dropdown
     */
    toggleDropdown(columnId, anchorElement) {
        if (this.activeDropdown && this.activeDropdown.dataset.column === columnId) {
            this.closeDropdown();
            return;
        }

        this.closeDropdown();
        this.openDropdown(columnId, anchorElement);
    }

    /**
     * Відкрити dropdown
     */
    openDropdown(columnId, anchorElement) {
        const column = this.table.config.columns.find(c => c.id === columnId);
        if (!column) return;

        const filterType = column.filterType || this.config.filterType;
        const currentFilter = this.state.getFilters()[columnId];

        // Створюємо dropdown wrapper
        const wrapper = document.createElement('div');
        wrapper.className = `${this.config.dropdownClass} filter-dropdown-hover`;
        wrapper.dataset.column = columnId;

        // Генеруємо контент залежно від типу
        switch (filterType) {
            case 'values':
                wrapper.innerHTML = this.renderValuesFilter(columnId, column, currentFilter);
                break;
            case 'exists':
                wrapper.innerHTML = this.renderExistsFilter(columnId, column, currentFilter);
                break;
            case 'contains':
                wrapper.innerHTML = this.renderContainsFilter(columnId, column, currentFilter);
                break;
            case 'search':
                wrapper.innerHTML = this.renderSearchFilter(columnId, column, currentFilter);
                break;
            case 'range':
                wrapper.innerHTML = this.renderRangeFilter(columnId, column, currentFilter);
                break;
            default:
                wrapper.innerHTML = this.renderValuesFilter(columnId, column, currentFilter);
        }

        // Додаємо до body
        document.body.appendChild(wrapper);
        this.positionDropdown(wrapper, anchorElement);

        // Прикріплюємо обробники
        this.attachDropdownHandlers(wrapper, columnId, filterType);

        // Hover mode: обробники на dropdown wrapper
        if (this.config.triggerMode === 'hover') {
            wrapper.addEventListener('mouseenter', () => {
                this.hoverState.isMouseOverDropdown = true;
                if (this.hoverState.hideTimeout) {
                    clearTimeout(this.hoverState.hideTimeout);
                    this.hoverState.hideTimeout = null;
                }
            });

            wrapper.addEventListener('mouseleave', () => {
                this.hoverState.isMouseOverDropdown = false;
                this.scheduleHideDropdown();
            });
        }

        // Плавна поява
        requestAnimationFrame(() => {
            if (wrapper.parentNode) {
                wrapper.classList.add('is-open');
            }
        });

        // Запобігаємо закриттю при кліку всередині
        wrapper.addEventListener('click', (e) => e.stopPropagation());

        this.activeDropdown = wrapper;
    }

    // ==================== FILTER RENDERERS ====================

    /**
     * Отримати унікальні значення з даних
     */
    getUniqueValues(data, columnId, labelMap = {}) {
        const valueCounts = new Map();

        data.forEach(item => {
            const rawValue = item[columnId];
            const key = (rawValue === null || rawValue === undefined || rawValue === '')
                ? '__empty__'
                : rawValue.toString().trim();

            valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
        });

        return Array.from(valueCounts.entries())
            .sort((a, b) => {
                if (a[0] === '__empty__') return 1;
                if (b[0] === '__empty__') return -1;
                const labelA = labelMap[a[0]] || a[0];
                const labelB = labelMap[b[0]] || b[0];
                return labelA.localeCompare(labelB, 'uk');
            })
            .map(([value, count]) => ({
                value,
                label: value === '__empty__' ? 'Пусто' : (labelMap[value] || value),
                count
            }));
    }

    /**
     * Отримати унікальні значення для contains (comma-separated)
     */
    getContainsValues(data, columnId, labelMap = {}) {
        const valueCounts = new Map();

        data.forEach(item => {
            const rawValue = item[columnId];
            if (!rawValue || rawValue.toString().trim() === '') {
                valueCounts.set('__empty__', (valueCounts.get('__empty__') || 0) + 1);
            } else {
                const values = rawValue.toString().split(',').map(v => v.trim()).filter(v => v);
                values.forEach(v => {
                    valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
                });
            }
        });

        return Array.from(valueCounts.entries())
            .sort((a, b) => {
                if (a[0] === '__empty__') return 1;
                if (b[0] === '__empty__') return -1;
                const labelA = labelMap[a[0]] || a[0];
                const labelB = labelMap[b[0]] || b[0];
                return labelA.localeCompare(labelB, 'uk');
            })
            .map(([value, count]) => ({
                value,
                label: value === '__empty__' ? 'Пусто' : (labelMap[value] || value),
                count
            }));
    }

    /**
     * Рендер фільтра по значеннях (values)
     */
    renderValuesFilter(columnId, column, currentFilter) {
        const data = this.state.getData();
        const labelMap = column.filterLabelMap || {};
        const uniqueValues = this.getUniqueValues(data, columnId, labelMap);

        // Якщо є predefined options — використовуємо їх
        const options = column.filterOptions
            ? column.filterOptions.map(value => ({
                value,
                label: labelMap[value] || value,
                count: data.filter(r => String(r[columnId] ?? '') === value || (value === '__empty__' && !r[columnId])).length
            }))
            : uniqueValues;

        const hasSearch = options.length > 10;

        // Визначаємо чи всі вибрані (для "Всі" checkbox)
        const isAllSelected = !currentFilter || (Array.isArray(currentFilter) && currentFilter.length === options.length);

        const optionsHtml = options.map(({ value, label, count }) => {
            const isChecked = !currentFilter || (Array.isArray(currentFilter) && currentFilter.includes(value));
            return `
                <label class="dropdown-item filter-option" data-filter-label="${escapeHtml(label.toLowerCase())}">
                    <input type="checkbox" data-filter-value="${escapeHtml(value)}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(label)}</span>
                    <span class="filter-count">${count}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="dropdown-header">${escapeHtml(column.label || columnId)}</div>
            ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            ${hasSearch ? `
                <div class="dropdown-search">
                    <input type="text" class="input-main" placeholder="Пошук..." data-values-search>
                </div>
            ` : ''}
            <div class="dropdown-body">
                <label class="dropdown-item filter-select-all">
                    <input type="checkbox" data-filter-all ${isAllSelected ? 'checked' : ''}>
                    <span>Всі</span>
                </label>
                <div class="dropdown-separator"></div>
                ${optionsHtml || '<p class="filter-empty">Немає значень</p>'}
            </div>
            ${!this.config.instantApply ? `
                <div class="filter-dropdown-footer">
                    <button class="filter-apply-btn" type="button">Застосувати</button>
                </div>
            ` : ''}
        `;
    }

    /**
     * Рендер фільтра exists (Наявно / Пусто)
     */
    renderExistsFilter(columnId, column, currentFilter) {
        const data = this.state.getData();
        const existsCount = data.filter(item => item[columnId] && item[columnId].toString().trim() !== '').length;
        const emptyCount = data.filter(item => !item[columnId] || item[columnId].toString().trim() === '').length;

        const existsChecked = !currentFilter || (Array.isArray(currentFilter) && currentFilter.includes('__exists__'));
        const emptyChecked = !currentFilter || (Array.isArray(currentFilter) && currentFilter.includes('__empty__'));

        return `
            <div class="dropdown-header">${escapeHtml(column.label || columnId)}</div>
            ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            <div class="dropdown-body">
                <label class="dropdown-item filter-option">
                    <input type="checkbox" data-filter-value="__exists__" ${existsChecked ? 'checked' : ''}>
                    <span>Наявно</span>
                    <span class="filter-count">${existsCount}</span>
                </label>
                <label class="dropdown-item filter-option">
                    <input type="checkbox" data-filter-value="__empty__" ${emptyChecked ? 'checked' : ''}>
                    <span>Пусто</span>
                    <span class="filter-count">${emptyCount}</span>
                </label>
            </div>
            ${!this.config.instantApply ? `
                <div class="filter-dropdown-footer">
                    <button class="filter-apply-btn" type="button">Застосувати</button>
                </div>
            ` : ''}
        `;
    }

    /**
     * Рендер фільтра contains (comma-separated значення)
     */
    renderContainsFilter(columnId, column, currentFilter) {
        const data = this.state.getData();
        const labelMap = column.filterLabelMap || {};
        const containsValues = this.getContainsValues(data, columnId, labelMap);

        const hasSearch = containsValues.length > 10;
        const isAllSelected = !currentFilter || (Array.isArray(currentFilter) && currentFilter.length === containsValues.length);

        const optionsHtml = containsValues.map(({ value, label, count }) => {
            const isChecked = !currentFilter || (Array.isArray(currentFilter) && currentFilter.includes(value));
            return `
                <label class="dropdown-item filter-option" data-filter-label="${escapeHtml(label.toLowerCase())}">
                    <input type="checkbox" data-filter-value="${escapeHtml(value)}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(label)}</span>
                    <span class="filter-count">${count}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="dropdown-header">${escapeHtml(column.label || columnId)}</div>
            ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            ${hasSearch ? `
                <div class="dropdown-search">
                    <input type="text" class="input-main" placeholder="Пошук..." data-values-search>
                </div>
            ` : ''}
            <div class="dropdown-body">
                <label class="dropdown-item filter-select-all">
                    <input type="checkbox" data-filter-all ${isAllSelected ? 'checked' : ''}>
                    <span>Всі</span>
                </label>
                <div class="dropdown-separator"></div>
                ${optionsHtml || '<p class="filter-empty">Немає значень</p>'}
            </div>
            ${!this.config.instantApply ? `
                <div class="filter-dropdown-footer">
                    <button class="filter-apply-btn" type="button">Застосувати</button>
                </div>
            ` : ''}
        `;
    }

    /**
     * Рендер фільтра пошуку (search)
     */
    renderSearchFilter(columnId, column, currentFilter) {
        return `
            <div class="dropdown-header">${escapeHtml(column.label || columnId)}</div>
            ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            <div class="dropdown-body">
                <input type="text" class="filter-search-input" placeholder="Введіть текст..."
                       value="${escapeHtml(currentFilter || '')}">
            </div>
            <div class="filter-dropdown-footer">
                <button class="filter-apply-btn" type="button">Застосувати</button>
            </div>
        `;
    }

    /**
     * Рендер фільтра діапазону (range)
     */
    renderRangeFilter(columnId, column, currentFilter) {
        const min = currentFilter?.min || '';
        const max = currentFilter?.max || '';

        return `
            <div class="dropdown-header">${escapeHtml(column.label || columnId)}</div>
            ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            <div class="dropdown-body">
                <div class="filter-range-inputs">
                    <input type="number" class="filter-range-min" placeholder="Від" value="${min}">
                    <span>—</span>
                    <input type="number" class="filter-range-max" placeholder="До" value="${max}">
                </div>
            </div>
            <div class="filter-dropdown-footer">
                <button class="filter-apply-btn" type="button">Застосувати</button>
            </div>
        `;
    }

    // ==================== POSITIONING ====================

    /**
     * Позиціонувати dropdown відносно anchor
     */
    positionDropdown(dropdown, anchor) {
        const rect = anchor.getBoundingClientRect();

        dropdown.style.position = 'fixed';
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.zIndex = '1000';

        // Корекція позиції після рендерингу
        requestAnimationFrame(() => {
            const dropdownRect = dropdown.getBoundingClientRect();

            // Корекція по горизонталі
            if (dropdownRect.right > window.innerWidth - 8) {
                dropdown.style.left = `${window.innerWidth - dropdownRect.width - 8}px`;
            }

            // Корекція по вертикалі — якщо не вміщується знизу, показати зверху
            if (dropdownRect.bottom > window.innerHeight - 8) {
                dropdown.style.top = `${rect.top - dropdownRect.height - 4}px`;
            }
        });
    }

    // ==================== DROPDOWN HANDLERS ====================

    /**
     * Прикріпити обробники до dropdown
     */
    attachDropdownHandlers(dropdown, columnId, filterType) {
        // Кнопка "Скинути"
        const clearBtn = dropdown.querySelector('.filter-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.state.setFilter(columnId, null);
                this.applyFilters();
                this.closeDropdown();
            });
        }

        // Кнопка "Застосувати" (якщо не instantApply)
        const applyBtn = dropdown.querySelector('.filter-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyDropdownFilter(dropdown, columnId, filterType);
            });
        }

        // "Всі" checkbox
        const selectAllCheckbox = dropdown.querySelector('[data-filter-all]');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const checkboxes = dropdown.querySelectorAll('[data-filter-value]');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                });

                if (this.config.instantApply) {
                    this.applyDropdownFilter(dropdown, columnId, filterType);
                }
            });
        }

        // Окремі чекбокси (instant apply + sync "Всі")
        dropdown.querySelectorAll('[data-filter-value]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();

                // Оновити стан "Всі" checkbox
                if (selectAllCheckbox) {
                    const allCheckboxes = dropdown.querySelectorAll('[data-filter-value]');
                    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
                    const someChecked = Array.from(allCheckboxes).some(cb => cb.checked);
                    selectAllCheckbox.checked = allChecked;
                    selectAllCheckbox.indeterminate = someChecked && !allChecked;
                }

                if (this.config.instantApply) {
                    this.applyDropdownFilter(dropdown, columnId, filterType);
                }
            });
        });

        // Enter для пошуку
        const searchInput = dropdown.querySelector('.filter-search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.applyDropdownFilter(dropdown, columnId, filterType);
                }
            });
            searchInput.focus();
        }

        // Пошук по значеннях фільтра (для values/contains з >10 опцій)
        const valuesSearch = dropdown.querySelector('[data-values-search]');
        if (valuesSearch) {
            valuesSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const options = dropdown.querySelectorAll('.filter-option');
                options.forEach(option => {
                    const label = option.dataset.filterLabel || '';
                    option.style.display = label.includes(query) ? '' : 'none';
                });
            });
            valuesSearch.addEventListener('click', (e) => e.stopPropagation());
            valuesSearch.focus();
        }
    }

    /**
     * Застосувати фільтр з dropdown
     */
    applyDropdownFilter(dropdown, columnId, filterType) {
        let filterValue = null;

        switch (filterType) {
            case 'values':
            case 'contains': {
                const allCheckboxes = dropdown.querySelectorAll('[data-filter-value]');
                const checked = dropdown.querySelectorAll('[data-filter-value]:checked');

                // Якщо всі вибрані — скидаємо фільтр (показуємо все)
                if (checked.length === allCheckboxes.length) {
                    filterValue = null;
                } else if (checked.length > 0) {
                    filterValue = Array.from(checked).map(cb => cb.dataset.filterValue);
                } else {
                    // Нічого не вибрано — пустий масив (нічого не покаже)
                    filterValue = [];
                }
                break;
            }
            case 'exists': {
                const checked = dropdown.querySelectorAll('[data-filter-value]:checked');
                const allCheckboxes = dropdown.querySelectorAll('[data-filter-value]');

                if (checked.length === allCheckboxes.length || checked.length === 0) {
                    filterValue = null;
                } else {
                    filterValue = Array.from(checked).map(cb => cb.dataset.filterValue);
                }
                break;
            }
            case 'search': {
                const input = dropdown.querySelector('.filter-search-input');
                if (input && input.value.trim()) {
                    filterValue = input.value.trim();
                }
                break;
            }
            case 'range': {
                const min = dropdown.querySelector('.filter-range-min')?.value;
                const max = dropdown.querySelector('.filter-range-max')?.value;
                if (min || max) {
                    filterValue = { min: min || null, max: max || null };
                }
                break;
            }
        }

        this.state.setFilter(columnId, filterValue);
        this.applyFilters();

        // Не закриваємо dropdown при instant apply
        if (!this.config.instantApply) {
            this.closeDropdown();
        }
    }

    // ==================== FILTER APPLICATION ====================

    /**
     * Застосувати всі фільтри до даних
     */
    applyFilters() {
        const filters = this.state.getFilters();
        let data = [...this.state.getData()];

        // Застосовуємо кожен фільтр
        Object.entries(filters).forEach(([columnId, filterValue]) => {
            if (filterValue == null) return;

            const column = this.table.config.columns.find(c => c.id === columnId);
            const filterType = column?.filterType || 'values';

            data = data.filter(row => {
                const value = row[columnId];

                switch (filterType) {
                    case 'values':
                        if (Array.isArray(filterValue)) {
                            const strValue = value != null ? String(value).trim() : '';
                            if (strValue) {
                                return filterValue.includes(strValue);
                            } else {
                                return filterValue.includes('__empty__');
                            }
                        }
                        return true;

                    case 'exists':
                        if (!Array.isArray(filterValue)) return true;
                        const hasValue = value && value.toString().trim() !== '';
                        if (filterValue.includes('__exists__') && filterValue.includes('__empty__')) return true;
                        if (filterValue.includes('__exists__')) return hasValue;
                        if (filterValue.includes('__empty__')) return !hasValue;
                        return false;

                    case 'contains':
                        if (!Array.isArray(filterValue)) return true;
                        const normalizedValue = value ? value.toString().trim() : '';
                        if (!normalizedValue) {
                            return filterValue.includes('__empty__');
                        }
                        // Розбиваємо по комі і перевіряємо чи є перетин
                        const itemValues = normalizedValue.split(',').map(v => v.trim()).filter(v => v);
                        return itemValues.some(v => filterValue.includes(v));

                    case 'search':
                        return String(value || '').toLowerCase().includes(filterValue.toLowerCase());

                    case 'range': {
                        const numValue = Number(value);
                        if (filterValue.min != null && numValue < Number(filterValue.min)) return false;
                        if (filterValue.max != null && numValue > Number(filterValue.max)) return false;
                        return true;
                    }

                    default:
                        return true;
                }
            });
        });

        this.state.setFilteredData(data);
        this.state.setTotalItems(data.length);
        this.state.setPage(1);

        // Оновлюємо індикатори
        this.updateFilterIndicators();

        // Викликаємо callback
        if (this.config.onFilter) {
            this.config.onFilter(filters, data);
        }
    }

    // ==================== INDICATORS ====================

    /**
     * Оновити індикатори активних фільтрів
     */
    updateFilterIndicators() {
        const header = this.table.getDOM().header;
        if (!header) return;

        const filters = this.state.getFilters();

        header.querySelectorAll('[data-filterable="true"]').forEach(cell => {
            const columnId = cell.dataset.column;
            const hasFilter = filters[columnId] != null;

            cell.classList.toggle('filter-active', hasFilter);

            const icon = cell.querySelector('.filter-icon');
            if (icon) {
                icon.textContent = hasFilter ? 'filter_alt' : 'filter_list';
            }
        });
    }

    // ==================== DROPDOWN LIFECYCLE ====================

    /**
     * Закрити dropdown
     */
    closeDropdown() {
        if (this.activeDropdown) {
            // Плавне зникнення
            this.activeDropdown.classList.remove('is-open');
            const dropdown = this.activeDropdown;
            setTimeout(() => {
                if (dropdown.parentNode) {
                    dropdown.remove();
                }
            }, 150);
            this.activeDropdown = null;
        }

        // Cleanup hover state
        if (this.hoverState.activeHeader) {
            this.hoverState.activeHeader.classList.remove('filter-hover-active');
        }
        this.hoverState.activeHeader = null;
        this.hoverState.isMouseOverDropdown = false;

        // Cleanup orphaned dropdowns
        document.querySelectorAll('.filter-dropdown-hover').forEach(el => {
            if (el !== this.activeDropdown) el.remove();
        });
    }

    // ==================== PUBLIC API ====================

    /**
     * Програмно встановити фільтр
     */
    setFilter(columnId, value) {
        this.state.setFilter(columnId, value);
        this.applyFilters();
    }

    /**
     * Очистити всі фільтри
     */
    clearFilters() {
        this.state.clearFilters();
        this.state.setFilteredData([...this.state.getData()]);
        this.state.setTotalItems(this.state.getData().length);
        this.updateFilterIndicators();
    }

    /**
     * Отримати активні фільтри
     */
    getFilters() {
        return this.state.getFilters();
    }

    /**
     * Знищити плагін
     */
    destroy() {
        // Скасуємо всі таймери
        if (this.hoverState.showTimeout) clearTimeout(this.hoverState.showTimeout);
        if (this.hoverState.hideTimeout) clearTimeout(this.hoverState.hideTimeout);

        this.closeDropdown();

        const header = this.table.getDOM().header;
        if (header && this.clickHandler) {
            header.removeEventListener('click', this.clickHandler);
        }

        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
        }
    }
}

/**
 * Застосувати фільтри до даних (standalone функція для зовнішнього використання)
 * Сумісна з форматом старої системи filterData()
 *
 * @param {Array} data - Масив даних
 * @param {Object} filters - Об'єкт з фільтрами { columnId: ['value1', 'value2'] }
 * @param {Array} columns - Конфігурація колонок (потрібна для filterType)
 * @returns {Array} Відфільтрований масив
 */
export function filterData(data, filters, columns = []) {
    if (!filters || Object.keys(filters).length === 0) {
        return data;
    }

    return data.filter(item => {
        for (const [columnId, allowedValues] of Object.entries(filters)) {
            const column = columns.find(c => c.id === columnId);
            const itemValue = item[columnId];
            const allowedSet = new Set(allowedValues);

            if (column?.filterType === 'exists') {
                const hasValue = itemValue && itemValue.toString().trim() !== '';
                if (allowedSet.has('__exists__') && allowedSet.has('__empty__')) continue;
                if (allowedSet.has('__exists__') && !hasValue) return false;
                if (allowedSet.has('__empty__') && hasValue) return false;
                if (!allowedSet.has('__exists__') && !allowedSet.has('__empty__')) return false;
            } else if (column?.filterType === 'contains') {
                const normalizedValue = itemValue ? itemValue.toString().trim() : '';
                if (!normalizedValue) {
                    if (!allowedSet.has('__empty__')) return false;
                } else {
                    const itemValues = normalizedValue.split(',').map(v => v.trim()).filter(v => v);
                    const hasMatch = itemValues.some(v => allowedSet.has(v));
                    if (!hasMatch) return false;
                }
            } else {
                // values (default)
                const normalizedValue = itemValue ? itemValue.toString().trim() : '';
                if (normalizedValue) {
                    if (!allowedSet.has(normalizedValue)) return false;
                } else {
                    if (!allowedSet.has('__empty__')) return false;
                }
            }
        }

        return true;
    });
}
