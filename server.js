// =========================================================
// 🌐 IMP CHAT SERVER v5.1: CORE (Limpieza y Modularización)
// =========================================================
const express = require('express');
const path = require('path');
const { closeDB } = require('./src/db'); // Importamos solo la función de cierre
const apiRoutes = require('./src/routes'); // Importamos todas las rutas

const app = express();
const port = 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

// ----------------------------------------------------
// CONFIGURACIÓN Y MIDDLEWARE
// ----------------------------------------------------
app.use(express.json()); // Habilita la lectura de JSON
app.use(express.static(PUBLIC_DIR)); // Sirve el index.html y otros archivos estáticos.

// ----------------------------------------------------
// ENRUTAMIENTO (CONECTAR LAS RUTAS)
// ----------------------------------------------------
app.use('/', apiRoutes); // Usamos las rutas definidas en src/routes.js


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

// Cierre seguro de la base de datos al apagar el servidor (Ctrl+C)
process.on('SIGINT', () => {
    closeDB(); // Llama a la función de cierre de DB del módulo db.js
    process.exit(0);
});