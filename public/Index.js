<!DOCTYPE html>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>IMP SERVERS</title>
</head>
<body>
<h1>¡Servidor funcionando!</h1>
<p>Si ves esto, tu `/` funciona correctamente.</p>
</body>
</html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>IMP SERVERS</title>
<style>
body { background: #000; color: #fff; font-family: Arial; }
#chat { height: 400px; overflow-y: scroll; border: 1px solid #fff; padding: 10px; margin-bottom: 10px; }
</style>
</head>
<body>
<h1>IMP SERVERS</h1>

<div id="login">
  <input id="username" placeholder="Usuario" autocomplete="off">
  <input id="password" placeholder="Contraseña" type="password" autocomplete="off">
  <button onclick="login()">Iniciar sesión</button>
  <p id="status"></p>
</div>

<div id="chat-container" style="display:none;">
  <div id="chat"></div>
  <input id="msg" placeholder="Escribe tu mensaje">
  <button onclick="sendMessage()">Enviar</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script src="js/app.js"></script>
</body>
</html>