// =========================================================
// 🌐 FUNCIÓN CLAVE PARA LA PÁGINA UNIFICADA
// =========================================================

/**
 * Muestra solo la vista especificada (login, register o chat) y oculta las demás.
 * @param {string} viewName - El nombre de la vista a mostrar ('login', 'register', 'chat').
 */
function showView(viewName) {
    const views = {
        'login': document.getElementById('login-view'),
        'register': document.getElementById('register-view'),
        'chat': document.getElementById('chat-view')
    };

    // Ocultar todas las vistas
    Object.values(views).forEach(v => {
        if (v) v.style.display = 'none';
    });

    // Mostrar la vista solicitada
    const targetView = views[viewName];
    if (targetView) {
        targetView.style.display = 'flex'; // Usamos 'flex' para las vistas de autenticación para centrado
    }

    // Pone el foco en el campo correcto
    if (viewName === 'login') {
        document.getElementById('username-input').focus();
    } else if (viewName === 'register') {
        document.getElementById('reg-username-input').focus();
    } else if (viewName === 'chat') {
        document.getElementById('message-input').focus();
    }
}


// =========================================================
// 🚀 CAMBIO EN LA INICIALIZACIÓN (Reemplaza tu antiguo window.onload)
// =========================================================

window.onload = function() {
    // Si hay sesión activa, vamos directamente al chat
    if (currentUser) {
        // 1. Mostrar la vista del chat
        showView('chat');
        
        // 2. Inicializar el chat (esto estaba antes en tu onload de index.html)
        document.getElementById('current-alias').textContent = currentUser.alias + ' (' + currentUser.role + ')';
        fetchMessages();
        messagePollingInterval = setInterval(fetchMessages, POLLING_INTERVAL);

        // Configurar envío de mensaje con Enter y señal de tecleo
        const input = document.getElementById('message-input');
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendMessage(); 
                } 
                // Nota: La lógica de sendTypingSignal debe estar definida en app.js
            });
            input.focus(); 
        }

    } else {
        // Si NO hay sesión, vamos al login
        showView('login');
    }
};

// =========================================================
// 📌 OTROS CAMBIOS EN FUNCIONES
// =========================================================

// En tu función 'login()'
// REEMPLAZA: window.location.href = '/index.html'; 
// POR: showView('chat');

// En tu función 'register()'
// REEMPLAZA: window.location.href = '/login.html';
// POR: showView('login');

// En tu función 'logout()'
// REEMPLAZA: window.location.href = '/login.html'; 
// POR: showView('login');