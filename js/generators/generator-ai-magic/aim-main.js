// js/generators/generator-ai-magic/aim-main.js

/*
 * AI Magic entry point for the Instruments page.
 * The module owns only the AI modal and delegates existing page behavior to
 * existing generators: SEO counters, highlight editor, and table magic parser.
 */

import { generateAiMagicContent } from '../../utils/utils-api-client.js';
import { closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { getModalDOM, getSelectedLanguage } from './aim-dom.js';
import { applyAll, applySeo, applyTable, applyText } from './aim-apply.js';
import { initAvatar, renderResult, setLoadingUI, setStatus } from './aim-renderer.js';
import { setLoading, setResult } from './aim-state.js';

let initialized = false;

export function initAiMagic() {
    if (initialized) return;
    initialized = true;

    document.addEventListener('modal-opened', (event) => {
        if (event.detail?.modalId !== 'ai-magic-modal') return;
        initModal(event.detail.modalElement);
    });
}

function initModal(modal) {
    const dom = getModalDOM(modal);
    if (!dom || dom.modal.dataset.aiMagicInit === 'true') return;

    dom.modal.dataset.aiMagicInit = 'true';
    initAvatar(dom);
    setStatus(dom, 'Встав джерело і натисни "Заповнити".');

    dom.generateBtn?.addEventListener('click', () => handleGenerate(dom));
    dom.applySeoBtn?.addEventListener('click', () => handleApply(dom, 'seo'));
    dom.applyTextBtn?.addEventListener('click', () => handleApply(dom, 'text'));
    dom.applyTableBtn?.addEventListener('click', () => handleApply(dom, 'table'));
    dom.applyAllBtn?.addEventListener('click', () => handleApply(dom, 'all'));
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

    try {
        const data = await generateAiMagicContent({ input, sourceText, rules });
        setResult(data.result, data.meta);
        const hasResult = renderResult(dom.modal);

        if (!hasResult) {
            return;
        }

        if (data.meta?.fetchWarning) {
            setStatus(dom, `Готово, але джерело не вдалося повністю прочитати: ${data.meta.fetchWarning}`, 'c-yellow');
        }
    } catch (error) {
        setResult(null, null);
        setStatus(dom, error.message || 'Не вдалося виконати AI-запит.', 'c-red');
    } finally {
        setLoading(false);
        setLoadingUI(dom, false);
    }
}

async function handleApply(dom, target) {
    const lang = getSelectedLanguage(dom.modal);
    let applied = 0;

    if (target === 'seo') applied = await applySeo(dom.modal, lang);
    if (target === 'text') applied = applyText(dom.modal, lang);
    if (target === 'table') applied = await applyTable(dom.modal, lang);
    if (target === 'all') applied = await applyAll(dom.modal, lang);

    if (!applied) {
        setStatus(dom, 'Немає непорожніх AI-полів для застосування. Спробуй точнішу назву або встав HTML/текст сторінки.', 'c-yellow');
        return;
    }

    const message = `Застосовано AI Magic: ${applied} пол.`;
    setStatus(dom, message, 'c-green');
    showToast(message, 'success', 3500);

    if (target === 'all') {
        closeModal('ai-magic-modal');
    }
}

initAiMagic();
