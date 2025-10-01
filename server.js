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

// Middlewares - Definición estricta de rutas de archivos estáticos
app.use(bodyParser.json());
app.use(express.static("public")); // Sirve index.html y chat.html desde la raíz de public
app.use("/css", express.static(path.join(__dirname, "public/css"))); // Sirve CSS
app.use("/assets", express.static(path.join(__dirname, "public/assets"))); // Sirve Imagen y Audio

// Archivos de datos (restante igual)
const USERS_FILE = path.join(__dirname, "data", "users.json");
const MESSAGES_FILE = path.join(__dirname, "data", "messages.json");

// ... (Funciones readJSON, writeJSON, y rutas /login, /messages) ...

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

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

app.get("/messages", (req, res) => {
  const messages = readJSON(MESSAGES_FILE);
  let lastIndex = parseInt(req.query.lastIndex) || 0;
  
  const newMessages = messages.slice(lastIndex);
  
  res.json({
    messages: newMessages,
    totalCount: messages.length
  });
});

app.post("/messages", async (req, res) => {
  let { username, text } = req.body;
  const messages = readJSON(MESSAGES_FILE);
  let translatedText = text;

  try {
    translatedText = await translate(text, { to: "es" });
  } catch (error) {
    console.error("❌ Error de traducción. Usando texto original:", error.message);
    translatedText = `(TRADUCCIÓN FALLIDA) ${text}`; 
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