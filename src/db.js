// src/db.js
// CAMBIO CLAVE: Importamos y configuramos la librería 'sqlite'
const sqlite = require('sqlite'); 
const sqliteDriver = require('sqlite3'); // Necesario como driver
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'imp.db'); 
let dbInstance;

// Función para abrir la base de datos de forma asíncrona
async function connectDB() {
    try {
        dbInstance = await sqlite.open({
            filename: dbPath,
            driver: sqliteDriver.Database
        });
        console.log('✅ Conectado a la base de datos SQLite.');
        return dbInstance;
    } catch (err) {
        console.error('❌ Error crítico al conectar con la base de datos:', err.message);
        process.exit(1);
    }
}

/**
 * Cierra la conexión a la base de datos de forma segura.
 */
function closeDB() {
    // La librería 'sqlite' maneja el cierre a través del driver.
    if (dbInstance && dbInstance.close) {
        dbInstance.close((err) => {
            if (err) console.error("Error al cerrar DB:", err.message);
            console.log('\nBase de datos cerrada.');
        });
    } else {
        console.log('\nBase de datos cerrada.');
    }
}

// Exportamos una función para obtener la instancia (ya que la conexión es asíncrona)
module.exports = { connectDB, closeDB };