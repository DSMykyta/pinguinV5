// js/generators/generator-text/gte-utils.js

export async function copyToClipboard(text) {
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

export function showCopiedFeedback(card) {
    const status = card.querySelector('.result-status');
    if (!status) return;
    const originalText = status.textContent;
    status.textContent = 'Скопійовано!';
    card.classList.add('copied');
    setTimeout(() => {
        status.textContent = originalText;
        card.classList.remove('copied');
    }, 1500);
}