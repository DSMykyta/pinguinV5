// js/components/forms/switch.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                             SWITCH                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  JS-поведінка для .switch компонента (radio-group перемикач)             ║
 * ║  Click anywhere → toggle, keyboard Space/Enter, програмне API           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * HTML:
 *   <div class="switch" data-switch>
 *     <input type="radio" id="a" name="grp" value="a" checked>
 *     <label for="a" class="switch-label">Опція 1</label>
 *     <input type="radio" id="b" name="grp" value="b">
 *     <label for="b" class="switch-label">Опція 2</label>
 *   </div>
 *
 * JS:
 *   import { initSwitches } from './components/forms/switch.js';
 *   initSwitches(container);
 *
 * API (через el._switch):
 *   el._switch.toggle()          — перемкнути на наступну опцію
 *   el._switch.check(value)      — встановити конкретне значення
 *   el._switch.uncheck()         — скинути до першої опції
 *   el._switch.value()           — поточне значення
 *   el._switch.disable()         — заблокувати
 *   el._switch.enable()          — розблокувати
 *   el._switch.destroy()         — зняти listeners
 *
 * Events (на .switch елементі):
 *   'switch:change'  — { detail: { value, previousValue, radio } }
 */

class Switch {
    constructor(el) {
        this.el = el;
        this._radios = () => Array.from(el.querySelectorAll('input[type="radio"]'));
        this._disabled = false;

        this._onClick = this._handleClick.bind(this);
        this._onKeyDown = this._handleKeyDown.bind(this);

        el.addEventListener('click', this._onClick);
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'radiogroup');
        el.addEventListener('keydown', this._onKeyDown);

        el._switch = this;
        el.dataset.switchInit = 'true';
    }

    // --- Interaction handlers ---

    _handleClick(e) {
        if (this._disabled) return;

        // Якщо клікнули саме на некчекнутий label — браузер сам перемкне radio.
        // Ми перехоплюємо тільки клік по контейнеру або по ВЖЕ активному label.
        const label = e.target.closest('.switch-label');
        if (label) {
            const radio = this._radioForLabel(label);
            if (radio && !radio.checked) {
                // Браузер сам обробить — нам нічого робити
                return;
            }
        }

        // Клік по контейнеру або по активному label → toggle
        this.toggle();
    }

    _handleKeyDown(e) {
        if (this._disabled) return;
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.toggle();
        }
    }

    _radioForLabel(label) {
        const forId = label.getAttribute('for');
        if (forId) return this.el.querySelector(`#${CSS.escape(forId)}`);
        return label.previousElementSibling?.matches('input[type="radio"]')
            ? label.previousElementSibling : null;
    }

    // --- Public API ---

    toggle() {
        const radios = this._radios();
        if (radios.length < 2) return;

        const currentIdx = radios.findIndex(r => r.checked);
        const nextIdx = (currentIdx + 1) % radios.length;
        this._select(radios[nextIdx]);
    }

    check(value) {
        const radio = this._radios().find(r => r.value === value);
        if (radio && !radio.checked) this._select(radio);
    }

    uncheck() {
        const first = this._radios()[0];
        if (first && !first.checked) this._select(first);
    }

    value() {
        return this._radios().find(r => r.checked)?.value ?? null;
    }

    disable() {
        this._disabled = true;
        this.el.classList.add('switch-disabled');
        this._radios().forEach(r => r.disabled = true);
    }

    enable() {
        this._disabled = false;
        this.el.classList.remove('switch-disabled');
        this._radios().forEach(r => r.disabled = false);
    }

    destroy() {
        this.el.removeEventListener('click', this._onClick);
        this.el.removeEventListener('keydown', this._onKeyDown);
        this.el.removeAttribute('tabindex');
        this.el.removeAttribute('role');
        delete this.el._switch;
        delete this.el.dataset.switchInit;
    }

    // --- Internal ---

    _select(radio) {
        const prev = this._radios().find(r => r.checked);
        const previousValue = prev?.value ?? null;

        if (radio.value === previousValue) return;

        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));

        this.el.dispatchEvent(new CustomEvent('switch:change', {
            bubbles: true,
            detail: { value: radio.value, previousValue, radio }
        }));
    }
}

/**
 * Ініціалізувати всі свічери в контейнері
 */
export function initSwitches(container = document) {
    container.querySelectorAll('.switch:not([data-switch-init])').forEach(el => {
        new Switch(el);
    });
}

/**
 * Знищити свічер
 */
export function destroySwitch(el) {
    if (el._switch) el._switch.destroy();
}
