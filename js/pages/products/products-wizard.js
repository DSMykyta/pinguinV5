// js/pages/products/products-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — WIZARD (Покрокове створення товару)             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відкриває той самий product-edit fullscreen модал,
 * але в режимі wizard: секції показуються по одній,
 * навігація кнопками Назад/Далі/Створити.
 *
 * Після "Створити" — зберігає товар, знімає wizard-mode,
 * модал стає звичайним для подальшого редагування.
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

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

export async function showProductWizard() {
    await showAddProductModal();
    _activateWizardMode();
    _showModeSwitch(true);
    _initModeSwitch();
}

/**
 * Показати перемикач Wizard/Стандарт (тільки для створення)
 */
function _showModeSwitch(show) {
    const sw = document.getElementById('product-mode-switch');
    if (!sw) return;

    if (show) {
        sw.classList.remove('u-hidden');
        const wizardRadio = document.getElementById('product-mode-wizard');
        if (wizardRadio) wizardRadio.checked = true;
    } else {
        sw.classList.add('u-hidden');
    }
}

function _initModeSwitch() {
    const sw = document.getElementById('product-mode-switch');
    if (!sw) return;

    sw.addEventListener('change', (e) => {
        if (e.target.value === 'wizard' && !_active) {
            _activateWizardMode();
        } else if (e.target.value === 'standard' && _active) {
            _deactivate();
        }
    });
}

function _activateWizardMode() {
    _active = true;
    _currentStep = 0;

    const container = document.querySelector('.modal-fullscreen-container');
    if (!container) return;

    container.classList.add('wizard-mode');
    _createWizardFooter(container);

    // Показати генератор таблиць та ініціалізувати
    showWizardGenerator(true);
    initWizardGenerator((htmlTable, brText) => {
        const codeEditor = getCompCodeEditorRu();
        const notesEditor = getCompNotesEditorRu();
        if (codeEditor) codeEditor.setValue(htmlTable);
        if (notesEditor) notesEditor.setValue(brText);
    });

    _collectSections();
    _showCurrentStep();
    _watchCategoryChanges();
}

// ═══════════════════════════════════════════════════════════════════════════
// WIZARD FOOTER
// ═══════════════════════════════════════════════════════════════════════════

function _createWizardFooter(container) {
    // Видалити старий якщо є
    const old = container.querySelector('.wizard-footer');
    if (old) old.remove();

    const footer = document.createElement('div');
    footer.className = 'wizard-footer';
    footer.innerHTML = `
        <button class="btn-ghost" id="wizard-btn-prev">
            <span class="material-symbols-outlined">arrow_back</span>
            Назад
        </button>
        <span class="body-s" id="wizard-step-label"></span>
        <button class="btn-primary" id="wizard-btn-next">
            Далі
            <span class="material-symbols-outlined">arrow_forward</span>
        </button>
        <button class="btn-primary u-hidden" id="wizard-btn-create">
            <span class="material-symbols-outlined">check</span>
            Створити
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
    const content = document.querySelector('.modal-fullscreen-content');
    if (!content) { _sections = []; return; }

    _sections = Array.from(content.querySelectorAll(':scope > section, :scope > div > section'));
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function _goToStep(step) {
    if (step < 0 || step >= _sections.length) return;
    _currentStep = step;
    _showCurrentStep();
}

function _showCurrentStep() {
    // Показати/сховати секції
    _sections.forEach((section, i) => {
        if (i === _currentStep) {
            section.classList.remove('u-hidden');
        } else {
            section.classList.add('u-hidden');
        }
    });

    const total = _sections.length;
    const step = _currentStep;

    // Label
    const label = document.getElementById('wizard-step-label');
    if (label) label.textContent = `${step + 1} / ${total}`;

    // Prev button
    const prevBtn = document.getElementById('wizard-btn-prev');
    if (prevBtn) {
        prevBtn.style.visibility = step === 0 ? 'hidden' : '';
    }

    // Next / Create
    const nextBtn = document.getElementById('wizard-btn-next');
    const createBtn = document.getElementById('wizard-btn-create');
    const isLast = step === total - 1;

    if (nextBtn) nextBtn.classList.toggle('u-hidden', isLast);
    if (createBtn) createBtn.classList.toggle('u-hidden', !isLast);

    // Sidebar nav — підсвітити поточну секцію
    _updateSidebarNav();
}

function _updateSidebarNav() {
    const nav = document.getElementById('product-section-navigator');
    if (!nav) return;

    const currentSection = _sections[_currentStep];
    if (!currentSection) return;

    nav.querySelectorAll('.nav-main a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href === `#${currentSection.id}`) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY CHANGE → RESCAN SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

function _watchCategoryChanges() {
    // MutationObserver на контейнер характеристик
    const charContainer = document.getElementById('product-characteristics-sections');
    if (!charContainer) return;

    if (_categoryChangeObserver) _categoryChangeObserver.disconnect();

    _categoryChangeObserver = new MutationObserver(() => {
        if (!_active) return;
        const prevCount = _sections.length;
        _collectSections();

        // Якщо кількість секцій змінилась — оновити UI
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
// CREATE
// ═══════════════════════════════════════════════════════════════════════════

async function _handleCreate() {
    const createBtn = document.getElementById('wizard-btn-create');
    if (createBtn) createBtn.disabled = true;

    try {
        // Використовуємо існуючий save handler з products-crud
        const saveBtn = document.getElementById('save-close-product');
        if (saveBtn) {
            // Тригеримо збереження, але НЕ закриваємо модал
            const { default: _unused, ...crud } = await import('./products-crud.js');
            // Напряму кликнути save (не save-close)
            const saveBtnOnly = document.getElementById('btn-save-product');
            if (saveBtnOnly) saveBtnOnly.click();
        }

        // Зняти wizard-mode → модал стає звичайним edit
        _deactivate();
        _showModeSwitch(false);

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

    const container = document.querySelector('.modal-fullscreen-container');
    if (container) container.classList.remove('wizard-mode');

    // Видалити wizard footer
    const footer = container?.querySelector('.wizard-footer');
    if (footer) footer.remove();

    // Сховати та скинути генератор
    showWizardGenerator(false);
    resetWizardGenerator();

    // Показати всі секції
    _sections.forEach(s => s.classList.remove('u-hidden'));
    _sections = [];
}
