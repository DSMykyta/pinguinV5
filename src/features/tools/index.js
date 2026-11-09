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
import { createRichTextEditorDemo } from './rich-text-editor-demo.js';
import { createDialogDemo } from './dialog-demo.js';
import { createInputDemo } from './input-demo.js';
import { createFieldDemo } from './field-demo.js';
import { createAdvancedFieldDemo } from './advanced-field-demo.js';
import { createListboxDemo } from './listbox-demo.js';
import { createMenuDemo } from './menu-demo.js';
import { createImageFieldDemo } from './image-field-demo.js';
import { createDataViewsDemo } from './data-views-demo.js';
import { createSectionNavigatorDemo } from './section-navigator-demo.js';
import './toast-demo.css';
import './rich-text-editor-demo.css';
import './dialog-demo.css';
import './input-demo.css';
import './field-demo.css';
import './advanced-field-demo.css';
import './listbox-demo.css';
import './menu-demo.css';
import './image-field-demo.css';
import './data-views-demo.css';

const TABS = Object.freeze([
  {
    id: 'tables',
    label: 'Таблиці',
    icon: 'table-2',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/tree/legacy/js/generators/generator-table',
    sourceLabel: 'Генератор у legacy',
  },
  {
    id: 'data-views',
    label: 'Макети даних',
    icon: 'layout-grid',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/ui/collection-view.md',
    sourceLabel: 'Специфікація таблиць і плиток',
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

export function mount(host, { setAsideContext, setSearchEntries, setHeaderActions, setWorkspaceLayout, localNavigation }) {
  // Each tab owns a separate persistent workspace (not shared placeholder DOM).
  const tablePage = createPageView({ title: 'Таблиці' });
  tablePage.body.append(createToastDemo());
  // The table itself is the page surface; there is no duplicate title or card.
  const dataViewsDemo = createDataViewsDemo();
  const textPage = createPageView({ title: 'Текст' });
  const richTextEditorDemo = createRichTextEditorDemo();
  const fieldDemo = createFieldDemo();
  const advancedDemo = createAdvancedFieldDemo();
  const listboxDemo = createListboxDemo();
  const menuDemo = createMenuDemo();
  const imageDemo = createImageFieldDemo();
  textPage.body.append(richTextEditorDemo.element, createDialogDemo(), createInputDemo(), fieldDemo.element, advancedDemo.element, listboxDemo.element, menuDemo.element, imageDemo.element);
  const navigationPage = createPageView({ title: 'Переходи між блоками' });
  const navigationDemo = createSectionNavigatorDemo();
  navigationPage.body.append(navigationDemo.element);
  const pageByTab = new Map([
    ['tables', tablePage],
    ['data-views', dataViewsDemo.element],
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
      content: pageByTab.get(item.id) instanceof HTMLElement
        ? pageByTab.get(item.id) : pageByTab.get(item.id).element,
      fill: item.id === 'data-views',
    })),
    onChange(id) {
      setHeaderActions(id === 'data-views' ? dataViewsDemo.headerActions : null);
      setWorkspaceLayout(id === 'data-views' ? 'flush' : 'default');
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
    setHeaderActions(null);
    setWorkspaceLayout('default');
    dataViewsDemo.destroy();
    richTextEditorDemo.destroy();
    navigationDemo.destroy();
    fieldDemo.destroy();
    advancedDemo.destroy();
    listboxDemo.destroy();
    menuDemo.destroy();
    imageDemo.destroy();
    tabs.destroy();
    host.replaceChildren();
  };
}
