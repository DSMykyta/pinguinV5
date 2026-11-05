/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOOLS NAVIGATION TEST                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє вкладки «Таблиці» й «Текст» та контекст aside.                            ║
 * ║ ЗАЛЕЖНОСТІ: Спільні UI tabs; setAsideContext від Shell.                                           ║
 * ║ ПУБЛІЧНИЙ API: mount(host, context).                                                               ║
 * ║ ПРИНЦИП: Окремі вкладки й контекст; жодних макетів непрацюючих редакторів.                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createTabs } from '../../ui/tabs/tabs.js';

const TABS = Object.freeze([
  {
    id: 'tables',
    label: 'Таблиці',
    icon: 'table-2',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/tree/legacy/js/generators/generator-table',
    sourceLabel: 'Генератор у legacy',
  },
  {
    id: 'text',
    label: 'Текст',
    icon: 'file-text',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/tree/legacy/js/components/editor',
    sourceLabel: 'Редактор у legacy',
  },
]);

export function mount(host, { setAsideContext, localNavigation }) {
  const content = document.createElement('div');
  content.className = 'pg-tools';

  const tabs = createTabs({
    idPrefix: 'pg-tools',
    label: 'Інструменти',
    navHost: localNavigation,
    items: TABS.map(item => {
      const heading = document.createElement('h2');
      heading.className = 'pg-tabs__panel-title';
      heading.textContent = item.label;
      return { ...item, content: heading };
    }),
    onChange(id) {
      const item = TABS.find(tab => tab.id === id);
      setAsideContext({
        title: item.label,
        links: [
          { label: item.sourceLabel, url: item.sourceUrl, icon: 'code' },
          { label: 'Правила компонентів',
            url: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/conventions.md',
            icon: 'file-text' },
        ],
      });
    },
  });

  content.append(tabs.element);
  host.replaceChildren(content);

  return () => {
    tabs.destroy();
    host.replaceChildren();
  };
}
