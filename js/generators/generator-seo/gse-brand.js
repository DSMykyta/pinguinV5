// js/generators/generator-seo/gse-brand.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     GENERATOR SEO - BRAND                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Відображення інформації про бренд та країну                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getSeoDOM } from './gse-dom.js';
import { getBrandsData } from './gse-data.js';

/**
 * Оновлює назву країни поруч з полем бренду.
 */
export function updateCountryDisplay() {
    const dom = getSeoDOM();
    const brandsData = getBrandsData();
    const brandName = dom.brandNameInput.value.trim().toLowerCase();
    const brandInfo = brandsData[brandName];

    if (brandInfo && brandInfo.country) {
        dom.countryNameDiv.innerHTML = `<span class="badge c-main">${brandInfo.country}</span>`;
    } else {
        dom.countryNameDiv.innerHTML = '';
    }
}