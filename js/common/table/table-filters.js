// js/common/table/table-filters.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - FILTERS PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Фільтри колонок (dropdown списки)                           ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Додає dropdown фільтри для колонок з filterable: true.                  ║
 * ║                                                                          ║
 * ║  ТИПИ ФІЛЬТРІВ:                                                          ║
 * ║  - values: вибір з унікальних значень колонки                            ║
 * ║  - search: текстовий пошук                                               ║
 * ║  - range: діапазон значень (min-max)                                     ║
 * ║  - custom: кастомний фільтр                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/text-utils.js';

/**
 * Плагін фільтрів
 */
export class FiltersPlugin {
    constructor(config = {}) {
        this.config = {
            filterType: 'values',     // Default filter type
            showClearButton: true,
            dropdownClass: 'table-filter-dropdown',
            onFilter: null,           // Custom callback
            ...config
        };

        this.table = null;
        this.state = null;
        this.activeDropdown = null;
        this.clickHandler = null;
        this.outsideClickHandler = null;
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

        // Обробник кліку на filter icon
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

        // Створюємо dropdown
        const dropdown = document.createElement('div');
        dropdown.className = this.config.dropdownClass;
        dropdown.dataset.column = columnId;

        // Генеруємо контент залежно від типу
        switch (filterType) {
            case 'values':
                dropdown.innerHTML = this.renderValuesFilter(columnId, column, currentFilter);
                break;
            case 'search':
                dropdown.innerHTML = this.renderSearchFilter(columnId, column, currentFilter);
                break;
            case 'range':
                dropdown.innerHTML = this.renderRangeFilter(columnId, column, currentFilter);
                break;
            default:
                dropdown.innerHTML = this.renderValuesFilter(columnId, column, currentFilter);
        }

        // Позиціонуємо dropdown
        document.body.appendChild(dropdown);
        this.positionDropdown(dropdown, anchorElement);

        // Прикріплюємо обробники
        this.attachDropdownHandlers(dropdown, columnId, filterType);

        this.activeDropdown = dropdown;
    }

    /**
     * Рендер фільтра по значеннях
     */
    renderValuesFilter(columnId, column, currentFilter) {
        const data = this.state.getData();
        const uniqueValues = new Set();

        // Збираємо унікальні значення
        data.forEach(row => {
            const value = row[columnId];
            if (value != null && value !== '') {
                uniqueValues.add(String(value));
            }
        });

        // Якщо є predefined options - використовуємо їх
        const options = column.filterOptions || Array.from(uniqueValues).sort();
        const labelMap = column.filterLabelMap || {};

        const optionsHtml = options.map(value => {
            const label = labelMap[value] || value;
            const isChecked = currentFilter && currentFilter.includes(value);
            return `
                <label class="filter-option">
                    <input type="checkbox" value="${escapeHtml(value)}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(label)}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="filter-dropdown-header">
                <span>Фільтр: ${escapeHtml(column.label || columnId)}</span>
                ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            </div>
            <div class="filter-dropdown-body">
                ${optionsHtml || '<p class="filter-empty">Немає значень</p>'}
            </div>
            <div class="filter-dropdown-footer">
                <button class="filter-apply-btn" type="button">Застосувати</button>
            </div>
        `;
    }

    /**
     * Рендер фільтра пошуку
     */
    renderSearchFilter(columnId, column, currentFilter) {
        return `
            <div class="filter-dropdown-header">
                <span>Пошук: ${escapeHtml(column.label || columnId)}</span>
                ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            </div>
            <div class="filter-dropdown-body">
                <input type="text" class="filter-search-input" placeholder="Введіть текст..."
                       value="${escapeHtml(currentFilter || '')}">
            </div>
            <div class="filter-dropdown-footer">
                <button class="filter-apply-btn" type="button">Застосувати</button>
            </div>
        `;
    }

    /**
     * Рендер фільтра діапазону
     */
    renderRangeFilter(columnId, column, currentFilter) {
        const min = currentFilter?.min || '';
        const max = currentFilter?.max || '';

        return `
            <div class="filter-dropdown-header">
                <span>Діапазон: ${escapeHtml(column.label || columnId)}</span>
                ${this.config.showClearButton ? '<button class="filter-clear-btn" type="button">Скинути</button>' : ''}
            </div>
            <div class="filter-dropdown-body">
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

    /**
     * Позиціонувати dropdown
     */
    positionDropdown(dropdown, anchor) {
        const rect = anchor.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();

        let left = rect.left;
        let top = rect.bottom + 4;

        // Корекція якщо виходить за межі вікна
        if (left + dropdownRect.width > window.innerWidth) {
            left = window.innerWidth - dropdownRect.width - 8;
        }

        if (top + dropdownRect.height > window.innerHeight) {
            top = rect.top - dropdownRect.height - 4;
        }

        dropdown.style.position = 'fixed';
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.style.zIndex = '1000';
    }

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

        // Кнопка "Застосувати"
        const applyBtn = dropdown.querySelector('.filter-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyDropdownFilter(dropdown, columnId, filterType);
            });
        }

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
    }

    /**
     * Застосувати фільтр з dropdown
     */
    applyDropdownFilter(dropdown, columnId, filterType) {
        let filterValue = null;

        switch (filterType) {
            case 'values': {
                const checked = dropdown.querySelectorAll('.filter-option input:checked');
                if (checked.length > 0) {
                    filterValue = Array.from(checked).map(cb => cb.value);
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
        this.closeDropdown();
    }

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
                        return Array.isArray(filterValue)
                            ? filterValue.includes(String(value))
                            : String(value) === filterValue;

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

    /**
     * Закрити dropdown
     */
    closeDropdown() {
        if (this.activeDropdown) {
            this.activeDropdown.remove();
            this.activeDropdown = null;
        }
    }

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
