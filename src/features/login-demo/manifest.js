/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LOGIN DEMO MANIFEST                                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Зареєстрована демонстраційна сторінка входу.                       ║
 * ║ ЗАЛЕЖНОСТІ: Page Registry та lazy import ./index.js.                            ║
 * ║ ПУБЛІЧНИЙ API: manifest.                                                   ║
 * ║ ПРИНЦИП: Наявний Shell, без реальної автентифікації.                         ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export const manifest = Object.freeze({
  id: 'login-demo',
  title: 'Демо входу',
  route: '/login-demo',
  type: 'tool',
  navigation: { icon: 'panel-right', order: 20 },
  // Keep the normal Shell, hide only irrelevant form-page actions.
  shellControls: { headerActions: false, quickActions: false },
  load: () => import('./index.js'),
});
