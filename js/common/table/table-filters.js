// js/common/table/table-filters.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - FILTERS PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Hover dropdown фільтри                                        ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Hover dropdown фільтри для колонок з filterable: true.                  ║
 * ║  Поведінка та HTML ІДЕНТИЧНІ до ui-table-controls.js.                    ║
 * ║                                                                          ║
 * ║  HTML СТРУКТУРА DROPDOWN (must match ui-table-controls.js exactly):      ║
 * ║  <div class="dropdown-wrapper filter-dropdown filter-dropdown-hover">    ║
 * ║    <div class="dropdown-panel" data-column="..." style="position:fixed">  ║
 * ║      <div class="dropdown-header">Label</div>                           ║
 * ║      <div class="dropdown-search">                                       ║
 * ║        <input placeholder="Пошук..." data-filter-search>                ║
 * ║      </div>                                                              ║
 * ║      <div class="dropdown-body">                                         ║
 * ║        <label class="dropdown-option filter-select-all">                   ║
 * ║          <input type="checkbox" data-filter-all> <span>Всі</span>       ║
 * ║        </label>                                                          ║
 * ║        <div class="dropdown-separator"></div>                            ║
 * ║        <label class="dropdown-option" data-filter-label="...">            ║
 * ║          <input type="checkbox" data-filter-value="...">                ║
 * ║          <span>label</span>                                              ║
 * ║          <span class="filter-count">N</span>                            ║
 * ║        </label>                                                          ║
 * ║      </div>                                                              ║
 * ║    </div>                                                                ║
 * ║  </div>                                                                  ║
 * ║                                                                          ║
 * ║  СЕЛЕКТОРИ:                                                              ║
 * ║  - .sortable-header.filterable — елементи з hover dropdown               ║
 * ║  - position: fixed на .dropdown-panel (НЕ на wrapper!)                    ║
 * ║  - .open клас для плавної появи                                       ║
 * ║                                                                          ║
 * ║  ТИПИ ФІЛЬТРІВ: values, exists, contains                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Константи (ідентичні ui-table-controls.js)
const HOVER_SHOW_DELAY = 400;
const HOVER_HIDE_DELAY = 200;

/**
 * Плагін фільтрів з hover dropdown
 * Поведінка ідентична до ui-table-controls.js setupHoverDropdowns()
 */
export class FiltersPlugin {
    constructor(config = {}) {
        this.config = {
            filterColumns: [],     // Array of { id, label, filterType, labelMap }
            onFilter: null,        // Callback (filtersObj) => void
            dataSource: null,      // Function () => data[] — зовнішнє джерело (як в initTableSorting)
            ...config
        };

        this.table = null;
        this.state = null;

        // Стан фільтрів — Map<columnId, Set<value>> (як в ui-table-controls.js)
        this.activeFilters = new Map();

        // Hover state
        this.hoverState = {
            activeHeader: null,
            showTimeout: null,
            hideTimeout: null,
            activeDropdown: null,
            isMouseOverDropdown: false
        };

        // Bound handlers
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
    }

    /**
     * Ініціалізація плагіна
     */
    init(table, state) {
        this.table = table;
        this.state = state;

        // Відновити збережений стан фільтрів
        if (this.config.initialFilters) {
            for (const [columnId, values] of Object.entries(this.config.initialFilters)) {
                if (Array.isArray(values)) {
                    this.activeFilters.set(columnId, new Set(values));
                }
            }
        }

        // Налаштовуємо hover після кожного рендеру
        this.state.registerHook('onRender', () => this.setupHoverDropdowns());

        // Закриваємо dropdown при зміні даних
        this.state.registerHook('onDataChange', () => this.hideHoverDropdown(true));
    }

    // ==================== UNIQUE VALUES ====================
    // Ідентично до ui-table-controls.js getUniqueValues()

