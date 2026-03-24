// js/utils/utils-date.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    DATE UTILS — ФОРМАТУВАННЯ ДАТ                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  📋 Експорти:                                                            ║
 * ║  ├── nowLocal()                → "YYYY-MM-DD HH:mm:ss" (local time)     ║
 * ║  ├── formatDate(date)          → "DD.MM.YY"                              ║
 * ║  └── formatDateTime(dateStr)   → "DD.MM.YY HH:mm"                       ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Поточний локальний час як рядок YYYY-MM-DD HH:mm:ss
 * Для збереження в базу (created_at, updated_at)
 *
 * @returns {string}
 */
export function nowLocal() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Форматує Date об'єкт у DD.MM.YY
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}

/**
 * Форматує рядок "YYYY-MM-DD HH:mm:ss" у "DD.MM.YY HH:mm"
 * Для відображення в UI
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const [date, time] = dateStr.split(' ');
    if (!date) return dateStr;
    const [y, m, d] = date.split('-');
    const shortTime = time ? time.slice(0, 5) : '';
    return `${d}.${m}.${y?.slice(2)} ${shortTime}`.trim();
}
