// =========================================================
// 🌐 IMP CHAT SERVER v4.1: EXPRESS + SQLITE + BCRYPT
// Soporte para Login Seguro y Persistencia de Mensajes
// =========================================================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const dbPath = path.join(__dirname, 'data', 'imp.db'); 

// 🚨 CONEXIÓN A LA BASE DE DATOS
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        // Si falla la conexión, el servidor no puede arrancar
        process.exit(1); 
    } else {
        console.log('✅ Conectado a la base de datos SQLite.');
    }
});

// ----------------------------------------------------
// MIDDLEWARE & RUTA ESTÁTICA
// ----------------------------------------------------
app.use(express.json());
app.use(express.static(PUBLIC_DIR));


// ----------------------------------------------------
// 1. ENDPOINT DE REGISTRO (POST /register)
// ----------------------------------------------------
app.post('/register', async (req, res) => {
    // Nota: Aquí solo guardamos username, password y un rol por defecto. 
    // Los campos extra (país, WhatsApp) deben guardarse en tablas o campos adicionales.
    const { username, password, alias } = req.body; 

    if (!username || !password || !alias) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const defaultRole = 'MIEMBRO'; // Asignar rol por defecto

        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
               [username, hash, defaultRole], 
               function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ success: false, message: 'El usuario ya existe.' });
                }
                console.error("Error al insertar usuario:", err);
                return res.status(500).json({ success: false, message: 'Error al registrar.' });
            }
            return res.status(201).json({ success: true, alias: alias, role: defaultRole });
        });
    } catch (error) {
        console.error("Error de bcrypt o DB:", error);
        res.status(500).json({ success: false, message: 'Error interno de registro.' });
    }
});


// ----------------------------------------------------
// 2. ENDPOINT DE AUTENTICACIÓN (POST /login)
// ----------------------------------------------------
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT id, username, password, role FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });

        try {
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                // Éxito: Nota: En la DB de init_db.js, el alias está en 'username'.
                return res.json({ success: true, alias: user.username, role: user.role });
            } else {
                return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
            }
        } catch (error) {
            console.error("Error al comparar hash:", error);
            res.status(500).json({ success: false, message: 'Error de autenticación.' });
        }
    });
});


// ----------------------------------------------------
// 3. ENDPOINTS DE MENSAJES (GET /messages, POST /messages)
// ----------------------------------------------------

app.get('/messages', (req, res) => {
    // Usamos el campo 'text' de la DB como 'message' para compatibilidad con app.js
    db.all(`SELECT id, username, role, text AS message, ts FROM messages ORDER BY ts ASC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cargar mensajes.' });
        }
        res.json(rows);
    });
});

app.post('/messages', (req, res) => {
    // El frontend envía alias y role (usaremos alias como username en la DB)
    const { alias, role, text } = req.body; 
    
    // Necesitas asegurarte de que el usuario existe antes de insertar el mensaje
    db.get('SELECT id FROM users WHERE username = ?', [alias], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Usuario no autenticado para enviar mensaje.' });
        }

        const user_id = user.id;

        db.run(`INSERT INTO messages (user_id, username, role, text) VALUES (?, ?, ?, ?)`, 
               [user_id, alias, role, text], 
               function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error al guardar el mensaje.' });
            }
            res.status(201).json({ id: this.lastID, alias, role, text, ts: new Date().toISOString() });
        });
    });
});


// ----------------------------------------------------
// INICIO DEL SERVIDOR
// ----------------------------------------------------
app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ IMP Chat Server (SQLite) CORRIENDO en Termux`);
    console.log(` 🌐 Acceso Habilitado en puerto: ${port}`);
    console.log(` 🔑 Compartir con: http://[TU_IP_LOCAL]:${port}`);
    console.log(`======================================================\n`);
});

// Cierre seguro de la base de datos
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error("Error al cerrar DB:", err.message);
        console.log('\nBase de datos cerrada. Servidor apagado.');
        process.exit(0);
    });
});