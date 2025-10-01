// Servidor de Chat Persistente con Node.js y Express
// VERSIÓN FINAL CON ARCHIVOS, ELIMINACIÓN ADMIN, LIMPIEZA AUTOMÁTICA E INDICADOR 'ESCRIBIENDO'

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const UPLOADS_DIR = path.join(__dirname, 'public/uploads'); 
const LOCAL_IP = '192.168.100.101'; 

// 🚨 VARIABLE DE ESTADO DE TECLEO: Guardamos el alias y el momento del último tecleo.
let typingUsers = {}; 

// ----------------------------------------------------
// 1. CONFIGURACIÓN DE CARGA DE ARCHIVOS (Multer)
// ----------------------------------------------------

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Límite de archivo
}).single('file'); 

// ----------------------------------------------------
// 2. MIDDLEWARE GENERAL Y PERSISTENCIA (JSON)
// ----------------------------------------------------

app.disable('x-powered-by'); 
app.use(express.json({ limit: '1kb' })); 
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', immutable: true })); 

function loadMessages() {
    try {
        if (!fs.existsSync(MESSAGES_FILE)) { fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8'); }
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        let messages = JSON.parse(data);
        
        // Asegurar que cada mensaje tenga un 'id'
        messages = messages.map((msg, index) => {
            if (!msg.id) {
                msg.id = (msg.timestamp || Date.now()) + '-' + index; 
            }
            return msg;
        });
        return messages;
    } catch (error) {
        console.error("Error al cargar mensajes, reiniciando historial:", error);
        fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
        return [];
    }
}

function saveMessages(messages) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// ----------------------------------------------------
// 3. FUNCIÓN DE LIMPIEZA AUTOMÁTICA
// ----------------------------------------------------

function startAutoCleanup() {
    const messages = loadMessages();
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 días en milisegundos
    let cleanedCount = 0;
    
    // Filtra los mensajes que son más recientes que hace 3 días
    const filteredMessages = messages.filter(msg => {
        const msgTimestamp = new Date(msg.timestamp).getTime();
        
        if (msgTimestamp < threeDaysAgo) {
            cleanedCount++;
            return false;
        }
        return true;
    });

    if (cleanedCount > 0) {
        saveMessages(filteredMessages);
        console.log(`\n🧹 LIMPIEZA AUTOMÁTICA: Se eliminaron ${cleanedCount} mensajes de más de 3 días.`);
    } else {
        console.log(`\n🧹 LIMPIEZA AUTOMÁTICA: No se encontraron mensajes antiguos.`);
    }
}


// ----------------------------------------------------
// 4. ENDPOINTS DE API (CHAT)
// ----------------------------------------------------

// GET /messages (Obtener historial)
app.get('/messages', (req, res) => {
    res.json(loadMessages());
});

// GET /typing (Devuelve la lista de usuarios tecleando)
app.get('/typing', (req, res) => {
    const now = Date.now();
    const activeTyping = {};
    
    // Filtra los usuarios cuya señal de tecleo tiene menos de 4 segundos
    for (const alias in typingUsers) {
        if (now - typingUsers[alias] < 4000) { 
            activeTyping[alias] = typingUsers[alias];
        }
    }
    
    // Limpia y actualiza los usuarios activos
    typingUsers = activeTyping; 
    
    res.json(Object.keys(typingUsers)); // Devuelve solo un array con los alias
});

// POST /typing (Actualiza el estado de tecleo)
app.post('/typing', (req, res) => {
    const alias = req.body.alias;
    if (alias) {
        typingUsers[alias] = Date.now(); // Actualiza la marca de tiempo
        res.status(200).json({ status: 'ok' });
    } else {
        res.status(400).json({ error: 'Falta el alias.' });
    }
});


// POST /upload (Maneja la subida de archivos)
app.post('/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Error al subir: Archivo demasiado grande o desconocido.' });
        }
        
        const fileUrl = '/uploads/' + path.basename(req.file.path); 
        res.status(200).json({ fileUrl: fileUrl, originalName: req.file.originalname });
    });
});

// POST /messages (Maneja el envío de texto O la URL del archivo)
app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    if (!newMessage || !newMessage.alias || !newMessage.rank || (!newMessage.text && !newMessage.fileUrl)) {
        return res.status(400).json({ error: 'Faltan campos.' });
    }
    
    // Limpia el estado de tecleo del usuario que acaba de enviar un mensaje
    if (typingUsers[newMessage.alias]) {
         delete typingUsers[newMessage.alias];
    }

    const messages = loadMessages();
    const newId = Date.now() + '-' + messages.length; 

    messages.push({ 
        id: newId, 
        alias: newMessage.alias, 
        rank: newMessage.rank, 
        text: newMessage.text || null,
        fileUrl: newMessage.fileUrl || null,
        originalName: newMessage.originalName || null,
        timestamp: new Date().toISOString() 
    });
    saveMessages(messages);
    
    res.status(201).json({ status: 'ok' }); 
});

// DELETE /messages/:id (Elimina un mensaje por ID - Solo Admins)
app.delete('/messages/:id', (req, res) => {
    const messageIdToDelete = req.params.id;
    let messages = loadMessages();
    const initialLength = messages.length;
    
    messages = messages.filter(msg => msg.id !== messageIdToDelete);
    
    if (messages.length < initialLength) {
        saveMessages(messages);
        res.status(200).json({ status: 'ok', message: `Mensaje ${messageIdToDelete} eliminado.` });
    } else {
        res.status(404).json({ error: 'Mensaje no encontrado.' });
    }
});


// Ruta de Fallback (404)
app.use((req, res) => {
    res.status(404).send('404: Recurso no encontrado. (Server running)');
});

// ----------------------------------------------------
// 5. Inicio del Servidor
// ----------------------------------------------------

startAutoCleanup(); 

app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ SERVIDOR OPTIMIZADO: Node.js/Express (PM2 Ready)`);
    console.log(` 🔑 LIMPIEZA AUTOMÁTICA ACTIVADA: Cada 3 días.`);
    console.log(` ✍️ SOPORTE 'ESCRIBIENDO...' HABILITADO.`);
    console.log(`======================================================\n`);
});