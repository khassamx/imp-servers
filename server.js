const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const translate = require("translate");

// Configuración de Traducción
translate.engine = "google"; 
translate.key = undefined; // Sin API key usa traducción gratuita

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
  return JSON.parse(fs.readFileSync(file));
}

// Escribir JSON
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Ruta: login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, username: user.username });
  } else {
    res.json({ success: false });
  }
});

// Ruta: obtener mensajes
// La ruta ahora puede aceptar un parámetro 'lastIndex' para optimizar la carga
app.get("/messages", (req, res) => {
  const messages = readJSON(MESSAGES_FILE);
  let lastIndex = parseInt(req.query.lastIndex) || 0;
  
  // Devuelve solo los mensajes nuevos desde el índice solicitado
  const newMessages = messages.slice(lastIndex);
  
  res.json({
    messages: newMessages,
    totalCount: messages.length // Devuelve el conteo total para que el cliente sepa dónde empezar la próxima vez
  });
});

// Ruta: enviar mensaje con traducción y manejo de errores
app.post("/messages", async (req, res) => {
  let { username, text } = req.body;
  const messages = readJSON(MESSAGES_FILE);
  let translatedText = text; // Por defecto, es el mismo texto

  try {
    // Intentar traducir
    translatedText = await translate(text, { to: "es" });
  } catch (error) {
    console.error("❌ Error de traducción:", error.message);
    // Si la traducción falla, usamos el texto original y avisamos
    translatedText = `(Traducción fallida) ${text}`; 
  }

  const newMessage = { 
    username, 
    text, 
    translatedText, 
    time: new Date().toISOString() 
  };
  messages.push(newMessage);
  writeJSON(MESSAGES_FILE, messages);

  res.json(newMessage);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
