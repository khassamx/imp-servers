// ----------------------------------------------------
// 🔑 CONFIGURACIÓN Y PERMISOS
// ----------------------------------------------------
const ADMIN_RANKS = ["Fundador", "Líder"];

// 🚨 CARGA DE SESIÓN
let currentUser = null; 
const savedAlias = localStorage.getItem('chat_user_alias');
const savedRank = localStorage.getItem('chat_user_rank');

if (savedAlias && savedRank) {
    currentUser = { alias: savedAlias, rank: savedRank };
}

// Variables globales de UI
const messagesDiv = document.getElementById('chat-messages');
const typingIndicatorDiv = document.getElementById('typing-indicator');

let connectionErrorShown = false; 
let selectedFile = null; 
let typingTimer = null; 
let lastMessageCount = 0;
let messagePollingInterval = null; 

// Configuración de Conexión
const protocol = window.location.protocol; 
const hostname = window.location.hostname;
let apiHost = hostname;
if (protocol === 'http:') {
    // Esto asegura que se use el puerto 3000 si no es HTTPS
    apiHost = hostname + ':3000';
}
const SERVER_URL = protocol + '//' + apiHost;
const POLLING_INTERVAL = 3000; 


// ----------------------------------------------------
// 1. LÓGICA DE AUTENTICACIÓN
// ----------------------------------------------------

