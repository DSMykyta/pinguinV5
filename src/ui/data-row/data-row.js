/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DATA ROW                                                                            ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює структурований рядок із полями.                                               ║
 * ║ ЗАЛЕЖНОСТІ: UI icon.                                                                               ║
 * ║ ПУБЛІЧНИЙ API: createDataRow().                                                                    ║
 * ║ ПРИНЦИП: Значення вставляються безпечним текстом.                                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIcon } from '../icon/icon.js';

/**
 * Structural row shared by overview lists and future tools.
 * Row data is plain text; styling never determines a record's meaning.
 */
export function createDataRow({ icon, title, description, trailing }) {
  const row = document.createElement('div');
  row.className = 'pg-data-row';

  const symbol = document.createElement('span');
  symbol.className = 'pg-data-row__symbol';
  symbol.append(createIcon(icon));

  const body = document.createElement('div');
  body.className = 'pg-data-row__body';

  const label = document.createElement('span');
  label.className = 'pg-data-row__title';
  label.textContent = title;

  const detail = document.createElement('span');
  detail.className = 'pg-data-row__description';
  detail.textContent = description;

  const meta = document.createElement('span');
  meta.className = 'pg-data-row__trailing';
  meta.textContent = trailing;

  body.append(label, detail);
  row.append(symbol, body, meta);
  return row;
}
