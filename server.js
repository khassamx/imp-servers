// Servidor de Chat Persistente con Node.js y Express
// Versión Final con Mensajes de Consola Claros

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// La URL de Cloudflare cambia cada vez que se inicia Cloudflared sin cuenta.
// Por seguridad y claridad, la dejaremos como una nota en la consola.
// Tu IP local (Asegúrate que 192.168.100.101 sea tu IP actual)
const LOCAL_IP = '192.168.100.101'; 

// ----------------------------------------------------
// 1. CONFIGURACIÓN INICIAL Y ESTÁTICA
// ----------------------------------------------------

// Middleware para parsear JSON de las peticiones POST
app.use(express.json());

// Configuración para servir archivos estáticos (index.html, CSS, JS)
app.use(express.static(path.join(__dirname, 'public'))); 

// ----------------------------------------------------
// 2. Funciones de Persistencia Seguras
// ----------------------------------------------------

function loadMessages() {
    try {
        // Si el archivo NO existe, lo crea con un array vacío.
        if (!fs.existsSync(MESSAGES_FILE)) {
            fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
        }
        
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    } catch (error) {
        console.error('Error al guardar mensajes:', error.message);
    }
}

// ----------------------------------------------------
// 3. ENDPOINTS (Rutas de API para el Chat)
// ----------------------------------------------------

app.get('/messages', (req, res) => {
    res.json(loadMessages());
});

app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    if (!newMessage || !newMessage.alias || !newMessage.text || !newMessage.rank) {
        return res.status(400).json({ error: 'Faltan campos.' });
    }
    
    const messages = loadMessages();
    messages.push({ ...newMessage, timestamp: new Date().toISOString() });
    saveMessages(messages);
    
    res.status(201).json(messages); 
});

// ----------------------------------------------------
// 4. Inicio del Servidor
// ----------------------------------------------------

app.listen(port, HOST, () => {
    
    // El mensaje de consola más importante con ambos enlaces!
    console.log(`\n========================================================================`);
    console.log(` ✅ Servidor de Chat (Node.js/Express) INICIADO en el puerto ${port}`);
    console.log(`========================================================================`);
    console.log(`\n🔑 ENLACE LOCAL (SOLO PARA TI/RED WI-FI):`);
    console.log(`   --> http://${LOCAL_IP}:${port}`);
    console.log(`\n🌐 ENLACE PÚBLICO (PARA AMIGOS EN OTROS PAÍSES):`);
    console.log(`   --> ¡ASEGÚRATE DE CORRER CLOUDFLARED EN LA OTRA SESIÓN!`);
    console.log(`   --> CLOUDFLARED te dará el enlace: [https://...trycloudflare.com]`);
    console.log(`\n========================================================================\n`);
});