// js/engine/entity-form.js

/**
 * ENTITY FORM — Automatic form handler
 *
 * Creates fillForm, clearForm, getFormData from a declarative field mapping.
 * Replaces manual fill/clear/getFormData in every *-crud.js file.
 */

/**
 * Create an automatic form handler
 *
 * @param {Array<Object>} fields - Field mapping
 * @param {string} fields[].domId - DOM element ID
 * @param {string} fields[].field - Entity field name
 * @param {string} [fields[].type='input'] - 'input' | 'select' | 'radio' | 'editor' | 'readonly'
 * @param {string} [fields[].default=''] - Default value for clear
 * @param {boolean} [fields[].readonly=false] - Exclude from getFormData
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
