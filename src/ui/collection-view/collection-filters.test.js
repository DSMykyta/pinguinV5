/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — COLLECTION FILTER TESTS                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Verify facets, blank values and combined column filters.      ║
 * ║ ЗАЛЕЖНОСТІ: node:test, node:assert/strict, collection-filters.js.           ║
 * ║ ПУБЛІЧНИЙ API: node --test collection-filters.test.js.                    ║
 * ║ ПРИНЦИП: Observable data results; no DOM implementation assertions.        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getFilterValue, matchesColumnFilters, getColumnOptions } from './collection-filters.js';

const columns = [{ key: 'country' }, { key: 'status' }];
const rows = [
  { id: 1, country: 'Україна', status: 'Активний' },
  { id: 2, country: 'Польща', status: 'Активний' },
  { id: 3, country: 'Україна', status: 'Архівний' },
  { id: 4, country: null, status: 'Активний' },
];

test('column filters combine OR values and AND columns without mutating data', () => {
  const filters = new Map([['country', new Set(['Україна', 'Польща'])],
    ['status', new Set(['Активний'])]]);
  assert.deepEqual(rows.filter(row => matchesColumnFilters(row, columns, filters)).map(row => row.id), [1, 2]);
  assert.equal(rows.length, 4);
  assert.equal(filters.get('country').size, 2);
});

test('empty selection yields no results while no filter includes every row', () => {
  assert.equal(rows.filter(row => matchesColumnFilters(row, columns, new Map())).length, 4);
  assert.equal(rows.filter(row => matchesColumnFilters(row, columns,
    new Map([['country', new Set()]]))).length, 0);
});

test('facets ignore their own selection and retain zero-count alternatives', () => {
  const filters = new Map([['country', new Set(['Україна'])], ['status', new Set(['Архівний'])]]);
  const matching = rows.filter(row => matchesColumnFilters(row, columns, filters, 'country'));
  assert.deepEqual(getColumnOptions(rows, columns[0], matching), [
    { value: 'Польща', label: 'Польща', count: 0 },
    { value: 'Україна', label: 'Україна', count: 1 },
    { value: '', label: 'Порожньо', count: 0 },
  ]);
});

test('filter values support blanks, numeric zero and explicit accessors', () => {
  assert.equal(getFilterValue({ count: 0 }, { key: 'count' }), '0');
  assert.equal(getFilterValue({}, { key: 'missing' }), '');
  assert.equal(getFilterValue({ nested: { name: 'Київ' } },
    { key: 'nested', filterValue: row => row.nested.name }), 'Київ');
});
