// js/generators/generator-text/gte-builder.js

// Цей файл тепер ПРАВИЛЬНО використовує текст, який йому передають.

function autoTag(text) {
  const lines = text.split('\n');
  let result = '';
  let isList = false;
  let isParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length === 0) {
      if (isList)  { result += '</ul>'; isList = false; }
      if (isParagraph) { result += '</p>'; isParagraph = false; }
      continue;
    }

    if (line.endsWith(':')) {
      if (isList)  { result += '</ul>'; isList = false; }
      if (isParagraph) { result += '</p>'; isParagraph = false; }
      result += `<h3>${line}</h3>`;
      continue;
    }

    if (i < lines.length - 1 && lines[i + 1].trim().length > 0) {
      if (!isList) { result += '<ul>'; isList = true; }
      result += `<li>${line}</li>`;
    } else {
      if (isList) {
        result += `<li>${line}</li></ul>`;
        isList = false;
      } else {
        if (isParagraph && !line.startsWith('<h1') && !line.startsWith('<h2') && !line.startsWith('<h3')) {
          result += `${line}</p>`;
          isParagraph = false;
        } else {
          if (!line.startsWith('<h1') && !line.startsWith('<h2') && !line.startsWith('<h3')) {
            result += `<p>${line}`;
            isParagraph = true;
          } else {
            result += `${line}`;
          }
        }
      }
    }
  }
  if (isList) result += '</ul>';
  if (isParagraph) result += '</p>';
  return result;
}

// 1) Автоформатування
export function generateTextHtml(rawText) {
  const text = (rawText || '').trim();
  if (!text) return '';
  let marked = autoTag(text);
  marked = marked
    .replace(/<\/strong><strong>/g, '')
    .replace(/<\/strong> <strong>/g, '')
    .replace(/<p><p>/g, '<p>')
    .replace(/<\/p><\/p>/g, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<\/p>/g, '</p>\n\n')
    .replace(/<h3><h3>/g, '<h3>')
    .replace(/<\/h3><\/h3>/g, '</h3>')
    .replace(/<\/li>/g, '</li>\n')
    .replace(/<ul>/g, '<ul>\n')
    .replace(/<ol>/g, '<ol>\n')
    .replace(/<\/ul>/g, '</ul>\n\n')
    .replace(/<\/ol>/g, '</ol>\n\n')
    .replace(/<\/h3>/g, '</h3>\n\n')
    .replace(/<\/h2>/g, '</h2>\n\n')
    .replace(/<\/h1>/g, '</h1>\n\n');
  return marked;
}

// 2) BR-ізація
export function generateTextBr(rawText) {
  const text = (rawText || '').trim();
  if (!text) return '';

  return text
    // Спочатку обробляємо заголовки h1, h2, h3 -> strong
    .replace(/<h[123]\b[^>]*>(.*?)<\/h[123]>/gi, '<strong>$1</strong><br/>')
    // Обробляємо th -> strong
    .replace(/<th\b[^>]*>(.*?)<\/th>/gi, '<strong>$1</strong>')
    // Видаляємо табличні теги
    .replace(/<\/?(table|thead|tbody|tr|th|td)\b[^>]*>/gi, ' ')
    // Конвертуємо </p>, </li> в <br/>
    .replace(/<\/(p|li|div)>/gi, '<br/>')
    // Видаляємо відкриваючі теги p, ul, ol, li, div
    .replace(/<(p|ul|ol|li|div)\b[^>]*>/gi, '')
    // Залишаємо тільки strong теги, видаляємо інші теги форматування
    .replace(/<\/?(em|b|u|i|span)\b[^>]*>/gi, '')
    // Очищаємо спецсимволи
    .replace(/&nbsp;/g, ' ')
    .replace(/[\n\r\t]/g, ' ')
    // Очищаємо множинні пробіли
    .replace(/ {2,}/g, ' ')
    // Очищаємо пробіли навколо тегів
    .replace(/\s*<br\/>\s*/g, '<br/>')
    .replace(/\s*<strong>/g, '<strong>')
    .replace(/<\/strong>\s*/g, '</strong>')
    // Видаляємо порожні strong теги
    .replace(/<strong>\s*<\/strong>/g, '')
    // Очищаємо множинні <br/>
    .replace(/(<br\/>){3,}/g, '<br/><br/>')
    .trim()
    // Видаляємо <br/> на початку та в кінці
    .replace(/^(<br\/>)+/, '')
    .replace(/(<br\/>)+$/, '');
}

