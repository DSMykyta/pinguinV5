// js/generators/generator-seo/gse-logic.js
import { getTriggersData, getBrandsData } from './gse-data.js';

export function updateBrandAndProductFromText(mainText) {
    const text = (mainText || '').trim();
    const textLower = text.toLowerCase();
    // Тепер ця функція буде доступна
    const brands = getBrandsData(); 

    let foundBrand = '';
    let productName = '';

    // 1. Створюємо список ВСІХ можливих назв брендів
    // Перевіряємо, чи brands взагалі існує і має властивості
    const allBrandNames = brands ? Object.values(brands).flatMap(brand => brand.searchNames || []) : [];
    
    // 2. Сортуємо їх від найдовшого до найкоротшого
    allBrandNames.sort((a, b) => b.length - a.length);

    // 3. Шукаємо ПЕРШИЙ (найдовший) збіг
    for (const brandName of allBrandNames) {
        if (!brandName) continue; // Пропускаємо порожні назви, якщо вони є
        const brandNameLower = brandName.toLowerCase();
        if (textLower.startsWith(brandNameLower + ' ') || textLower === brandNameLower) {
            foundBrand = brandName; 
            const brandEndIndex = brandName.length;
            productName = text.substring(brandEndIndex).trim(); 
            break; 
        }
    }

    // 4. Якщо НІЧОГО не знайшли - стара логіка
    if (!foundBrand) {
        const words = text.split(/\s+/);
        foundBrand = words[0] || '';
        productName = words.slice(1).join(' ');
    }

    // 5. Обрізаємо назву товару по тире
    const dashIndex = productName.search(/\s*(-|–)\s*/);
    if (dashIndex !== -1) {
        productName = productName.substring(0, dashIndex).trim();
    }

    return { brand: foundBrand, product: productName };
}

// --- Функції генерації ---

export function generateSeoTitle(brand, product, packaging) {
    return `Купить ${brand} ${product}${packaging ? ' ' + packaging : ''} в Украине. Низкие цены!`;
}

export function generateSeoDescription(mainText) {
    const text = (mainText || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    const firstSentence = text.match(/[^\.!\?]+[\.!\?]+/g)?.[0] || text;
    const phoneNumbers = ["(096)519-78-22", "(073)475-67-07", "(099)237-90-38"];
    const randomPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    return `${firstSentence} Для заказа звоните по номеру: ${randomPhone}`;
}

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

// --- Інша логіка ---

/**
 * Повертає країну для заданого бренду.
 * @param {string} brandName - Назва бренду.
 * @returns {string} - Назва країни або порожній рядок.
 */
export function getCountryForBrand(brandName) {
    const brandsData = getBrandsData();
    const brandInfo = brandsData[brandName.toLowerCase()];
    return brandInfo ? brandInfo.country : '';
}

export function checkSafety(productName) {
    const BANNED_PRODUCTS = ['alpha gpc', 'aloe-emodin', 'aloin', 'barbaloin', 'hydroxyanthracene', 'dmaa', 'dmha', 'yohimbine'];
    const productValue = productName.toLowerCase();
    const isBanned = BANNED_PRODUCTS.some(p => productValue.includes(p));
    return isBanned ? 'Заборонено до продажу в Україні' : '';
}

