const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Rutas de archivos
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Estado del servidor
let messages = [];
let users = {};
let typingStatus = {};

// ----------------------------------------------------
// 1. UTILIDADES Y CONFIGURACIÓN INICIAL
// ----------------------------------------------------

// Configuración de Multer para la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname);
        cb(null, uuidv4() + fileExt);
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json()); // Habilitar body-parser para JSON
app.use(express.static(path.join(__dirname, 'public'))); // Servir archivos estáticos

// Habilitar CORS para desarrollo (Necesario si el front-end y back-end tienen puertos diferentes)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    next();
});

/**
 * Carga los datos de mensajes y usuarios desde los archivos.
 */
async function loadData() {
    try {
        // Cargar Mensajes
        const messagesData = await fs.readFile(MESSAGES_FILE, 'utf8');
        messages = JSON.parse(messagesData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Archivo de mensajes no encontrado, inicializando vacío.');
            messages = [];
        } else {
            console.error('Error al cargar mensajes:', error);
        }
    }

    try {
        // Cargar Usuarios
        const usersData = await fs.readFile(USERS_FILE, 'utf8');
        users = JSON.parse(usersData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Archivo de usuarios no encontrado, inicializando vacío.');
            users = {};
        } else {
            console.error('Error al cargar usuarios:', error);
        }
    }
}

/**
 * Guarda el array de mensajes en el archivo.
 */
async function saveMessages() {
    try {
        await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    } catch (error) {
        console.error('Error al guardar mensajes:', error);
    }
}

/**
 * Guarda el objeto de usuarios en el archivo.
 */
async function saveUsers() {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('Error al guardar usuarios:', error);
    }
}


// ----------------------------------------------------
// 2. ENDPOINTS DE AUTENTICACIÓN (NUEVOS)
// ----------------------------------------------------

/**
 * POST /register: Maneja el registro de nuevos usuarios.
 */
app.post('/register', async (req, res) => {
    const { name, username, password, alias, country, whatsapp, email, rank } = req.body;

    if (!username || !password || !alias) {
        return res.status(400).json({ message: 'Campos requeridos faltantes.' });
    }

    if (users[username]) {
        return res.status(409).json({ message: 'El usuario ya existe.' });
    }
    
    // NOTA: En un sistema real, la contraseña debe ser HASHED (encriptada).
    // Aquí la almacenamos como texto plano por simplicidad, ¡pero ten cuidado!
    users[username] = {
        name,
        password, // PELIGRO: Usar hash en producción
        alias,
        country,
        whatsapp,
        email,
        rank: rank || 'Miembro',
        createdAt: new Date().toISOString()
    };

    await saveUsers();
    console.log(`Usuario registrado: ${username} (${alias})`);
    res.status(201).json({ alias, rank: users[username].rank, message: 'Registro exitoso.' });
});


/**
 * POST /login: Maneja la autenticación de usuarios.
 */
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Falta usuario o contraseña.' });
    }

    const user = users[username];

    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    console.log(`Login exitoso para: ${username} (${user.alias})`);
    res.json({ alias: user.alias, rank: user.rank, message: 'Login exitoso.' });
});


// ----------------------------------------------------
// 3. ENDPOINTS DEL CHAT
// ----------------------------------------------------

/**
 * POST /messages: Envía un nuevo mensaje.
 */
app.post('/messages', async (req, res) => {
    const { alias, rank, text, fileUrl, originalName } = req.body;

    if (!alias || !rank) {
        return res.status(400).json({ message: 'Datos de usuario faltantes.' });
    }

    const newMessage = {
        id: uuidv4(),
        alias: alias,
        rank: rank,
        text: text,
        fileUrl: fileUrl || null,
        originalName: originalName || null,
        timestamp: new Date().toISOString()
    };

    messages.push(newMessage);
    await saveMessages();

    // Eliminar la señal de tecleo después de enviar el mensaje
    if (typingStatus[alias]) {
        delete typingStatus[alias];
    }

    res.status(201).json(newMessage);
});

/**
 * GET /messages: Devuelve todos los mensajes.
 */
app.get('/messages', (req, res) => {
    res.json(messages);
});

/**
 * DELETE /messages/:id: Elimina un mensaje.
 */
app.delete('/messages/:id', async (req, res) => {
    const { id } = req.params;
    const initialLength = messages.length;
    
    messages = messages.filter(msg => msg.id !== id);

    if (messages.length < initialLength) {
        await saveMessages();
        res.status(200).json({ message: 'Mensaje eliminado.' });
    } else {
        res.status(404).json({ message: 'Mensaje no encontrado.' });
    }
});


/**
 * POST /upload: Sube un archivo.
 */
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    // Devolvemos la URL relativa para que el cliente la use
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
        fileUrl: fileUrl, 
        originalName: req.file.originalname 
    });
});


/**
 * POST /typing: Recibe la señal de tecleo.
 */
app.post('/typing', (req, res) => {
    const { alias } = req.body;
    if (alias) {
        typingStatus[alias] = Date.now();
        res.status(200).json({ message: 'Señal de tecleo recibida.' });
    } else {
        res.status(400).json({ message: 'Falta alias.' });
    }
});

/**
 * GET /typing: Devuelve la lista de usuarios tecleando.
 */
app.get('/typing', (req, res) => {
    const now = Date.now();
    const activeTyping = [];

    // Limpiar señales de tecleo antiguas (más de 4 segundos)
    for (const alias in typingStatus) {
        if (now - typingStatus[alias] < 4000) {
            activeTyping.push(alias);
        } else {
            delete typingStatus[alias];
        }
    }
    res.json(activeTyping);
});


// ----------------------------------------------------
// 4. MANTENIMIENTO Y ARRANQUE
// ----------------------------------------------------

/**
 * Tarea de limpieza programada para eliminar archivos de más de 30 minutos.
 */
async function runCleanup() {
    try {
        const files = await fs.readdir(UPLOADS_DIR);
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);

        for (const file of files) {
            const filePath = path.join(UPLOADS_DIR, file);
            
            // Ignorar el archivo .gitkeep si existe
            if (file === '.gitkeep') continue;

            const stats = await fs.stat(filePath);
            
            if (stats.birthtimeMs < thirtyMinutesAgo) {
                await fs.unlink(filePath);
                console.log(`[CLEANUP] Archivo eliminado: ${file}`);
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
             console.error('Error en la tarea de limpieza:', error);
        } else {
             // Si el directorio UPLOADS_DIR no existe, lo creamos
             try { await fs.mkdir(UPLOADS_DIR, { recursive: true }); } catch (e) { console.error('Fallo al crear directorio de subidas:', e); }
        }
    }
}

// Inicializa el servidor
loadData().then(() => {
    // Asegurar que el directorio de subidas existe antes de empezar
    runCleanup(); 
    setInterval(runCleanup, CLEANUP_INTERVAL); // Programar la limpieza periódica

    app.listen(PORT, () => {
        console.log(`Servidor iniciado en http://localhost:${PORT}`);
        console.log(`Directorio de subidas: ${UPLOADS_DIR}`);
    });
});
