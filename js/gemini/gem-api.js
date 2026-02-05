// js/gemini/gem-api.js

/**
 * GEMINI API
 * Прямий виклик Google Gemini API з браузера
 */

import { getApiKey } from './gem-config.js';
import { runHook } from './gem-plugins.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Виклик Gemini API
 * @param {string} userPrompt - Запит користувача
 * @param {string} systemPrompt - System prompt
 * @returns {Promise<Object>} Результат {text, usage}
 */
export async function callGemini(userPrompt, systemPrompt) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('API ключ не налаштовано');
    }

    runHook('onBeforeRequest', { userPrompt, systemPrompt });

    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userPrompt }]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
    };

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Перевірка на блокування
        if (data.promptFeedback?.blockReason) {
            throw new Error(`Контент заблоковано: ${data.promptFeedback.blockReason}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
            throw new Error('Порожня відповідь від Gemini');
        }

        const result = {
            text,
            usage: {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                responseTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0
            }
        };

        runHook('onAfterRequest', result);

        return result;

    } catch (error) {
        runHook('onError', error);
        throw error;
    }
}

/**
 * Парсинг HTML з відповіді Gemini
 * @param {string} text - Текст відповіді
 * @returns {string} HTML код
 */
export function parseHtmlFromResponse(text) {
    // Шукаємо HTML в блоці коду
    const codeBlockMatch = text.match(/```html\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }

    // Шукаємо HTML теги напряму
    const htmlMatch = text.match(/<p>[\s\S]*<\/p>/);
    if (htmlMatch) {
        return htmlMatch[0].trim();
    }

    return '';
}

/**
 * Парсинг SEO даних з відповіді Gemini
 * @param {string} text - Текст відповіді
 * @returns {Object} {title, keywords, description}
 */
export function parseSeoFromResponse(text) {
    const seo = {
        title: '',
        keywords: '',
        description: ''
    };

    // SEO Title
    const titleMatch = text.match(/SEO Title[:\s]*(.+)/i);
    if (titleMatch) {
        seo.title = titleMatch[1].replace(/[*`]/g, '').trim();
    }

    // SEO Keywords
    const keywordsMatch = text.match(/SEO Keywords[:\s]*(.+)/i);
    if (keywordsMatch) {
        seo.keywords = keywordsMatch[1].replace(/[*`]/g, '').trim();
    }

    // SEO Description
    const descMatch = text.match(/SEO Description[:\s]*(.+)/i);
    if (descMatch) {
        seo.description = descMatch[1].replace(/[*`]/g, '').trim();
    }

    return seo;
}
