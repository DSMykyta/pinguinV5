// js/pages/redirect-target/redirect-target-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — STATE                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Єдине джерело правди та шина подій сторінки                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function createRedirectTargetState() {
    const hooks = {};
    const filters = {};

    return {
        // Дані сторінки
        data: [],
        
        // Кешовані DOM-елементи (згідно шаблону HTML)
        dom: {
            container: document.getElementById('tab-redirect-target'),
            tableContainer: document.getElementById('redirect-target-table-container'),
            btnAdd: document.getElementById('btn-add-redirect-target'),
        },

        // Шина подій
        registerHook(name, fn, opts = {}) {
            (hooks[name] ??= []).push({ fn, plugin: opts.plugin ?? '?' });
        },
        
        runHook(name, ...args) {
            hooks[name]?.forEach(({ fn, plugin }) => {
                try { 
                    fn(...args); 
                } catch (e) { 
                    console.error(`[${name}/${plugin}]`, e); 
                }
            });
        },

        // Трансформація даних
        registerFilter(name, fn) { 
            (filters[name] ??= []).push(fn); 
        },
        
        applyFilter(name, value, ...args) {
            return (filters[name] ?? []).reduce((v, fn) => fn(v, ...args), value);
        }
    };
}