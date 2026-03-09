// js/generators/generator-table/gt-dom.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║               TABLE GENERATOR — DOM-ЕЛЕМЕНТИ (DOM)                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Кешування посилань на DOM-елементи генератора таблиць        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
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
        // Головний контейнер секції
        rowsContainer: document.getElementById('rows-container'),

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

/**
 * Перемикає rowsContainer на інший елемент (для wizard-режиму).
 * @param {HTMLElement} container - Новий контейнер рядків.
 */
export function setRowsContainer(container) {
    getTableDOM(); // Переконатись що кеш створений
    domCache.rowsContainer = container;
}

/**
 * Повертає rowsContainer до стандартного #rows-container.
 */
export function resetRowsContainer() {
    if (domCache) {
        domCache.rowsContainer = document.getElementById('rows-container');
    }
}

/**
 * Скидає кеш DOM-елементів (для re-init в іншому контексті).
 */
export function resetDomCache() {
    domCache = null;
}