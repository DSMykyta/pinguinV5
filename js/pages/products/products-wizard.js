// js/pages/products/products-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — WIZARD (Покрокове створення товару)             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                        ║
 * ║  Відкриває product-edit fullscreen модал у режимі wizard:              ║
 * ║  секції показуються по одній, навігація Назад/Далі/Створити.           ║
 * ║                                                                        ║
 * ║  Dot-індикатори у шапці (по центру):                                   ║
 * ║  ├── c-grey   — не відвідано                                           ║
 * ║  ├── c-red    — є незаповнені required                                 ║
 * ║  ├── c-green  — все заповнено                                          ║
 * ║  └── c-yellow — відвідано, required ок, але є порожні поля             ║
 * ║                                                                        ║
 * ║  Чекбокси в section-header кожної секції для ручної позначки.          ║
 * ║                                                                        ║
 * ║  Створити — зберігає товар і закриває модал.                           ║
 * ║                                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showAddProductModal, getCompCodeEditorRu, getCompNotesEditorRu } from './products-crud.js';
import { initWizardGenerator, showWizardGenerator, resetWizardGenerator } from './products-crud-composition-generator.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _currentStep = 0;
let _sections = [];
let _active = false;
let _categoryChangeObserver = null;
let _visited = new Set();
let _dotsContainer = null;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

export async function showProductWizard() {
    await showAddProductModal();
    _activateWizardMode();
}

function _activateWizardMode() {
    _active = true;
    _currentStep = 0;
    _visited = new Set();

    const container = document.querySelector('.modal-container');
    if (!container) return;

    container.classList.add('wizard-mode');
    _createWizardFooter(container);
    _createDots();

    // Генератор таблиць: перемикає gt-* на wizard-контейнер + показує aside-table
    showWizardGenerator(true);
    initWizardGenerator((htmlTable, brText) => {
        const codeEditor = getCompCodeEditorRu();
        const notesEditor = getCompNotesEditorRu();
        if (codeEditor) codeEditor.setValue(htmlTable);
        if (notesEditor) notesEditor.setValue(brText);
    });

    // Відкрити aside (може бути закритий)
    const aside = document.querySelector('.aside');
    if (aside?.classList.contains('closed')) {
        aside.classList.remove('closed');
    }

    _collectSections();
    _visited.add(0);
    _showCurrentStep();
    _watchCategoryChanges();
}

// ═══════════════════════════════════════════════════════════════════════════
// DOTS — індикатори кроків у шапці
// ═══════════════════════════════════════════════════════════════════════════

function _createDots() {
    _dotsContainer?.remove();

    const header = document.querySelector('.wizard-mode .modal-header');
    if (!header) return;

    _dotsContainer = document.createElement('div');
    _dotsContainer.className = 'group';
    _dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.dot-btn');
        if (!dot) return;
        const idx = parseInt(dot.dataset.step);
        if (!isNaN(idx)) _goToStep(idx);
    });

    header.appendChild(_dotsContainer);
}

function _renderDots() {
    if (!_dotsContainer) return;

    _dotsContainer.innerHTML = _sections.map((section, i) => {
        const color = _getDotColor(section, i);
        const active = i === _currentStep ? ' active' : '';
        return `<button class="dot-btn${active}" data-step="${i}"><span class="dot ${color}"></span></button>`;
    }).join('');
}

function _getDotColor(section, index) {
    if (!_visited.has(index)) return 'c-grey';

    const requiredFields = section.querySelectorAll('[required]');
    const hasEmptyRequired = Array.from(requiredFields).some(_isFieldEmpty);
    if (hasEmptyRequired) return 'c-red';

    const allInputs = section.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea, select');
    const filledCount = Array.from(allInputs).filter(el => !_isFieldEmpty(el)).length;
    if (filledCount === 0 && allInputs.length > 0) return 'c-yellow';

    return 'c-green';
}

