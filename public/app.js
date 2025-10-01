// ----------------------------------------------------
// 🔑 DATA DE USUARIOS Y PERMISOS
// ----------------------------------------------------
const USER_DATA = {
    "Keko1283": { alias: "Khassam", rank: "Fundador" }, 
    "Titan12831283": { alias: "Titán IMP", rank: "Líder" }, 
    "Naim12831283": { alias: "Naim Russu", rank: "Colíder" }, 
    "Atlas12831283": { alias: "Atlas", rank: "Atlas" },
    "milagroscon4@gmail.com": { alias: "Aye Russu", rank: "Miembro" } 
};

const ADMIN_RANKS = ["Fundador", "Líder"];

// 🚨 CARGA DE SESIÓN: Intentamos cargar la sesión guardada inmediatamente.
let currentUser = null; 
const savedKey = localStorage.getItem('chat_user_key');
if (savedKey && USER_DATA[savedKey]) {
    currentUser = USER_DATA[savedKey];
    currentUser.key = savedKey; // Guardamos la clave para consistencia
}

// Variables globales de UI (se inicializan solo si estamos en index.html)
const messagesDiv = document.getElementById('chat-messages');
const typingIndicatorDiv = document.getElementById('typing-indicator');

let connectionErrorShown = false; 
let selectedFile = null; 
let typingTimer = null; 
let lastMessageCount = 0;

// Lógica de URL corregida
const protocol = window.location.protocol; 
const hostname = window.location.hostname;
let apiHost = hostname;
if (protocol === 'http:') {
    apiHost = hostname + ':3000';
}
const SERVER_URL = protocol + '//' + apiHost;
const POLLING_INTERVAL = 3000; 


// ----------------------------------------------------
// 1. LÓGICA DE INICIO, PERSISTENCIA Y REDIRECCIÓN
// ----------------------------------------------------

/**
 * Intenta iniciar sesión. Si es exitoso, guarda en localStorage y redirige a la página de chat.
 * @param {string} userKey - La clave secreta del usuario.
 */
function login(userKey) {
    const username = userKey || document.getElementById('username-input').value.trim();
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.textContent = '';

    if (USER_DATA[username]) {
        currentUser = USER_DATA[username];

        // Guardar sesión
        localStorage.setItem('chat_user_key', username);
        localStorage.setItem('chat_user_alias', currentUser.alias);
        localStorage.setItem('chat_user_rank', currentUser.rank);

        // 🚨 REDIRECCIÓN CRÍTICA: Llevamos al usuario a la página principal del chat
        window.location.href = '/index.html'; 
    } else if (errorDiv) {
        errorDiv.textContent = '❌ Clave secreta/Usuario incorrecto. Intenta de nuevo.';
    }
}

/**
 * Chequea si hay sesión activa y redirige a la página de chat si existe.
 * Se llama solo desde login.html.
 */
function checkSessionAndRedirect() {
    if (currentUser && window.location.pathname.endsWith('/login.html')) {
        // Redirigir si estamos en login.html y ya tenemos sesión
        window.location.href = '/index.html';
    }
}

/**
 * Cierra la sesión, borra el localStorage y redirige al login.
 */
function logout() {
    localStorage.removeItem('chat_user_key');
    localStorage.removeItem('chat_user_alias');
    localStorage.removeItem('chat_user_rank');

    currentUser = null;
    window.location.href = '/login.html'; // Redirigir a login
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function focusInput() {
    const input = document.getElementById('message-input');
    if(input) input.focus();
}


// ----------------------------------------------------
// 2. LÓGICA DE ARCHIVOS Y ADMINISTRACIÓN
// ----------------------------------------------------

function handleFileSelection() {
    const input = document.getElementById('file-input');
    selectedFile = input.files[0];

    if (selectedFile) {
        const messageInput = document.getElementById('message-input');
        messageInput.placeholder = `Archivo listo: ${selectedFile.name}. Presiona Enviar.`;
        messageInput.value = ''; 
        focusInput();
    }
}

async function uploadFileAndSendMessage(messageData) {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const uploadResponse = await fetch(SERVER_URL + '/upload', {
        method: 'POST',
        body: formData
    });

    if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(`Fallo la subida del archivo: ${error.error || 'Desconocido'}`);
    }

    const uploadData = await uploadResponse.json();

    messageData.fileUrl = uploadData.fileUrl;
    messageData.originalName = uploadData.originalName;
    // Si el usuario puso texto, lo mantenemos; si no, es solo el archivo (texto = null)
    messageData.text = document.getElementById('message-input').value.trim() || null;

    selectedFile = null;
    document.getElementById('file-input').value = ''; 
    document.getElementById('message-input').placeholder = 'Escribe tu mensaje o agrega un archivo...';
}

