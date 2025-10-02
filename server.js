// server.js
// =========================================================
// 🌐 IMP CHAT SERVER v5.2: CORE - LIMPIO Y MODULARIZADO
// Este archivo inicia el servidor y conecta los módulos.
// =========================================================
const express = require('express');
const path = require('path');
// Importa la función para cerrar la DB y las rutas de la API
const { closeDB } = require('./src/db'); 
const apiRoutes = require('./src/routes'); 

const app = express();
const port = 3000;
const HOST = '0.0.0.0'; 
const PUBLIC_DIR = path.join(__dirname, 'public');

// ----------------------------------------------------
// CONFIGURACIÓN Y MIDDLEWARE
// ----------------------------------------------------
app.use(express.json()); // Habilita la lectura de JSON para todas las peticiones POST/PUT
app.use(express.static(PUBLIC_DIR)); // Sirve el index.html y otros archivos estáticos.

// ----------------------------------------------------
// ENRUTAMIENTO
// ----------------------------------------------------
// Todas las rutas de la API (/login, /register, /messages) se manejan en src/routes.js
app.use('/', apiRoutes); 


// ----------------------------------------------------
// INICIO DEL SERVIDOR
// ----------------------------------------------------
app.listen(port, HOST, () => {
    console.log(`\n======================================================`);
    console.log(` ✅ IMP Chat Server (Modularizado) CORRIENDO en Termux`);
    console.log(` 🌐 Acceso Habilitado en puerto: ${port}`);
    console.log(` 🔑 Compartir con: http://[TU_IP_LOCAL]:${port}`);
    console.log(`======================================================\n`);
});

// Cierre seguro de la base de datos al apagar el servidor (detecta CTRL+C)
process.on('SIGINT', () => {
    closeDB(); // Función importada de src/db.js
    process.exit(0);
});