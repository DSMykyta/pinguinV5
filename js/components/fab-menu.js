// js/components/fab-menu.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          FAB MENU                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Плаваюча кнопка зі спливаючим меню опцій (speed dial, пагінація)       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Generic FAB menu — кругла кнопка з анімованим спливаючим меню опцій.
 * Використовується в пагінації, speed dial, і будь-де.
 * ІДЕМПОТЕНТНИЙ: повторні виклики НЕ додають нових event listeners.
 *
 * @example
 * initFabMenu(container, {
 *     items: [{ value: 10, label: '10' }, { value: 999999, label: 'Всі' }],
 *     value: 25,
 *     onChange: (newValue) => console.log(newValue),
 *     formatLabel: v => v > 1000 ? 'Всі' : String(v)
 * });
 */

/**
 * @param {HTMLElement} container
 * @param {Object} config
 * @param {Array<{value: *, label: string}>} config.items
 * @param {*} config.value - поточне значення
 * @param {Function} config.onChange - callback(newValue)
 * @param {Function} [config.formatLabel] - форматування label тригера
 * @returns {{ updateLabel: Function }}
 */
export function initFabMenu(container, { items, value, onChange, formatLabel = String }) {
    let menu = container.querySelector('.fab-menu');

    if (!menu) {
        menu = buildMenu(items, value, formatLabel);
        container.appendChild(menu);
    }

    // Ідемпотентний: вже ініціалізовано — тільки додати callback
    if (menu._fabMenuState) {
        menu._fabMenuState.callbacks.push(onChange);
        return makeAPI(menu, formatLabel);
    }

    // Перша ініціалізація
    const state = { value, callbacks: [onChange] };
    menu._fabMenuState = state;

    menu.addEventListener('click', (e) => {
        if (e.target.closest('.fab-menu-trigger')) {
            menu.classList.toggle('open');
        }

        const item = e.target.closest('.fab-menu-item');
        if (item) {
            const raw = item.dataset.value;
            const newValue = isNaN(raw) ? raw : Number(raw);
            menu.classList.remove('open');
            if (newValue !== state.value) {
                state.value = newValue;
                const label = menu.querySelector('.fab-menu-label');
                if (label) label.textContent = formatLabel(newValue);
                state.callbacks.forEach(cb => cb(newValue));
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) menu.classList.remove('open');
    });

    return makeAPI(menu, formatLabel);
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════════════════════════

function makeAPI(menu, formatLabel) {
    return {
        updateLabel(value) {
            menu._fabMenuState.value = value;
            const label = menu.querySelector('.fab-menu-label');
            if (label) label.textContent = formatLabel(value);
        }
    };
}

function buildMenu(items, currentValue, formatLabel) {
    const el = document.createElement('div');
    el.className = 'fab-menu';

    // Тригер (перший в DOM, але flex column-reverse ставить його внизу)
    const trigger = document.createElement('button');
    trigger.className = 'fab-menu-trigger';
    trigger.innerHTML = `<span class="fab-menu-label">${formatLabel(currentValue)}</span>`;
    el.appendChild(trigger);

    // Items wrapper — absolute positioned popup
    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'fab-menu-items';

    items.forEach(({ value, label, dialLabel }) => {
        const row = document.createElement('div');
        row.className = 'fab-menu-item';
        row.dataset.value = value;

        if (dialLabel) {
            const lbl = document.createElement('span');
            lbl.className = 'fab-menu-item-label';
            lbl.textContent = dialLabel;
            row.appendChild(lbl);
        }

        const btn = document.createElement('button');
        btn.className = 'fab-menu-item-btn';
        btn.textContent = label;
        row.appendChild(btn);

        itemsWrap.appendChild(row);
    });

    el.appendChild(itemsWrap);
    return el;
}
