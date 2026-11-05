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
import './ui/tabs/tabs.css';
import './shell/sidebar/sidebar.css';
import './shell/aside/aside.css';
import './shell/shell.css';

import { mountShell } from './shell/shell.js';

const host = document.getElementById('app');
const unmountShell = mountShell(host);

if (import.meta.hot) {
  import.meta.hot.dispose(unmountShell);
}
