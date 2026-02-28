// js/auth/auth-drive-token.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     AUTH — DRIVE TOKEN                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — OAuth2 refresh token для Google Drive (CLI-скрипт)           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

//
// Одноразовий скрипт для отримання OAuth2 refresh token для Google Drive.
//
// ВИКОРИСТАННЯ:
//   node auth/auth-drive-token.js <CLIENT_ID> <CLIENT_SECRET>
//
// Скрипт:
// 1. Генерує URL для авторизації
// 2. Відкриває його в браузері
// 3. Після авторизації — вставити код з URL
// 4. Виводить refresh_token для збереження в Vercel env vars

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Використання: node auth/auth-drive-token.js <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n════════════════════════════════════════════════════════');
console.log('  Google Drive OAuth2 — отримання refresh token');
console.log('════════════════════════════════════════════════════════\n');
console.log('Відкрий цей URL в браузері:\n');
console.log(authUrl);
console.log('\nОчікую авторизацію на http://localhost:3333 ...\n');

// Локальний сервер для отримання коду
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/callback') {
    const code = parsedUrl.query.code;

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Помилка: код авторизації не отримано</h1>');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Готово! Повернись в термінал.</h1><p>Можеш закрити цю вкладку.</p>');

      console.log('════════════════════════════════════════════════════════');
      console.log('  REFRESH TOKEN (скопіюй і додай в Vercel env vars):');
      console.log('════════════════════════════════════════════════════════\n');
      console.log('Ключ:     GOOGLE_OAUTH_REFRESH_TOKEN');
      console.log('Значення:', tokens.refresh_token);
      console.log('\n════════════════════════════════════════════════════════\n');

      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>Помилка</h1><pre>${err.message}</pre>`);
      console.error('Помилка отримання токену:', err.message);
    }
  }
});

server.listen(3333);
