// js/pages/products/products-crud-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — WIZARD MODE                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — wizard режим для модалу товару.
 *
 * Відповідає за:
 *   - Перемикач standard/wizard mode
 *   - Авто-активація wizard (FAB кнопка)
 *   - MutationObserver на #product-characteristics-sections
 *   - Очищення при закритті модалу
 */

let _pendingWizardMode = false;
let _observer = null;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Поставити прапорець що наступний модал — wizard
 */
export function setPendingWizardMode() {
    _pendingWizardMode = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATION OBSERVER — автоматично оновлює wizard при зміні секцій
// ═══════════════════════════════════════════════════════════════════════════

function _startObserver() {
    _stopObserver();

    const charContainer = document.getElementById('product-characteristics-sections');
    if (!charContainer) return;

    _observer = new MutationObserver(() => {
        const container = document.querySelector('#product-edit .modal-container');
        if (!container?.classList.contains('wizard-mode')) return;

        import('../../components/modal/modal-wizard.js').then(({ refreshWizard }) => {
            refreshWizard();
        });
    });

    _observer.observe(charContainer, { childList: true });
}

function _stopObserver() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL EVENTS
// ═══════════════════════════════════════════════════════════════════════════

function onProductModalOpened(e) {
    if (e.detail.modalId !== 'product-edit') return;

    const overlay = e.detail.modalElement;
    const container = overlay?.querySelector('.modal-container');

    // ── Wizard mode switch ──
    const modeSwitch = overlay?.querySelector('#product-mode-switch');
    if (modeSwitch && !modeSwitch._wizardInit) {
        modeSwitch._wizardInit = true;
        modeSwitch.addEventListener('change', async (ev) => {
            const c = ev.target.closest('.modal-container');
            if (!c) return;
            const { initWizard, destroyWizard } = await import('../../components/modal/modal-wizard.js');
            if (ev.target.value === 'wizard') {
                initWizard(c);
                _startObserver();
            } else {
                _stopObserver();
                destroyWizard(c);
            }
        });
    }

    // ── Auto-activate wizard якщо прапорець стоїть ──
    if (_pendingWizardMode && container) {
        _pendingWizardMode = false;
        if (modeSwitch) modeSwitch.classList.remove('u-hidden');
        import('../../components/modal/modal-wizard.js').then(({ initWizard }) => {
            initWizard(container);
            _startObserver();
        });
        const radio = overlay.querySelector('#product-mode-wizard');
        if (radio) radio.checked = true;
    } else {
        if (modeSwitch) modeSwitch.classList.add('u-hidden');
    }
}

async function onProductModalClosed(e) {
    if (e.detail.modalId !== 'product-edit') return;

    _stopObserver();

    const container = e.detail.modalElement?.querySelector('.modal-container');
    if (container?.classList.contains('wizard-mode')) {
        const { destroyWizard } = await import('../../components/modal/modal-wizard.js');
        destroyWizard(container);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    document.addEventListener('modal-opened', onProductModalOpened);
    document.addEventListener('modal-closed', onProductModalClosed);
}
