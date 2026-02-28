// js/components/charms/charm-required.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REQUIRED CHARM                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                        ║
 * ║  Декларативна валідація обов'язкових полів на основі HTML [required].   ║
 * ║  Автоматично знімає [error] при введенні/зміні значення.               ║
 * ║                                                                        ║
 * ║  USAGE:                                                                ║
 * ║  <input required>                         — обов'язковий інпут         ║
 * ║  <select required data-custom-select>     — обов'язковий селект        ║
 * ║                                                                        ║
 * ║  API:                                                                  ║
 * ║  validateRequired(container) → boolean                                 ║
 * ║    Перевіряє всі [required] в container.                               ║
 * ║    Ставить [error] на візуальний контейнер порожніх полів.              ║
 * ║    Повертає true якщо все заповнено, false якщо є помилки.             ║
 * ║                                                                        ║
 * ║  ERROR TARGET (пріоритет):                                             ║
 * ║    1. .content-bloc-container — для UA/RU блоків                       ║
 * ║    2. .custom-select-wrapper  — для кастомних селектів                 ║
 * ║    3. .content-line           — для одиноких рядків                    ║
 * ║    4. .input-main             — для одиноких інпутів                   ║
 * ║                                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */


// ═══════════════════════════════════════════════════════════════════════════
// CHARM INIT — авто-зняття [error] при введенні
// ═══════════════════════════════════════════════════════════════════════════

export function initRequiredCharm(scope = document) {
    scope.querySelectorAll('[required]').forEach(el => {
        if (el._requiredCharmInit) return;
        el._requiredCharmInit = true;
        setupAutoClean(el);
    });
}

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
// VALIDATE — перевірка всіх [required] в контейнері
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {HTMLElement} container — модалка, форма, секція
 * @returns {boolean} true = все заповнено, false = є помилки
 */
export function validateRequired(container) {
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

    // Скрол до першої помилки
    if (!valid) {
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
