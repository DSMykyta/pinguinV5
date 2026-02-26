const templateCache = new Map();

/**
 * Асинхронно завантажує HTML-вміст з файлу і вставляє його в контейнер.
 * @param {string} url - Шлях до HTML-файлу.
 * @param {HTMLElement} container - DOM-елемент, куди буде вставлено вміст.
 */
export async function loadHTML(url, container) {
    if (!url || !container) return;

    if (templateCache.has(url)) {
        container.innerHTML = templateCache.get(url);
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Не вдалося завантажити шаблон: ${response.statusText}`);
        }
        const html = await response.text();
        templateCache.set(url, html);
        container.innerHTML = html;
    } catch (error) {
        console.error(`Помилка завантаження HTML з ${url}:`, error);
        container.innerHTML = `<p style="color: red;">Помилка завантаження панелі.</p>`;
    }
}