const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../utils/cors');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { getValues, updateValues } = require('../utils/google-sheets');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Валідація вхідних даних
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Читання користувачів з Google Sheets
    const usersData = await getValues('Users!A2:F1000'); // A=id, B=username, C=password_hash, D=role, E=created_at, F=last_login

    // Пошук користувача
    const userRow = usersData.find(row => row[1] === username);

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const [id, storedUsername, passwordHash, role, createdAt] = userRow;

    // Перевірка пароля
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Генерація токенів
    const user = { id, username: storedUsername, role };
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Оновлення last_login в Google Sheets
    const userRowIndex = usersData.indexOf(userRow) + 2; // +2 because header row and 0-based index
    const now = new Date().toISOString();
    await updateValues(`Users!F${userRowIndex}`, [[now]]);

    // Повернення токенів та інформації про користувача
    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id,
        username: storedUsername,
        role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
