// js/generators/generator-table/gt-smart-value-parser.test.js

/**
 * Тести для Smart Value Parser
 * Запуск: node gt-smart-value-parser.test.js
 */

import { smartParseLine, _testExports } from './gt-smart-value-parser.js';

// ============================================================================
// ТЕСТОВІ КЕЙСИ
// ============================================================================

const testCases = [
    // === Модифікатори після одиниці ===
    {
        input: 'Витамин А 900 мкг RAE',
        expected: { left: 'Витамин А', right: '900 мкг RAE' },
        category: 'Модифікатори'
    },
    {
        input: 'Фолиевая кислота 400 мкг DFE',
        expected: { left: 'Фолиевая кислота', right: '400 мкг DFE' },
        category: 'Модифікатори'
    },
    {
        input: 'Витамин Е 15 мг АТЕ',
        expected: { left: 'Витамин Е', right: '15 мг АТЕ' },
        category: 'Модифікатори'
    },
    {
        input: 'Ниацин 20 мг NE',
        expected: { left: 'Ниацин', right: '20 мг NE' },
        category: 'Модифікатори'
    },

    // === Форми в дужках ===
    {
        input: 'Цинк (як цитрат цинку) 15 мг',
        expected: { left: 'Цинк (як цитрат цинку)', right: '15 мг' },
        category: 'Форми в дужках'
    },
    {
        input: 'Магній (оксид магнію) 400 мг',
        expected: { left: 'Магній (оксид магнію)', right: '400 мг' },
        category: 'Форми в дужках'
    },
    {
        input: 'Вітамін B12 (як метилкобаламін) 1000 мкг',
        expected: { left: 'Вітамін B12 (як метилкобаламін)', right: '1000 мкг' },
        category: 'Форми в дужках'
    },

    // === Альтернативні значення в дужках ===
    {
        input: 'Витамин D3 50 мкг (2000 IU)',
        expected: { left: 'Витамин D3', right: '50 мкг (2000 IU)' },
        category: 'Альтернативні значення'
    },
    {
        input: 'Витамин Е 15 мг (22.4 IU)',
        expected: { left: 'Витамин Е', right: '15 мг (22.4 IU)' },
        category: 'Альтернативні значення'
    },

    // === Ферментні значення ===
    {
        input: 'Смесь ферментов 2500 HUT/400 мг',
        expected: { left: 'Смесь ферментов', right: '2500 HUT/400 мг' },
        category: 'Ферменти'
    },
    {
        input: 'Бромелайн 90 GDU',
        expected: { left: 'Бромелайн', right: '90 GDU' },
        category: 'Ферменти'
    },
    {
        input: 'Папаин 2670 TU',
        expected: { left: 'Папаин', right: '2670 TU' },
        category: 'Ферменти'
    },
    {
        input: 'Грибковая липаза 1500 FIP',
        expected: { left: 'Грибковая липаза', right: '1500 FIP' },
        category: 'Ферменти'
    },
    {
        input: 'Грибковая лактаза 600 LACU',
        expected: { left: 'Грибковая лактаза', right: '600 LACU' },
        category: 'Ферменти'
    },
    {
        input: 'Альфа-галактозидаза 300 GALU',
        expected: { left: 'Альфа-галактозидаза', right: '300 GALU' },
        category: 'Ферменти'
    },

    // === Пробіотики ===
    {
        input: 'Lactobacillus acidophilus 10 billion CFU',
        expected: { left: 'Lactobacillus acidophilus', right: '10 billion CFU' },
        category: 'Пробіотики'
    },
    {
        input: 'Біфідобактерії 5 млрд КУО',
        expected: { left: 'Біфідобактерії', right: '5 млрд КУО' },
        category: 'Пробіотики'
    },

    // === Стандартні значення ===
    {
        input: 'Белок 25 г',
        expected: { left: 'Белок', right: '25 г' },
        category: 'Стандартні'
    },
    {
        input: 'Витамин C 500 мг',
        expected: { left: 'Витамин C', right: '500 мг' },
        category: 'Стандартні'
    },
    {
        input: 'Калории 120 ккал',
        expected: { left: 'Калории', right: '120 ккал' },
        category: 'Стандартні'
    },

    // === Без значення ===
    {
        input: '1 капсула',
        expected: { left: '1 капсула', right: '' },
        category: 'Без значення'
    },
    {
        input: 'Гіпромелоза (рослинна капсула)',
        expected: { left: 'Гіпромелоза (рослинна капсула)', right: '' },
        category: 'Без значення'
    },
];

// ============================================================================
// ЗАПУСК ТЕСТІВ
// ============================================================================

function runTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           SMART VALUE PARSER - ТЕСТУВАННЯ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let passed = 0;
    let failed = 0;
    let currentCategory = '';

    for (const testCase of testCases) {
        // Показати категорію
        if (testCase.category !== currentCategory) {
            currentCategory = testCase.category;
            console.log(`\n--- ${currentCategory} ---\n`);
        }

        const result = smartParseLine(testCase.input);
        const leftMatch = result.left === testCase.expected.left;
        const rightMatch = result.right === testCase.expected.right;
        const success = leftMatch && rightMatch;

        if (success) {
            console.log(`✅ "${testCase.input}"`);
            console.log(`   → left: "${result.left}"`);
            console.log(`   → right: "${result.right}"`);
            passed++;
        } else {
            console.log(`❌ "${testCase.input}"`);
            console.log(`   Очікувалось:`);
            console.log(`     left: "${testCase.expected.left}"`);
            console.log(`     right: "${testCase.expected.right}"`);
            console.log(`   Отримано:`);
            console.log(`     left: "${result.left}" ${leftMatch ? '✓' : '✗'}`);
            console.log(`     right: "${result.right}" ${rightMatch ? '✓' : '✗'}`);
            failed++;
        }
        console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`РЕЗУЛЬТАТ: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════════');

    return failed === 0;
}

// Запуск
const success = runTests();
process.exit(success ? 0 : 1);
