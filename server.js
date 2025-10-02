// server.js (SOLO CAMBIAREMOS LA LÍNEA DE IMPORTACIÓN Y EL ARRANQUE)

// ... líneas de const
const path = require('path');
const { connectDB, closeDB } = require('./src/db'); // Importamos connectDB
const apiRoutes = require('./src/routes'); 
// ...

// ----------------------------------------------------
// INICIO DEL SERVIDOR (LO ENCERRAMOS EN UNA FUNCIÓN ASÍNCRONA)
// ----------------------------------------------------
async function startServer() {
    // Intentar conectar a la DB antes de iniciar el servidor
    await connectDB(); 

    app.listen(port, HOST, () => {
        console.log(`\n======================================================`);
        console.log(` ✅ IMP Chat Server (Modularizado) CORRIENDO en Termux`);
        console.log(` 🌐 Acceso Habilitado en puerto: ${port}`);
        console.log(` 🔑 Compartir con: http://[TU_IP_LOCAL]:${port}`);
        console.log(`======================================================\n`);
    });
}

startServer(); // Llamamos a la función de inicio.

// Cierre seguro de la base de datos al apagar el servidor (detecta CTRL+C)
process.on('SIGINT', () => {
    closeDB(); 
    process.exit(0);
});