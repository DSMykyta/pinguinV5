// tests/api-security.test.js

// =========================================================================
// API SECURITY REGRESSION TESTS
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Перевіряє JWT guards, CORS preflight, Sheets access policy, точні
// whitelist-и та SSRF-захист без звернення до реальних Google API.
//
// ЗАПУСК:
// node --test tests/api-security.test.js
// =========================================================================

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = 'api-security-test-secret';

const googleSheetsPath = require.resolve('../server/utils/google-sheets');
require.cache[googleSheetsPath] = {
  id: googleSheetsPath,
  filename: googleSheetsPath,
  loaded: true,
  exports: {
    getValues: async (range, spreadsheetType) => {
      if (spreadsheetType === 'users' && range === 'Users!A2:B1000') {
        return [['user-1', 'tester']];
      }
      if (spreadsheetType === 'users' && range === 'Users!G2:H1000') {
        return [['Test User', 'avatar-id']];
      }
      return [[range, 'test-value']];
    },
    batchGetValues: async ranges => ranges.map(range => ({ range, values: [] })),
    updateValues: async () => ({ updatedRows: 1 }),
    appendValues: async () => ({ updates: { updatedRows: 1 } }),
    batchUpdate: async () => ({ totalUpdatedRows: 1 }),
    batchUpdateSpreadsheet: async () => ({ replies: [] }),
    getSheetNames: async () => [{ title: 'Test', sheetId: 1 }],
  },
};

const { corsMiddleware } = require('../server/utils/cors');
const { requireAccessToken } = require('../server/utils/auth-guard');
const { generateRefreshToken, generateToken } = require('../server/utils/jwt');
const {
  PUBLIC_DATA_SHEETS,
  PUBLIC_SHEETS,
  TASKS_SHEET_ID,
  extractSheetName,
  isExactAllowedSheet,
  validateUniversalSheetsRequest,
} = require('../server/utils/sheet-security');
const {
  SafeUrlError,
  isPublicIp,
  parseSafeUrl,
  resolveSafeTarget,
  safeFetchBuffer,
} = require('../server/utils/safe-url-fetch');

const authHandler = require('../api/auth');
const sheetsHandler = require('../api/sheets');
const publicDataHandler = require('../api/public/data');
const driveUploadHandler = require('../api/drive/upload');
const drivePhotoHandler = require('../api/drive/upload-photo');
const driveReferencesHandler = require('../api/drive/references');
const driveImagesHandler = require('../api/drive/images');
const hashPasswordHandler = require('../api/auth/hash-password');

const accessToken = generateToken({
  id: 'user-1',
  username: 'tester',
  role: 'editor',
});
const adminToken = generateToken({
  id: 'admin-1',
  username: 'admin',
  role: 'admin',
});
const refreshToken = generateRefreshToken({
  id: 'user-1',
  username: 'tester',
});

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

async function invoke(handler, request) {
  const response = createResponse();
  await handler(request, response);
  return response;
}

