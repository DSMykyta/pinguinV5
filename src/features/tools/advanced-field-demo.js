/**
 * PINGUIN NEXT — ADVANCED FIELD GALLERY
 * Isolated functional controls; no persistence and no Shell dependencies.
 */
import { createTextarea } from '../../ui/textarea/textarea.js';
import { createNumberField } from '../../ui/number-field/number-field.js';
import { createCheckbox } from '../../ui/checkbox/checkbox.js';
import { createSwitch } from '../../ui/switch/switch.js';
import { createRadioGroup } from '../../ui/radio-group/radio-group.js';

export function createAdvancedFieldDemo() {
  const element = document.createElement('section');
  element.className = 'pg-tools-advanced-fields';
  const heading = document.createElement('h3');
  heading.className = 'pg-tools-advanced-fields__heading';
  heading.textContent = 'Складні поля та вибір';
  const hint = document.createElement('p');
  hint.className = 'pg-tools-advanced-fields__hint';
  hint.textContent = 'Багаторядковий текст, числовий крок та незалежні перемикачі. Це справжні керовані елементи.';
  const grid = document.createElement('div');
  grid.className = 'pg-tools-advanced-fields__grid';
  const controls = [
    createTextarea({
      label: 'Примітка до товару', name: 'demo-notes',
      placeholder: 'Текст довільної довжини…', description: 'Поле розширюється до восьми рядків.',
      minRows: 3, maxRows: 8, showCount: true, maxLength: 500,
    }),
    createNumberField({
      label: 'Маса порції', name: 'demo-portion-grams',
      value: 30, min: 0, max: 500, step: 0.5, unit: 'г',
      description: 'Крок 0,5 г; працює введення з клавіатури.',
    }),
    createCheckbox({
      label: 'Враховувати в описі', name: 'demo-use-description',
      checked: true, description: 'Звичайний прапорець із нативною семантикою.',
    }),
    createSwitch({
      label: 'Автоматичний режим', name: 'demo-auto-mode',
      description: 'Увімкнено або вимкнено; без додаткових налаштувань.',
    }),
    createRadioGroup({
      label: 'Спосіб експорту', name: 'demo-export-mode',
      value: 'html',
      options: [
        { label: 'HTML-таблиця', value: 'html' },
        { label: 'HTML із переносами', value: 'br' },
      ],
    }),
  ];
  controls.forEach(control => grid.append(control.element));
  element.append(heading, hint, grid);
  return {
    element,
    destroy() {
      controls.forEach(control => control.destroy());
      element.remove();
    },
  };
}
