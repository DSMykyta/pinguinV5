// js/components/modal/modal-wizard.js

/**
 * MODAL WIZARD — покроковий режим для fullscreen модалів
 *
 * Активується свічером "Повний / Покроковий" в header.
 * Ховає nav + aside, показує секції по одній зі slide-анімацією.
 *
 * API:
 *   initWizard(container)    — підключити wizard до модалу
 *   destroyWizard(container) — відключити, повернути оригінальний стан
 *
 * Клас на контейнері: .wizard-mode
 */

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const _state = new WeakMap();

function _getState(container) {
    return _state.get(container);
}

function _createState(container) {
    const s = {
        active: false,
        currentStep: 0,
        sections: [],
        dotsContainer: null,
        // Originals to restore
        originalFooterHTML: null,
        originalHeaderCenter: null,
        originalHeaderLeft: null,
        originalTitle: '',
        // Elements
        container,
        footer: container.querySelector('.modal-footer'),
        headerCenter: container.querySelector('.modal-header .modal-center'),
        headerLeft: container.querySelector('.modal-header .modal-left'),
        main: container.querySelector('.modal-body > main'),
    };
    _state.set(container, s);
    return s;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати wizard на контейнері модалу.
 * Викликати коли свічер перемкнуто на "Покроковий".
 */
export function initWizard(container) {
    if (_state.has(container)) return;

    const s = _createState(container);
    s.active = true;

    // Зберегти оригінали
    s.originalFooterHTML = s.footer?.innerHTML ?? '';
    s.originalHeaderCenter = s.headerCenter?.innerHTML ?? '';
    s.originalHeaderLeft = s.headerLeft?.innerHTML ?? '';
    s.originalTitle = s.headerLeft?.querySelector('h1')?.textContent ?? '';

    // Зібрати секції
    _collectSections(s);

    // Активувати
    container.classList.add('wizard-mode');
    _buildFooter(s);
    _buildDots(s);
    _goToStep(s, 0);
}

/**
 * Деактивувати wizard, повернути оригінальний стан.
 */
export function destroyWizard(container) {
    const s = _getState(container);
    if (!s) return;

    s.active = false;
    container.classList.remove('wizard-mode');

    // Повернути footer
    if (s.footer) s.footer.innerHTML = s.originalFooterHTML;

    // Повернути header
    if (s.headerCenter) s.headerCenter.innerHTML = s.originalHeaderCenter;
    if (s.headerLeft) s.headerLeft.innerHTML = s.originalHeaderLeft;

    // Показати всі секції, прибрати slide-стилі
    s.sections.forEach(sec => {
        sec.style.transform = '';
        sec.style.opacity = '';
        sec.style.position = '';
        sec.style.top = '';
        sec.style.left = '';
        sec.style.width = '';
        sec.classList.remove('u-hidden');
    });

    // Показати section-header назад
    s.sections.forEach(sec => {
        const header = sec.querySelector('.section-header');
        if (header) header.style.display = '';
    });

    _state.delete(container);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

function _collectSections(s) {
    if (!s.main) { s.sections = []; return; }
    s.sections = Array.from(
        s.main.querySelectorAll(':scope > section, :scope > div > section')
    );
}

function _getSectionName(section) {
    const h2 = section.querySelector('.section-header h2, .section-header .section-name');
    if (h2) return h2.textContent.trim();
    const label = section.getAttribute('aria-label');
    if (label) return label;
    return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function _goToStep(s, step) {
    if (step < 0 || step >= s.sections.length) return;

    const prev = s.currentStep;
    const direction = step > prev ? 1 : -1;
    s.currentStep = step;

    _animateSlide(s, prev, step, direction);
    _updateFooter(s);
    _updateDots(s);
    _updateTitle(s);
}

function _animateSlide(s, fromIdx, toIdx, direction) {
    const from = s.sections[fromIdx];
    const to = s.sections[toIdx];

    if (fromIdx === toIdx) {
        // Перший показ — без анімації
        s.sections.forEach((sec, i) => {
            if (i === toIdx) {
                sec.classList.remove('u-hidden');
                sec.style.transform = 'translateX(0)';
                sec.style.opacity = '1';
            } else {
                sec.classList.add('u-hidden');
            }
            // Ховаємо section-header
            const header = sec.querySelector('.section-header');
            if (header) header.style.display = 'none';
        });
        return;
    }

    // Ховаємо section-header на новій секції
    const toHeader = to.querySelector('.section-header');
    if (toHeader) toHeader.style.display = 'none';

    // Підготувати нову секцію (поза екраном)
    to.classList.remove('u-hidden');
    to.style.transition = 'none';
    to.style.transform = `translateX(${direction * 100}%)`;
    to.style.opacity = '0';

    // Force reflow
    to.offsetHeight;

    // Анімувати
    to.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    from.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    to.style.transform = 'translateX(0)';
    to.style.opacity = '1';
    from.style.transform = `translateX(${-direction * 100}%)`;
    from.style.opacity = '0';

    from.addEventListener('transitionend', function handler() {
        from.removeEventListener('transitionend', handler);
        from.classList.add('u-hidden');
        from.style.transition = '';
        from.style.transform = '';
        from.style.opacity = '';
    }, { once: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER — [prev] [N/N] [next]
// ═══════════════════════════════════════════════════════════════════════════

function _buildFooter(s) {
    if (!s.footer) return;

    s.footer.innerHTML = `
        <button type="button" class="btn-icon touch c-secondary" data-wizard="prev">
            <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="modal-left"></div>
        <div class="modal-center">
            <span class="body-s" data-wizard="label"></span>
        </div>
        <div class="modal-right"></div>
        <button type="button" class="btn-icon touch c-main" data-wizard="next">
            <span class="material-symbols-outlined">arrow_forward</span>
        </button>
    `;

    s.footer.querySelector('[data-wizard="prev"]').addEventListener('click', () => {
        _goToStep(s, s.currentStep - 1);
    });
    s.footer.querySelector('[data-wizard="next"]').addEventListener('click', () => {
        _goToStep(s, s.currentStep + 1);
    });
}

function _updateFooter(s) {
    const label = s.footer?.querySelector('[data-wizard="label"]');
    if (label) label.textContent = `${s.currentStep + 1} / ${s.sections.length}`;

    const prev = s.footer?.querySelector('[data-wizard="prev"]');
    if (prev) prev.style.visibility = s.currentStep === 0 ? 'hidden' : '';

    const next = s.footer?.querySelector('[data-wizard="next"]');
    if (next) next.style.visibility = s.currentStep === s.sections.length - 1 ? 'hidden' : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// TITLE — назва секції в header-left
// ═══════════════════════════════════════════════════════════════════════════

function _updateTitle(s) {
    if (!s.headerLeft) return;
    const name = _getSectionName(s.sections[s.currentStep]);
    const h1 = s.headerLeft.querySelector('h1');
    if (h1) {
        h1.textContent = name;
    } else {
        s.headerLeft.innerHTML = `<h1>${name}</h1>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOTS — крапки-навігація в header-center
// ═══════════════════════════════════════════════════════════════════════════

function _buildDots(s) {
    if (!s.headerCenter) return;
    s.headerCenter.innerHTML = '';

    s.dotsContainer = document.createElement('div');
    s.dotsContainer.className = 'group';
    s.dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('[data-wizard-step]');
        if (!dot) return;
        const idx = parseInt(dot.dataset.wizardStep);
        if (!isNaN(idx)) _goToStep(s, idx);
    });

    s.headerCenter.appendChild(s.dotsContainer);
    _updateDots(s);
}

function _updateDots(s) {
    if (!s.dotsContainer) return;

    s.dotsContainer.innerHTML = s.sections.map((_, i) => {
        const active = i === s.currentStep ? ' active' : '';
        return `<button type="button" class="dot-btn${active}" data-wizard-step="${i}"><span class="dot"></span></button>`;
    }).join('');
}
