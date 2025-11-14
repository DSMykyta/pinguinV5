// scripts/create-admin.js
// Скрипт для створення першого admin користувача

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Генерує дані для першого admin користувача
 */
async function createAdminUser() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';

  console.log('\n🔐 Генерація даних для admin користувача...\n');

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);
  const role = 'admin';
  const createdAt = new Date().toISOString();
  const lastLogin = '';

  console.log('📋 Скопіюйте ці дані в Google Sheets (аркуш "Users"):');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`ID (колонка A):            ${id}`);
  console.log(`Username (колонка B):      ${username}`);
  console.log(`Password Hash (колонка C): ${passwordHash}`);
  console.log(`Role (колонка D):          ${role}`);
  console.log(`Created At (колонка E):    ${createdAt}`);
  console.log(`Last Login (колонка F):    ${lastLogin}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('\n📝 Інструкція:');
  console.log('1. Відкрийте https://docs.google.com/spreadsheets/d/1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls/edit');
  console.log('2. Перейдіть на аркуш "Users"');
  console.log('3. Вставте дані в рядок 2 (перший рядок - це заголовки)');
  console.log('4. Збережіть таблицю');
  console.log('5. Оновіть адмін панель (F5)');
  console.log(`\n✅ Логін: ${username}`);
  console.log(`✅ Пароль: ${password}`);
  console.log('\n⚠️  ВАЖЛИВО: Змініть пароль після першого входу!\n');
}

createAdminUser().catch(console.error);
