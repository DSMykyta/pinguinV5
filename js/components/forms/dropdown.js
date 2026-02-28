// js/components/forms/dropdown.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          DROPDOWN MENU                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Спадні меню з розумним позиціонуванням (portal to body, auto up/down)   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const CLOSE_DELAY = 300;

/**
 * Smart positioning для dropdown panel.
 * Єдина функція позиціонування — використовується і в Dropdown, і в table-filters.
 *
 * @param {HTMLElement} panel - dropdown panel
 * @param {DOMRect} anchorRect - bounding rect якоря (trigger або header cell)
 * @param {Object} [options]
 * @param {boolean} [options.center=false] - центрувати під якорем (для широких комірок)
 * @param {boolean} [options.matchWidth=false] - minWidth = anchorRect.width
 * @returns {{ openUpward: boolean }}
 */
export function positionPanel(panel, anchorRect, options = {}) {
    const { center = false, matchWidth = false } = options;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Вимірюємо розміри panel
    panel.style.visibility = 'hidden';
    panel.style.display = 'block';
    panel.style.position = 'fixed';
    const panelHeight = panel.scrollHeight;

    // Auto up/down
    const spaceBelow = viewportHeight - anchorRect.bottom - 8;
    const spaceAbove = anchorRect.top - 8;
    const openUpward = spaceBelow < panelHeight && spaceAbove > spaceBelow;

    // Vertical
    if (openUpward) {
        panel.style.top = 'auto';
        panel.style.bottom = `${viewportHeight - anchorRect.top + 4}px`;
    } else {
        panel.style.top = `${anchorRect.bottom + 4}px`;
        panel.style.bottom = 'auto';
    }

    panel.style.maxHeight = `${Math.min(400, openUpward ? spaceAbove : spaceBelow)}px`;

    // Horizontal
    let left;
    if (center) {
        const panelWidth = panel.scrollWidth;
        left = anchorRect.left + anchorRect.width / 2 - panelWidth / 2;
    } else {
        left = anchorRect.left;
    }

    // Viewport corrections
    if (left < 8) left = 8;
    const effectiveWidth = panel.offsetWidth || panel.scrollWidth;
    if (left + effectiveWidth > viewportWidth - 8) {
        left = viewportWidth - effectiveWidth - 8;
    }

    panel.style.left = `${left}px`;
    panel.style.right = 'auto';
    panel.style.width = '';
    panel.style.minWidth = matchWidth ? `${anchorRect.width}px` : '';

    panel.style.visibility = '';
    panel.style.display = '';

    return { openUpward };
}

class Dropdown {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.trigger = wrapper.querySelector('[data-dropdown-trigger]');
        this.panel = wrapper.querySelector('.dropdown-panel');

        if (!this.trigger || !this.panel) return;

        this.closeTimeout = null;
        this._scrollParents = null;
        this._scrollHandler = null;
        this._keyDownHandler = (e) => this._handleKeyDown(e);
        this._outsideClickHandler = (e) => this._handleOutsideClick(e);

        this._bindEvents();
        wrapper.dataset.dropdownInit = 'true';
    }

    _bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.wrapper.classList.contains('open')) {
                this.close();
            } else {
                this.open();
            }
        });

        // Закриття з затримкою при виході мишки
        this.wrapper.addEventListener('mouseleave', () => this._startCloseTimeout());
        this.wrapper.addEventListener('mouseenter', () => this._cancelCloseTimeout());

        // Panel може бути в body (portal) — слухаємо і його
        this.panel.addEventListener('mouseleave', () => this._startCloseTimeout());
        this.panel.addEventListener('mouseenter', () => this._cancelCloseTimeout());

        // Не закривати при кліку всередині panel
        this.panel.addEventListener('click', (e) => e.stopPropagation());
    }

    open() {
        if (this.wrapper.classList.contains('open')) return;

        // Закриваємо інші відкриті dropdown
        document.querySelectorAll('.dropdown-wrapper.open').forEach(w => {
            if (w !== this.wrapper && w._dropdown) w._dropdown.close();
        });

        const triggerRect = this.trigger.getBoundingClientRect();

        // Portal: переміщуємо panel в body
        document.body.appendChild(this.panel);

        // Smart positioning (спільна функція)
        const { openUpward } = positionPanel(this.panel, triggerRect, { matchWidth: true });

        if (openUpward) {
            this.wrapper.classList.add('open-upward');
        } else {
            this.wrapper.classList.remove('open-upward');
        }

        this.wrapper.classList.add('open');
        this.panel.classList.add('open');

        // Scroll listeners — закриваємо при скролі батьківських контейнерів
        this._scrollParents = this._getScrollParents(this.wrapper);
        this._scrollHandler = () => this.close();
        this._scrollParents.forEach(p => p.addEventListener('scroll', this._scrollHandler, { passive: true }));
        window.addEventListener('scroll', this._scrollHandler, { passive: true });
        window.addEventListener('resize', this._scrollHandler, { passive: true });

        // Keyboard + outside click
        document.addEventListener('keydown', this._keyDownHandler);
        document.addEventListener('click', this._outsideClickHandler);
    }

    close() {
        if (!this.wrapper.classList.contains('open')) return;

        this.wrapper.classList.remove('open', 'open-upward');
        this.panel.classList.remove('open');

        // Скидаємо inline стилі
        this.panel.style.position = '';
        this.panel.style.top = '';
        this.panel.style.bottom = '';
        this.panel.style.left = '';
        this.panel.style.width = '';
        this.panel.style.minWidth = '';
        this.panel.style.maxHeight = '';
        this.panel.style.display = '';

        // Portal: повертаємо panel назад
        if (this.panel.parentNode === document.body) {
            this.wrapper.appendChild(this.panel);
        }

        // Cleanup listeners
        document.removeEventListener('keydown', this._keyDownHandler);
        document.removeEventListener('click', this._outsideClickHandler);

        if (this._scrollParents) {
            this._scrollParents.forEach(p => p.removeEventListener('scroll', this._scrollHandler));
            window.removeEventListener('scroll', this._scrollHandler);
            window.removeEventListener('resize', this._scrollHandler);
            this._scrollParents = null;
            this._scrollHandler = null;
        }

        this._cancelCloseTimeout();
    }

    _handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    }

    _handleOutsideClick(e) {
        if (!this.wrapper.contains(e.target) && !this.panel.contains(e.target)) {
            this.close();
        }
    }

    _startCloseTimeout() {
        if (!this.wrapper.classList.contains('open')) return;
        this._cancelCloseTimeout();
        this.closeTimeout = setTimeout(() => {
            // Не закривати якщо інпут всередині має фокус
            const focused = this.panel.querySelector(':focus');
            if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;
            this.close();
        }, CLOSE_DELAY);
    }

    _cancelCloseTimeout() {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
        }
    }

    _getScrollParents(el) {
        const parents = [];
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
            const style = getComputedStyle(parent);
            if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
                parents.push(parent);
            }
            parent = parent.parentElement;
        }
        return parents;
    }

    destroy() {
        this.close();
        delete this.wrapper._dropdown;
        delete this.wrapper.dataset.dropdownInit;
    }
}

/**
 * Ініціалізувати всі dropdown в контейнері
 */
export function initDropdowns(container = document) {
    container.querySelectorAll('.dropdown-wrapper:not([data-dropdown-init])').forEach(wrapper => {
        const instance = new Dropdown(wrapper);
        wrapper._dropdown = instance;
    });
}

/**
 * Знищити dropdown
 */
export function destroyDropdown(wrapper) {
    if (wrapper._dropdown) wrapper._dropdown.destroy();
}