test('JWT_SECRET is mandatory without breaking this test process', () => {
  const jwtPath = path.resolve(__dirname, '../server/utils/jwt.js');
  const script = `
    delete process.env.JWT_SECRET;
    const { generateToken } = require(${JSON.stringify(jwtPath)});
    try {
      generateToken({ id: '1', username: 'test', role: 'admin' });
      process.exit(2);
    } catch (error) {
      process.stdout.write(error.name + ':' + error.message);
    }
  `;
  const env = { ...process.env };
  delete env.JWT_SECRET;

  const result = spawnSync(process.execPath, ['-e', script], {
    env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /JwtConfigurationError:JWT_SECRET environment variable is required/);
});

test('missing JWT_SECRET produces an explicit server configuration error', () => {
  const guardPath = path.resolve(__dirname, '../server/utils/auth-guard.js');
  const script = `
    delete process.env.JWT_SECRET;
    const { requireAccessToken } = require(${JSON.stringify(guardPath)});
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { process.stdout.write(JSON.stringify({ status: this.statusCode, body })); }
    };
    requireAccessToken(
      { headers: { authorization: 'Bearer invalid-token' } },
      res
    );
  `;
  const env = { ...process.env };
  delete env.JWT_SECRET;

  const result = spawnSync(process.execPath, ['-e', script], {
    env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    status: 500,
    body: { error: 'Server authentication is not configured' },
  });
});

test('access guard accepts access JWT and rejects missing or refresh JWT', () => {
  const missingResponse = createResponse();
  assert.equal(requireAccessToken(createRequest(), missingResponse), null);
  assert.equal(missingResponse.statusCode, 401);

  const refreshResponse = createResponse();
  const refreshRequest = createRequest({
    headers: { authorization: `Bearer ${refreshToken}` },
  });
  assert.equal(requireAccessToken(refreshRequest, refreshResponse), null);
  assert.equal(refreshResponse.statusCode, 401);

  const accessResponse = createResponse();
  const accessRequest = createRequest({
    headers: { authorization: `Bearer ${accessToken}` },
  });
  assert.equal(requireAccessToken(accessRequest, accessResponse).username, 'tester');
});

test('admin role guard returns 403 for a valid non-admin access JWT', () => {
  const response = createResponse();
  const request = createRequest({
    headers: { authorization: `Bearer ${accessToken}` },
  });

  assert.equal(requireAccessToken(request, response, { roles: ['admin'] }), null);
  assert.equal(response.statusCode, 403);
});

test('CORS OPTIONS remains open and does not call the protected handler', async () => {
  let called = false;
  const handler = corsMiddleware((req, res) => {
    called = true;
    requireAccessToken(req, res);
  });

  const response = await invoke(handler, createRequest({ method: 'OPTIONS' }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.ended, true);
  assert.equal(called, false);
  assert.equal(response.headers['Access-Control-Allow-Headers'], 'Content-Type, Authorization');
});

test('OPTIONS remains open on every protected endpoint', async () => {
  const handlers = [
    sheetsHandler,
    driveUploadHandler,
    drivePhotoHandler,
    driveReferencesHandler,
    driveImagesHandler,
    hashPasswordHandler,
    authHandler,
  ];

  for (const handler of handlers) {
    const response = await invoke(handler, createRequest({ method: 'OPTIONS' }));
    assert.equal(response.statusCode, 200);
    assert.equal(response.ended, true);
  }
});

test('sheet names are extracted and whitelisted by exact match only', () => {
  assert.equal(extractSheetName('SEO!A:E'), 'SEO');
  assert.equal(extractSheetName("'My Sheet'!A1:B2"), 'My Sheet');
  assert.equal(extractSheetName("'Owner''s Sheet'!A1"), "Owner's Sheet");
  assert.equal(isExactAllowedSheet('SEO', PUBLIC_SHEETS), true);
  assert.equal(isExactAllowedSheet('SEO-private', PUBLIC_SHEETS), false);
  assert.equal(isExactAllowedSheet('Banned', PUBLIC_DATA_SHEETS), true);
  assert.equal(isExactAllowedSheet('BannedPrivate', PUBLIC_DATA_SHEETS), false);
});

test('universal Sheets policy blocks users, unknown types and Tasks escape paths', () => {
  assert.equal(validateUniversalSheetsRequest({
    action: 'get',
    range: 'Users!A:I',
    spreadsheetType: 'users',
  }).status, 403);

  assert.equal(validateUniversalSheetsRequest({
    action: 'get',
    range: 'Anything!A:I',
    spreadsheetType: 'unknown',
  }).status, 403);

  assert.equal(validateUniversalSheetsRequest({
    action: 'get',
    range: 'Users!A:I',
    spreadsheetType: 'tasks',
  }).status, 403);

  assert.equal(validateUniversalSheetsRequest({
    action: 'get',
    range: 'Tasks!A:N',
    spreadsheetType: 'tasks',
  }).allowed, true);

  assert.equal(validateUniversalSheetsRequest({
    action: 'batchUpdateSpreadsheet',
    spreadsheetType: 'tasks',
    requests: [{
      deleteDimension: {
        range: {
          sheetId: TASKS_SHEET_ID,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: 2,
        },
      },
    }],
  }).allowed, true);

  assert.equal(validateUniversalSheetsRequest({
    action: 'batchUpdateSpreadsheet',
    spreadsheetType: 'tasks',
    requests: [{
      deleteDimension: {
        range: {
          sheetId: TASKS_SHEET_ID + 1,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: 2,
        },
      },
    }],
  }).status, 403);
});

test('private Sheets POST requires JWT and blocks users with a valid JWT', async () => {
  const noToken = await invoke(sheetsHandler, createRequest({
    method: 'POST',
    body: { action: 'get', range: 'Brands!A:F', spreadsheetType: 'main' },
  }));
  assert.equal(noToken.statusCode, 401);

  const usersRequest = await invoke(sheetsHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: { action: 'get', range: 'Users!A:I', spreadsheetType: 'users' },
  }));
  assert.equal(usersRequest.statusCode, 403);
});

