// server/utils/safe-url-fetch.js

// =========================================================================
// SSRF-SAFE REMOTE FILE FETCH
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Безпечне завантаження віддаленого файлу для upload-by-URL без доступу
// до localhost, приватних, link-local або зарезервованих мереж.
//
// ЕКСПОРТИ:
// - safeFetchBuffer(url, options): завантажує файл з лімітами.
// - parseSafeUrl(url): перевіряє схему та credentials.
// - resolveSafeTarget(url, resolver): перевіряє DNS/IP.
// - isPublicIp(address): визначає, чи IP дозволений для зовнішнього fetch.
//
// ПОЛІТИКА БЕЗПЕКИ:
// - Тільки HTTP/HTTPS, без credentials у URL.
// - Перевірка всіх DNS-відповідей і кожного redirect.
// - Перевірена IP-адреса закріплюється через custom lookup у http/https.
// - Спільний timeout, ліміт redirect-ів і максимального розміру відповіді.
// =========================================================================

const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

class SafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SafeUrlError';
  }
}

async function safeFetchBuffer(input, options = {}) {
  const maxSize = options.maxSize || 4 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 3;
  const timeoutMs = options.timeoutMs || 10000;
  const resolver = options.resolver || resolvePublicAddress;
  const requester = options.requester || requestOnce;
  const deadline = Date.now() + timeoutMs;

  let currentUrl = parseSafeUrl(input);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const dnsTime = deadline - Date.now();
    if (dnsTime <= 0) {
      throw new SafeUrlError('Remote request timed out');
    }

    const target = await withTimeout(
      resolveSafeTarget(currentUrl, resolver),
      dnsTime,
      'Hostname resolution timed out',
    );
    const remainingTime = deadline - Date.now();

    if (remainingTime <= 0) {
      throw new SafeUrlError('Remote request timed out');
    }

    const response = await requester(currentUrl, target, {
      maxSize,
      timeoutMs: remainingTime,
    });

    if (isRedirect(response.statusCode)) {
      const location = response.headers.location;
      if (!location) {
        throw new SafeUrlError('Redirect response is missing Location header');
      }
      if (redirectCount === maxRedirects) {
        throw new SafeUrlError('Too many redirects');
      }

      currentUrl = parseSafeUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new SafeUrlError(`Remote server returned ${response.statusCode}`);
    }

    if (response.body.length > maxSize) {
      throw new SafeUrlError('Remote file is too large');
    }

    return {
      buffer: response.body,
      contentType: response.headers['content-type'] || '',
      finalUrl: currentUrl.toString(),
    };
  }

  throw new SafeUrlError('Too many redirects');
}

function parseSafeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new SafeUrlError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeUrlError('Only http and https URLs are allowed');
  }

  if (url.username || url.password) {
    throw new SafeUrlError('URL credentials are not allowed');
  }

  return url;
}

async function resolveSafeTarget(url, resolver) {
  const hostname = normalizeHostname(url.hostname);

  if (isLocalHostname(hostname)) {
    throw new SafeUrlError('Local hostnames are not allowed');
  }

  const literalFamily = net.isIP(hostname);
  if (literalFamily) {
    if (!isPublicIp(hostname)) {
      throw new SafeUrlError('Private or reserved IP addresses are not allowed');
    }
    return { address: hostname, family: literalFamily };
  }

  const records = await resolver(hostname);
  if (!Array.isArray(records) || records.length === 0) {
    throw new SafeUrlError('Hostname did not resolve');
  }

  if (records.some(record => !isPublicIp(record.address))) {
    throw new SafeUrlError('Hostname resolves to a private or reserved IP address');
  }

  return records[0];
}

async function resolvePublicAddress(hostname) {
  try {
    return await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeUrlError('Hostname resolution failed');
  }
}

function requestOnce(url, target, options) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        Accept: 'image/*',
        Host: url.host,
      },
      lookup: createPinnedLookup(target),
      servername: net.isIP(normalizeHostname(url.hostname))
        ? undefined
        : normalizeHostname(url.hostname),
    }, (response) => {
      const contentLength = Number(response.headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > options.maxSize) {
        response.resume();
        reject(new SafeUrlError('Remote file is too large'));
        return;
      }

      const chunks = [];
      let size = 0;

      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > options.maxSize) {
          response.destroy(new SafeUrlError('Remote file is too large'));
          return;
        }
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          headers: response.headers,
          body: Buffer.concat(chunks),
        });
      });

      response.on('error', reject);
    });

    request.setTimeout(options.timeoutMs, () => {
      request.destroy(new SafeUrlError('Remote request timed out'));
    });
    request.on('error', (error) => {
      reject(error instanceof SafeUrlError ? error : new SafeUrlError('Remote request failed'));
    });
    request.end();
  });
}

function createPinnedLookup(target) {
  return (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, [{ address: target.address, family: target.family }]);
      return;
    }
    callback(null, target.address, target.family);
  };
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isLocalHostname(hostname) {
  return hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal');
}

function isPublicIp(address) {
  const family = net.isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

function isPublicIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  const [a, b, c] = octets;
  return !(
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224
  );
}

function isPublicIpv6(address) {
  const normalized = address.toLowerCase();
  const mappedIpv4 = extractMappedIpv4(normalized);
  if (mappedIpv4) return isPublicIpv4(mappedIpv4);

  const value = ipv6ToBigInt(normalized);
  if (value === null) return false;

  return !(
    isIpv6InSubnet(value, '::', 128)
    || isIpv6InSubnet(value, '::1', 128)
    || isIpv6InSubnet(value, '::', 96)
    || isIpv6InSubnet(value, '::ffff:0:0', 96)
    || isIpv6InSubnet(value, 'fc00::', 7)
    || isIpv6InSubnet(value, 'fe80::', 10)
    || isIpv6InSubnet(value, 'fec0::', 10)
    || isIpv6InSubnet(value, 'ff00::', 8)
    || isIpv6InSubnet(value, '2001:db8::', 32)
  );
}

function extractMappedIpv4(address) {
  const match = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return match ? match[1] : null;
}

function isIpv6InSubnet(value, subnet, prefixLength) {
  const subnetValue = ipv6ToBigInt(subnet);
  const shift = BigInt(128 - prefixLength);
  return (value >> shift) === (subnetValue >> shift);
}

function ipv6ToBigInt(address) {
  if (address.includes('.')) return null;

  const halves = address.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;

  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;

  const parts = halves.length === 2
    ? [...left, ...Array(missing).fill('0'), ...right]
    : left;

  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) {
    return null;
  }

  return parts.reduce((result, part) => (result << 16n) + BigInt(`0x${part}`), 0n);
}

function isRedirect(statusCode) {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SafeUrlError(message)), timeoutMs);
    timer.unref?.();

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

module.exports = {
  SafeUrlError,
  isPublicIp,
  parseSafeUrl,
  resolveSafeTarget,
  safeFetchBuffer,
};
