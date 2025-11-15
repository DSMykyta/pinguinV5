// api/permissions/test.js

/**
 * Тестовий endpoint для діагностики проблем з Google Sheets
 * GET /api/permissions/test
 */

const { corsMiddleware } = require('../utils/cors');
const { getValues, getSheetNames } = require('../utils/google-sheets');

async function handler(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // Тест 1: Отримати список всіх листів в users spreadsheet
    console.log('🧪 Тест 1: Отримання списку листів...');
    const startSheets = Date.now();

    try {
      const sheets = await getSheetNames('users');
      const elapsed = Date.now() - startSheets;

      results.tests.push({
        name: 'Get sheet names',
        status: 'success',
        elapsed: `${elapsed}ms`,
        data: sheets
      });

      console.log(`✅ Знайдено ${sheets.length} листів за ${elapsed}ms`);
    } catch (error) {
      const elapsed = Date.now() - startSheets;
      results.tests.push({
        name: 'Get sheet names',
        status: 'error',
        elapsed: `${elapsed}ms`,
        error: error.message,
        stack: error.stack
      });
      console.error(`❌ Помилка отримання листів (${elapsed}ms):`, error.message);
    }

    // Тест 2: Спроба читання PermissionsCatalog
    console.log('🧪 Тест 2: Читання PermissionsCatalog...');
    const startCatalog = Date.now();

    try {
      const catalogData = await Promise.race([
        getValues('PermissionsCatalog!A1:F10', 'users'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        )
      ]);

      const elapsed = Date.now() - startCatalog;
      results.tests.push({
        name: 'Read PermissionsCatalog',
        status: 'success',
        elapsed: `${elapsed}ms`,
        rowsCount: catalogData?.length || 0,
        firstRow: catalogData?.[0] || null
      });

      console.log(`✅ Прочитано ${catalogData?.length || 0} рядків за ${elapsed}ms`);
    } catch (error) {
      const elapsed = Date.now() - startCatalog;
      results.tests.push({
        name: 'Read PermissionsCatalog',
        status: 'error',
        elapsed: `${elapsed}ms`,
        error: error.message,
        stack: error.stack
      });
      console.error(`❌ Помилка читання PermissionsCatalog (${elapsed}ms):`, error.message);
    }

    // Тест 3: Спроба читання RolePermissions
    console.log('🧪 Тест 3: Читання RolePermissions...');
    const startRoles = Date.now();

    try {
      const rolesData = await Promise.race([
        getValues('RolePermissions!A1:C10', 'users'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        )
      ]);

      const elapsed = Date.now() - startRoles;
      results.tests.push({
        name: 'Read RolePermissions',
        status: 'success',
        elapsed: `${elapsed}ms`,
        rowsCount: rolesData?.length || 0,
        firstRow: rolesData?.[0] || null
      });

      console.log(`✅ Прочитано ${rolesData?.length || 0} рядків за ${elapsed}ms`);
    } catch (error) {
      const elapsed = Date.now() - startRoles;
      results.tests.push({
        name: 'Read RolePermissions',
        status: 'error',
        elapsed: `${elapsed}ms`,
        error: error.message,
        stack: error.stack
      });
      console.error(`❌ Помилка читання RolePermissions (${elapsed}ms):`, error.message);
    }

    // Тест 4: Перевірка environment variables
    results.tests.push({
      name: 'Environment variables',
      status: 'info',
      data: {
        hasServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasSpreadsheetIdUsers: !!process.env.SPREADSHEET_ID_USERS,
        spreadsheetIdUsers: process.env.SPREADSHEET_ID_USERS ?
          `${process.env.SPREADSHEET_ID_USERS.substring(0, 10)}...` :
          'NOT SET'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Діагностика завершена',
      results
    });

  } catch (error) {
    console.error('❌ Критична помилка тестування:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      results
    });
  }
}

module.exports = async (req, res) => {
  return corsMiddleware(req, res, () => handler(req, res));
};
