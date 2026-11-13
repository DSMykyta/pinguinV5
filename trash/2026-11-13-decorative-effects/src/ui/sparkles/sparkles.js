/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SPARKLES                                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Декоративний шар дрібних CSS-іскор для будь-якої поверхні.           ║
 * ║ ЗАЛЕЖНОСТІ: Нативний DOM та sparkles.css, завантажений застосунком.               ║
 * ║ ПУБЛІЧНИЙ API: createSparkles({ visible }) → { element, getVisible, setVisible, destroy }. ║
 * ║ ПРИНЦИП: Один елемент, без JS-частинок, Canvas, таймерів і залежності від фону.   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

export function createSparkles({ visible = true } = {}) {
  if (typeof visible !== 'boolean') {
    throw new TypeError('Sparkles visible must be a boolean');
  }

  const element = document.createElement('span');
  element.className = 'pg-sparkles';
  element.setAttribute('aria-hidden', 'true');

  function setVisible(next) {
    if (typeof next !== 'boolean') {
      throw new TypeError('Sparkles visible must be a boolean');
    }
    element.hidden = !next;
  }

  setVisible(visible);

  return Object.freeze({
    element,
    getVisible: () => !element.hidden,
    setVisible,
    destroy() { element.remove(); },
  });
}
