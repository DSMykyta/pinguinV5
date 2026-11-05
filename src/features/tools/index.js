/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOOLS NAVIGATION TEST                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє вкладки «Таблиці» й «Текст» та контекст aside.                            ║
 * ║ ЗАЛЕЖНОСТІ: UI page, UI tabs, контекстні callbacks від Shell.                                           ║
 * ║ ПУБЛІЧНИЙ API: mount(host, context).                                                               ║
 * ║ ПРИНЦИП: Окремі вкладки й контекст; жодних макетів непрацюючих редакторів.                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createTabs } from '../../ui/tabs/tabs.js';
import { createPageView } from '../../ui/page/page.js';

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

export function mount(host, { setAsideContext, setPageSection, setSearchEntries, localNavigation }) {
  const page = createPageView({ title: TABS[0].label });

  const tabs = createTabs({
    idPrefix: 'pg-tools',
    label: 'Інструменти',
    navHost: localNavigation,
    items: TABS.map(item => ({
      ...item,
      // Each editor supplies content without owning the shared page heading.
      content: document.createElement('div'),
    })),
    onChange(id) {
      const item = TABS.find(tab => tab.id === id);
      page.setTitle(item.label);
      setPageSection(item.label);
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

  setSearchEntries(TABS.map(item => ({
    id: 'tab:' + item.id,
    label: item.label,
    group: 'Інструменти',
    activate: () => tabs.activate(item.id),
  })));

  page.body.append(tabs.element);
  host.replaceChildren(page.element);

  return () => {
    tabs.destroy();
    host.replaceChildren();
  };
}
