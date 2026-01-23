// js/generators/generator-highlight/ghl-validator.js

import { getHighlightDOM } from './ghl-dom.js';
import { updateHighlights } from './ghl-highlighter.js';
import { debounce } from '../../utils/common-utils.js';
import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

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

/**
 * Знайти інформацію про заборонене слово
 */
function findBannedWordInfo(word) {
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

// Tooltip
let tooltipElement = null;

function getTooltipElement() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'banned-word-tooltip';
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

function showTooltip(target, wordInfo) {
    const tooltip = getTooltipElement();
    let content = '';

    if (wordInfo.group_name_ua) {
        content += `<div class="tooltip-title">${wordInfo.group_name_ua}</div>`;
    }
    if (wordInfo.banned_explaine) {
        content += `<div class="tooltip-description">${wordInfo.banned_explaine}</div>`;
    }
    if (wordInfo.banned_hint) {
        content += `<div class="tooltip-hint"><strong>Рекомендація:</strong> ${wordInfo.banned_hint}</div>`;
    }

    if (!content) return;

    tooltip.innerHTML = content;

    const rect = target.getBoundingClientRect();
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';

    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;

    let top = rect.bottom + 8;
    let left = rect.left;

    if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
    }
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    if (left < 10) {
        left = 10;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = '';
    tooltip.classList.add('visible');
}

function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('visible');
    }
}

/**
 * Валідація тексту та оновлення UI
 */
function validateText() {
    const dom = getHighlightDOM();
    if (!dom.textarea) return;

    const text = dom.textarea.value || '';

    // Оновлюємо підсвічування в textarea (клас highlight-banned-word з pseudo-table.css)
    updateHighlights(text, validationRegex, 'highlight-banned-word');

    // Рахуємо заборонені слова
    const wordCounts = new Map();
    let totalCount = 0;

    if (validationRegex) {
        validationRegex.lastIndex = 0;
        let match;

        while ((match = validationRegex.exec(text)) !== null) {
            if (match[1]) {
                const word = match[1].toLowerCase();
                const currentCount = wordCounts.get(word) || 0;
                wordCounts.set(word, currentCount + 1);
                totalCount++;
            }
        }
    }

    // Оновлюємо чіпи з результатами
    displayResults(wordCounts, totalCount);
}

function displayResults(wordCounts, totalCount) {
    const dom = getHighlightDOM();
    if (!dom.validationResults) return;

    if (totalCount > 0) {
        const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const chips = sortedEntries.map(([word, count]) =>
            `<span class="chip chip-error" data-banned-word="${word}">${word} (${count})</span>`
        ).join(' ');

        dom.validationResults.innerHTML = chips;
        dom.validationResults.classList.add('has-errors');

        // Додаємо обробники для tooltip
        dom.validationResults.querySelectorAll('.chip-error[data-banned-word]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const word = e.target.dataset.bannedWord;
                const wordInfo = findBannedWordInfo(word);
                if (wordInfo) {
                    showTooltip(e.target, wordInfo);
                }
            });
            chip.addEventListener('mouseleave', hideTooltip);
        });
    } else {
        dom.validationResults.innerHTML = '';
        dom.validationResults.classList.remove('has-errors');
    }
}

export async function initValidator() {
    const dom = getHighlightDOM();
    if (!dom.textarea) return;

    await fetchBannedWords();

    const debouncedValidate = debounce(validateText, 300);
    dom.textarea.addEventListener('input', debouncedValidate);

    // Початкова валідація
    validateText();
}