// 3) Повне очищення (весь HTML видаляється, залишається тільки текст)
export function generateTextClean(rawText) {
  const text = (rawText || '').trim();
  if (!text) return '';

  return text
    // Додаємо маркери для структури перед видаленням тегів
    .replace(/<h[123]\b[^>]*>(.*?)<\/h[123]>/gi, '\n\n###HEADER###$1###HEADER###\n\n')
    .replace(/<\/p>/gi, '###PARA###')
    .replace(/<br\s*\/?>/gi, '###BREAK###')
    .replace(/<\/li>/gi, '###ITEM###')
    // Видаляємо всі HTML теги
    .replace(/<[^>]+>/g, '')
    // Декодуємо HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Видаляємо contentReference
    .replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '')
    // Видаляємо спецсимволи
    .replace(/[\x01\r\t]/g, '')
    // Замінюємо маркери на правильне форматування
    .replace(/###HEADER###/g, '')
    .replace(/###PARA###/g, '\n')
    .replace(/###BREAK###/g, '\n')
    .replace(/###ITEM###/g, '\n')
    // Очищаємо множинні пробіли в одному рядку
    .replace(/[^\S\n]+/g, ' ')
    // Видаляємо пробіли на початку та в кінці рядків
    .replace(/^ +/gm, '')
    .replace(/ +$/gm, '')
    // Очищаємо множинні розриви рядків (більше 2 підряд)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 4) Часткове очищення (видаляємо атрибути, зберігаємо базові теги)
export function generateTextKeepTags(rawText) {
  const text = (rawText || '').trim();
  if (!text) return '';

  return text
    // Спочатку конвертуємо посилання - залишаємо тільки текст (перед видаленням атрибутів!)
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
    // Видаляємо небажані теги повністю
    .replace(/<\/?(?:span|script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    // Тепер видаляємо атрибути з усіх тегів, залишаємо тільки назву тега
    .replace(/<([a-z0-9]+)\b[^>]*>/gi, '<$1>')
    // Конвертуємо <pre> в <p>
    .replace(/<\/?pre>/gi, 'p')
    // &nbsp; -> звичайний пробіл
    .replace(/&nbsp;/g, ' ')
    // Декодуємо інші HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Видаляємо contentReference
    .replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '')
    // Видаляємо маркери списків
    .replace(/[•·●○■□▪▫]/g, '')
    // Видаляємо порожні параграфи
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<p><\/p>/gi, '')
    // Виправляємо заголовки "Особливості"
    .replace(/<h3>\s*особливості:\s*<\/h3>/gi, '<h3>Особливості:</h3>')
    .replace(/<h2>\s*особливості:\s*<\/h2>/gi, '<h2>Особливості:</h2>')
    // Видаляємо спецсимволи
    .replace(/[\x01\r\t]/g, '')
    // Очищаємо множинні пробіли
    .replace(/ {2,}/g, ' ')
    // Очищаємо пробіли навколо тегів
    .replace(/>\s+</g, '><')
    .replace(/\s+>/g, '>')
    .replace(/<\s+/g, '<')
    // Додаємо форматування для читабельності
    .replace(/<\/p>/g, '</p>\n')
    .replace(/<\/h([123])>/g, '</h$1>\n')
    .replace(/<\/li>/g, '</li>\n')
    .replace(/<ul>/g, '\n<ul>\n')
    .replace(/<ol>/g, '\n<ol>\n')
    .replace(/<\/ul>/g, '\n</ul>\n')
    .replace(/<\/ol>/g, '\n</ol>\n')
    // Очищаємо зайві розриви рядків
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