async function deleteMessage(messageId) {
    // Usamos confirm simulado (ya que no podemos usar window.confirm)
    if (!confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/messages/${messageId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log(`Mensaje ${messageId} eliminado correctamente.`);
            fetchMessages(); 
        } else {
            console.error('Error al eliminar mensaje:', response.statusText);
            // alert simulado
            alert('No se pudo eliminar el mensaje.');
        }
    } catch (error) {
        console.error('Error de red al eliminar:', error);
        // alert simulado
        alert('No se pudo conectar con el servidor para eliminar el mensaje.');
    }
}


// ----------------------------------------------------
// 3. LÓGICA DE ENVÍO Y RECEPCIÓN
// ----------------------------------------------------

function sendTypingSignal() {
    if (!currentUser || !typingIndicatorDiv) return;

    if (typingTimer) {
        clearTimeout(typingTimer);
    }

    fetch(SERVER_URL + '/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: currentUser.alias })
    }).catch(error => { console.warn('Error al enviar señal de tecleo:', error); });

    typingTimer = setTimeout(() => {
        typingTimer = null;
    }, 3000); 
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (!input || (!text && !selectedFile)) return;
    if (text.length > 256) {
         // alert simulado
         alert('Mensaje de texto demasiado largo (máx 256 caracteres).');
         return;
    }

    const messageData = {
        alias: currentUser.alias,
        rank: currentUser.rank,
        text: text 
    };

    try {
        if (selectedFile) {
            await uploadFileAndSendMessage(messageData);
        }

        const response = await fetch(SERVER_URL + '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });

        if (response.ok) {
            input.value = ''; 
            fetchMessages(); 
            input.focus();
        } else {
            console.error('Error al enviar mensaje:', response.statusText);
            // alert simulado
            alert('Error al enviar. Revisa la consola para más detalles.');
        }
    } catch (error) {
        console.error('Error de red al enviar/subir:', error);
        // alert simulado
        alert('No se pudo completar el envío: ' + error.message);
    }
}

function fetchTypingStatus() {
    if (!currentUser || !typingIndicatorDiv) return;

    fetch(SERVER_URL + '/typing')
        .then(response => {
            if (!response.ok) throw new Error('Fallo al obtener estado de tecleo.');
            return response.json();
        })
        .then(typingAliases => {
            const othersTyping = typingAliases.filter(alias => alias !== currentUser.alias);

            if (othersTyping.length > 0) {
                const aliases = othersTyping.join(', ');
                let text = `${aliases} está escribiendo...`;
                if (othersTyping.length > 1) {
                    text = `${aliases} están escribiendo...`;
                }
                typingIndicatorDiv.textContent = text;
            } else {
                typingIndicatorDiv.textContent = '';
            }
        })
        .catch(error => { console.warn('Error al obtener tecleo:', error); });
}


function fetchMessages() {
    if (!messagesDiv) return; // Salir si no estamos en la página del chat

    fetch(SERVER_URL + '/messages')
        .then(response => {
            if (!response.ok) { throw new Error('Servidor no responde'); }
            return response.json();
        })
        .then(messages => {
            if (connectionErrorShown) { removeConnectionError(); connectionErrorShown = false; }

            fetchTypingStatus(); 

            if (messages.length > lastMessageCount) {
                const newMessage = messages[messages.length - 1]; 
                displaySystemNotification(newMessage); 

                displayMessages(messages);
                lastMessageCount = messages.length;
            }
        })
        .catch(error => {
            if (!connectionErrorShown) { displayConnectionError(); connectionErrorShown = true; }
        });
}

function displaySystemNotification(message) {
    if (Notification.permission === 'granted' && !document.hasFocus()) {
        const options = {
            body: message.text || (message.fileUrl ? 'Archivo adjunto' : 'Mensaje nuevo'),
            icon: 'logo.png',
            tag: 'new-chat-message' 
        };
        new Notification(`[${message.rank}] ${message.alias}:`, options);
    }
}

// ----------------------------------------------------
// 4. LÓGICA DE RENDERIZADO AVANZADO
// ----------------------------------------------------

