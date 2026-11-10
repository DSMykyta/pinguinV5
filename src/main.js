/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — APPLICATION ENTRY                                                                   ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Завантажує стилі та запускає єдиний Shell.                                            ║
 * ║ ЗАЛЕЖНОСТІ: Shell, shared CSS і opt-in UI behaviors.                                               ║
 * ║ ПУБЛІЧНИЙ API: Точка входу Vite.                                                                   ║
 * ║ ПРИНЦИП: HMR знімає старі слухачі.                                                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import './styles/foundation.css';
import './ui/button/button.css';
import './ui/data-row/data-row.css';
import './ui/collection-view/collection-view.css';
import './ui/selection-actions/selection-actions.css';
import './ui/view-switch/view-switch.css';
import './ui/segment-switch/segment-switch.css';
import './ui/pagination/pagination.css';
import './ui/page/page.css';
import './ui/tabs/tabs.css';
import './ui/tooltip/tooltip.css';
import './ui/toast/toast.css';
import './ui/reveal-panel/reveal-panel.css';
import './ui/dialog/dialog.css';
import './ui/workspace-layout/workspace-layout.css';
import './ui/section-navigator/section-navigator.css';
import './ui/field/field.css';
import './ui/scrollbar/scrollbar.css';
import './ui/input/input.css';
import './ui/select/select.css';
import './ui/combobox/combobox.css';
import './ui/listbox/listbox.css';
import './ui/menu/menu.css';
import './ui/image-field/image-field.css';
import './ui/tag-field/tag-field.css';
import './ui/textarea/textarea.css';
import './ui/rich-text-editor/rich-text-editor.css';
import './ui/number-field/number-field.css';
import './ui/checkbox/checkbox.css';
import './ui/radio-group/radio-group.css';
import './ui/switch/switch.css';
import './shell/sidebar/sidebar.css';
import './shell/aside/aside.css';
import './shell/aside/fab.css';
import './shell/search/search.css';
import './shell/route-message.css';
import './shell/shell.css';

import { mountShell } from './shell/shell.js';
import { initTooltips } from './ui/tooltip/tooltip.js';
import { mountToasts } from './ui/toast/toast.js';
import { mountDialogs } from './ui/dialog/dialog.js';
import { mountRotatingPlaceholders } from './ui/input/rotating-placeholder.js';

const host = document.getElementById('app');
const disposeTooltips = initTooltips();
const disposeToasts = mountToasts();
const disposeDialogs = mountDialogs();
const unmountShell = mountShell(host);
const unmountPlaceholders = mountRotatingPlaceholders(host);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmountPlaceholders();
    unmountShell();
    disposeTooltips();
    disposeToasts();
    disposeDialogs();
  });
}
