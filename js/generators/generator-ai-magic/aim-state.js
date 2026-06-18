// js/generators/generator-ai-magic/aim-state.js

/**
 * AI Magic state.
 * Keeps the latest structured result isolated from page modules.
 */

export const state = {
    result: null,
    meta: null,
    loading: false,
};

export function setResult(result, meta = null) {
    state.result = result || null;
    state.meta = meta || null;
}

export function setLoading(loading) {
    state.loading = Boolean(loading);
}

export function resetState() {
    state.result = null;
    state.meta = null;
    state.loading = false;
}