async function register() {
    const name = document.getElementById('name-input').value.trim();
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const alias = document.getElementById('alias-input').value.trim();
    const country = document.getElementById('country-input').value.trim();
    const whatsapp = document.getElementById('whatsapp-input').value.trim();
    const email = document.getElementById('email-input').value.trim();
    const errorDiv = document.getElementById('register-error');

    errorDiv.textContent = '';

    if (!name || !username || !password || !alias || !country || !whatsapp || !email) {
        errorDiv.textContent = '❌ Por favor, completa todos los campos requeridos.';
        return;
    }
    
    const registrationData = { name, username, password, alias, country, whatsapp, email };

    try {
        const response = await fetch(SERVER_URL + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ Registro exitoso. ¡Bienvenido, ${result.alias}! Ahora inicia sesión.`);
            window.location.href = '/login.html';
        } else {
            errorDiv.textContent = `❌ Error: ${result.message || 'Error desconocido al registrar.'}`;
        }
    } catch (error) {
        console.error('Error de red al registrar:', error);
        errorDiv.textContent = '❌ No se pudo conectar con el servidor para registrar. Intenta más tarde.';
    }
}


async function login() {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const errorDiv = document.getElementById('login-error');

    errorDiv.textContent = ''; 

    if (!username || !password) {
        errorDiv.textContent = '❌ Ingresa tu Usuario y Contraseña.';
        return;
    }

    try {
        const response = await fetch(SERVER_URL + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = { alias: result.alias, rank: result.rank };
            
            localStorage.setItem('chat_user_alias', currentUser.alias);
            localStorage.setItem('chat_user_rank', currentUser.rank);

            window.location.href = '/index.html'; 
        } else {
            errorDiv.textContent = `❌ Error: ${result.message || 'Usuario o Contraseña incorrectos.'}`;
        }
    } catch (error) {
        console.error('Error de red al intentar login:', error);
        errorDiv.textContent = '❌ No se pudo conectar con el servidor. Intenta más tarde.';
    }
}

/**
 * Chequea si hay sesión activa y redirige. Se ejecuta al cargar cualquier página.
 */
function checkSessionAndRedirect() {
    const path = window.location.pathname;
    
    // Si hay sesión y estamos en login/register, vamos a index.
    if (currentUser && (path.endsWith('/login.html') || path.endsWith('/register.html'))) {
        window.location.href = '/index.html';
    // Si NO hay sesión y estamos en index, vamos a login.
    } else if (!currentUser && path.endsWith('/index.html')) {
        window.location.href = '/login.html';
    }
}

function logout() {
    localStorage.removeItem('chat_user_alias');
    localStorage.removeItem('chat_user_rank');
    
    currentUser = null;
    if(messagePollingInterval) clearInterval(messagePollingInterval);
    window.location.href = '/login.html';
}

// ----------------------------------------------------
// 2. LÓGICA DE CHAT Y POLLING
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

    try {
        const uploadResponse = await fetch(SERVER_URL + '/upload', {
            method: 'POST',
            body: formData
        });
        
        // 🚨 Validación Crítica: Asegurar que la respuesta es JSON
        const contentType = uploadResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             const errorText = await uploadResponse.text();
             throw new Error(`Respuesta inesperada del servidor (Status: ${uploadResponse.status}). Contenido: ${errorText.substring(0, 50)}...`);
        }
        
        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
            throw new Error(`Fallo en la subida: ${uploadData.error || 'Error desconocido'}`);
        }

        messageData.fileUrl = uploadData.fileUrl;
        messageData.originalName = uploadData.originalName;
        messageData.text = document.getElementById('message-input').value.trim() || null;
        
        selectedFile = null;
        document.getElementById('file-input').value = ''; 
        document.getElementById('message-input').placeholder = 'Escribe tu mensaje o agrega un archivo...';

    } catch (e) {
        // Relanza el error para que la función sendMessage lo muestre al usuario
        throw new Error(`Error durante el proceso de subida: ${e.message}`);
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (!currentUser || !input || (!text && !selectedFile)) return;
    if (text.length > 256) {
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
            const error = await response.json();
            console.error('Error al enviar mensaje:', error);
            alert(`Error al enviar. ${error.message || 'Revisa la consola.'}`);
        }
    } catch (error) {
        console.error('Error de red al enviar/subir:', error);
        alert('No se pudo completar el envío: ' + error.message);
    }
}

async function deleteMessage(messageId) {
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
            alert('No se pudo eliminar el mensaje.');
        }
    } catch (error) {
        console.error('Error de red al eliminar:', error);
        alert('No se pudo conectar con el servidor para eliminar el mensaje.');
    }
}

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
    if (!messagesDiv || !currentUser) return;
    
    fetch(SERVER_URL + '/messages')
        .then(response => {
            if (!response.ok) { throw new Error(`Servidor no responde (Status: ${response.status})`); }
            return response.json();
        })
        .then(messages => {
            if (connectionErrorShown) { removeConnectionError(); connectionErrorShown = false; }
            
            fetchTypingStatus(); 

            if (messages.length !== lastMessageCount) {
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

// ----------------------------------------------------
// 3. LÓGICA DE RENDERIZADO Y UI
// ----------------------------------------------------

function formatText(text) {
    if (!text) return '';
    let formattedText = text.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
    formattedText = formattedText.replace(/\_([^\_]+)\_/g, '<i>$1</i>');
    return formattedText;
}

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}]`;
}

function displayMessages(messages) {
    if (!messagesDiv || !currentUser) return;
    
    // Almacenar la posición actual
    const isAtBottom = messagesDiv.scrollHeight - messagesDiv.clientHeight <= messagesDiv.scrollTop + 100;
    
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
    
    // Solo hace scroll si el usuario estaba cerca del fondo.
    if (isAtBottom) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
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

function displayConnectionError() {
    if (!messagesDiv) return;
    if (!document.getElementById('connection-error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'connection-error-message';
        errorDiv.className = 'connection-error';
        errorDiv.textContent = '❌ ERROR DE CONEXIÓN CON EL SERVIDOR.';
        messagesDiv.appendChild(errorDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; 
    }
}

function removeConnectionError() {
    const errorDiv = document.getElementById('connection-error-message');
    if (errorDiv) { errorDiv.remove(); }
}

function focusInput() {
    const input = document.getElementById('message-input');
    if(input) input.focus();
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ----------------------------------------------------
// 4. INICIALIZACIÓN GLOBAL
// ----------------------------------------------------

window.onload = function() {
    // 1. Chequeo de sesión y redirección (antes que nada)
    checkSessionAndRedirect(); 
    
    // 2. Si estamos en la página de chat, iniciar el polling
    if (window.location.pathname.endsWith('/index.html') && currentUser) {
        requestNotificationPermission();
        fetchMessages(); // Primera carga inmediata
        messagePollingInterval = setInterval(fetchMessages, POLLING_INTERVAL);
        
        // Configurar envío de mensaje con Enter
        const input = document.getElementById('message-input');
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendMessage(); 
                } else if (e.key !== 'Enter') {
                    sendTypingSignal();
                }
            });
            input.focus(); 
        }

        // Mostrar alias y rango actual
        const userInfoDiv = document.getElementById('user-info');
        if (userInfoDiv) {
             userInfoDiv.textContent = `${currentUser.alias} (${currentUser.rank})`;
        }
    }
};
```eof

---

## 🚀 Resumen del Estado Actual

Tu aplicación está en su punto más funcional y estable hasta ahora:

1.  **`server.js` (Limpio):** Maneja el registro, el login, el guardado de datos y el envío/subida de archivos correctamente.
2.  **`app.js` (Completo):** Maneja la UI, la persistencia de sesión, la lógica de registro/login, y soluciona el error de "Unexpected Token" al validar la respuesta del servidor.
3.  **Archivos estáticos:** Tienes `login.html`, `register.html`, `index.html`, y sus respectivos CSS.

Ahora, con ambos archivos de lógica limpios y actualizados, el servidor debería funcionar sin errores de sintaxis, y el cliente sabrá qué hacer. ¡El siguiente paso es hacer que tu túnel de Cloudflare funcione sin el error 502!