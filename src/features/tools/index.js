/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOOLS NAVIGATION TEST                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє вкладки «Таблиці», «Елементи», «Тексти» та контекст aside.                            ║
 * ║ ЗАЛЕЖНОСТІ: UI page, UI tabs, контекстні callbacks від Shell.                                           ║
 * ║ ПУБЛІЧНИЙ API: mount(host, context).                                                               ║
 * ║ ПРИНЦИП: Окремі вкладки й контекст; жодних макетів непрацюючих редакторів.                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createTabs } from '../../ui/tabs/tabs.js';
import { createPageView } from '../../ui/page/page.js';
import { createToastDemo } from './toast-demo.js';
import { createWaveProgressDemo } from './wave-progress-demo.js';
import { createThinkingProgressDemo } from './thinking-progress-demo.js';
import { createRichTextEditorDemo } from './rich-text-editor-demo.js';
import { createDialogDemo } from './dialog-demo.js';
import { createInputDemo } from './input-demo.js';
import { createFieldDemo } from './field-demo.js';
import { createAdvancedFieldDemo } from './advanced-field-demo.js';
import { createListboxDemo } from './listbox-demo.js';
import { createMenuDemo } from './menu-demo.js';
import { createButtonDemo } from './button-demo.js';
import { createImageFieldDemo } from './image-field-demo.js';
import { createDataViewsDemo } from './data-views-demo.js';
import { createMediaLibraryDemo } from './media-library-demo.js';
import { createSectionNavigatorDemo } from './section-navigator-demo.js';
import './toast-demo.css';
import './wave-progress-demo.css';
import './thinking-progress-demo.css';
import './rich-text-editor-demo.css';
import './dialog-demo.css';
import './input-demo.css';
import './field-demo.css';
import './advanced-field-demo.css';
import './listbox-demo.css';
import './menu-demo.css';
import './button-demo.css';
import './image-field-demo.css';
import './data-views-demo.css';
import './media-library-demo.css';

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
    id: 'media-library',
    label: 'Медіатека',
    icon: 'layout-grid',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/ui/collection-view.md',
    sourceLabel: 'Незалежні колекції',
  },
  {
    id: 'elements',
    label: 'Елементи',
    icon: 'layout-grid',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/ui/overview.md',
    sourceLabel: 'Спільні UI-компоненти',
  },
  {
    id: 'texts',
    label: 'Тексти',
    icon: 'file-text',
    scroll: 'contained',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/ui/rich-text-editor.md',
    sourceLabel: 'Текстовий редактор',
  },
  {
    id: 'navigation',
    label: 'Переходи',
    icon: 'layers',
    sourceUrl: 'https://github.com/DSMykyta/pinguinV5/blob/work/docs/ui/section-navigator.md',
    sourceLabel: 'Дослідження переходів',
  },
]);

export function mount(host, { setAsideContext, setSearchEntries, setSearchContext, setHeaderActions, setFooterContent, setPageFabContext, localNavigation }) {
  // Each tab owns a separate persistent workspace (not shared placeholder DOM).
  const tablePage = createPageView({ title: 'Таблиці' });
  const waveProgressDemo = createWaveProgressDemo();
  const thinkingProgressDemo = createThinkingProgressDemo();
  tablePage.body.append(createToastDemo(), waveProgressDemo.element,
    thinkingProgressDemo.element);
  // The table itself is the page surface; there is no duplicate title or card.
  const dataViewsDemo = createDataViewsDemo();
  const mediaLibraryDemo = createMediaLibraryDemo();
  // Separate collections own their own rows, selection sets, pagination and tiles.
  const collections = new Map([
    ['data-views', dataViewsDemo],
    ['media-library', mediaLibraryDemo],
  ]);
  const elementsPage = createPageView({ title: 'Елементи' });
  const richTextEditorDemo = createRichTextEditorDemo();
  const fieldDemo = createFieldDemo();
  const advancedDemo = createAdvancedFieldDemo();
  const listboxDemo = createListboxDemo();
  const menuDemo = createMenuDemo();
  const buttonDemo = createButtonDemo();
  const imageDemo = createImageFieldDemo();
  elementsPage.body.append(createDialogDemo(), createInputDemo(), fieldDemo.element, advancedDemo.element, listboxDemo.element, buttonDemo.element, menuDemo.element, imageDemo.element);
  const navigationDemo = createSectionNavigatorDemo();
  const pageByTab = new Map([
    ['tables', tablePage],
    ['data-views', dataViewsDemo.element],
    ['media-library', mediaLibraryDemo.element],
    ['elements', elementsPage],
    ['texts', richTextEditorDemo.element],
    ['navigation', navigationDemo.element],
  ]);

  const tabs = createTabs({
    idPrefix: 'pg-tools',
    label: 'Інструменти',
    navHost: localNavigation,
    items: TABS.map(item => ({
      id: item.id,
      label: item.label,
      scroll: item.scroll,
      // Content and future editor state belong exclusively to this panel.
      content: pageByTab.get(item.id) instanceof HTMLElement
        ? pageByTab.get(item.id) : pageByTab.get(item.id).element,
    })),
    onChange(id) {
      const collection = collections.get(id);
      setHeaderActions(collection?.headerActions ?? null);
      setFooterContent(collection?.footerContent ?? null);
      setPageFabContext(collection?.getPageFabContext() ?? null);
      setSearchContext(collection?.getSearchContext() ?? false);
      if (collection) {
        setAsideContext(collection.getAsideContext());
        return;
      }
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
  // One native page scrollbar; no scrollable card nested inside the workspace.
  navigationDemo.setScrollContainer(tabs.element.querySelector('#pg-tools-panel-navigation'));


  return () => {
    setHeaderActions(null);
    setFooterContent(null);
    setPageFabContext(null);
    setSearchContext(null);
    waveProgressDemo.destroy();
    thinkingProgressDemo.destroy();
    dataViewsDemo.destroy();
    mediaLibraryDemo.destroy();
    richTextEditorDemo.destroy();
    navigationDemo.destroy();
    fieldDemo.destroy();
    advancedDemo.destroy();
    listboxDemo.destroy();
    menuDemo.destroy();
    buttonDemo.destroy();
    imageDemo.destroy();
    tabs.destroy();
    host.replaceChildren();
  };
}