/**
 * Convierte Markdown simple (*negritas*, _itálicas_) a HTML.
 * @param {string} text - El texto a formatear.
 * @returns {string} Texto formateado con etiquetas HTML.
 */
function formatText(text) {
    if (!text) return '';
    let formattedText = text.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
    formattedText = formattedText.replace(/\_([^\_]+)\_/g, '<i>$1</i>');
    return formattedText;
}

/**
 * Formatea una cadena de fecha ISO a la hora local [HH:MM].
 * @param {string} isoString - Cadena de fecha ISO (timestamp del servidor).
 * @returns {string} Hora formateada.
 */
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}]`;
}

function displayMessages(messages) {
    if (!messagesDiv) return;

    messagesDiv.innerHTML = ''; 

    const isCurrentUserAdmin = ADMIN_RANKS.includes(currentUser.rank); 

    messages.forEach(msg => {
        const messageEntry = document.createElement('div');
        messageEntry.className = 'message-entry';

        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';

        // 1. Marca de Tiempo
        const timeSpan = document.createElement('span');
        timeSpan.textContent = formatTimestamp(msg.timestamp);
        timeSpan.style.color = '#777';
        timeSpan.style.marginRight = '8px';

        // 2. Rango y Alias
        const rankSpan = document.createElement('span');
        rankSpan.className = 'rank-tag rank-' + msg.rank.replace(/\s/g, ''); 
        rankSpan.textContent = '[' + msg.rank + ']';

        const aliasSpan = document.createElement('b');
        aliasSpan.textContent = msg.alias + ':';
        aliasSpan.style.color = '#fff'; 
        aliasSpan.style.marginLeft = '5px';

        headerContainer.appendChild(timeSpan);
        headerContainer.appendChild(rankSpan);
        headerContainer.appendChild(aliasSpan);

        // 3. BOTÓN DE ELIMINAR (Solo para Admins)
        if (isCurrentUserAdmin && msg.id) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '❌';
            deleteButton.title = 'Eliminar mensaje';
            deleteButton.onclick = () => deleteMessage(msg.id);
            deleteButton.style.marginLeft = 'auto'; 
            deleteButton.style.background = 'none';
            deleteButton.style.border = 'none';
            deleteButton.style.color = '#ff4d4d';
            deleteButton.style.cursor = 'pointer';

            headerContainer.appendChild(deleteButton);
        }

        messageEntry.appendChild(headerContainer);

        // 4. Contenido del Mensaje
        const contentContainer = document.createElement('div');

        if (msg.fileUrl) {
            const mediaContainer = document.createElement('div');
            mediaContainer.className = 'media-container';
            mediaContainer.style.marginTop = '5px';

            const fileExtension = msg.fileUrl.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
            const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExtension);

            if (isImage) {
                const img = document.createElement('img');
                img.src = msg.fileUrl;
                img.style.maxWidth = '100%';
                img.maxHeight = '250px';
                mediaContainer.appendChild(img);
            } else if (isVideo) {
                const video = document.createElement('video');
                video.src = msg.fileUrl;
                video.controls = true;
                video.style.maxWidth = '100%';
                video.maxHeight = '250px';
                mediaContainer.appendChild(video);
            }

            const downloadLink = document.createElement('a');
            downloadLink.href = msg.fileUrl;
            downloadLink.download = msg.originalName || 'archivo_descargado';
            downloadLink.textContent = `[Descargar: ${msg.originalName || 'Archivo'}]`;
            downloadLink.style.color = '#00BFFF';
            downloadLink.style.display = 'block';

            mediaContainer.appendChild(downloadLink);
            contentContainer.appendChild(mediaContainer);
        }

        if (msg.text) {
            const textNode = document.createElement('div');
            textNode.style.marginLeft = '5px';
            textNode.innerHTML = formatText(msg.text); 
            contentContainer.appendChild(textNode);
        }

        messageEntry.appendChild(contentContainer);
        messagesDiv.appendChild(messageEntry);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


// --- Funciones Auxiliares de UI ---
function displayConnectionError() {
    if (!messagesDiv) return;
    if (!document.getElementById('connection-error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'connection-error-message';
        errorDiv.className = 'connection-error';
        errorDiv.textContent = '❌ ERROR DE CONEXIÓN CON EL SERVIDOR. Revisa el túnel Cloudflare.';
        messagesDiv.appendChild(errorDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; 
    }
}

function removeConnectionError() {
    const errorDiv = document.getElementById('connection-error-message');
    if (errorDiv) { errorDiv.remove(); }
}