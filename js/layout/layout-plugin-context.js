// js/layout/layout-plugin-context.js

/**
 * LAYOUT CONTEXT
 *
 * Defines the single active page context for layout-v2. A context is either
 * the visible section, the active tab content, or the page main element.
 * Other layout plugins consume `layout:context-changed` instead of running
 * competing observers.
 */

const ACTIVE_CLASS = 'layout-context-active';
const READY_CLASS = 'layout-context-ready';
const MODE_CLASSES = ['layout-sections', 'layout-tabs', 'layout-single'];

let contentMain = null;
let currentContext = null;
let sectionObserver = null;
let childObserver = null;
let refreshQueued = false;
const observedSections = new Set();

function getDirectSections() {
    if (!contentMain) return [];
    return Array.from(contentMain.querySelectorAll(':scope > section'));
}

function getAsideTemplate(context) {
    const owner = context?.closest?.('[data-aside-template]');
    return owner?.dataset.asideTemplate || null;
}

function setMode(mode) {
    MODE_CLASSES.forEach(className => document.body.classList.remove(className));
    document.body.classList.add(`layout-${mode}`);
}

function activateContext(context) {
    if (!context || context === currentContext) return;

    currentContext?.classList.remove(ACTIVE_CLASS);
    currentContext = context;
    currentContext.classList.add(ACTIVE_CLASS);
    document.body.classList.add(READY_CLASS);

    document.dispatchEvent(new CustomEvent('layout:context-changed', {
        detail: {
            context,
            contextId: context.id || context.dataset.tabContent || null,
            asideTemplate: getAsideTemplate(context),
        },
    }));
}

function chooseVisibleSection(entries) {
    const visible = entries.filter(entry => entry.isIntersecting);
    if (!visible.length || !contentMain) return null;

    const rootTop = contentMain.getBoundingClientRect().top;
    const targetTop = rootTop + contentMain.clientHeight * 0.2;

    visible.sort((a, b) => (
        Math.abs(a.boundingClientRect.top - targetTop)
        - Math.abs(b.boundingClientRect.top - targetTop)
    ));

    return visible[0].target;
}

function ensureSectionObserver() {
    if (sectionObserver || !contentMain) return;

    sectionObserver = new IntersectionObserver(entries => {
        const section = chooseVisibleSection(entries);
        if (section) activateContext(section);
    }, {
        root: contentMain,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
    });
}

function refreshSections() {
    refreshQueued = false;
    if (!contentMain) return;

    const sections = getDirectSections();
    const sectionSet = new Set(sections);

    observedSections.forEach(section => {
        if (sectionSet.has(section)) return;
        sectionObserver?.unobserve(section);
        observedSections.delete(section);
    });

    if (!sections.length) {
        setMode('single');
        activateContext(contentMain);
        return;
    }

    setMode('sections');
    ensureSectionObserver();

    sections.forEach(section => {
        if (observedSections.has(section)) return;
        observedSections.add(section);
        sectionObserver.observe(section);
    });

    if (!currentContext || !sectionSet.has(currentContext)) {
        activateContext(sections[0]);
    }
}

function scheduleSectionRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(refreshSections);
}

function handleTabSwitch(event) {
    if (!contentMain?.contains(event.target)) return;

    const tabId = event.detail?.tabId;
    const tabContent = Array.from(contentMain.querySelectorAll('[data-tab-content]'))
        .find(element => element.dataset.tabContent === tabId);

    if (tabContent) activateContext(tabContent);
}

export function init() {
    if (!document.body.classList.contains('layout-v2')) return;

    contentMain = document.getElementById('content-main');
    if (!contentMain) return;

    document.addEventListener('tab-switched', handleTabSwitch);

    const tabContents = contentMain.querySelectorAll('[data-tab-content]');
    if (contentMain.classList.contains('tabbed-page') || tabContents.length) {
        setMode('tabs');
        activateContext(contentMain.querySelector('[data-tab-content].active') || tabContents[0] || contentMain);
        return;
    }

    childObserver = new MutationObserver(scheduleSectionRefresh);
    childObserver.observe(contentMain, { childList: true });
    refreshSections();
}
