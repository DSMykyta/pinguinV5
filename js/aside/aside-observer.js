// js/aside/aside-observer.js

/**
 * ASIDE: Observer
 *
 * IntersectionObserver що слідкує за секціями з data-aside-template.
 * При скролі до секції:
 * - перемикає шаблон в aside-body + aside-fab
 * - встановлює стан aside (expanded / collapsed / closed)
 *
 * Атрибути секцій:
 * - data-aside-template="aside-table"  — назва шаблону
 * - data-aside-state="expanded"        — стан aside для цієї секції (default: expanded)
 *
 * Absent секції:
 * - data-aside-template=""  або без значення — aside закривається (closed)
 */

import { setAsideState } from './aside-state.js';
import { showAsidePanel } from './aside-loader.js';

export function initAsideObserver() {
    const sections = document.querySelectorAll('[data-aside-template]');
    if (!sections.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const templateName = entry.target.dataset.asideTemplate;

            // Тільки міняємо контент, стан aside не чіпаємо —
            // користувач сам керує expanded/collapsed/closed
            showAsidePanel(templateName || null);
        });
    }, {
        root: document.querySelector('.content-main'),
        threshold: 0.1
    });

    sections.forEach(s => observer.observe(s));
}
