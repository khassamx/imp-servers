const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads'); 
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let messages = [];
let users = {};
let typingStatus = {};

// --- Configuración de Multer para la subida de archivos ---
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
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

// --- CORS ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    next();
});

// --- Utilidades de Datos ---
async function loadData() {
    try {
        const messagesData = await fs.readFile(MESSAGES_FILE, 'utf8');
        messages = JSON.parse(messagesData);
    } catch (error) {
        if (error.code === 'ENOENT') { messages = []; } else { console.error('Error al cargar mensajes:', error); }
    }

    try {
        const usersData = await fs.readFile(USERS_FILE, 'utf8');
        users = JSON.parse(usersData);
    } catch (error) {
        if (error.code === 'ENOENT') { users = {}; } else { console.error('Error al cargar usuarios:', error); }
    }
}

async function saveMessages() {
    try {
        await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
    } catch (error) { console.error('Error al guardar mensajes:', error); }
}

async function saveUsers() {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) { console.error('Error al guardar usuarios:', error); }
}

// --- ENDPOINTS DE AUTENTICACIÓN ---
app.post('/register', async (req, res) => {
    const { name, username, password, alias, country, whatsapp, email, rank } = req.body;

    if (!username || !password || !alias) { return res.status(400).json({ message: 'Campos requeridos faltantes.' }); }
    if (users[username]) { return res.status(409).json({ message: 'El usuario ya existe.' }); }
    
    users[username] = { name, password, alias, country, whatsapp, email, rank: rank || 'Miembro', createdAt: new Date().toISOString() };

    await saveUsers();
    console.log(`Usuario registrado: ${username} (${alias})`);
    res.status(201).json({ alias, rank: users[username].rank, message: 'Registro exitoso.' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ message: 'Falta usuario o contraseña.' }); }

    const user = users[username];
    if (!user || user.password !== password) { return res.status(401).json({ message: 'Credenciales inválidas.' }); }

    console.log(`Login exitoso para: ${username} (${user.alias})`);
    res.json({ alias: user.alias, rank: user.rank, message: 'Login exitoso.' });
});


// --- ENDPOINTS DEL CHAT Y ARCHIVOS ---
app.post('/messages', async (req, res) => {
    const { alias, rank, text, fileUrl, originalName } = req.body;

    if (!alias || !rank) { return res.status(400).json({ message: 'Datos de usuario faltantes.' }); }

    const newMessage = { id: uuidv4(), alias, rank, text, fileUrl: fileUrl || null, originalName: originalName || null, timestamp: new Date().toISOString() };

    messages.push(newMessage);
    await saveMessages();

    if (typingStatus[alias]) { delete typingStatus[alias]; }

    res.status(201).json(newMessage);
});

app.get('/messages', (req, res) => { res.json(messages); });

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

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) { return res.status(400).json({ error: 'No se subió ningún archivo.' }); }

    const fileUrl = `/uploads/${req.file.filename}`; 
    res.json({ fileUrl: fileUrl, originalName: req.file.originalname });
});

app.post('/typing', (req, res) => {
    const { alias } = req.body;
    if (alias) {
        typingStatus[alias] = Date.now();
        res.status(200).json({ message: 'Señal de tecleo recibida.' });
    } else {
        res.status(400).json({ message: 'Falta alias.' });
    }
});

app.get('/typing', (req, res) => {
    const now = Date.now();
    const activeTyping = [];

    for (const alias in typingStatus) {
        if (now - typingStatus[alias] < 4000) { activeTyping.push(alias); } else { delete typingStatus[alias]; }
    }
    res.json(activeTyping);
});


// --- MANEJO DE ERRORES Y ARRANQUE ---
app.use((req, res, next) => {
    if (req.accepts('json')) {
        return res.status(404).json({ message: `Ruta de API no encontrada: ${req.path}` });
    }
    res.redirect('/login.html');
});

async function runCleanup() {
    try {
        const files = await fs.readdir(UPLOADS_DIR);
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);

        for (const file of files) {
            const filePath = path.join(UPLOADS_DIR, file);
            if (file === '.gitkeep') continue;
            const stats = await fs.stat(filePath);
            
            if (stats.birthtimeMs < thirtyMinutesAgo) {
                await fs.unlink(filePath);
                console.log(`[CLEANUP] Archivo eliminado: ${file}`);
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') { console.error('Error en la tarea de limpieza:', error); } 
        else { try { await fs.mkdir(UPLOADS_DIR, { recursive: true }); } catch (e) { console.error('Fallo al crear directorio de subidas:', e); } }
    }
}

loadData().then(() => {
    runCleanup(); 
    setInterval(runCleanup, CLEANUP_INTERVAL); 

    app.listen(PORT, () => {
        console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });
});
```eof

---

## 🚀 Siguientes Pasos

1.  **Reemplaza el contenido completo** de tu `server.js` con el código limpio que acabas de ver.
2.  **Guarda** con `CTRL + O` y sal con `CTRL + X` en `nano`.
3.  Vuelve a ejecutar:
    ```bash
    node server.js
    ```

Esto debería eliminar el **`SyntaxError`**. Una vez que el servidor esté corriendo, solo te faltaría el túnel de Cloudflare para que esté en línea (si aún no lo está).

¿El servidor levanta correctamente ahora?