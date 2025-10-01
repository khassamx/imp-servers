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

// Middlewares
app.use(bodyParser.json());
app.use(express.static("public")); 

// Archivos de datos
const USERS_FILE = path.join(__dirname, "data", "users.json");
const MESSAGES_FILE = path.join(__dirname, "data", "messages.json");

// Leer JSON
function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Error al leer el archivo JSON ${file}:`, error.message);
    return [];
  }
}

// Escribir JSON
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error al escribir en el archivo JSON ${file}:`, error.message);
  }
}

// 🔑 RUTA: login (Retorna Alias y Rango)
app.post("/login", (req, res) => {
  const { username } = req.body; 
  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.username === username);
  
  if (user) {
    // Retornamos el ALIAS y el RANGO
    res.json({ 
      success: true, 
      chatAlias: user.chatAlias, 
      userRango: user.Rango 
    });
  } else {
    res.json({ success: false });
  }
});

// RUTA: obtener mensajes (FILTRADO POR CHAT Y RANGO)
// Acepta un parámetro 'channel' (global, admin, veterano, miembro) y 'userRango'
app.get("/messages", (req, res) => {
  const messages = readJSON(MESSAGES_FILE);
  let lastIndex = parseInt(req.query.lastIndex) || 0;
  const channel = req.query.channel || 'Global';
  const userRango = req.query.userRango; // Rango del usuario que solicita los mensajes

  let filteredMessages = [];

  // 💡 Lógica de Permisos de Lectura
  for (const message of messages) {
    // 1. CHAT GLOBAL: Todos pueden ver todos los mensajes (siempre incluimos)
    if (message.channel === 'Global') {
      filteredMessages.push(message);
      continue; 
    }

    // 2. CHAT ADMIN: Solo lo ven los "Admin"
    if (message.channel === 'Admin' && userRango === 'Admin') {
      filteredMessages.push(message);
      continue;
    }

    // 3. CHAT VETERANO: Lo ven los "Admin" y los "Veterano"
    if (message.channel === 'Veterano' && (userRango === 'Admin' || userRango === 'Veterano')) {
      filteredMessages.push(message);
      continue;
    }

    // 4. CHAT MIEMBRO: Lo ven todos, ya que todos tienen al menos el rango 'Miembro'
    // El canal 'Miembro' es el mismo que 'Global' en este contexto, pero lo mantenemos por si la lógica cambia.
    if (message.channel === 'Miembro' && (userRango === 'Admin' || userRango === 'Veterano' || userRango === 'Miembro')) {
        filteredMessages.push(message);
        continue;
    }
  }

  // Ahora aplicamos la carga incremental sobre los mensajes filtrados
  const newMessages = filteredMessages.slice(lastIndex);
  
  res.json({
    messages: newMessages,
    totalCount: filteredMessages.length 
  });
});

// RUTA: enviar mensaje con traducción
app.post("/messages", async (req, res) => {
  // Ahora el cliente envía el 'channel' (Global, Admin, etc.)
  let { username, text, channel, rango } = req.body; 
  const messages = readJSON(MESSAGES_FILE);
  let translatedText = text; 

  // 💡 Lógica de Permisos de Escritura (Solo los Admin pueden escribir en el Chat Admin)
  if (channel === 'Admin' && rango !== 'Admin') {
     return res.status(403).json({ success: false, message: "No tienes permisos para escribir en el chat Admin." });
  }

  try {
    translatedText = await translate(text, { to: "es" });
  } catch (error) {
    console.error("❌ Error de traducción:", error.message);
    translatedText = `(TRADUCCIÓN FALLIDA) ${text}`; 
  }

  const newMessage = { 
    username, 
    text, 
    translatedText, 
    time: new Date().toISOString(),
    channel: channel || 'Global', // Guardamos el canal
    rango: rango // Guardamos el rango del remitente
  };
  messages.push(newMessage);
  writeJSON(MESSAGES_FILE, messages);

  res.json(newMessage);
});

// 🚀 Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
