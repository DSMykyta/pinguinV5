// js/generators/generator-highlight/ghl-validator-v2.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           HIGHLIGHT GENERATOR - VALIDATOR V2                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Логіка завантаження та перевірки заборонених слів.
 * Адаптовано для роботи з Rich Text Editor.
 */

import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

// ============================================================================
// СТАН
// ============================================================================

let bannedWords = [];
let bannedWordsData = [];
let validationRegex = null;

const BANNED_WORDS_URL = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=1742878044`;

const FALLBACK_WORDS = [
    'лікує', 'лікування', 'профілактика хвороб', 'діагностика', 'профілактика',
    'запобігає хворобам', 'діагностує', 'знижує тиск', 'очищає печінку', 'очищає кров',
    'очищає', 'нормалізує гормони', 'підвищує імунітет', 'вбиває віруси', 'протипухлинний',
    'знижує холестерин', 'заспокоює нервову систему', 'відновлює хрящ', 'підвищує потенцію',
    'виліковує', 'профілактика раку', 'виявляє', 'нормалізує цукор у крові', 'детоксикація'
];

// ============================================================================
// ПРИВАТНІ ФУНКЦІЇ
// ============================================================================

function escapeRegExp(string) {
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex() {
    if (bannedWords.length === 0) {
        validationRegex = null;
        return;
    }

    const optimizedList = [...new Set(bannedWords)]
        .map(word => escapeRegExp(word.toLowerCase()))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    const regexBody = optimizedList.join('|');

    try {
        validationRegex = new RegExp(`(?<!\\p{L})(${regexBody})(?!\\p{L})`, 'giu');
    } catch (error) {
        console.error("[GHL Validator] Помилка при створенні RegExp:", error);
        validationRegex = null;
    }
}

async function fetchBannedWords() {
    try {
        if (typeof Papa === 'undefined') throw new Error('PapaParse не знайдено.');
        const response = await fetch(BANNED_WORDS_URL);
        if (!response.ok) throw new Error(`Статус: ${response.status}`);
        const csvData = await response.text();
        const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true }).data;

        bannedWordsData = parsedData;

        const wordsFromSheet = [];
        parsedData.forEach(row => {
            const ukWords = (row.name_uk || '').split(',').map(s => s.trim()).filter(Boolean);
            const ruWords = (row.name_ru || '').split(',').map(s => s.trim()).filter(Boolean);
            wordsFromSheet.push(...ukWords, ...ruWords);
        });

        if (wordsFromSheet.length === 0) throw new Error('Список порожній.');

        bannedWords = [...new Set(wordsFromSheet)].sort((a, b) => a.localeCompare(b));

    } catch (error) {
        console.error("[GHL Validator] Помилка завантаження:", error.message);
        bannedWords = FALLBACK_WORDS.sort((a, b) => a.localeCompare(b));
        bannedWordsData = [];
    }
    buildRegex();
}

// ============================================================================
// ПУБЛІЧНІ ФУНКЦІЇ
// ============================================================================

/**
 * Ініціалізація валідатора - завантажує заборонені слова
 */
export async function initValidator() {
    await fetchBannedWords();
    console.log(`✅ Завантажено ${bannedWords.length} заборонених слів`);
}

/**
 * Отримати регулярний вираз для пошуку заборонених слів
 * @returns {RegExp|null}
 */
export function getValidationRegex() {
    return validationRegex;
}

/**
 * Отримати список заборонених слів
 * @returns {string[]}
 */
export function getBannedWords() {
    return bannedWords;
}

/**
 * Отримати повні дані про заборонені слова
 * @returns {Object[]}
 */
export function getBannedWordsData() {
    return bannedWordsData;
}

/**
 * Знайти інформацію про заборонене слово
 * @param {string} word - Слово для пошуку
 * @returns {Object|null}
 */
export function findBannedWordInfo(word) {
    if (!bannedWordsData || bannedWordsData.length === 0) return null;

    const lowerWord = word.toLowerCase();

    for (const row of bannedWordsData) {
        const ukWords = (row.name_uk || '').split(',').map(s => s.trim().toLowerCase());
        const ruWords = (row.name_ru || '').split(',').map(s => s.trim().toLowerCase());

        if (ukWords.includes(lowerWord) || ruWords.includes(lowerWord)) {
            return {
                group_name_ua: row.group_name_ua || '',
                banned_explaine: row.banned_explaine || '',
                banned_hint: row.banned_hint || ''
            };
        }
    }
    return null;
}

/**
 * Перевірити текст на заборонені слова
 * @param {string} text - Текст для перевірки
 * @returns {Object} - { totalCount, wordCounts: Map }
 */
export function validateText(text) {
    const result = {
        totalCount: 0,
        wordCounts: new Map()
    };

    if (!validationRegex || !text) return result;

    validationRegex.lastIndex = 0;
    let match;

    while ((match = validationRegex.exec(text)) !== null) {
        if (match[1]) {
            const word = match[1].toLowerCase();
            const currentCount = result.wordCounts.get(word) || 0;
            result.wordCounts.set(word, currentCount + 1);
            result.totalCount++;
        }
    }

    return result;
}

/**
 * Перезавантажити заборонені слова
 */
export async function reloadBannedWords() {
    await fetchBannedWords();
}
