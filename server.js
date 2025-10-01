// Servidor de Chat Persistente con Node.js y Express
// 💡 SOLUCIÓN para Estabilidad y Verificación de 'messages.json'

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// ----------------------------------------------------
// 1. CONFIGURACIÓN INICIAL Y ESTÁTICA
// ----------------------------------------------------

// Middleware para parsear JSON de las peticiones POST
app.use(express.json());

// 💡 Configuración para servir archivos estáticos (index.html, CSS, JS)
// Express buscará los archivos dentro de la carpeta 'public'.
app.use(express.static(path.join(__dirname, 'public'))); 

// ----------------------------------------------------
// 2. Funciones de Persistencia Seguras
// ----------------------------------------------------

function loadMessages() {
    try {
        // 🚨 VERIFICACIÓN CRUCIAL: Si el archivo NO existe, créalo con un array vacío.
        if (!fs.existsSync(MESSAGES_FILE)) {
            console.warn('Advertencia: messages.json no encontrado. Creando archivo vacío...');
            fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
        }
        
        // Lee y parsea el historial de mensajes
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al cargar mensajes. Retornando array vacío:', error.message);
        return [];
    }
}

function saveMessages(messages) {
    try {
        // Guarda el array completo de mensajes con formato (indentación de 2)
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    } catch (error) {
        console.error('Error al guardar mensajes:', error.message);
    }
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
    console.log(` 🔑 ACCESO LOCAL: http://192.168.100.101:${port}`);
    console.log(` 🌐 TÚNEL CLOUDFLARE: ¡Asegúrate que Cloudflared esté corriendo!`);
    console.log(`======================================================\n`);
});