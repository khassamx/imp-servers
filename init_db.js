// init_db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); // ¡CAMBIO CLAVE: Usamos la versión JS!
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'imp.db');

// Asegurar que el directorio 'data' exista
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('❌ Error al abrir la base de datos:', err.message);
        return;
    }
    console.log(`✅ Base de datos abierta: ${dbPath}`);

    // Crear la tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )`);

    // Crear la tabla de mensajes
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // =========================================================
    // 🛡️ Insertar Usuarios Iniciales con Hash Seguro (bcryptjs)
    // =========================================================
    try {
        const passwordHash = await bcrypt.hash('Gta2045', 10); // Hash de la contraseña 'Gta2045'
        
        const usersToInsert = [
            // Usuarios (username, password, role)
            ['Keko.imp', passwordHash, 'LIDER'],
            ['Veterano', passwordHash, 'VETERANO'],
            ['Miembro01', passwordHash, 'MIEMBRO']
        ];

        db.serialize(() => {
            const stmt = db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)");
            usersToInsert.forEach(user => {
                stmt.run(user);
            });
            stmt.finalize();
        });

        console.log('✅ Usuarios iniciales y tablas creadas/verificadas.');

    } catch (error) {
        console.error('❌ Error al hashear contraseñas o insertar usuarios:', error);
    } finally {
        // Cerrar la conexión después de la inicialización
        db.close((closeErr) => {
            if (closeErr) {
                console.error('Error al cerrar DB:', closeErr.message);
            }
            console.log('Base de datos cerrada.');
        });
    }
});