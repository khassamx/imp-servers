// src/routes.js
const express = require('express');
const router = express.Router(); 
const bcrypt = require('bcryptjs'); // ¡CAMBIO CLAVE: Usamos la versión JS!
const { db } = require('./db'); 

// ----------------------------------------------------
// 1. ENDPOINT DE REGISTRO (POST /register)
// ----------------------------------------------------
router.post('/register', async (req, res) => {
    const { username, password, alias } = req.body; 
    if (!username || !password || !alias) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }
    try {
        const hash = await bcrypt.hash(password, 10); // bcryptjs hash
        const defaultRole = 'MIEMBRO'; 
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
               [username, hash, defaultRole], 
               function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ success: false, message: 'El Usuario ya existe.' });
                }
                console.error("Error al insertar usuario:", err);
                return res.status(500).json({ success: false, message: 'Error interno al registrar.' });
            }
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
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, username, password, role FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });

        try {
            const match = await bcrypt.compare(password, user.password); // bcryptjs compare
            if (match) {
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
router.get('/messages', (req, res) => {
    db.all(`SELECT id, username, role, text AS message, ts AS timestamp FROM messages ORDER BY ts ASC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al cargar mensajes.' });
        }
        res.json(rows);
    });
});

router.post('/messages', (req, res) => {
    const { alias, role, text } = req.body; 
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

module.exports = router;