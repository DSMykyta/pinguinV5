/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED FIELD GALLERY (TOOLS ONLY)                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Real independent controls with the same outlined floating label.                       ║
 * ║ ЗАЛЕЖНОСТІ: ../../ui/input/input, ../../ui/select/select, ../../ui/combobox/combobox,               ║
 * ║ ../../ui/tag-field/tag-field                                                                        ║
 * ║ ПУБЛІЧНИЙ API: createFieldDemo()                                                                    ║
 * ║ ПРИНЦИП: No feature data, persistence or Shell changes.                                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createInput } from '../../ui/input/input.js';
import { createSelect } from '../../ui/select/select.js';
import { createCombobox } from '../../ui/combobox/combobox.js';
import { createTagField } from '../../ui/tag-field/tag-field.js';

export function createFieldDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-field-demo';
  const title = document.createElement('h3');
  title.className = 'pg-tools-field-demo__title';
  title.textContent = 'Спільні поля';
  const hint = document.createElement('p');
  hint.className = 'pg-tools-field-demo__hint';
  hint.textContent = 'Спільні рамки й постійні підписи над полями для введення тексту, вибору та тегів.';
  const grid = document.createElement('div');
  grid.className = 'pg-tools-field-demo__grid';

  const unit = document.createElement('span');
  unit.className = 'pg-tools-field-demo__unit';
  unit.textContent = '₴';
  const suffix = document.createElement('span');
  suffix.className = 'pg-tools-field-demo__unit';
  suffix.textContent = 'за шт.';
  const help = document.createElement('button');
  help.type = 'button';
  help.className = 'pg-tools-field-demo__help pg-button pg-button--step';
  help.textContent = '?';
  help.setAttribute('aria-label', 'Пояснення одиниць');
  help.dataset.pgTooltip = 'Число та суфікс не змінюють положення підпису';
  help.setAttribute('data-pg-tooltip-always', '');

  const controls = [
    createInput({ label: 'Назва запису', name: 'demo-field-name' }),
    createSelect({
      label: 'Країна виробництва', name: 'demo-field-country',
      options: [{ value: 'ua', label: 'Україна' }, { value: 'pl', label: 'Польща' }, { value: 'de', label: 'Німеччина' }],
    }),
    createCombobox({
      label: 'Товар у каталозі', name: 'demo-field-product',
      placeholder: 'Почніть вводити назву…',
      options: [
        { value: 'whey', label: 'Сироватковий протеїн' },
        { value: 'creatine', label: 'Креатин моногідрат' },
        { value: 'vitamin', label: 'Вітамін B12' },
      ],
    }),
    createTagField({
      label: 'Альтернативні назви', name: 'demo-field-aliases',
      description: 'Enter додає значення. Backspace двічі видаляє останній тег.',
    }),
    createInput({
      label: 'Ціна товару', name: 'demo-field-price',
      inputMode: 'decimal', leading: unit, trailing: [suffix, help],
    }),
    createInput({
      label: 'Код виробника', name: 'demo-field-code',
      value: 'PG-123', clearable: true,
    }),
  ];
  controls.forEach(control => grid.append(control.element));
  element.append(title, hint, grid);
  return {
    element,
    destroy() {
      controls.forEach(control => control.destroy());
      element.remove();
    },
  };
}
