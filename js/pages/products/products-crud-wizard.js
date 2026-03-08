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
 *   - Оновлення wizard при зміні секцій (характеристики)
 *   - Очищення при закритті модалу
 */

let _pendingWizardMode = false;

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Поставити прапорець що наступний модал — wizard
 */
export function setPendingWizardMode() {
    _pendingWizardMode = true;
}

/**
 * Оновити wizard якщо активний (після рендеру нових секцій)
 */
export async function refreshWizardIfActive() {
    const modal = document.getElementById('product-edit');
    if (!modal?.classList.contains('wizard-mode')) return;

    const { refreshWizard } = await import('../../components/modal/modal-wizard.js');
    refreshWizard();
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
            } else {
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
        });
        const radio = overlay.querySelector('#product-mode-wizard');
        if (radio) radio.checked = true;
    } else {
        if (modeSwitch) modeSwitch.classList.add('u-hidden');
    }
}

async function onProductModalClosed(e) {
    if (e.detail.modalId !== 'product-edit') return;

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
