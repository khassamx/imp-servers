// Servidor de Chat Persistente con Node.js y Express
// VERSIÓN FINAL CON SOPORTE DE ARCHIVOS (FOTOS/VIDEOS)

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // 🚨 NUEVO: Librería para manejar archivos
const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const UPLOADS_DIR = path.join(__dirname, 'public/uploads'); // 🚨 NUEVO: Carpeta para guardar archivos
const LOCAL_IP = '192.168.100.101'; 

// ----------------------------------------------------
// 1. CONFIGURACIÓN DE CARGA DE ARCHIVOS (Multer)
// ----------------------------------------------------

// 🚨 Asegurar que la carpeta 'uploads' exista
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuración de almacenamiento: guarda los archivos en 'public/uploads'
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Renombra el archivo para evitar conflictos y añade una marca de tiempo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

// Middleware de Multer (para aceptar un solo archivo 'file')
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Límite de 50MB por archivo (ajústalo si es necesario)
}).single('file'); 

// ----------------------------------------------------
// 2. MIDDLEWARE GENERAL Y PERSISTENCIA
// ----------------------------------------------------

app.disable('x-powered-by'); 
app.use(express.json({ limit: '1kb' })); // Para JSON (mensajes de texto)
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', immutable: true })); 

function loadMessages() {
    try {
        if (!fs.existsSync(MESSAGES_FILE)) { fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8'); }
        const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        fs.writeFileSync(MESSAGES_FILE, '[]', 'utf8');
        return [];
    }
}

function saveMessages(messages) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

// ----------------------------------------------------
// 3. ENDPOINTS DE API
// ----------------------------------------------------

// GET /messages (Obtener historial)
app.get('/messages', (req, res) => {
    res.json(loadMessages());
});

// 🚨 NUEVO ENDPOINT: POST /upload (Maneja la subida de archivos)
app.post('/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Un error de Multer (ej. archivo muy grande)
            return res.status(500).json({ error: 'Error al subir: Archivo demasiado grande.' });
        } else if (err) {
            // Otros errores
            return res.status(500).json({ error: 'Ocurrió un error desconocido al subir el archivo.' });
        }
        
        // Si no hay errores, retorna la URL pública del archivo
        // El path.basename asegura que solo se envíe 'uploads/nombre-archivo.ext'
        const fileUrl = '/uploads/' + path.basename(req.file.path); 
        res.status(200).json({ fileUrl: fileUrl, originalName: req.file.originalname });
    });
});

// POST /messages (Maneja el envío de texto O la URL del archivo)
app.post('/messages', (req, res) => {
    const newMessage = req.body;
    
    // Validación más flexible para texto y archivos
    if (!newMessage || !newMessage.alias || !newMessage.rank || (!newMessage.text && !newMessage.fileUrl)) {
        return res.status(400).json({ error: 'Faltan campos (alias, rank, text O fileUrl).' });
    }
    
    // Si hay texto, validar longitud. Si hay archivo, no es necesario validar longitud del texto.
    if (newMessage.text && newMessage.text.length > 256) {
         return res.status(400).json({ error: 'Mensaje de texto demasiado largo.' });
    }

    const messages = loadMessages();
    messages.push({ 
        alias: newMessage.alias, 
        rank: newMessage.rank, 
        text: newMessage.text || null,
        fileUrl: newMessage.fileUrl || null, // Guarda la URL del archivo
        originalName: newMessage.originalName || null, // Nombre original
        timestamp: new Date().toISOString() 
    });
    saveMessages(messages);
    
    res.status(201).json({ status: 'ok' }); 
});


// Ruta de Fallback (404)
app.use((req, res) => {
    res.status(404).send('404: Recurso no encontrado. (Server running)');
});

// ----------------------------------------------------
// 4. Inicio del Servidor
// ----------------------------------------------------

app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ SERVIDOR OPTIMIZADO: Node.js/Express (PM2 Ready)`);
    console.log(` 🚀 AHORA CON SOPORTE PARA CARGA DE ARCHIVOS.`);
    console.log(`======================================================`);
    console.log(`\n🔑 ENLACE LOCAL (PARA TI - CONSTANTE):`);
    console.log(`   --> http://${LOCAL_IP}:${port}`);
    console.log(`\n🌐 ENLACE PÚBLICO (PARA AMIGOS):`);
    console.log(`   --> Cloudflared te dará el enlace.`);
    console.log(`\n======================================================\n`);
});