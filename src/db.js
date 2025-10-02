// src/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'imp.db'); 

// 🚨 CONEXIÓN A LA BASE DE DATOS
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error crítico al conectar con la base de datos:', err.message);
        process.exit(1); 
    } else {
        console.log('✅ Conectado a la base de datos SQLite.');
    }
});

/**
 * Cierra la conexión a la base de datos de forma segura.
 */
function closeDB() {
    db.close((err) => {
        if (err) console.error("Error al cerrar DB:", err.message);
        console.log('\nBase de datos cerrada.');
    });
}

// Exportamos la instancia de la base de datos y la función de cierre
module.exports = { db, closeDB };