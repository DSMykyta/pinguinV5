/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WELCOME DIALOG
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Вітальна презентація Pinguin V6.
 * ║ ЗАЛЕЖНОСТІ: Спільний Dialog, AnimatedGradient.
 * ║ ПУБЛІЧНИЙ API: showWelcomeDialog().
 * ║ ПРИНЦИП: Єдиний native Dialog; життєвий цикл градієнта прив’язано до відкриття.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { showDialog } from '../dialog/dialog.js';
import { createAnimatedGradient } from '../animated-gradient/animated-gradient.js';

export function showWelcomeDialog() {
  const content = document.createElement('div');
  content.className = 'pg-welcome-dialog';
  const gradient = createAnimatedGradient({ cycle: true });
  const brand = document.createElement('div');
  brand.className = 'pg-welcome-dialog__brand';
  brand.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.className = 'pg-welcome-dialog__name';
  name.textContent = 'pinguin';
  const version = document.createElement('span');
  version.className = 'pg-welcome-dialog__version';
  version.textContent = 'V6';
  brand.append(name, version);
  content.append(gradient.element, brand);
  function sync() {
    if (content.isConnected) gradient.mount();
  }
  document.addEventListener('pg:modal-change', sync);
  function cleanup() {
    document.removeEventListener('pg:modal-change', sync);
    gradient.destroy();
  }
  try {
    return showDialog({
      title: 'Pinguin V6',
      content,
      presentation: 'edge-to-edge',
      showClose: false,
      closeOnBackdrop: true,
    }).finally(cleanup);
  } catch (error) {
    cleanup();
    throw error;
  }
}
