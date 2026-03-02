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
 * - generateSeoTitle(brand, product, packaging, lang) - Генерує SEO title
 * - generateSeoDescription(mainText, lang) - Генерує SEO description
 * - generateSeoKeywords(brand, product, packaging, activeTulips, lang) - Генерує keywords
 */

import { getTriggersData } from './gse-data.js';

/**
 * Генерує SEO заголовок
 * @param {string} brand - Назва бренду
 * @param {string} product - Назва продукту
 * @param {string} packaging - Упаковка
 * @param {'ru'|'ua'} lang - Мова
 * @returns {string} SEO title
 */
export function generateSeoTitle(brand, product, packaging, lang = 'ru') {
    const buy = lang === 'ua' ? 'Купити' : 'Купить';
    const country = lang === 'ua' ? 'в Україні' : 'в Украине';
    const prices = lang === 'ua' ? 'Низькі ціни!' : 'Низкие цены!';
    return `${buy} ${brand} ${product}${packaging ? ' ' + packaging : ''} ${country}. ${prices}`;
}

/**
 * Генерує SEO опис
 * @param {string} mainText - Основний текст
 * @param {'ru'|'ua'} lang - Мова
 * @returns {string} SEO description
 */
export function generateSeoDescription(mainText, lang = 'ru') {
    const text = (mainText || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    const firstSentence = text.match(/[^\.!\?]+[\.!\?]+/g)?.[0] || text;
    const phoneNumbers = ["(096)519-78-22", "(073)475-67-07", "(099)237-90-38"];
    const randomPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    const cta = lang === 'ua'
        ? `Для замовлення телефонуйте: ${randomPhone}`
        : `Для заказа звоните по номеру: ${randomPhone}`;
    return `${firstSentence} ${cta}`;
}

/**
 * Генерує SEO ключові слова
 * @param {string} brand - Назва бренду
 * @param {string} product - Назва продукту
 * @param {string} packaging - Упаковка
 * @param {Array<string>} activeTulips - Активні тригери
 * @param {'ru'|'ua'} lang - Мова
 * @returns {string} Список keywords через кому
 */
export function generateSeoKeywords(brand, product, packaging, activeTulips, lang = 'ru') {
    const triggersData = getTriggersData();
    const buy = lang === 'ua' ? 'купити' : 'купить';
    let baseKeywords = [`${buy} ${brand} ${product}${packaging ? ' ' + packaging : ''}`, `${brand} ${product}`, brand, product].filter(Boolean);

    let triggerKeywords = [];
    const kwField = lang === 'ua' ? 'keywords_ua' : 'keywords';
    activeTulips.forEach(title => {
        const trigger = triggersData.find(t => t.title === title);
        if (trigger && trigger[kwField]?.length) triggerKeywords.push(...trigger[kwField]);
    });

    return [...new Set([...baseKeywords, ...triggerKeywords])].join(', ');
}
