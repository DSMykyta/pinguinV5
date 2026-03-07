// js/components/modal/modal-wizard.js

/**
 * MODAL WIZARD — покроковий режим для fullscreen модалів
 *
 * API:
 *   initWizard(container)    — підключити wizard
 *   destroyWizard(container) — відключити, повернути стан
 *
 * Клас на контейнері: .wizard-mode
 */

let _active = false;
let _currentStep = 0;
let _sections = [];
let _container = null;
let _footer = null;
let _headerCenter = null;
let _headerLeft = null;
let _main = null;
let _dotsContainer = null;
let _originalFooter = '';
let _originalCenter = '';
let _originalLeft = '';

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

export function initWizard(container) {
    if (_active) destroyWizard(_container);
    if (!container) { console.warn('[Wizard] no container'); return; }

    _container = container;
    _footer = container.querySelector('.modal-footer');
    _headerCenter = container.querySelector('.modal-header .modal-center');
    _headerLeft = container.querySelector('.modal-header .modal-left');
    _main = container.querySelector('.modal-body > main');

    if (!_main) { console.warn('[Wizard] no <main>'); return; }

    // Зберегти оригінали
    _originalFooter = _footer?.innerHTML ?? '';
    _originalCenter = _headerCenter?.innerHTML ?? '';
    _originalLeft = _headerLeft?.innerHTML ?? '';

    // Зібрати секції (пропустити hidden і порожні)
    _sections = Array.from(
        _main.querySelectorAll(':scope > section, :scope > div > section')
    ).filter(sec => !sec.classList.contains('u-hidden') && sec.offsetParent !== null);

    if (_sections.length === 0) { console.warn('[Wizard] no sections'); return; }

    // Активувати
    _active = true;
    _currentStep = 0;
    container.classList.add('wizard-mode');

    _buildFooter();
    _buildDots();
    _showStep(0);

    console.log(`[Wizard] activated, ${_sections.length} sections`);
}

export function destroyWizard(container) {
    if (!_active) return;
    _active = false;

    if (_container) _container.classList.remove('wizard-mode');

    // Повернути footer
    if (_footer) _footer.innerHTML = _originalFooter;

    // Повернути header
    if (_headerCenter) _headerCenter.innerHTML = _originalCenter;
    if (_headerLeft) _headerLeft.innerHTML = _originalLeft;

    // Показати всі секції, прибрати inline стилі
    _sections.forEach(sec => {
        sec.classList.remove('u-hidden');
        sec.style.cssText = '';
        const header = sec.querySelector('.section-header');
        if (header) header.style.display = '';
    });

    _sections = [];
    _container = null;
    _footer = null;
    _headerCenter = null;
    _headerLeft = null;
    _main = null;
    _dotsContainer = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function _showStep(step) {
    if (step < 0 || step >= _sections.length) return;

    const prevStep = _currentStep;
    const direction = step > prevStep ? 1 : -1;
    _currentStep = step;

    if (prevStep === step) {
        // Перший показ — без анімації
        _sections.forEach((sec, i) => {
            const header = sec.querySelector('.section-header');
            if (header) header.style.display = 'none';

            if (i === step) {
                sec.classList.remove('u-hidden');
                sec.style.transform = 'translateX(0)';
                sec.style.opacity = '1';
            } else {
                sec.classList.add('u-hidden');
                sec.style.transform = '';
                sec.style.opacity = '';
            }
        });
    } else {
        _animateSlide(prevStep, step, direction);
    }

    _updateUI();
}

function _animateSlide(fromIdx, toIdx, direction) {
    const from = _sections[fromIdx];
    const to = _sections[toIdx];

    // Ховаємо section-header
    const toHeader = to.querySelector('.section-header');
    if (toHeader) toHeader.style.display = 'none';

    // Нова секція — поза екраном
    to.classList.remove('u-hidden');
    to.style.transition = 'none';
    to.style.transform = `translateX(${direction * 100}%)`;
    to.style.opacity = '0';
    to.offsetHeight; // reflow

    // Анімація
    const t = 'transform 0.3s ease, opacity 0.3s ease';
    to.style.transition = t;
    from.style.transition = t;

    to.style.transform = 'translateX(0)';
    to.style.opacity = '1';
    from.style.transform = `translateX(${-direction * 100}%)`;
    from.style.opacity = '0';

    from.addEventListener('transitionend', () => {
        from.classList.add('u-hidden');
        from.style.transition = '';
        from.style.transform = '';
        from.style.opacity = '';
    }, { once: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════════════════════════════════

function _updateUI() {
    // Footer label
    const label = _footer?.querySelector('[data-wizard="label"]');
    if (label) label.textContent = `${_currentStep + 1} / ${_sections.length}`;

    // Footer buttons visibility
    const isFirst = _currentStep === 0;
    const isLast = _currentStep === _sections.length - 1;

    const prev = _footer?.querySelector('[data-wizard="prev"]');
    if (prev) prev.style.visibility = isFirst ? 'hidden' : '';

    const next = _footer?.querySelector('[data-wizard="next"]');
    if (next) next.classList.toggle('u-hidden', isLast);

    const save = _footer?.querySelector('[data-wizard="save"]');
    if (save) save.classList.toggle('u-hidden', !isLast);

    // Title — назва секції
    if (_headerLeft) {
        const section = _sections[_currentStep];
        const name = section?.querySelector('.section-header h2')?.textContent?.trim() || '';
        const h1 = _headerLeft.querySelector('h1');
        if (h1) h1.textContent = name;
    }

    // Dots
    _updateDots();
}

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════

function _buildFooter() {
    if (!_footer) return;

    _footer.innerHTML = `
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
        <button type="button" class="btn-icon touch c-main u-hidden" data-wizard="save">
            <span class="material-symbols-outlined">check</span>
        </button>
    `;

    _footer.querySelector('[data-wizard="prev"]').addEventListener('click', () => _showStep(_currentStep - 1));
    _footer.querySelector('[data-wizard="next"]').addEventListener('click', () => _showStep(_currentStep + 1));
    _footer.querySelector('[data-wizard="save"]').addEventListener('click', () => {
        // Клікаємо оригінальну кнопку save-close якщо є
        const saveBtn = _container?.querySelector('[id$="save-close-product"], [id^="save-close"]');
        if (saveBtn) saveBtn.click();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOTS
// ═══════════════════════════════════════════════════════════════════════════

function _buildDots() {
    if (!_headerCenter) return;
    _headerCenter.innerHTML = '';

    _dotsContainer = document.createElement('div');
    _dotsContainer.className = 'group';
    _dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('[data-wizard-step]');
        if (!dot) return;
        const idx = parseInt(dot.dataset.wizardStep);
        if (!isNaN(idx)) _showStep(idx);
    });

    _headerCenter.appendChild(_dotsContainer);
}

function _updateDots() {
    if (!_dotsContainer) return;
    _dotsContainer.innerHTML = _sections.map((_, i) => {
        const active = i === _currentStep ? ' active' : '';
        return `<button type="button" class="dot-btn${active}" data-wizard-step="${i}"><span class="dot"></span></button>`;
    }).join('');
}
