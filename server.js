// =========================================================
// 🌐 IMP CHAT SERVER v5.0: EXPRESS + SQLITE + BCRYPT
// Sistema robusto con persistencia en Base de Datos.
// =========================================================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const dbPath = path.join(__dirname, 'data', 'imp.db'); 

// 🚨 CONEXIÓN A LA BASE DE DATOS
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        // Si hay un error crítico al conectar la DB, salimos del proceso.
        console.error('❌ Error crítico al conectar con la base de datos:', err.message);
        process.exit(1); 
    } else {
        console.log('✅ Conectado a la base de datos SQLite.');
    }
});

// ----------------------------------------------------
// MIDDLEWARE & RUTA ESTÁTICA
// ----------------------------------------------------
app.use(express.json()); // Habilita la lectura de JSON en el cuerpo de las peticiones.
app.use(express.static(PUBLIC_DIR)); // Sirve el index.html y otros archivos estáticos.


// ----------------------------------------------------
// 1. ENDPOINT DE REGISTRO (POST /register)
// ----------------------------------------------------
app.post('/register', async (req, res) => {
    // Usamos 'username' para el login y 'alias' para mostrar en el chat.
    const { username, password, alias } = req.body; 

    if (!username || !password || !alias) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: Usuario, Contraseña y Alias.' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const defaultRole = 'MIEMBRO'; 

        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
               [username, hash, defaultRole], 
               function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ success: false, message: 'El Usuario ya existe. Por favor, elige otro.' });
                }
                console.error("Error al insertar usuario:", err);
                return res.status(500).json({ success: false, message: 'Error interno al registrar.' });
            }
            // Devuelve el alias y rol del usuario recién creado
            return res.status(201).json({ success: true, alias: alias, role: defaultRole });
        });
    } catch (error) {
        console.error("Error de bcrypt o DB:", error);
        res.status(500).json({ success: false, message: 'Error de proceso interno de registro.' });
    }
});


// ----------------------------------------------------
// 2. ENDPOINT DE AUTENTICACIÓN (POST /login)
// ----------------------------------------------------
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT id, username, password, role FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado o clave secreta incorrecta.' });

        try {
            // Compara la contraseña enviada con el hash almacenado
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                // Éxito: Nota: Usamos 'username' como el 'alias' para el chat (por la estructura de init_db.js).
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
// 3. ENDPOINTS DE MENSAJES
// ----------------------------------------------------

// GET /messages: Carga el historial de mensajes
app.get('/messages', (req, res) => {
    // text AS message y ts AS timestamp para ser más compatible con la UI
    db.all(`SELECT id, username, role, text AS message, ts AS timestamp FROM messages ORDER BY ts ASC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cargar mensajes.' });
        }
        res.json(rows);
    });
});

// POST /messages: Envía un nuevo mensaje
app.post('/messages', (req, res) => {
    const { alias, role, text } = req.body; 
    
    // Buscar el ID del usuario por su alias/username
    db.get('SELECT id FROM users WHERE username = ?', [alias], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Usuario no autenticado o no encontrado para enviar mensaje.' });
        }

        const user_id = user.id;

        db.run(`INSERT INTO messages (user_id, username, role, text) VALUES (?, ?, ?, ?)`, 
               [user_id, alias, role, text], 
               function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error al guardar el mensaje.' });
            }
            // Retornamos el mensaje guardado con su nuevo ID y timestamp
            res.status(201).json({ 
                id: this.lastID, 
                alias, 
                role, 
                text, 
                timestamp: new Date().toISOString() 
            });
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

// Cierre seguro de la base de datos al apagar el servidor (Ctrl+C)
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error("Error al cerrar DB:", err.message);
        console.log('\nBase de datos cerrada. Servidor apagado.');
        process.exit(0);
    });
});