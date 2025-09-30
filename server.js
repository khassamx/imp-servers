const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const bcrypt = require("bcryptjs");
const fetch = require("node-fetch");

app.use(express.static("public"));
app.use(express.json());

const USERS_FILE = "./data/users.json";
const MESSAGES_FILE = "./data/messages.json";

// ===== LOGIN =====
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
        res.json({ success: true, role: user.role, username: user.username });
    } else {
        res.json({ success: false });
    }
});

// ===== SOCKET.IO CHAT =====
io.on("connection", socket => {
    console.log("Nuevo usuario conectado");

    // Enviar historial de mensajes
    const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE));
    socket.emit("chat-history", messages);

    // Recibir mensaje
    socket.on("chat-message", async data => {
        const translatedText = await translateToSpanish(data.message);
        const message = {
            username: data.username,
            role: data.role,
            message: translatedText,
            date: new Date()
        };

        messages.push(message);
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));

        io.emit("chat-message", message);
        console.log(`[${message.role}] ${message.username}: ${message.message}`);
    });
});

// ===== TRADUCCIÓN AUTOMÁTICA =====
async function translateToSpanish(text) {
    try {
        const res = await fetch("https://libretranslate.de/translate", {
            method: "POST",
            body: JSON.stringify({ q: text, source: "auto", target: "es" }),
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        return data.translatedText || text;
    } catch (err) {
        return text; // Si falla, devolver el texto original
    }
}

// ===== INICIAR SERVIDOR =====
const PORT = 3000;
http.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));