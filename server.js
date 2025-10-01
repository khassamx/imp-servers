// Servidor de Chat Simple con Node.js y Express (Para Termux)

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; // 💡 ¡CAMBIO CLAVE! Esto permite que otros se conecten a tu IP.

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos (index.html, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Ruta del archivo de mensajes
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Función para cargar mensajes
function loadMessages() {
    try {
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Función para guardar mensajes
function saveMessages(messages) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// ----------------------------------------------------
// ENDPOINTS DEL CHAT
// ----------------------------------------------------

// 1. GET /messages: Retorna todos los mensajes (Historial)
app.get('/messages', (req, res) => {
    const messages = loadMessages();
    // 💡 NOTA: Los mensajes se envían en el orden en que se guardaron.
    res.json(messages);
});

// 2. POST /messages: Recibe y guarda un nuevo mensaje
app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    if (!newMessage || !newMessage.alias || !newMessage.text) {
        return res.status(400).send({ error: 'Faltan datos en el mensaje.' });
    }
    
    const messages = loadMessages();
    messages.push(newMessage);
    saveMessages(messages);
    
    // Devolvemos el array completo para que el frontend no tenga que recargar todo
    res.status(201).json(messages); 
});

// Iniciar el servidor
app.listen(port, HOST, () => {
    console.log(`\n===================================`);
    console.log(` Servidor de Chat corriendo en Termux`);
    console.log(` 🔑 ACCESO EXTERNO Habilitado en puerto ${port}`);
    console.log(` Presiona CTRL+C para detener.`);
    console.log(`===================================\n`);
});
