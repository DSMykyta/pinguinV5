/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                TABLE GENERATOR - DOM-ЕЛЕМЕНТИ (DOM)                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Централізоване кешування посилань на всі DOM-елементи, що використовуються
 * генератором. Це запобігає повторним викликам document.getElementById/querySelector
 * і робить код чистішим та трохи продуктивнішим.
 */

let domCache = null;

/**
 * Знаходить та кешує всі необхідні DOM-елементи.
 * @returns {object} - Об'єкт з посиланнями на елементи.
 */
export function getTableDOM() {
    if (domCache) {
        return domCache;
    }

    domCache = {
        // Головні контейнери та кнопки секції
        rowsContainer: document.getElementById('rows-container'),
        reloadBtn: document.getElementById('reload-section-tablet'),
        
        // Кнопки правої панелі
        addInputBtn: document.getElementById('add-input-btn'),
        addEmptyLineBtn: document.getElementById('add-empty-line-btn'),
        addIngredientsBtn: document.getElementById('add-ingredients-btn'),
        addWarningBtn: document.getElementById('add-warning-btn'),
        addCompositionBtn: document.getElementById('add-composition-btn'),
        addNutritionBtn: document.getElementById('add-nutrition-btn'),
        addVitaminsBtn: document.getElementById('add-vitamins-btn'),
        addAminosBtn: document.getElementById('add-aminos-btn'),

        // Картки результатів
        resultCardHtml: document.getElementById('result-card-html'),
        resultCardBr: document.getElementById('result-card-br'),

        // Елементи модального вікна "Магія"
        magicModal: document.getElementById('magic-modal'),
        magicApplyBtn: document.getElementById('magic-apply-btn'),
        magicText: document.getElementById('magic-text'),
    };

    return domCache;
}