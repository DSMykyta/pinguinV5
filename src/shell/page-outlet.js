/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PAGE OUTLET                                                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Монтує сторінки та звільняє їхні ресурси.                                             ║
 * ║ ЗАЛЕЖНОСТІ: route-message, page.load(), callbacks Shell.                                                            ║
 * ║ ПУБЛІЧНИЙ API: createPageOutlet().                                                                 ║
 * ║ ПРИНЦИП: AbortSignal скасовує застарілу роботу.                                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createRouteMessage } from './route-message.js';

export function createPageOutlet({ content, pageName, sidebar, localNavigation, onNavigate, onRouteChange, onAsideContext, onSearchEntries, onSearchContext, onHeaderActions }) {
  let activePageCleanup = null;
  let activePageController = null;
  let pageRevision = 0;

  async function displayPage(page) {
    const revision = ++pageRevision;
    activePageController?.abort();
    activePageController = null;
    activePageCleanup?.();
    activePageCleanup = null;
    localNavigation.replaceChildren();

    onRouteChange();
    onAsideContext(null);

    sidebar.setActiveRoute(page?.route ?? null);
    content.scrollTop = 0;

    if (!page) {
      content.removeAttribute('data-pg-page-type');
      pageName.textContent = 'Не знайдено';
      document.title = 'Сторінку не знайдено · Pinguin';
      content.replaceChildren(createRouteMessage(
        'Сторінку не знайдено',
        'Перевірте адресу або поверніться до інструментів.',
        () => onNavigate('/tools'),
      ));
      return;
    }

    content.dataset.pgPageType = page.type;
    pageName.textContent = page.title;
    document.title = page.title + ' · Pinguin';
    content.replaceChildren();

    const controller = new AbortController();
    activePageController = controller;

    try {
      const pageModule = await page.load();
      if (revision !== pageRevision || controller.signal.aborted) return;
      if (typeof pageModule.mount !== 'function') {
        throw new TypeError('Page is missing mount(): ' + page.id);
      }
      const cleanup = pageModule.mount(content, {
        signal: controller.signal,
        localNavigation,
        setSearchEntries: entries => {
          if (revision === pageRevision && !controller.signal.aborted) onSearchEntries(entries);
        },
        setAsideContext: context => {
          if (revision === pageRevision && !controller.signal.aborted) onAsideContext(context);
        },
        setHeaderActions: element => {
          if (revision === pageRevision && !controller.signal.aborted) onHeaderActions?.(element);
        },
        setSearchContext: context => {
          if (revision === pageRevision && !controller.signal.aborted) onSearchContext?.(context);
        },
      });
      activePageCleanup = typeof cleanup === 'function' ? cleanup : null;
    } catch (error) {
      if (revision !== pageRevision || controller.signal.aborted) return;
      console.error('Page failed to load:', page.id, error);
      content.replaceChildren(createRouteMessage(
        'Не вдалося відкрити сторінку',
        'Спробуйте відкрити інструменти.',
        () => onNavigate('/tools'),
      ));
    }
  }

  function dispose() {
    pageRevision++;
    activePageController?.abort();
    activePageCleanup?.();
    activePageController = null;
    activePageCleanup = null;
    localNavigation.replaceChildren();
  }

  return Object.freeze({ displayPage, dispose });
}
