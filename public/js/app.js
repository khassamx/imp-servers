// =========================================================
// 🌐 FRONTEND v4.1: ADAPTADO A EXPRESS/SQLITE
// Usa 'fetch' y localStorage
// =========================================================

// 🚨 CARGA DE SESIÓN
let currentUser = null; 
const savedAlias = localStorage.getItem('chat_user_alias');
const savedRole = localStorage.getItem('chat_user_role'); // Usamos 'role' para consistencia

if (savedAlias && savedRole) {
    currentUser = { alias: savedAlias, role: savedRole };
}

// Configuración de Conexión (Ajuste para Termux)
const protocol = window.location.protocol; 
const hostname = window.location.hostname;
let apiHost = hostname;
// Si no es HTTPS, asume que debe usar el puerto 3000
if (protocol === 'http:') { 
    apiHost = hostname + ':3000';
}
const SERVER_URL = protocol + '//' + apiHost;
const POLLING_INTERVAL = 3000; 
let messagePollingInterval = null; 


// ----------------------------------------------------
// 1. LÓGICA DE AUTENTICACIÓN
// ----------------------------------------------------

async function login() {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const errorDiv = document.getElementById('login-error');

    errorDiv.textContent = ''; 

    try {
        const response = await fetch(SERVER_URL + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            currentUser = { alias: result.alias, role: result.role };

            localStorage.setItem('chat_user_alias', currentUser.alias);
            localStorage.setItem('chat_user_role', currentUser.role); // Guardamos el rol

            window.location.href = '/index.html'; 
        } else {
            errorDiv.textContent = `❌ ${result.message || 'Usuario o Contraseña incorrectos.'}`;
        }
    } catch (error) {
        console.error('Error de red al intentar login:', error);
        errorDiv.textContent = '❌ No se pudo conectar con el servidor. Intenta más tarde.';
    }
}

function logout() {
    localStorage.removeItem('chat_user_alias');
    localStorage.removeItem('chat_user_role');

    currentUser = null;
    if(messagePollingInterval) clearInterval(messagePollingInterval);
    window.location.href = '/login.html';
}

function checkSessionAndRedirect() {
    const path = window.location.pathname;

    // Redirige si la sesión es incorrecta para la página actual
    if (currentUser && (path.endsWith('/login.html') || path.endsWith('/register.html'))) {
        window.location.href = '/index.html';
    } else if (!currentUser && path.endsWith('/index.html')) {
        window.location.href = '/login.html';
    }
}


// ----------------------------------------------------
// 2. LÓGICA DE CHAT Y MENSAJES
// ----------------------------------------------------

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (!currentUser || !input || !text) return;

    const messageData = {
        alias: currentUser.alias,
        role: currentUser.role, // Usamos 'role' en lugar de 'rank'
        text: text 
    };

    try {
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
            alert(`Error al enviar mensaje. ${error.message || 'Revisa la consola.'}`);
        }
    } catch (error) {
        alert('No se pudo completar el envío: Error de red.');
    }
}

function addMessageToDOM(alias, message, role, timestamp) {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;

    const messageEntry = document.createElement('div');
    messageEntry.className = 'message-entry';

    const timeSpan = document.createElement('span');
    const date = new Date(timestamp);
    timeSpan.textContent = `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}]`;
    timeSpan.style.color = '#777';
    timeSpan.style.marginRight = '8px';

    const roleSpan = document.createElement('span');
    roleSpan.className = 'rank-tag rank-' + role.replace(/\s/g, ''); 
    roleSpan.textContent = '[' + role + ']';

    const aliasSpan = document.createElement('b');
    aliasSpan.textContent = alias + ':';
    aliasSpan.style.color = '#fff'; 
    aliasSpan.style.marginLeft = '5px';

    const textNode = document.createElement('div');
    textNode.innerHTML = message;
    textNode.style.marginLeft = '5px';

    messageEntry.appendChild(timeSpan);
    messageEntry.appendChild(roleSpan);
    messageEntry.appendChild(aliasSpan);
    messageEntry.appendChild(textNode);
    messagesDiv.appendChild(messageEntry);
}


async function fetchMessages() {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv || !currentUser) return;

    try {
        const response = await fetch(SERVER_URL + '/messages');
        const messages = await response.json();
        
        messagesDiv.innerHTML = ''; 

        messages.forEach(msg => {
            addMessageToDOM(msg.username, msg.message, msg.role, msg.ts);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error("Error al cargar mensajes:", error);
    }
}


// ----------------------------------------------------
// 3. INICIALIZACIÓN
// ----------------------------------------------------

// Se ejecuta cuando se carga la página
window.onload = function() {
    checkSessionAndRedirect(); 

    if (window.location.pathname.endsWith('/index.html') && currentUser) {
        document.getElementById('current-alias').textContent = currentUser.alias + ' (' + currentUser.role + ')';

        // Evento de envío con Enter
        const input = document.getElementById('message-input');
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendMessage(); 
                } 
            });
            input.focus(); 
        }

        fetchMessages();
        messagePollingInterval = setInterval(fetchMessages, POLLING_INTERVAL);
    } else if (window.location.pathname.endsWith('/login.html')) {
        document.getElementById('username-input').focus();
    }
};