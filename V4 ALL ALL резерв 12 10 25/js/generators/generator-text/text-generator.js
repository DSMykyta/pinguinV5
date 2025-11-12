// text-generator.js
// Збережені функції зі старого скрипта: автоформат, очищення стилів/коду, br-ізація,
// плюс кнопки-обгортки (bold/H1/H2/H3/lowercase) і логіка "натиснув картку → скопійовано".
// Джерело регулярок та кнопок — твій script_text.js. (див. файл-джерело) 

let $input, $statusNodes;

export function initTextGenerator() {
  $input = document.getElementById('input-text-markup');
  if (!$input) return;

  // КНОПКИ-ОБГОРТКИ (як у канві)
  bindFormatting('#boldBtn',  wrapTag.bind(null, 'strong'));
  bindFormatting('#h1Btn',    wrapTag.bind(null, 'h1'));
  bindFormatting('#h2Btn',    wrapTag.bind(null, 'h2'));
  bindFormatting('#h3Btn',    wrapTag.bind(null, 'h3'));
  bindFormatting('#lowercaseBtn', makeLowercase);

  // КАРТКИ-РЕЗУЛЬТАТИ: “натиснув → згенерувалось → скопійовано”
  bindResultCard('#result-card-text-html', generateTextHtml);
  bindResultCard('#result-card-text-br',   generateTextBr);
  bindResultCard('#result-card-text-clean',generateTextClean);
  bindResultCard('#result-card-text-clean-tags', generateTextKeepTags);


  // Кеш для швидкого доступу до статусів
  $statusNodes = document.querySelectorAll('.result-card .result-status');
}

/* ===================== КНОПКИ-ОБГОРТКИ ===================== */
function bindFormatting(selector, handler) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.addEventListener('click', (e) => { e.preventDefault(); handler(); });
}
function wrapTag(tag) {
  const { value, selectionStart, selectionEnd } = $input;
  const sel = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after  = value.slice(selectionEnd);
  const wrapped = `<${tag}>${sel}</${tag}>`;
  $input.value = before + wrapped + after;
  // Повернути курсор після вставки
  const pos = before.length + wrapped.length;
  $input.focus();
  $input.setSelectionRange(pos, pos);
}
function makeLowercase() {
  const { value, selectionStart, selectionEnd } = $input;
  const sel = value.slice(selectionStart, selectionEnd).toLowerCase();
  $input.setRangeText(sel, selectionStart, selectionEnd, 'end');
}

/* ===================== КАРТКИ/КОПІЮВАННЯ ===================== */
function bindResultCard(selector, generatorFn) {
  const card = document.querySelector(selector);
  if (!card) return;

  card.addEventListener('click', async (e) => {
    // клік по трьох крапках не копіює
    const isMenu = e.target.closest('.result-card-actions');
    if (isMenu) return;

    const text = generatorFn();
    await copyToClipboard(text);
    showCopied(card);
  });
}
async function copyToClipboard(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}
function showCopied(card) {
  const status = card.querySelector('.result-status');
  if (!status) return;
  status.textContent = 'Скопійовано!';
  card.classList.add('copied');
  setTimeout(() => {
    status.textContent = '';
    card.classList.remove('copied');
  }, 1000);
}

/* ===================== ЯДРО: ГЕНЕРАТОРИ ===================== */
// 1) Автоформатування (autoTag) — перенесено зі старого script_text.js
export function generateTextHtml() {
  const text = ($input?.value || '').trim();
  if (!text) return '';
  let marked = autoTag(text);
  // Пост-обробка форматування — як у старому коді
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

// 2) BR-ізація — перенесено зі старого script_text.js
export function generateTextBr() {
  const text = ($input?.value || '');
  return text
    .replace(/<\/?(table|thead|tbody|tr|th|td)\b[^>]*>/gi, '')
    .replace(/<\/?(strong|em|b|u|h2)\b[^>]*>/gi, '')
    .replace(/&nbsp;|\n|\r|\t/g, ' ')
    .replace(/<h2\b[^>]*>(.*?)<\/h2>/gi, '<strong>$1</strong>')
    .replace(/<th\b[^>]*>(.*?)<\/th>/gi, '<strong>$1</strong>')
    .replace(/ +/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/Харчова цінність|Пищевая ценность/g, '')
    .replace(/Состав может незначительно отличаться в зависимости от вкуса/g, '<strong>Состав может незначительно отличаться в зависимости от вкуса</strong>')
    .replace(/<\/(tr|table)>/g, '<br/>')
    .trim()
    .replace(/(<br\/>)+$/, '');
}

// 3) Очищення (стилі/теги/сервісні вставки) — перенесено зі старого script_text.js
export function generateTextClean() {
  const text = ($input?.value || '');

  // повне очищення (як кнопка “Очистити Теги”)
  const cleaned = text
    .replace(/<\/?(table|tbody|thead|tr|th|td|h1|h2|h3|p|em|ul|ol|li|b|pre|u|strong|hr|br|span|img|script)\b[^>]*>|\s*особливості:\s*|\n\n\n+|\n{3}|\r|\t|&nbsp;|\x01/gi, (m) => {
      if (m.startsWith('<h') && m.endsWith('>')) return '\n\n';
      if (m === 'особливості:') return 'Особливості:';
      return '';
    })
    .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$3')
    .replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '')
    .replace(/ +/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  return cleaned;
}

// 3b) Часткове очищення: зберегти теги, прибрати стилі/сміття (зі старого script_text.js)
export function generateTextKeepTags() {
  const text = ($input?.value || '');

  return text
    // 1) Прибрати атрибути у ВСІХ тегів (залишити тільки сам тег)
    .replace(/<([a-z0-9]+)\b[^>]*>/gi, '<$1>')
    // 2) <pre> → <p>
    .replace(/<\/?pre>/gi, '<p>')
    // 3) Посилання: лишити видимий текст
    .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$3')
    // 4) Прибрати службові вставки :contentReference[oaicite:X]{index:X}
    .replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '')
    // 5) &nbsp; → пробіл; <br> → розрив абзаців
    .replace(/&nbsp;|<br\s*\/?>/gi, (m) => m === '&nbsp;' ? ' ' : '</p><p>')
    // 6) Прибрати порожні <p> і звести повтори </p><p>
    .replace(/<p(?:>|\s[^>]*>)(\s|&nbsp;)*<\/p>/gi, '')
    .replace(/(<\/p><p>)+/g, '</p><p>')
    // 7) Позбутися маркерів списку та <img>
    .replace(/[•·●]/g, '')
    .replace(/<img[^>]+>/gi, '')
    // 8) Нормалізувати Особливості
    .replace(/<h3>\s*особливості:<\/h3>/gi, '<h3>Особливості:</h3>')
    // 9) Прибрати <span> та <script> блоки
    .replace(/<\/?span[^>]*>|<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 10) Прибрати спецсимвол \x01
    .replace(/\x01/g, '')
    // 11) Підчистити пробіли
    .replace(/ +/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}


/* -------- допоміжні: автоTag з твого коду -------- */
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
