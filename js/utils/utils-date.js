// js/utils/utils-date.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    DATE UTILS — ФОРМАТУВАННЯ ДАТ                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  📋 Експорти:                                                            ║
 * ║  └── formatDate(date) → "DD.MM.YY"                                      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Форматує дату у формат DD.MM.YY
 *
 * @param {Date} date - Об'єкт дати
 * @returns {string} Форматована дата
 */
export function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}
