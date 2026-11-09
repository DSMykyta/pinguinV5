/**
 * PINGUIN NEXT — SECTION NAVIGATOR DEMO
 * ПРИЗНАЧЕННЯ: Ізольований приклад переходів між блоками.
 * ЗАЛЕЖНОСТІ: Універсальні Section navigator та Input.
 * ПУБЛІЧНИЙ API: createSectionNavigatorDemo() → { element, destroy }.
 * ПРИНЦИП: Приклад контенту без залежностей між секціями.
 */
import { createSectionNavigator } from '../../ui/section-navigator/section-navigator.js';
import { createInput } from '../../ui/input/input.js';
import '../../ui/section-navigator/section-navigator.css';
import './section-navigator-demo.css';

export function createSectionNavigatorDemo() {
  function createNode(tag, part, text) {
    const node = document.createElement(tag);
    node.className = 'pg-tools-section-navigator-demo' + (part ? '__' + part : '');
    if (text) node.textContent = text;
    return node;
  }
  const element = createNode('section');
  const main = createNode('div', 'fields');
  const fields = [
    ['Назва', 'Товар для прикладу'], ['Бренд', 'Pinguin'], ['Артикул', 'PG-001'],
    ['Штрихкод', '4820000000000'], ['Країна', 'Україна'], ['Лінійка', 'Основна'],
  ].map(([label, value]) => createInput({ label, value }));
  for (const field of fields) main.append(field.element);
  main.append(createNode('p', 'note', 'Змініть будь-яке поле й поверніться сюди після перегляду фото — значення збережеться в цьому прикладі.'));

  const photos = createNode('div', 'photos');
  const photo = createNode('div', 'photo');
  photo.setAttribute('role', 'img');
  photo.setAttribute('aria-label', 'Приклад місця для фотографії товару');
  photo.append(createNode('span', 'photo-symbol', '01'), createNode('span', 'note', 'Головне фото'));
  photos.append(photo, createNode('p', 'note', 'Короткий блок. Звідси можна одразу перейти до опису або повернутися до основних даних.'));

  const description = createNode('div', 'description');
  description.append(createNode('p', 'note', 'Це окремий блок опису. Він може містити будь-який редактор, таблицю або форму.'));
  const note = createInput({ label: 'Примітка', value: '', description: 'Власне поле незалежної секції.' });
  description.append(note.element);
  const navigator = createSectionNavigator({
    label: 'Приклад блоків товару',
    items: [
      { id: 'main', label: 'Основне', content: main },
      { id: 'photos', label: 'Фото', content: photos },
      { id: 'description', label: 'Опис', content: description },
    ],
  });
  element.append(navigator.element);
  return {
    element,
    setScrollContainer: navigator.setScrollContainer,
    destroy() {
      navigator.destroy();
      for (const field of [...fields, note]) field.destroy();
      element.remove();
    },
  };
}
