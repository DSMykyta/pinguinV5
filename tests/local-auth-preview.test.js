const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LOCAL_AUTH_PREVIEW_TOKEN,
  createLocalPreviewAccount,
  isLocalAuthPreviewRequest,
} = require('../server/utils/local-auth-preview');

function request(host, token = LOCAL_AUTH_PREVIEW_TOKEN, extraHeaders = {}) {
  return {
    headers: {
      host,
      authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  };
}

function withEnvironment(values, callback) {
  const previous = {};
  Object.entries(values).forEach(([key, value]) => {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    callback();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

test('local auth preview requires explicit flag, loopback host and preview token', () => {
  withEnvironment({ LOCAL_AUTH_BYPASS: 'true', VERCEL_ENV: undefined }, () => {
    assert.equal(isLocalAuthPreviewRequest(request('localhost:3000')), true);
    assert.equal(isLocalAuthPreviewRequest(request('127.0.0.1:3000')), true);
    assert.equal(isLocalAuthPreviewRequest(request('[::1]:3000')), true);
    assert.equal(isLocalAuthPreviewRequest(request('localhost:3000', 'wrong')), false);
    assert.equal(isLocalAuthPreviewRequest(request('pinguin-v5.vercel.app')), false);
  });
});

test('local auth preview stays disabled on Vercel Preview and Production', () => {
  for (const vercelEnv of ['preview', 'production']) {
    withEnvironment({ LOCAL_AUTH_BYPASS: 'true', VERCEL_ENV: vercelEnv }, () => {
      assert.equal(isLocalAuthPreviewRequest(request('localhost:3000')), false);
    });
  }
});

test('local auth preview is disabled by default and exposes a complete admin profile', () => {
  withEnvironment({ LOCAL_AUTH_BYPASS: undefined, VERCEL_ENV: undefined }, () => {
    assert.equal(isLocalAuthPreviewRequest(request('localhost:3000')), false);
  });

  const account = createLocalPreviewAccount();
  assert.equal(account.role, 'admin');
  assert.equal(account.status, 'active');
  assert.ok(account.capabilities.includes('accounts.manage'));
});
