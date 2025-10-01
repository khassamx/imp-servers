// Servidor de Chat Persistente con Node.js y Express
// 💡 SOLUCIÓN FINAL para 'Cannot GET /' y Persistencia

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 

// ----------------------------------------------------
// 1. CONFIGURACIÓN CRUCIAL (Soluciona 'Cannot GET /')
// ----------------------------------------------------

// Middleware para parsear JSON de las peticiones POST
app.use(express.json());

// 💡 LÍNEA CLAVE: Indica a Express que debe buscar archivos estáticos
// (como index.html, CSS, JS) dentro de la carpeta 'public'.
app.use(express.static(path.join(__dirname, 'public'))); 

// Ruta del archivo de mensajes (persistencia de datos)
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// ----------------------------------------------------
// 2. Funciones de Persistencia
// ----------------------------------------------------

function loadMessages() {
    try {
        // Lee y parsea el historial de mensajes
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe o falla, retorna un array vacío
        return [];
    }
}

function saveMessages(messages) {
    // Guarda el array completo de mensajes en messages.json
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// ----------------------------------------------------
// 3. ENDPOINTS (Rutas de API para el Chat)
// ----------------------------------------------------

// 1. GET /messages: Retorna todo el historial de mensajes
app.get('/messages', (req, res) => {
    const messages = loadMessages();
    res.json(messages);
});

// 2. POST /messages: Recibe un nuevo mensaje y lo guarda
app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    // Validación de datos mínimos
    if (!newMessage || !newMessage.alias || !newMessage.text || !newMessage.rank) {
        return res.status(400).json({ error: 'Faltan campos (alias, text, rank) en el mensaje.' });
    }
    
    const messages = loadMessages();
    
    // Añadir el mensaje con marca de tiempo
    messages.push({ ...newMessage, timestamp: new Date().toISOString() });
    
    saveMessages(messages);
    
    // Devolvemos un status 201 (Created)
    res.status(201).json(messages); 
});

// ----------------------------------------------------
// 4. Inicio del Servidor
// ----------------------------------------------------

app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ Servidor de Chat (Node.js/Express) INICIADO`);
    console.log(` 🔑 COMPARTIR USANDO: http://192.168.100.101:${port}`);
    console.log(`======================================================\n`);
});