const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const translate = require("translate");

// Configuración de Traducción
translate.engine = "google"; 
translate.key = undefined; 

const app = express();
const PORT = 3000;

// Middlewares - Rutas estáticas estrictas
app.use(bodyParser.json());
app.use(express.static("public")); 
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

// Archivos de datos
const USERS_FILE = path.join(__dirname, "data", "users.json");
const MESSAGES_FILE = path.join(__dirname, "data", "messages.json");

// Funciones Auxiliares
function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  // Usamos try/catch para manejo de errores robusto al leer JSON
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`ERROR: Fallo al leer o parsear ${file}:`, error.message);
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ===================================
// RUTA: /login - AUTENTICACIÓN CON RANGO
// ===================================
app.post("/login", (req, res) => {
  // Validación estricta de la entrada
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: "Campos incompletos." });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Éxito: Devolvemos el username y el rango
    res.json({ 
      success: true, 
      username: user.username, 
      rank: user.rank || 'Invitado' // Retorno estricto, si no hay rank, asigna 'Invitado'
    });
  } else {
    res.json({ success: false, message: "Usuario o contraseña incorrectos." });
  }
});

// ===================================
// RUTA: /messages (GET) - OBTENER MENSAJES
// ===================================
app.get("/messages", (req, res) => {
  const messages = readJSON(MESSAGES_FILE);
  let lastIndex = parseInt(req.query.lastIndex) || 0;
  
  const newMessages = messages.slice(lastIndex);
  
  res.json({
    messages: newMessages,
    totalCount: messages.length
  });
});

// ===================================
// RUTA: /messages (POST) - ENVIAR MENSAJE CON RANGO
// ===================================
app.post("/messages", async (req, res) => {
  // Capturamos el nuevo campo 'rank' desde el cliente
  let { username, text, rank } = req.body; 
  const messages = readJSON(MESSAGES_FILE);
  let translatedText = text;

  // Validación de contenido
  if (!username || !text.trim()) {
    return res.status(400).json({ success: false, message: "Faltan datos de mensaje." });
  }
  
  // Lógica de Traducción
  try {
    // Solo traduce si el texto tiene algo significativo
    if (text.length > 2) {
      translatedText = await translate(text, { to: "es" });
    }
  } catch (error) {
    console.error("❌ Error de traducción. Usando texto original:", error.message);
    translatedText = `(TRADUCCIÓN FALLIDA) ${text}`; 
  }

  const newMessage = { 
    username, 
    text, 
    translatedText, 
    rank: rank || 'Desconocido', // Guardamos el rango. Si no viene, asignamos 'Desconocido'.
    time: new Date().toISOString() 
  };
  messages.push(newMessage);
  writeJSON(MESSAGES_FILE, messages);

  res.json(newMessage);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});