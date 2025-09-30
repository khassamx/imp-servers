// init_db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'imp.db');
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

const db = new sqlite3.Database(dbPath);

async function run() {
  const saltRounds = 10;
  db.serialize(async () => {
    db.run(`PRAGMA foreign_keys = ON;`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('LIDER','COLIDER','VETERANO','MIEMBRO')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      role TEXT,
      text TEXT,
      ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );`);

    // Pre-popular usuarios (si no existen)
    const defaults = [
      { user: 'Keko.imp', pass: 'Gta2045', role: 'LIDER' },
      { user: 'Aye_Russu', pass: 'hiro2025', role: 'COLIDER' },
      { user: 'Atlas', pass: '293749292', role: 'VETERANO' },
      { user: 'Naim', pass: 'tilin123', role: 'MIEMBRO' },
      { user: 'Oliver-imp', pass: '12831283', role: 'LIDER' },
      { user: 'Zoe', pass: 'psico2025', role: 'VETERANO' },
      { user: 'Mili', pass: 'miliCasa', role: 'MIEMBRO' },
      { user: 'Ayelen', pass: 'ayel2025', role: 'COLIDER' },
      { user: 'Ruben', pass: 'ruben321', role: 'MIEMBRO' },
      { user: 'Ainhoa', pass: 'ainhoPass', role: 'VETERANO' }
    ];

    for (const u of defaults) {
      const hash = await bcrypt.hash(u.pass, saltRounds);
      db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, [u.user, hash, u.role]);
    }

    console.log('Base de datos inicializada en', dbPath);
    db.close();
  });
}

run().catch(err => { console.error(err); db.close(); });