import './styles/foundation.css';
import './ui/button/button.css';
import './ui/data-row/data-row.css';
import './shell/sidebar/sidebar.css';
import './shell/aside/aside.css';
import './shell/shell.css';

import { mountShell } from './shell/shell.js';

const host = document.getElementById('app');
const unmountShell = mountShell(host);

if (import.meta.hot) {
  import.meta.hot.dispose(unmountShell);
}
