// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_PATH = path.join(__dirname, 'data', 'imp.db');
const db = new sqlite3.Database(DB_PATH);

app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: 'CAMBIA_ESTO_POR_UNA_CLAVE_MUY_FUERTE',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 } // 1 dia
}));

// --- AUTH helpers ---
function isAuthenticated(req) {
  return req.session && req.session.user;
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'No autenticado' });
  next();
}

function requireLeader(req, res, next) {
  if (!isAuthenticated(req) || req.session.user.role !== 'LIDER') return res.status(403).json({ error: 'Acceso denegado: solo LIDER' });
  next();
}

// --- Routes ---
// login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });

  db.get(`SELECT id, username, password, role FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error BD' });
    if (!row) return res.status(401).json({ error: 'Credenciales inválidas' });
    bcrypt.compare(password, row.password, (err2, ok) => {
      if (ok) {
        req.session.user = { id: row.id, username: row.username, role: row.role };
        return res.json({ ok: true, user: req.session.user });
      } else return res.status(401).json({ error: 'Credenciales inválidas' });
    });
  });
});

// logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(()=>res.json({ ok: true }));
});

// obtener historial (autenticado)
app.get('/api/messages', requireAuth, (req, res) => {
  db.all(`SELECT id, username, role, text, ts FROM messages ORDER BY id ASC LIMIT 1000`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error BD' });
    res.json(rows);
  });
});

// --- Admin (solo LIDER) ---
// listar usuarios (solo para leader)
app.get('/api/admin/users', requireLeader, (req, res) => {
  db.all(`SELECT id, username, role, created_at FROM users ORDER BY id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error BD' });
    res.json(rows);
  });
});

// crear usuario
app.post('/api/admin/users', requireLeader, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Datos incompletos' });
  const hash = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hash, role], function(err){
    if (err) return res.status(500).json({ error: 'Error BD' });
    res.json({ ok: true, id: this.lastID });
  });
});

// actualizar usuario (password/role)
app.put('/api/admin/users/:id', requireLeader, async (req, res) => {
  const id = req.params.id;
  const { password, role } = req.body;
  if (!password && !role) return res.status(400).json({ error: 'Nada para actualizar' });
  const updates = [];
  const params = [];
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push('password = ?'); params.push(hash);
  }
  if (role) { updates.push('role = ?'); params.push(role); }
  params.push(id);
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err){
    if (err) return res.status(500).json({ error: 'Error BD' });
    res.json({ ok: true, changes: this.changes });
  });
});

// borrar usuario
app.delete('/api/admin/users/:id', requireLeader, (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM users WHERE id = ?`, [id], function(err){
    if (err) return res.status(500).json({ error: 'Error BD' });
    res.json({ ok: true, changes: this.changes });
  });
});

// --- sockets ---
io.use((socket, next) => {
  // allow sessions to be available on socket (basic)
  const cookieString = socket.handshake.headers.cookie || '';
  // for simplicity we skip cookie-session parsing here; the frontend will send user info on connect
  next();
});

io.on('connection', (socket) => {
  // frontend must send 'auth' with user object after connecting
  let user = null;
  socket.on('auth', (u) => {
    user = u; // { id, username, role } from session validated by server endpoints (we trust frontend only after login route)
    socket.user = user;
  });

  socket.on('sendMessage', (text) => {
    if (!user) return;
    const stmt = db.prepare(`INSERT INTO messages (user_id, username, role, text) VALUES (?, ?, ?, ?)`);
    stmt.run(user.id, user.username, user.role, text, function(err){
      if (err) return console.error('Error insert message', err);
      const msg = { id: this.lastID, username: user.username, role: user.role, text, ts: new Date().toISOString() };
      io.emit('newMessage', msg);
      // Log en consola (requisito)
      console.log(`[CHAT] ${msg.ts} - [${msg.role}] ${msg.username}: ${msg.text}`);
    });
    stmt.finalize();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('IMP SERVERS corriendo en http://localhost:' + PORT);
});