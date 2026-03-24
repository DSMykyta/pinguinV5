// js/generators/generator-seo/gse-generators-v2.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              SEO GENERATOR V2 - CONTENT GENERATORS                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * V2: Якісне SEO замість шаблонного спаму.
 * - Title: ключове слово першим, без "Низькі ціни!", ліміт 60
 * - Description: інформативне речення + benefit, без телефонів, ліміт 160
 * - Keywords: без "купити", транслітерація, trigger keywords
 *
 * API ідентичний v1 — drop-in replacement.
 */

import { getTriggersData } from './gse-data.js';
import { stripHtmlTags } from '../../utils/utils-text.js';

const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;

/**
 * Генерує SEO заголовок (V2)
 * Пріоритет: Product > Brand > "купити" > "в Україні"
 * @param {string} brand - Назва бренду
 * @param {string} product - Назва продукту
 * @param {string} packaging - Упаковка/варіація
 * @param {'ru'|'ua'} lang - Мова
 * @returns {string} SEO title (до 60 символів)
 */
export function generateSeoTitle(brand, product, packaging, lang = 'ru') {
    const buy = lang === 'ua' ? 'купити' : 'купить';
    const country = lang === 'ua' ? 'в Україні' : 'в Украине';

    // Збираємо частини
    const productPart = [product, packaging].filter(Boolean).join(' ');
    const brandPart = brand || '';

    // Якщо немає ні продукту ні бренду — порожній title
    if (!productPart && !brandPart) return '';

    // Якщо тільки бренд
    if (!productPart) {
        return trimTitle(`${brandPart} — ${buy} ${country}`, TITLE_LIMIT);
    }

    // Повна версія: Product Brand — купити в Україні
    const full = `${productPart} ${brandPart} — ${buy} ${country}`;
    if (full.length <= TITLE_LIMIT) return full;

    // Без країни: Product Brand — купити
    const noCountry = `${productPart} ${brandPart} — ${buy}`;
    if (noCountry.length <= TITLE_LIMIT) return noCountry;

    // Без купити: Product Brand
    const nameOnly = `${productPart} ${brandPart}`;
    if (nameOnly.length <= TITLE_LIMIT) return nameOnly;

    // Обрізаємо до ліміту
    return trimTitle(nameOnly, TITLE_LIMIT);
}

/**
 * Генерує SEO опис (V2)
 * Перше інформативне речення + CTA без телефону
 * @param {string} mainText - Основний текст (може містити HTML)
 * @param {'ru'|'ua'} lang - Мова
 * @returns {string} SEO description (до 160 символів)
 */
export function generateSeoDescription(mainText, lang = 'ru') {
    const text = stripHtmlTags(mainText || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';

    const cta = lang === 'ua'
        ? 'Доставка по Україні.'
        : 'Доставка по Украине.';

    // Витягуємо речення
    const sentences = extractSentences(text);

    if (!sentences.length) {
        // Немає повних речень — беремо текст як є
        return trimDescription(text, cta, DESC_LIMIT);
    }

    // Перше речення
    let desc = sentences[0];

    // Якщо перше речення занадто коротке — додаємо друге
    if (desc.length < 40 && sentences.length > 1) {
        const combined = desc + ' ' + sentences[1];
        if (combined.length + cta.length + 1 <= DESC_LIMIT) {
            desc = combined;
        }
    }

    return trimDescription(desc, cta, DESC_LIMIT);
}

/**
 * Генерує SEO ключові слова (V2)
 * Без "купити", з варіаціями назви, trigger keywords
 * @param {string} brand - Назва бренду
 * @param {string} product - Назва продукту
 * @param {string} packaging - Упаковка/варіація
 * @param {Array<string>} activeTulips - Активні тригери
 * @param {'ru'|'ua'} lang - Мова
 * @returns {string} Список keywords через кому
 */
export function generateSeoKeywords(brand, product, packaging, activeTulips, lang = 'ru') {
    const triggersData = getTriggersData();

    // Рівень 1 — точні збіги
    let keywords = [];
    if (product) keywords.push(product);
    if (brand && product) keywords.push(`${brand} ${product}`);
    if (product && packaging) keywords.push(`${product} ${packaging}`);
    if (brand) keywords.push(brand);

    // Рівень 2 — trigger keywords
    const kwField = lang === 'ua' ? 'keywords_ua' : 'keywords';
    activeTulips.forEach(title => {
        const trigger = triggersData.find(t => t.title === title);
        if (trigger && trigger[kwField]?.length) {
            keywords.push(...trigger[kwField]);
        }
    });

    // Дедуплікація (case-insensitive)
    const seen = new Set();
    const unique = [];
    for (const kw of keywords) {
        const lower = kw.toLowerCase().trim();
        if (lower && !seen.has(lower)) {
            seen.add(lower);
            unique.push(kw.trim());
        }
    }

    return unique.join(', ');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS (приватні)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обрізає title до ліміту по межі слова
 */
function trimTitle(text, limit) {
    if (text.length <= limit) return text;

    // Обрізаємо по пробілу
    const trimmed = text.substring(0, limit);
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > limit * 0.6) {
        return trimmed.substring(0, lastSpace);
    }
    return trimmed;
}

/**
 * Витягує речення з тексту
 */
function extractSentences(text) {
    // Розбиваємо по крапці, знаку оклику, знаку питання
    const raw = text.match(/[^.!?]+[.!?]+/g);
    if (!raw) return [];

    return raw
        .map(s => s.trim())
        .filter(s => s.length > 10); // Ігноруємо дуже короткі "речення"
}

/**
 * Формує description: речення + CTA, вкладаючись у ліміт
 */
function trimDescription(desc, cta, limit) {
    const full = `${desc} ${cta}`;
    if (full.length <= limit) return full;

    // Тільки речення без CTA
    if (desc.length <= limit) return desc;

    // Обрізаємо речення до ліміту по межі слова
    const trimmed = desc.substring(0, limit - 3);
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > limit * 0.5) {
        return trimmed.substring(0, lastSpace) + '...';
    }
    return trimmed + '...';
}
