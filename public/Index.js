<!-- public/index.html -->
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>IMP SERVERS — Login</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="wrap">
    <div class="login-card" id="loginCard">
      <h1 class="title">IMP SERVERS</h1>
      <div class="terminal" id="terminal">
        <div id="terminalLines">
          <div class="line">Autenticando en IMP SERVERS...</div>
        </div>
      </div>

      <form id="loginForm" autocomplete="off" onsubmit="return false;">
        <label>USUARIO</label>
        <input id="username" type="text" autocomplete="new-username" spellcheck="false" />
        <label>CONTRASEÑA</label>
        <input id="password" type="password" autocomplete="new-password" />
        <div class="actions">
          <button id="loginBtn" class="btn">INICIAR SESIÓN</button>
        </div>
        <div id="loginError" class="error hidden"></div>
      </form>
    </div>

    <div class="chat-card hidden" id="chatCard">
      <div class="top">
        <div>
          <div class="welcome" id="welcomeText"></div>
          <div class="small" id="roleText"></div>
        </div>
        <div>
          <button id="logoutBtn" class="btn small">Cerrar sesión</button>
        </div>
      </div>

      <div id="chatBox" class="chatBox" aria-live="polite"></div>

      <div class="sendRow">
        <input id="messageInput" type="text" placeholder="Escribe un mensaje..." />
        <button id="sendBtn" class="btn">Enviar</button>
      </div>

      <div id="adminPanel" class="adminPanel hidden">
        <h3>Panel del LÍDER — Control de usuarios</h3>
        <div class="adminControls">
          <select id="adminUsersSelect"></select>
          <input id="adminNewPass" type="text" placeholder="Nueva contraseña (dejar vacío para no cambiar)" />
          <select id="adminNewRole">
            <option value="LIDER">LIDER</option>
            <option value="COLIDER">COLIDER</option>
            <option value="VETERANO">VETERANO</option>
            <option value="MIEMBRO">MIEMBRO</option>
          </select>
          <div class="flexRow">
            <button id="adminUpdateBtn" class="btn">Actualizar</button>
            <button id="adminDeleteBtn" class="btn warn">Eliminar</button>
            <button id="adminCreateBtn" class="btn primary">Agregar</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>