// js/generators/generator-ai-magic/aim-main.js

/*
 * AI Magic entry point.
 * The module owns only the AI generation surface. It does not depend on the
 * Instruments page generators, so the AI page can stay isolated.
 */

import { generateAiMagicContent } from '../../utils/utils-api-client.js';
import { showLoader } from '../../components/feedback/loading.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { getAiMagicDOM } from './aim-dom.js';
import { initAvatar, renderResult, setLoadingUI, setStatus } from './aim-renderer.js';
import { setLoading, setResult } from './aim-state.js';

export function initAiMagicPage(root = document.getElementById('ai-magic-surface')) {
    initSurface(root);
}

function initSurface(root) {
    const dom = getAiMagicDOM(root);
    if (!dom || dom.surface.dataset.aiMagicInit === 'true') return;

    dom.surface.dataset.aiMagicInit = 'true';
    initResultEditors(dom.surface);
    initAvatar(dom);
    setStatus(dom, 'Встав джерело і натисни "Заповнити".');

    dom.generateBtn?.addEventListener('click', () => handleGenerate(dom));
}

function initResultEditors(surface) {
    const editorIds = {
        descriptionUa: 'ai-magic-description-ua-editor',
        descriptionRu: 'ai-magic-description-ru-editor',
        compositionCodeUa: 'ai-magic-composition-code-ua-editor',
        compositionCodeRu: 'ai-magic-composition-code-ru-editor',
        servingNotesUa: 'ai-magic-serving-notes-ua-editor',
        servingNotesRu: 'ai-magic-serving-notes-ru-editor',
    };

    surface.aiMagicEditors = surface.aiMagicEditors || {};

    Object.entries(editorIds).forEach(([key, id]) => {
        if (surface.aiMagicEditors[key]) return;

        const container = surface.querySelector(`#${id}`);
        if (!container) return;

        container.innerHTML = '';
        surface.aiMagicEditors[key] = createHighlightEditor(container);
    });
}

async function handleGenerate(dom) {
    const input = dom.sourceInput?.value?.trim() || '';
    const sourceText = dom.sourceText?.value?.trim() || '';
    const rules = dom.rules?.value?.trim() || '';

    if (!input && !sourceText) {
        setStatus(dom, 'Потрібне посилання, назва або вставлений текст сторінки.', 'c-red');
        return;
    }

    setLoading(true);
    setLoadingUI(dom, true);
    setStatus(dom, 'Генерую структурований двомовний результат...', 'c-yellow');
    const loader = showLoader(dom.loaderContainer || dom.surface, {
        type: 'progress',
        message: 'Підготовка запиту до Google AI...',
    });
    loader?.updateProgress(20, 'Читаю джерело і правила...');

    try {
        loader?.updateProgress(45, 'Генерую текст, SEO, таблицю і фото...');
        const data = await generateAiMagicContent({ input, sourceText, rules });
        loader?.updateProgress(85, 'Розкладаю результат по полях...');
        setResult(data.result, data.meta);
        const hasResult = renderResult(dom.surface);

        if (!hasResult) {
            return;
        }

        if (data.meta?.fetchWarning) {
            setStatus(dom, `Готово, але джерело не вдалося повністю прочитати: ${data.meta.fetchWarning}`, 'c-yellow');
        }
        loader?.updateProgress(100, 'Готово!');
    } catch (error) {
        setResult(null, null);
        setStatus(dom, error.message || 'Не вдалося виконати AI-запит.', 'c-red');
    } finally {
        loader?.hide();
        setLoading(false);
        setLoadingUI(dom, false);
    }
}
