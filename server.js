// Servidor de Chat Persistente con Node.js y Express (Optimizado para Termux)
// Este código maneja la persistencia de los mensajes en el archivo 'messages.json'.

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; // Escucha en todas las interfaces para acceso externo

// ----------------------------------------------------
// Configuración
// ----------------------------------------------------

// Middleware para parsear JSON de las peticiones POST
app.use(express.json());

// Servir archivos estáticos (index.html, CSS, etc.) desde la carpeta actual
app.use(express.static(path.join(__dirname)));

// Ruta del archivo de mensajes (persistencia de datos)
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// ----------------------------------------------------
// Funciones de Persistencia (FileSystem)
// ----------------------------------------------------

/**
 * Carga el array de mensajes desde messages.json.
 * Si el archivo no existe o está vacío, retorna un array vacío.
 */
function loadMessages() {
    try {
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Ignorar error si el archivo no existe (simplemente es la primera vez)
        return [];
    }
}

/**
 * Guarda el array completo de mensajes en messages.json.
 */
function saveMessages(messages) {
    // Usamos null, 2 para formatear el JSON, haciéndolo legible en el archivo.
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// ----------------------------------------------------
// ENDPOINTS (Rutas) del Chat
// ----------------------------------------------------

// 1. GET /messages: Retorna todo el historial de mensajes
app.get('/messages', (req, res) => {
    const messages = loadMessages();
    res.json(messages);
});

// 2. POST /messages: Recibe un nuevo mensaje desde el frontend y lo guarda
app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    // Validación de datos mínimos
    if (!newMessage || !newMessage.alias || !newMessage.text || !newMessage.rank) {
        return res.status(400).json({ error: 'Faltan campos (alias, text, rank) en el mensaje.' });
    }
    
    const messages = loadMessages();
    
    // Añadir el mensaje y la marca de tiempo (opcional, pero útil)
    messages.push({ ...newMessage, timestamp: new Date().toISOString() });
    
    saveMessages(messages);
    
    // 💡 IMPORTANTE: Devolvemos el array completo al frontend.
    // Aunque el frontend solo necesita un 201 OK, devolver el array puede ser útil.
    res.status(201).json(messages); 
});

// ----------------------------------------------------
// Inicio del Servidor
// ----------------------------------------------------

app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ Servidor de Chat (Node.js/Express) CORRIENDO en Termux`);
    console.log(` 🌐 Acceso Habilitado en puerto: ${port}`);
    console.log(` 🔑 COMPARTIR con otros usando: http://[TU_IP_LOCAL]:${port}`);
    console.log(`======================================================\n`);
});
