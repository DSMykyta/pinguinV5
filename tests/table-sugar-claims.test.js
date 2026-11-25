const assert = require('node:assert/strict');
const test = require('node:test');

const cases = [
  [
    "50 грам",
    "0.24 г",
    "Кокосова стружка, мальтитол, сукралоза",
    "Sugar Free"
  ],
  [
    "50 грам",
    "0.25 г",
    "рисове борошно, декстроза",
    "Sugar Free"
  ],
  [
    "50 грам",
    "0.26 г",
    "мальтитол",
    "No Added Sugar"
  ],
  [
    "50 грам",
    "0 г",
    "",
    "Sugar Free"
  ],
  [
    "50 грам",
    "",
    "",
    ""
  ],
  [
    "50 грам",
    "0 г",
    "—",
    "Sugar Free"
  ],
  [
    "50 грам",
    "0,24 г",
    "глюкозний сироп",
    "Sugar Free"
  ],
  [
    "50 грам",
    "0 г",
    "мед",
    "Sugar Free"
  ],
  [
    "50 грам",
    "0 г",
    "мальтоза",
    "Sugar Free"
  ],
  [
    "1 батончик (50 г)",
    "250 мг",
    "мальтитол",
    "Sugar Free"
  ],
  [
    "100 мл",
    "0.5 г",
    "сукралоза",
    "Sugar Free"
  ],
  [
    "1 порція",
    "0.01 г",
    "сукралоза",
    "No Added Sugar"
  ],
  [
    "50 грам",
    "0.25",
    "сукралоза",
    "No Added Sugar"
  ],
  [
    "50 грам",
    "-1 г",
    "декстроза",
    ""
  ],
  [
    "50 грам",
    "0.25 г",
    "не вказано",
    "Sugar Free"
  ],
  [
    "50 грам",
    "0.25 г",
    "рисові кульки (рис, декстроза)",
    "Sugar Free"
  ]
];

test('sugar claim hints handle serving units, threshold with Sugar Free taking display priority', async () => {
    const { getSugarClaimHints } = await import('../js/generators/generator-table/gt-sugar-claims.js');
    for (const [serving, sugar, ingredients, expected] of cases) {
        const rows = [{ left: 'Харчова цінність', right: serving }, { left: '- цукор', right: sugar }, { separator: true }, { left: 'Інгредієнти', header: true }, { left: ingredients, single: true }];
        assert.equal(getSugarClaimHints(rows)[1].join('|'), expected, JSON.stringify(rows));
    }
    const ru = [{ left: 'Пищевая ценность', right: '60 грамм' }, { left: ' - сахар', right: '0,3 г' }, { separator: true }, { left: 'Ингредиенты', header: true }, { left: 'какао, мальтитол', single: true }];
    assert.deepEqual(getSugarClaimHints(ru)[1], ['Sugar Free']);
    assert.deepEqual(getSugarClaimHints(ru.slice(0, 2))[1], ['Sugar Free']);
    assert.deepEqual(getSugarClaimHints([...ru, { left: 'Харчова цінність', right: '50 г' }, { left: 'цукор', right: '2 г' }]).at(-1), []);
});