function _isFieldEmpty(el) {
    if (el.tagName === 'SELECT') return !el.value;
    return !el.value.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// WIZARD FOOTER
// ═══════════════════════════════════════════════════════════════════════════

function _createWizardFooter(container) {
    const old = container.querySelector('.wizard-footer');
    if (old) old.remove();

    const footer = document.createElement('div');
    footer.className = 'wizard-footer';
    footer.innerHTML = `
        <button class="btn-icon touch c-secondary" id="wizard-btn-prev">
            <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="body-s" id="wizard-step-label"></span>
        <button class="btn-icon touch c-main" id="wizard-btn-next">
            <span class="material-symbols-outlined">arrow_forward</span>
        </button>
        <button class="btn-icon touch c-main u-hidden" id="wizard-btn-create">
            <span class="material-symbols-outlined">check</span>
        </button>
    `;
    container.appendChild(footer);

    footer.querySelector('#wizard-btn-prev').onclick = () => _goToStep(_currentStep - 1);
    footer.querySelector('#wizard-btn-next').onclick = () => _goToStep(_currentStep + 1);
    footer.querySelector('#wizard-btn-create').onclick = () => _handleCreate();
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

function _collectSections() {
    const content = document.querySelector('.modal-body > main');
    if (!content) { _sections = []; return; }

    _sections = Array.from(content.querySelectorAll(':scope > section, :scope > div > section'));
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function _goToStep(step) {
    if (step < 0 || step >= _sections.length) return;
    _currentStep = step;
    _visited.add(step);
    _showCurrentStep();
}

function _showCurrentStep() {
    _sections.forEach((section, i) => {
        if (i === _currentStep) {
            section.classList.remove('u-hidden');
        } else {
            section.classList.add('u-hidden');
        }
    });

    const total = _sections.length;
    const step = _currentStep;

    const label = document.getElementById('wizard-step-label');
    if (label) label.textContent = `${step + 1} / ${total}`;

    const prevBtn = document.getElementById('wizard-btn-prev');
    if (prevBtn) prevBtn.style.visibility = step === 0 ? 'hidden' : '';

    const nextBtn = document.getElementById('wizard-btn-next');
    const createBtn = document.getElementById('wizard-btn-create');
    const isLast = step === total - 1;
    if (nextBtn) nextBtn.classList.toggle('u-hidden', isLast);
    if (createBtn) createBtn.classList.toggle('u-hidden', !isLast);

    _renderDots();
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY CHANGE → RESCAN SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

function _watchCategoryChanges() {
    const charContainer = document.getElementById('product-characteristics-sections');
    if (!charContainer) return;

    if (_categoryChangeObserver) _categoryChangeObserver.disconnect();

    _categoryChangeObserver = new MutationObserver(() => {
        if (!_active) return;
        const prevCount = _sections.length;
        _collectSections();

        if (_sections.length !== prevCount) {
            if (_currentStep >= _sections.length) {
                _currentStep = _sections.length - 1;
            }
            _showCurrentStep();
        }
    });

    _categoryChangeObserver.observe(charContainer, { childList: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE — зберегти та закрити модал
// ═══════════════════════════════════════════════════════════════════════════

async function _handleCreate() {
    const createBtn = document.getElementById('wizard-btn-create');
    if (createBtn) createBtn.disabled = true;

    try {
        // save-close: зберегти + закрити модал
        const saveCloseBtn = document.getElementById('save-close-product');
        if (saveCloseBtn) saveCloseBtn.click();

        _deactivate();
    } catch (error) {
        console.error('Wizard create error:', error);
    } finally {
        if (createBtn) createBtn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEACTIVATE
// ═══════════════════════════════════════════════════════════════════════════

function _deactivate() {
    _active = false;

    if (_categoryChangeObserver) {
        _categoryChangeObserver.disconnect();
        _categoryChangeObserver = null;
    }

    const container = document.querySelector('.modal-container');
    if (container) container.classList.remove('wizard-mode');

    // Видалити wizard UI
    container?.querySelector('.wizard-footer')?.remove();
    _dotsContainer?.remove();
    _dotsContainer = null;

    // Скинути генератор
    showWizardGenerator(false);
    resetWizardGenerator();

    // Показати всі секції
    _sections.forEach(s => s.classList.remove('u-hidden'));
    _sections = [];
    _visited = new Set();
}
