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
import { createToastDemo } from './toast-demo.js';
import { createDialogDemo } from './dialog-demo.js';
import { createInputDemo } from './input-demo.js';
import { createFieldDemo } from './field-demo.js';
import { createAdvancedFieldDemo } from './advanced-field-demo.js';
import { createSectionNavigatorDemo } from './section-navigator-demo.js';
import './toast-demo.css';
import './dialog-demo.css';
import './input-demo.css';
import './field-demo.css';
import './advanced-field-demo.css';

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
  {
    id: 'navigation',
    label: 'Переходи',
    icon: 'layers',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/ui/section-navigator.md',
    sourceLabel: 'Дослідження переходів',
  },
]);

export function mount(host, { setAsideContext, setSearchEntries, localNavigation }) {
  // Each tab owns a separate persistent workspace (not shared placeholder DOM).
  const tablePage = createPageView({ title: 'Таблиці' });
  tablePage.body.append(createToastDemo());
  const textPage = createPageView({ title: 'Текст' });
  const fieldDemo = createFieldDemo();
  const advancedDemo = createAdvancedFieldDemo();
  textPage.body.append(createDialogDemo(), createInputDemo(), fieldDemo.element, advancedDemo.element);
  const navigationPage = createPageView({ title: 'Переходи між блоками' });
  const navigationDemo = createSectionNavigatorDemo();
  navigationPage.body.append(navigationDemo.element);
  const pageByTab = new Map([
    ['tables', tablePage],
    ['text', textPage],
    ['navigation', navigationPage],
  ]);

  const tabs = createTabs({
    idPrefix: 'pg-tools',
    label: 'Інструменти',
    navHost: localNavigation,
    items: TABS.map(item => ({
      id: item.id,
      label: item.label,
      // Content and future editor state belong exclusively to this panel.
      content: pageByTab.get(item.id).element,
    })),
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

  setSearchEntries(TABS.map(item => ({
    id: 'tab:' + item.id,
    label: item.label,
    group: 'Інструменти',
    activate: () => tabs.activate(item.id),
  })));

  // Tabs control independent panels inside the approved Shell workspace.
  host.replaceChildren(tabs.element);

  return () => {
    navigationDemo.destroy();
    fieldDemo.destroy();
    advancedDemo.destroy();
    tabs.destroy();
    host.replaceChildren();
  };
}
