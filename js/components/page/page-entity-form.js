// js/components/page/page-entity-form.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE ENTITY FORM — Автоматичний обробник форми        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Створює fillForm, clearForm, getFormData з декларативного     ║
 * ║  маппінгу полів. Замінює ручний fill/clear/getFormData.                 ║
 * ║                                                                          ║
 * ║  🎯 Використання:                                                        ║
 * ║  Викликається автоматично з page-entity-crud.js.                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Створити автоматичний обробник форми
 *
 * @param {Array<Object>} fields — Маппінг полів
 * @param {string} fields[].domId — ID DOM-елемента
 * @param {string} fields[].field — Назва поля сутності
 * @param {string} [fields[].type='input'] — 'input' | 'select' | 'radio' | 'editor' | 'readonly'
 * @param {string} [fields[].default=''] — Значення за замовчуванням
 * @param {boolean} [fields[].readonly=false] — Виключити з getFormData
 * @returns {{ fillForm, clearForm, getFormData, setEditor, getEditor, destroyEditors }}
 */
export function createFormHandler(fields) {
    const editors = {};

    function setEditor(domId, editorInstance) {
        editors[domId] = editorInstance;
    }

    function getEditor(domId) {
        return editors[domId] || null;
    }

    function destroyEditors() {
        for (const [domId, editor] of Object.entries(editors)) {
            if (editor && typeof editor.destroy === 'function') {
                editor.destroy();
            }
            editors[domId] = null;
        }
    }

    function fillForm(entity) {
        for (const f of fields) {
            const value = entity[f.field];

            switch (f.type) {
                case 'editor': {
                    const editor = editors[f.domId];
                    if (editor) editor.setValue(value || '');
                    break;
                }
                case 'radio': {
                    const radio = document.querySelector(
                        `input[name="${f.domId}"][value="${value || f.default || ''}"]`
                    );
                    if (radio) radio.checked = true;
                    break;
                }
                case 'select':
                default: {
                    const el = document.getElementById(f.domId);
                    if (el) el.value = value ?? f.default ?? '';
                    break;
                }
            }
        }
    }

    function clearForm() {
        for (const f of fields) {
            const defaultVal = f.default ?? '';

            switch (f.type) {
                case 'editor': {
                    const editor = editors[f.domId];
                    if (editor) editor.setValue('');
                    break;
                }
                case 'radio': {
                    const radio = document.querySelector(
                        `input[name="${f.domId}"][value="${defaultVal}"]`
                    );
                    if (radio) radio.checked = true;
                    break;
                }
                case 'select':
                default: {
                    const el = document.getElementById(f.domId);
                    if (el) el.value = defaultVal;
                    break;
                }
            }
        }
    }

    function getFormData() {
        const result = {};

        for (const f of fields) {
            if (f.readonly) continue;

            switch (f.type) {
                case 'editor': {
                    const editor = editors[f.domId];
                    result[f.field] = editor ? editor.getValue() : '';
                    break;
                }
                case 'radio': {
                    const checked = document.querySelector(`input[name="${f.domId}"]:checked`);
                    result[f.field] = checked?.value || f.default || '';
                    break;
                }
                case 'select':
                default: {
                    const el = document.getElementById(f.domId);
                    result[f.field] = el?.value.trim() || '';
                    break;
                }
            }
        }

        return result;
    }

    return { fillForm, clearForm, getFormData, setEditor, getEditor, destroyEditors };
}
