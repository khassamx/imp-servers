// Servidor de Chat Persistente con Node.js y Express
// VERSIÓN ESTRICTA, OPTIMIZADA Y LISTA PARA PM2

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const LOCAL_IP = '192.168.100.101'; 

// ----------------------------------------------------
// 1. CONFIGURACIÓN INICIAL Y ESTÁTICA
// ----------------------------------------------------

// Optimización: Deshabilita el encabezado X-Powered-By por seguridad
app.disable('x-powered-by'); 

// Middleware para parsear JSON de las peticiones POST (Estricto y Optimizado)
app.use(express.json({ limit: '1kb' })); // Límite estricto para payloads pequeños

// Configuración para servir archivos estáticos (index.html, CSS, JS)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d', // Cachea archivos estáticos por 7 días
    immutable: true 
})); 

// ----------------------------------------------------
// 2. Funciones de Persistencia Seguras
// ----------------------------------------------------

function loadMessages() {
    try {
        if (!fs.existsSync(MESSAGES_FILE)) {
            fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
        }
        
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // En caso de error de parseo, borra y comienza de nuevo para evitar fallos
        fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
        return [];
    }
}

function saveMessages(messages) {
    // Escrito de forma síncrona para asegurar que no se pierdan datos
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// ----------------------------------------------------
// 3. ENDPOINTS (Rutas de API)
// ----------------------------------------------------

app.get('/messages', (req, res) => {
    res.json(loadMessages());
});

app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    // Validación estricta de datos
    if (!newMessage || !newMessage.alias || !newMessage.text || !newMessage.rank || newMessage.text.length > 256) {
        return res.status(400).json({ error: 'Mensaje inválido o incompleto.' });
    }
    
    const messages = loadMessages();
    messages.push({ 
        alias: newMessage.alias, 
        rank: newMessage.rank, 
        text: newMessage.text, 
        timestamp: new Date().toISOString() 
    });
    saveMessages(messages);
    
    // Respuesta de éxito mínima y optimizada
    res.status(201).json({ status: 'ok' }); 
});

// Ruta de Fallback (Si no encuentra nada más)
app.use((req, res) => {
    res.status(404).send('404: Recurso no encontrado. (Server running)');
});

// ----------------------------------------------------
// 4. Inicio del Servidor
// ----------------------------------------------------

app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ SERVIDOR OPTIMIZADO: Node.js/Express (PM2 Ready)`);
    console.log(`======================================================`);
    console.log(`\n🔑 ENLACE LOCAL (PARA TI - CONSTANTE):`);
    console.log(`   --> http://${LOCAL_IP}:${port}`);
    console.log(`\n🌐 ENLACE PÚBLICO (PARA AMIGOS):`);
    console.log(`   --> Debes ejecutar Cloudflared y usar la URL que te dé.`);
    console.log(`\n======================================================\n`);
});