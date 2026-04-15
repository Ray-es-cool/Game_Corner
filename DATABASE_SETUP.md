const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const DB_FILE = './users.json';

// Load users
function loadUsers() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// Save users
function saveUsers(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// SIGNUP
app.post('/api/users/signup', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  if (users[username]) {
    return res.json({ success: false, error: 'User exists' });
  }

  const hash = await bcrypt.hash(password, 10);

  users[username] = {
    pass: hash,
    tokens: 0,
    data: {}
  };

  saveUsers(users);

  res.json({ success: true });
});

// LOGIN
app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users[username];

  if (!user) {
    return res.json({ success: false });
  }

  const match = await bcrypt.compare(password, user.pass);

  if (!match) {
    return res.json({ success: false });
  }

  res.json({
    success: true,
    username,
    tokens: user.tokens
  });
});

// GET USER
app.get('/api/users/:username', (req, res) => {
  const users = loadUsers();
  const user = users[req.params.username];

  if (!user) return res.json({ success: false });

  res.json({
    success: true,
    tokens: user.tokens,
    data: user.data
  });
});

// UPDATE USER
app.post('/api/users/:username', (req, res) => {
  const users = loadUsers();
  const user = users[req.params.username];

  if (!user) return res.json({ success: false });

  const { tokens, data } = req.body;

  if (tokens !== undefined) user.tokens = tokens;
  if (data !== undefined) user.data = data;

  saveUsers(users);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});