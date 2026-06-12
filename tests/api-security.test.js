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
const bcrypt = require('bcryptjs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = 'api-security-test-secret';

const testUserRows = [
  [
    'user-1',
    'tester',
    bcrypt.hashSync('tester-password', 4),
    'editor',
    '2026-01-01T00:00:00.000Z',
    '',
    'Test User',
    'avatar-id',
    'FALSE',
    '38666871',
    '',
    '',
    '',
    '',
    'active',
    '',
    '',
    '',
    '1',
  ],
  [
    'admin-1',
    'admin',
    bcrypt.hashSync('admin-password', 4),
    'admin',
    '2026-01-01T00:00:00.000Z',
    '',
    'Admin User',
    'penguin',
    'TRUE',
    '951753',
    '',
    '',
    '',
    '',
    'active',
    '',
    '',
    '',
    '1',
  ],
  [
    'disabled-1',
    'disabled',
    bcrypt.hashSync('disabled-password', 4),
    'viewer',
    '2026-01-01T00:00:00.000Z',
    '',
    'Disabled User',
    'panda',
    'FALSE',
    '123456',
    '',
    '',
    '',
    '',
    'disabled',
    '',
    '',
    '',
    '2',
  ],
  [
    'viewer-1',
    'viewer',
    bcrypt.hashSync('viewer-password', 4),
    'viewer',
    '2026-01-01T00:00:00.000Z',
    '',
    'View User',
    'koala',
    'FALSE',
    'legacy-value',
    '',
    '',
    '',
    '',
    'active',
    '',
    '',
    '',
    '1',
  ],
];
const appendedUserRows = [];
const accountBatchUpdates = [];

const googleSheetsPath = require.resolve('../server/utils/google-sheets');
require.cache[googleSheetsPath] = {
  id: googleSheetsPath,
  filename: googleSheetsPath,
  loaded: true,
  exports: {
    getValues: async (range, spreadsheetType) => {
      if (spreadsheetType === 'users' && range === 'Users!A2:S1000') {
        return testUserRows.map(row => [...row]);
      }
      return [[range, 'test-value']];
    },
    batchGetValues: async (ranges, spreadsheetType) => ranges.map(range => {
      if (spreadsheetType === 'users' && range === 'Users!A2:B1000') {
        return { range, values: testUserRows.map(row => row.slice(0, 2)) };
      }
      if (spreadsheetType === 'users' && range === 'Users!G2:H1000') {
        return { range, values: testUserRows.map(row => row.slice(6, 8)) };
      }
      if (spreadsheetType === 'users' && range === 'Users!O2:O1000') {
        return { range, values: testUserRows.map(row => row.slice(14, 15)) };
      }
      return { range, values: [] };
    }),
    updateValues: async () => ({ updatedRows: 1 }),
    appendValues: async (_range, values) => {
      appendedUserRows.push(...values.map(row => [...row]));
      return { updates: { updatedRows: values.length } };
    },
    batchUpdate: async (data) => {
      accountBatchUpdates.push(...data);
      return { totalUpdatedRows: data.length };
    },
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
const staleAdminToken = generateToken({
  id: 'admin-1',
  username: 'admin',
  role: 'admin',
  authVersion: 2,
});
const disabledToken = generateToken({
  id: 'disabled-1',
  username: 'disabled',
  role: 'viewer',
  authVersion: 2,
});
const viewerToken = generateToken({
  id: 'viewer-1',
  username: 'viewer',
  role: 'viewer',
});
const refreshToken = generateRefreshToken({
  id: 'user-1',
  username: 'tester',
});
const staleRefreshToken = generateRefreshToken({
  id: 'admin-1',
  username: 'admin',
  authVersion: 2,
});
const disabledRefreshToken = generateRefreshToken({
  id: 'disabled-1',
  username: 'disabled',
  authVersion: 2,
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

test('private Sheets rejects disabled and stale sessions', async () => {
  const disabled = await invoke(sheetsHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${disabledToken}` },
    body: { action: 'get', range: 'Brands!A:F', spreadsheetType: 'main' },
  }));
  assert.equal(disabled.statusCode, 401);

  const stale = await invoke(sheetsHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${staleAdminToken}` },
    body: { action: 'get', range: 'Brands!A:F', spreadsheetType: 'main' },
  }));
  assert.equal(stale.statusCode, 401);
});

test('viewer role can read Sheets but cannot write or upload to Drive', async () => {
  const read = await invoke(sheetsHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${viewerToken}` },
    body: { action: 'get', range: 'Brands!A:F', spreadsheetType: 'main' },
  }));
  assert.equal(read.statusCode, 200);

  const write = await invoke(sheetsHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${viewerToken}` },
    body: {
      action: 'update',
      range: 'Brands!A2:F2',
      values: [['test']],
      spreadsheetType: 'main',
    },
  }));
  assert.equal(write.statusCode, 403);

  const upload = await invoke(driveUploadHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${viewerToken}` },
  }));
  assert.equal(upload.statusCode, 403);
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

test('Drive endpoints reject disabled sessions before touching Drive', async () => {
  const cases = [
    [driveUploadHandler, createRequest({ method: 'POST' })],
    [drivePhotoHandler, createRequest({ method: 'POST' })],
    [driveReferencesHandler, createRequest({ method: 'POST' })],
    [driveReferencesHandler, createRequest({ method: 'GET' })],
    [driveReferencesHandler, createRequest({ method: 'DELETE' })],
    [driveImagesHandler, createRequest({ method: 'GET' })],
  ];

  for (const [handler, request] of cases) {
    request.headers = { authorization: `Bearer ${disabledToken}` };
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
  assert.deepEqual(authorized.body.users, [
    {
      id: 'user-1',
      username: 'tester',
      display_name: 'Test User',
      avatar: 'avatar-id',
    },
    {
      id: 'admin-1',
      username: 'admin',
      display_name: 'Admin User',
      avatar: 'penguin',
    },
    {
      id: 'viewer-1',
      username: 'viewer',
      display_name: 'View User',
      avatar: 'koala',
    },
  ]);
  assert.equal(JSON.stringify(authorized.body).includes('password'), false);
  assert.equal(JSON.stringify(authorized.body).includes('"role"'), false);
});

test('auth rejects disabled accounts and stale auth versions', async () => {
  const disabled = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${disabledToken}` },
    body: { action: 'profile' },
  }));
  assert.equal(disabled.statusCode, 401);

  const stale = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${staleAdminToken}` },
    body: { action: 'listAccounts' },
  }));
  assert.equal(stale.statusCode, 401);
});

test('login returns an access token and blocks disabled accounts', async () => {
  const login = await invoke(authHandler, createRequest({
    method: 'POST',
    body: {
      action: 'login',
      username: 'tester',
      password: 'tester-password',
    },
  }));
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.status, 'active');
  assert.equal(requireAccessToken(createRequest({
    headers: { authorization: `Bearer ${login.body.token}` },
  }), createResponse()).type, 'access');

  const disabledLogin = await invoke(authHandler, createRequest({
    method: 'POST',
    body: {
      action: 'login',
      username: 'disabled',
      password: 'disabled-password',
    },
  }));
  assert.equal(disabledLogin.statusCode, 401);
});

test('login rate limit returns 429 after repeated invalid attempts', async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await invoke(authHandler, createRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.10' },
      body: {
        action: 'login',
        username: 'rate-limited-user',
        password: 'wrong-password',
      },
    }));
    assert.equal(response.statusCode, 401);
  }

  const blocked = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.10' },
    body: {
      action: 'login',
      username: 'rate-limited-user',
      password: 'wrong-password',
    },
  }));
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
});

test('refresh rotates tokens and rejects stale, disabled or wrong token types', async () => {
  const refreshed = await invoke(authHandler, createRequest({
    method: 'POST',
    body: {
      action: 'refresh',
      refreshToken,
    },
  }));
  assert.equal(refreshed.statusCode, 200);
  assert.equal(refreshed.body.user.username, 'tester');
  assert.equal(requireAccessToken(createRequest({
    headers: { authorization: `Bearer ${refreshed.body.token}` },
  }), createResponse()).type, 'access');

  const invalidCases = [
    staleRefreshToken,
    disabledRefreshToken,
    accessToken,
  ];
  for (const token of invalidCases) {
    const response = await invoke(authHandler, createRequest({
      method: 'POST',
      body: {
        action: 'refresh',
        refreshToken: token,
      },
    }));
    assert.equal(response.statusCode, 401);
  }
});

test('account management is admin-only and never returns password hashes', async () => {
  const editorList = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: { action: 'listAccounts' },
  }));
  assert.equal(editorList.statusCode, 403);

  const adminList = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { action: 'listAccounts' },
  }));
  assert.equal(adminList.statusCode, 200);
  assert.equal(adminList.body.accounts.length, 4);
  assert.equal(JSON.stringify(adminList.body).includes('passwordHash'), false);

  const create = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      action: 'createAccount',
      username: 'new.user',
      password: 'new-user-password',
      display_name: 'New User',
      role: 'viewer',
      avatar: 'panda',
      menu: false,
    },
  }));
  assert.equal(create.statusCode, 201);
  assert.equal(create.body.account.username, 'new.user');
  assert.equal(appendedUserRows.length, 1);
  assert.notEqual(appendedUserRows[0][2], 'new-user-password');
  assert.equal(await bcrypt.compare('new-user-password', appendedUserRows[0][2]), true);
});

test('account management protects the current and last active administrator', async () => {
  const response = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      action: 'updateAccount',
      id: 'admin-1',
      role: 'editor',
    },
  }));
  assert.equal(response.statusCode, 409);
});

test('users can update profile and change their own password', async () => {
  const profile = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: {
      action: 'updateProfile',
      display_name: 'Updated User',
      avatar: 'otter',
      menu: true,
    },
  }));
  assert.equal(profile.statusCode, 200);
  assert.equal(profile.body.user.display_name, 'Updated User');

  const wrongPassword = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: {
      action: 'changePassword',
      currentPassword: 'wrong-password',
      newPassword: 'replacement-password',
    },
  }));
  assert.equal(wrongPassword.statusCode, 401);

  const changed = await invoke(authHandler, createRequest({
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: {
      action: 'changePassword',
      currentPassword: 'tester-password',
      newPassword: 'replacement-password',
    },
  }));
  assert.equal(changed.statusCode, 200);
  assert.equal(accountBatchUpdates.some(item => item.range === 'Users!C2'), true);
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
