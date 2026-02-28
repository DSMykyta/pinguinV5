// js/components/charms/charm-required.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REQUIRED CHARM                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                        ║
 * ║  Генерік система валідації обов'язкових полів.                          ║
 * ║  Сторінковий код НЕ знає про required — все автоматично.               ║
 * ║                                                                        ║
 * ║  HTML:                                                                 ║
 * ║  <input required>  — і все, решта автоматично                          ║
 * ║                                                                        ║
 * ║  ЩО РОБИТЬ:                                                            ║
 * ║  1. Додає червону dot до label кожного [required] поля                 ║
 * ║  2. Автозняття [error] при введенні/зміні                              ║
 * ║  3. Перехоплює save-кнопки в модалах (capture phase)                   ║
 * ║     → валідує → [error] + тост + скрол → блокує збереження             ║
 * ║  4. Перехоплює submit на формах з [required]                           ║
 * ║                                                                        ║
 * ║  ERROR TARGET (пріоритет):                                             ║
 * ║    1. .content-bloc-container — для UA/RU блоків                       ║
 * ║    2. .custom-select-wrapper  — для кастомних селектів                 ║
 * ║    3. .content-line           — для одиноких рядків                    ║
 * ║    4. .input-main             — для одиноких інпутів                   ║
 * ║                                                                        ║
 * ║  ЗАЛЕЖНОСТІ:                                                           ║
 * ║  - feedback/toast.js (showToast)                                       ║
 * ║                                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showToast } from '../feedback/toast.js';


// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function initRequiredCharm(scope = document) {
    // Dots + auto-clean для всіх [required]
    scope.querySelectorAll('[required]').forEach(el => {
        if (el._requiredCharmInit) return;
        el._requiredCharmInit = true;
        addDotToLabel(el);
        setupAutoClean(el);
    });

    // Перехоплення save-кнопок в модалах (capture phase — до onclick)
    if (!document._requiredSaveGuard) {
        document._requiredSaveGuard = true;
        document.addEventListener('click', handleSaveClick, true);
        document.addEventListener('submit', handleFormSubmit, true);
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// DOT — автоматична червона крапка в label
// ═══════════════════════════════════════════════════════════════════════════

function addDotToLabel(el) {
    const id = el.id;
    if (!id) return;

    // Шукаємо label[for="id"]
    let label = document.querySelector(`label[for="${id}"]`);

    // Якщо нема — шукаємо найближчий label вгору
    if (!label) {
        const group = el.closest('.group');
        if (group) label = group.querySelector('label.label-l');
    }

    if (!label) return;

    // Не дублювати
    if (label.querySelector('.dot')) return;

    const dot = document.createElement('span');
    dot.className = 'dot c-red small';
    label.appendChild(dot);
}


// ═══════════════════════════════════════════════════════════════════════════
// AUTO-CLEAN — зняття [error] при введенні
// ═══════════════════════════════════════════════════════════════════════════

function setupAutoClean(el) {
    const events = el.tagName === 'SELECT' ? ['change'] : ['input'];

    events.forEach(evt => {
        el.addEventListener(evt, () => {
            const target = findErrorTarget(el);
            if (target) target.removeAttribute('error');
        });
    });
}


// ═══════════════════════════════════════════════════════════════════════════
// SAVE GUARD — перехоплення кнопок збереження
// ═══════════════════════════════════════════════════════════════════════════

function handleSaveClick(e) {
    const btn = e.target.closest('[id*="save"]');
    if (!btn) return;

    // Тільки в модалах
    const modal = btn.closest('.modal-overlay');
    if (!modal) return;

    // Є [required] поля?
    if (!modal.querySelector('[required]')) return;

    // Валідація
    if (!validate(modal)) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}

function handleFormSubmit(e) {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (!form.querySelector('[required]')) return;

    // Шукаємо контейнер для валідації (модал або сама форма)
    const container = form.closest('.modal-overlay') || form;

    if (!validate(container)) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// VALIDATE
// ═══════════════════════════════════════════════════════════════════════════

function validate(container) {
    const fields = container.querySelectorAll('[required]');
    let valid = true;

    fields.forEach(el => {
        const target = findErrorTarget(el);
        if (!target) return;

        if (isEmpty(el)) {
            target.setAttribute('error', '');
            valid = false;
        } else {
            target.removeAttribute('error');
        }
    });

    if (!valid) {
        showToast('Заповніть обов\'язкові поля', 'error');
        const first = container.querySelector('[error]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isEmpty(el) {
    if (el.tagName === 'SELECT') {
        return !el.value;
    }
    return !el.value.trim();
}

function findErrorTarget(el) {
    // 1. content-bloc-container (UA/RU блоки)
    const bloc = el.closest('.content-bloc-container');
    if (bloc) return bloc;

    // 2. custom-select-wrapper (кастомні селекти)
    const selectWrapper = el.closest('.custom-select-wrapper');
    if (selectWrapper) return selectWrapper;

    // 3. content-line (одинокий рядок без content-bloc-container)
    const line = el.closest('.content-line');
    if (line) return line;

    // 4. input-main (одинокий інпут з власним бордером)
    if (el.classList.contains('input-main')) return el;

    return null;
}
