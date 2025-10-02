// init_db.js
// CAMBIO CLAVE: Usamos la librería 'sqlite' más simple
const sqlite = require('sqlite'); 
const sqliteDriver = require('sqlite3'); // Necesario como driver para 'sqlite'
const bcrypt = require('bcryptjs'); 
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'imp.db');

// Asegurar que el directorio 'data' exista
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

async function initializeDatabase() {
    let db;
    try {
        // Conexión asíncrona usando la nueva librería
        db = await sqlite.open({
            filename: dbPath,
            driver: sqliteDriver.Database // Usamos el driver sqlite3 que es más fácil de instalar a veces
        });

        console.log(`✅ Base de datos abierta: ${dbPath}`);

        // Crear la tabla de usuarios
        await db.exec(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);

        // Crear la tabla de mensajes
        await db.exec(`CREATE TABLE IF NOT EXISTS messages (
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
        const passwordHash = await bcrypt.hash('Gta2045', 10); 
        
        const usersToInsert = [
            // Usuarios (username, password, role)
            ['Keko.imp', passwordHash, 'LIDER'],
            ['Veterano', passwordHash, 'VETERANO'],
            ['Miembro01', passwordHash, 'MIEMBRO']
        ];

        for (const [username, password, role] of usersToInsert) {
            await db.run("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)", 
                         username, password, role);
        }

        console.log('✅ Usuarios iniciales y tablas creadas/verificadas.');

    } catch (error) {
        console.error('❌ Error fatal al inicializar la base de datos:', error);
    } finally {
        if (db) {
            // El driver 'sqlite' no tiene un método 'close' simple, pero generalmente es manejado por Node.
            // Para Termux, no cerraremos la DB en init_db.js para evitar errores, pero si lo haremos en server.js
            console.log('Finalizada la inicialización.');
        }
    }
}

initializeDatabase();