    getUniqueValues(data, columnId, filterType, labelMap = null) {
        if (filterType === 'exists') {
            return [
                { value: '__exists__', label: 'Наявно', count: data.filter(item => item[columnId] && item[columnId].toString().trim() !== '').length },
                { value: '__empty__', label: 'Пусто', count: data.filter(item => !item[columnId] || item[columnId].toString().trim() === '').length }
            ];
        }

        if (filterType === 'contains') {
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
                    const labelA = labelMap?.[a[0]] || a[0];
                    const labelB = labelMap?.[b[0]] || b[0];
                    return labelA.localeCompare(labelB, 'uk');
                })
                .map(([value, count]) => ({
                    value,
                    label: value === '__empty__' ? 'Пусто' : (labelMap?.[value] || value),
                    count
                }));
        }

        // Default: values
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
                const labelA = labelMap?.[a[0]] || a[0];
                const labelB = labelMap?.[b[0]] || b[0];
                return labelA.localeCompare(labelB, 'uk');
            })
            .map(([value, count]) => ({
                value,
                label: value === '__empty__' ? 'Пусто' : (labelMap?.[value] || value),
                count
            }));
    }

    // ==================== HOVER SETUP ====================
    // Ідентично до ui-table-controls.js setupHoverDropdowns()

    setupHoverDropdowns() {
        const container = this.table.getContainer();
        if (!container) return;

        const filterableHeaders = container.querySelectorAll('.sortable-header.filterable');

        filterableHeaders.forEach(header => {
            // Запобігаємо дублюванню
            if (header.dataset.hoverSetup === 'true') return;
            header.dataset.hoverSetup = 'true';

            const columnId = header.dataset.sortKey || header.dataset.column;
            const columnConfig = this.config.filterColumns?.find(c => c.id === columnId);

            // Hover з затримкою перед показом
            header.addEventListener('mouseenter', () => {
                // Скасуємо заплановане закриття
                if (this.hoverState.hideTimeout) {
                    clearTimeout(this.hoverState.hideTimeout);
                    this.hoverState.hideTimeout = null;
                }

                // Якщо dropdown вже відкритий для цього header — не робимо нічого
                if (this.hoverState.activeHeader === header) return;

                // Запланувати показ з затримкою
                if (this.hoverState.showTimeout) {
                    clearTimeout(this.hoverState.showTimeout);
                }

                this.hoverState.showTimeout = setTimeout(() => {
                    this.showHoverDropdown(header, columnConfig);
                }, HOVER_SHOW_DELAY);
            });

            header.addEventListener('mouseleave', (e) => {
                // Скасовуємо заплановане відкриття
                if (this.hoverState.showTimeout) {
                    clearTimeout(this.hoverState.showTimeout);
                    this.hoverState.showTimeout = null;
                }

                // Не закриваємо одразу — даємо час перейти на dropdown
                const toElement = e.relatedTarget;
                if (toElement && this.hoverState.activeDropdown &&
                    this.hoverState.activeDropdown.contains(toElement)) {
                    return;
                }

                this.scheduleHideDropdown();
            });
        });
    }

    // ==================== CREATE DROPDOWN ====================
    // HTML структура ІДЕНТИЧНА до ui-table-controls.js createHoverDropdown()

    createHoverDropdown(header, columnConfig) {
        const columnId = header.dataset.sortKey || header.dataset.column;
        const columnLabel = columnConfig?.label || header.querySelector('span')?.textContent || columnId;
        const filterType = columnConfig?.filterType || 'values';
        const labelMap = columnConfig?.labelMap || null;

        // Дані для побудови значень — завжди оригінальні (нефільтровані)
        const data = this.config.dataSource ? this.config.dataSource() : this.state.getData();
        const uniqueValues = this.getUniqueValues(data, columnId, filterType, labelMap);

        // Ініціалізуємо фільтр якщо потрібно (все вибрано за замовчуванням)
        if (!this.activeFilters.has(columnId)) {
            this.activeFilters.set(columnId, new Set(uniqueValues.map(v => v.value)));
        }

        const currentFilter = this.activeFilters.get(columnId);
        const allSelected = uniqueValues.every(v => currentFilter.has(v.value));

        // === Wrapper: dropdown-wrapper filter-dropdown filter-dropdown-hover ===
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-wrapper filter-dropdown filter-dropdown-hover';

        // === Menu (child): dropdown-panel з position: fixed ===
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-panel';
        dropdown.dataset.column = columnId;

        const hasSearch = uniqueValues.length > 10;

        dropdown.innerHTML = `
            <div class="dropdown-header">${columnLabel}</div>
            ${hasSearch ? `
                <div class="dropdown-search">
                    <input type="text" placeholder="Пошук..." data-filter-search>
                </div>
            ` : ''}
            <div class="dropdown-body">
                <label class="dropdown-option filter-select-all">
                    <input type="checkbox" data-filter-all ${allSelected ? 'checked' : ''}>
                    <span>Всі</span>
                </label>
                <div class="dropdown-separator"></div>
                ${uniqueValues.map(({ value, label, count }) => `
                    <label class="dropdown-option" data-filter-label="${label.toLowerCase()}">
                        <input type="checkbox" data-filter-value="${value}" ${currentFilter.has(value) ? 'checked' : ''}>
                        <span>${label}</span>
                        <span class="filter-count">${count}</span>
                    </label>
                `).join('')}
            </div>
        `;

        // === Обробник "Всі" (instant apply, Set-based) ===
        const selectAllCheckbox = dropdown.querySelector('[data-filter-all]');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const checkboxes = dropdown.querySelectorAll('[data-filter-value]');
                const filter = this.activeFilters.get(columnId);

                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    if (e.target.checked) {
                        filter.add(cb.dataset.filterValue);
                    } else {
                        filter.delete(cb.dataset.filterValue);
                    }
                });

                this.triggerFilterChange();
            });
        }

        // === Обробники окремих чекбоксів (instant apply) ===
        dropdown.querySelectorAll('[data-filter-value]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const filter = this.activeFilters.get(columnId);
                const value = e.target.dataset.filterValue;

                if (e.target.checked) {
                    filter.add(value);
                } else {
                    filter.delete(value);
                }

                // Оновити "Всі"
                const allChecked = uniqueValues.every(v => filter.has(v.value));
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allChecked;
                }

                this.triggerFilterChange();
            });
        });

        // === Пошук по значеннях ===
        if (hasSearch) {
            const searchInput = dropdown.querySelector('[data-filter-search]');
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const items = dropdown.querySelectorAll('.dropdown-body .dropdown-option:not(.filter-select-all)');
                items.forEach(item => {
                    const label = item.dataset.filterLabel || '';
                    item.style.display = label.includes(query) ? '' : 'none';
                });
            });
            searchInput.addEventListener('click', (e) => e.stopPropagation());
        }

        // Запобігаємо закриттю при кліку всередині dropdown
        dropdown.addEventListener('click', (e) => e.stopPropagation());

        // === Hover handlers на wrapper ===
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

        wrapper.appendChild(dropdown);
        return wrapper;
    }

    // ==================== POSITION DROPDOWN ====================
    // Ідентично до ui-table-controls.js positionDropdown()
    // position: fixed на .dropdown-panel (НЕ на wrapper!)

    positionDropdown(wrapper, header) {
        const headerRect = header.getBoundingClientRect();
        const dropdown = wrapper.querySelector('.dropdown-panel');

        dropdown.style.position = 'fixed';
        dropdown.style.top = `${headerRect.bottom + 4}px`;
        dropdown.style.left = `${headerRect.left}px`;
        dropdown.style.right = 'auto';
        dropdown.style.marginTop = '0';

        // Корекція позиції після рендерингу
        requestAnimationFrame(() => {
            const dropdownRect = dropdown.getBoundingClientRect();

            if (dropdownRect.right > window.innerWidth - 8) {
                dropdown.style.left = `${window.innerWidth - dropdownRect.width - 8}px`;
            }

            if (dropdownRect.bottom > window.innerHeight - 8) {
                dropdown.style.top = `${headerRect.top - dropdownRect.height - 4}px`;
            }
        });
    }

    // ==================== SHOW / HIDE ====================
    // Ідентично до ui-table-controls.js showHoverDropdown() / hideHoverDropdown()

    showHoverDropdown(header, columnConfig) {
        // Якщо вже показано для цього header — не робимо нічого
        if (this.hoverState.activeHeader === header && this.hoverState.activeDropdown) {
            return;
        }

        // ВАЖЛИВО: Видаляємо ВСІ існуючі hover dropdown з DOM
        document.querySelectorAll('.filter-dropdown-hover').forEach(el => el.remove());

        this.hideHoverDropdown(true);

        const wrapper = this.createHoverDropdown(header, columnConfig);

        // Додаємо до body
        document.body.appendChild(wrapper);

        // Позиціонуємо
        this.positionDropdown(wrapper, header);

        // Плавна поява
        requestAnimationFrame(() => {
            if (wrapper.parentNode) {
                wrapper.classList.add('open');
            }
        });

        this.hoverState.activeDropdown = wrapper;
        this.hoverState.activeHeader = header;
        header.classList.add('filter-hover-active');

        // Закриття при кліку поза dropdown (з setTimeout(0) як в старій системі)
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 0);
    }

    scheduleHideDropdown() {
        if (this.hoverState.hideTimeout) {
            clearTimeout(this.hoverState.hideTimeout);
        }

        this.hoverState.hideTimeout = setTimeout(() => {
            if (!this.hoverState.isMouseOverDropdown) {
                this.hideHoverDropdown();
            }
        }, HOVER_HIDE_DELAY);
    }

    hideHoverDropdown(immediate = false) {
        // Скасуємо всі таймери
        if (this.hoverState.showTimeout) {
            clearTimeout(this.hoverState.showTimeout);
            this.hoverState.showTimeout = null;
        }
        if (this.hoverState.hideTimeout) {
            clearTimeout(this.hoverState.hideTimeout);
            this.hoverState.hideTimeout = null;
        }

        // Видаляємо поточний dropdown
        if (this.hoverState.activeDropdown) {
            if (immediate) {
                this.hoverState.activeDropdown.remove();
            } else {
                // Плавне зникнення
                this.hoverState.activeDropdown.classList.remove('open');
                const dropdown = this.hoverState.activeDropdown;
                setTimeout(() => {
                    if (dropdown.parentNode) {
                        dropdown.remove();
                    }
                }, 150);
            }
            this.hoverState.activeDropdown = null;
        }

        // Також видаляємо будь-які залишкові dropdown
        if (immediate) {
            document.querySelectorAll('.filter-dropdown-hover').forEach(el => el.remove());
        }

        if (this.hoverState.activeHeader) {
            this.hoverState.activeHeader.classList.remove('filter-hover-active');
        }
        this.hoverState.activeHeader = null;
        this.hoverState.isMouseOverDropdown = false;

        document.removeEventListener('click', this.handleOutsideClick);
    }

    handleOutsideClick(e) {
        if (this.hoverState.activeDropdown && !this.hoverState.activeDropdown.contains(e.target)) {
            this.hideHoverDropdown();
        }
    }

    // ==================== TRIGGER FILTER CHANGE ====================
    // Ідентично до ui-table-controls.js triggerFilterChange()
    // Тільки повідомляє про фільтри де НЕ всі значення вибрані

    triggerFilterChange() {
        if (!this.config.onFilter) return;

        const filtersObj = {};
        this.activeFilters.forEach((values, columnId) => {
            const column = this.config.filterColumns?.find(c => c.id === columnId);
            if (!column) return;

            const data = this.config.dataSource ? this.config.dataSource() : this.state.getData();
            const uniqueValues = this.getUniqueValues(data, columnId, column.filterType, column.labelMap);

            // Включаємо тільки якщо НЕ всі значення вибрані
            if (values.size < uniqueValues.length) {
                filtersObj[columnId] = Array.from(values);
            }
        });

        this.config.onFilter(filtersObj);
    }

    // ==================== PUBLIC API ====================

    /**
     * Отримати активні фільтри
     */
    getFilters() {
        const filtersObj = {};
        this.activeFilters.forEach((values, columnId) => {
            filtersObj[columnId] = Array.from(values);
        });
        return filtersObj;
    }

    /**
     * Встановити фільтри
     */
    setFilters(filters) {
        Object.entries(filters).forEach(([columnId, values]) => {
            this.activeFilters.set(columnId, new Set(values));
        });
        this.triggerFilterChange();
    }

    /**
     * Скинути фільтри (все вибрано)
     */
    resetFilters() {
        const data = this.config.dataSource ? this.config.dataSource() : this.state.getData();
        this.config.filterColumns?.forEach(column => {
            const uniqueValues = this.getUniqueValues(data, column.id, column.filterType, column.labelMap);
            this.activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
        });
        this.triggerFilterChange();
    }

    /**
     * Застосувати фільтри до даних (functional, як sortAPI.filter())
     */
    filter(data) {
        const filtersObj = {};
        this.activeFilters.forEach((values, columnId) => {
            const column = this.config.filterColumns?.find(c => c.id === columnId);
            if (!column) return;
            const allData = this.config.dataSource ? this.config.dataSource() : this.state.getData();
            const uniqueValues = this.getUniqueValues(allData, columnId, column.filterType, column.labelMap);
            if (values.size < uniqueValues.length) {
                filtersObj[columnId] = Array.from(values);
            }
        });
        return filterData(data, filtersObj, this.config.filterColumns || []);
    }

    /**
     * Знищити плагін
     */
    destroy() {
        if (this.hoverState.showTimeout) clearTimeout(this.hoverState.showTimeout);
        if (this.hoverState.hideTimeout) clearTimeout(this.hoverState.hideTimeout);

        this.hideHoverDropdown(true);
        this.activeFilters.clear();

        document.removeEventListener('click', this.handleOutsideClick);
    }
}

/**
 * Застосувати фільтри до даних (standalone функція)
 * Сумісна з ui-table-controls.js filterData()
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
