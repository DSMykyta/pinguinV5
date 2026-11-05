/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — APPLICATION ENTRY                                                                   ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Завантажує стилі та запускає єдиний Shell.                                            ║
 * ║ ЗАЛЕЖНОСТІ: Shell та спільний CSS.                                                                 ║
 * ║ ПУБЛІЧНИЙ API: Точка входу Vite.                                                                   ║
 * ║ ПРИНЦИП: HMR знімає старі слухачі.                                                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import './styles/foundation.css';
import './ui/button/button.css';
import './ui/data-row/data-row.css';
import './ui/page/page.css';
import './ui/tabs/tabs.css';
import './ui/tooltip/tooltip.css';
import './shell/sidebar/sidebar.css';
import './shell/aside/aside.css';
import './shell/search/search.css';
import './shell/route-message.css';
import './shell/shell.css';

import { mountShell } from './shell/shell.js';
import { initTooltips } from './ui/tooltip/tooltip.js';

const host = document.getElementById('app');
const disposeTooltips = initTooltips();
const unmountShell = mountShell(host);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmountShell();
    disposeTooltips();
  });
}
