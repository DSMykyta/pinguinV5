// js/generators/generator-seo/gse-generators.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 SEO GENERATOR - CONTENT GENERATORS                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Генерація SEO-контенту: title, description, keywords.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - generateSeoTitle(brand, product, packaging) - Генерує SEO title
 * - generateSeoDescription(mainText) - Генерує SEO description
 * - generateSeoKeywords(brand, product, packaging, activeTulips) - Генерує keywords
 */

import { getTriggersData } from './gse-data.js';

/**
 * Генерує SEO заголовок
 * @param {string} brand - Назва бренду
 * @param {string} product - Назва продукту
 * @param {string} packaging - Упаковка
 * @returns {string} SEO title
 */
export function generateSeoTitle(brand, product, packaging) {
    return `Купить ${brand} ${product}${packaging ? ' ' + packaging : ''} в Украине. Низкие цены!`;
}

/**
 * Генерує SEO опис
 * @param {string} mainText - Основний текст
 * @returns {string} SEO description
 */
export function generateSeoDescription(mainText) {
    const text = (mainText || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    const firstSentence = text.match(/[^\.!\?]+[\.!\?]+/g)?.[0] || text;
    const phoneNumbers = ["(096)519-78-22", "(073)475-67-07", "(099)237-90-38"];
    const randomPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    return `${firstSentence} Для заказа звоните по номеру: ${randomPhone}`;
}

/**
 * Генерує SEO ключові слова
 * @param {string} brand - Назва бренду
 * @param {string} product - Назва продукту
 * @param {string} packaging - Упаковка
 * @param {Array<string>} activeTulips - Активні тригери
 * @returns {string} Список keywords через кому
 */
export function generateSeoKeywords(brand, product, packaging, activeTulips) {
    const triggersData = getTriggersData();
    let baseKeywords = [`купить ${brand} ${product}${packaging ? ' ' + packaging : ''}`, `${brand} ${product}`, brand, product].filter(Boolean);

    let triggerKeywords = [];
    activeTulips.forEach(title => {
        const trigger = triggersData.find(t => t.title === title);
        if (trigger) triggerKeywords.push(...trigger.keywords);
    });

    return [...new Set([...baseKeywords, ...triggerKeywords])].join(', ');
}