test('public Sheets GET type=public and type=csv remain open', async () => {
  const publicResponse = await invoke(sheetsHandler, createRequest({
    method: 'GET',
    query: { type: 'public', range: 'SEO!A:E' },
  }));
  assert.equal(publicResponse.statusCode, 200);
  assert.equal(publicResponse.body.success, true);

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    text: async () => 'column\nvalue',
  });

  try {
    const csvResponse = await invoke(sheetsHandler, createRequest({
      method: 'GET',
      query: { type: 'csv', gid: '123' },
    }));
    assert.equal(csvResponse.statusCode, 200);
    assert.equal(csvResponse.body, 'column\nvalue');
  } finally {
    global.fetch = originalFetch;
  }
});

test('public data endpoint rejects prefix-based whitelist bypasses', async () => {
  const allowed = await invoke(publicDataHandler, createRequest({
    method: 'GET',
    query: { sheet: 'Banned', range: 'A1:B2' },
  }));
  assert.equal(allowed.statusCode, 200);

  const denied = await invoke(publicDataHandler, createRequest({
    method: 'GET',
    query: { sheet: 'BannedPrivate', range: 'A1:B2' },
  }));
  assert.equal(denied.statusCode, 403);
});

test('Drive upload, list and delete endpoints require access JWT', async () => {
  const cases = [
    [driveUploadHandler, createRequest({ method: 'POST' })],
    [drivePhotoHandler, createRequest({ method: 'POST' })],
    [driveReferencesHandler, createRequest({ method: 'POST' })],
    [driveReferencesHandler, createRequest({ method: 'GET' })],
    [driveReferencesHandler, createRequest({ method: 'DELETE' })],
    [driveImagesHandler, createRequest({ method: 'GET' })],
  ];

  for (const [handler, request] of cases) {
    const response = await invoke(handler, request);
    assert.equal(response.statusCode, 401);
  }
});

test('auth users directory requires access JWT and returns only allowed fields', async () => {
  const noToken = await invoke(authHandler, createRequest({
    method: 'POST',
    body: { action: 'directory' },
  }));
  assert.equal(noToken.statusCode, 401);

  const authorized = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: { action: 'directory' },
  }));
  assert.equal(authorized.statusCode, 200);
  assert.deepEqual(authorized.body.users, [{
    id: 'user-1',
    username: 'tester',
    display_name: 'Test User',
    avatar: 'avatar-id',
  }]);
  assert.equal(JSON.stringify(authorized.body).includes('bcrypt-hash'), false);
  assert.equal(JSON.stringify(authorized.body).includes('"role"'), false);
});

test('hash-password requires admin access JWT', async () => {
  const noToken = await invoke(hashPasswordHandler, createRequest({
    method: 'POST',
    body: { password: 'secret-password' },
  }));
  assert.equal(noToken.statusCode, 401);

  const editor = await invoke(hashPasswordHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: { password: 'secret-password' },
  }));
  assert.equal(editor.statusCode, 403);

  const adminWrongMethod = await invoke(hashPasswordHandler, createRequest({
    method: 'GET',
    headers: { authorization: `Bearer ${adminToken}` },
  }));
  assert.equal(adminWrongMethod.statusCode, 405);
});

test('SSRF policy blocks unsafe protocols, credentials and private IP ranges', () => {
  assert.throws(() => parseSafeUrl('file:///etc/passwd'), SafeUrlError);
  assert.throws(() => parseSafeUrl('https://user:pass@example.com/image.jpg'), SafeUrlError);

  const blocked = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '192.168.0.1',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    'fec0::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
  ];

  for (const address of blocked) {
    assert.equal(isPublicIp(address), false, address);
  }

  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('2606:4700:4700::1111'), true);
});

test('SSRF policy validates every DNS answer and every redirect target', async () => {
  const mixedResolver = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ];

  await assert.rejects(
    resolveSafeTarget(new URL('https://example.com/image.jpg'), mixedResolver),
    /private or reserved/,
  );

  let requests = 0;
  const requester = async () => {
    requests += 1;
    return {
      statusCode: 302,
      headers: { location: 'http://127.0.0.1/private' },
      body: Buffer.alloc(0),
    };
  };

  await assert.rejects(
    safeFetchBuffer('https://example.com/image.jpg', {
      resolver: async () => [{ address: '93.184.216.34', family: 4 }],
      requester,
    }),
    /Private or reserved IP addresses are not allowed/,
  );
  assert.equal(requests, 1);
});

test('SSRF fetch enforces maximum response size', async () => {
  await assert.rejects(
    safeFetchBuffer('https://example.com/image.jpg', {
      maxSize: 4,
      resolver: async () => [{ address: '93.184.216.34', family: 4 }],
      requester: async () => ({
        statusCode: 200,
        headers: { 'content-type': 'image/png' },
        body: Buffer.alloc(5),
      }),
    }),
    /too large/,
  );
});
