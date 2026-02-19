// js/common/charms/refresh-button.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    UTILITY: SPINNER FOR ASYNC BUTTONS                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Не auto-discovery charm, а імпортована утиліта.                       ║
 * ║  Додає .spinning на іконку, disabled на кнопку, await callback.        ║
 * ║                                                                        ║
 * ║  import { withSpinner } from '../common/charms/refresh-button.js';     ║
 * ║  btn.addEventListener('click', () => withSpinner(btn, async () => {    ║
 * ║      await loadData();                                                 ║
 * ║      renderTable();                                                    ║
 * ║  }));                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * @param {HTMLElement} btn — кнопка з .material-symbols-outlined іконкою
 * @param {Function} asyncFn — async callback
 * @returns {Promise<*>} результат asyncFn
 */
export async function withSpinner(btn, asyncFn) {
    if (btn.disabled) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    btn.disabled = true;
    icon?.classList.add('spinning');
    try {
        return await asyncFn();
    } finally {
        icon?.classList.remove('spinning');
        btn.disabled = false;
    }
}
