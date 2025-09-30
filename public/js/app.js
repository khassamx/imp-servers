// public/js/app.js
const socket = io();
let CURRENT = null;

function qs(sel){ return document.querySelector(sel); }
const loginCard = qs('#loginCard');
const chatCard = qs('#chatCard');
const loginBtn = qs('#loginBtn');
const logoutBtn = qs('#logoutBtn');
const usernameEl = qs('#username');
const passwordEl = qs('#password');
const loginError = qs('#loginError');
const welcomeText = qs('#welcomeText');
const roleText = qs('#roleText');
const chatBox = qs('#chatBox');
const messageInput = qs('#messageInput');
const sendBtn = qs('#sendBtn');
const adminPanel = qs('#adminPanel');
const adminUsersSelect = qs('#adminUsersSelect');
const adminNewPass = qs('#adminNewPass');
const adminNewRole = qs('#adminNewRole');
const adminUpdateBtn = qs('#adminUpdateBtn');
const adminDeleteBtn = qs('#adminDeleteBtn');
const adminCreateBtn = qs('#adminCreateBtn');

async function api(path, opts={}) {
  opts.headers = opts.headers || {};
  if (!opts.headers['Content-Type'] && !(opts.body instanceof FormData)) opts.headers['Content-Type'] = 'application/json';
  if (opts.body && opts.headers['Content-Type'] === 'application/json') opts.body = JSON.stringify(opts.body);
  const res = await fetch(path, opts);
  return res.json().catch(()=>({}));
}

function showLogin() {
  chatCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
}
function showChat() {
  loginCard.classList.add('hidden');
  chatCard.classList.remove('hidden');
}

function appendTerminalLine(text) {
  const t = document.getElementById('terminalLines');
  const div = document.createElement('div');
  div.className = 'line';
  div.textContent = text;
  t.appendChild(div);
  t.parentElement.scrollTop = t.parentElement.scrollHeight;
}

// login handler
loginBtn.addEventListener('click', async () => {
  loginError.classList.add('hidden');
  appendTerminalLine('Verificando credenciales...');
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();
  if (!username || !password) { loginError.textContent = 'Completa usuario y contraseña'; loginError.classList.remove('hidden'); return; }

  const r = await api('/api/login', { method: 'POST', body: { username, password }});
  if (r && r.ok) {
    CURRENT = r.user;
    onLoginSuccess();
  } else {
    loginError.textContent = r.error || 'Error al iniciar sesión';
    loginError.classList.remove('hidden');
    appendTerminalLine('Acceso denegado.');
  }
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  CURRENT = null;
  socket.emit('auth', null);
  showLogin();
  chatBox.innerHTML = '';
  appendTerminalLine('Sesión cerrada.');
});

// on successful login
async function onLoginSuccess(){
  appendTerminalLine('Acceso concedido. Cargando chat...');
  welcomeText.textContent = `Bienvenido, ${CURRENT.username}`;
  roleText.textContent = `Rango: ${CURRENT.role}`;
  showChat();

  // autenticar socket
  socket.emit('auth', CURRENT);

  // cargar historial
  const msgs = await api('/api/messages');
  chatBox.innerHTML = '';
  msgs.forEach(m => appendMessage(m));
  // mostrar admin panel si lider
  if (CURRENT.role === 'LIDER') {
    adminPanel.classList.remove('hidden');
    loadAdminUsers();
  } else adminPanel.classList.add('hidden');
}

// append message to chat box (format [RANGO] USUARIO: texto)
function appendMessage(m) {
  const div = document.createElement('div');
  div.className = 'message';
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.textContent = `[${m.role}] ${m.username} — ${new Date(m.ts || m.ts).toLocaleString()}`;
  const text = document.createElement('div'); text.textContent = m.text;
  div.appendChild(meta); div.appendChild(text);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// send
sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text || !CURRENT) return;
  socket.emit('sendMessage', text);
  messageInput.value = '';
});

// socket incoming
socket.on('newMessage', (m) => {
  appendMessage(m);
});

// --- Admin actions ---
async function loadAdminUsers(){
  const r = await api('/api/admin/users');
  adminUsersSelect.innerHTML = '';
  if (!r || !Array.isArray(r)) return;
  r.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.username} • ${u.role}`;
    adminUsersSelect.appendChild(opt);
  });
}

adminUpdateBtn.addEventListener('click', async () => {
  const id = adminUsersSelect.value;
  const pass = adminNewPass.value.trim();
  const role = adminNewRole.value;
  if (!id) return alert('Selecciona usuario');
  const body = {};
  if (pass) body.password = pass;
  if (role) body.role = role;
  const r = await api(`/api/admin/users/${id}`, { method: 'PUT', body });
  if (r && r.ok) {
    alert('Usuario actualizado');
    adminNewPass.value = '';
    await loadAdminUsers();
  } else alert(r.error || 'Error');
});

adminDeleteBtn.addEventListener('click', async () => {
  const id = adminUsersSelect.value;
  if (!id) return alert('Selecciona usuario');
  if (!confirm('Eliminar usuario?')) return;
  const r = await api(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (r && r.ok) { alert('Eliminado'); await loadAdminUsers(); } else alert(r.error || 'Error');
});

adminCreateBtn.addEventListener('click', async () => {
  const username = prompt('Nombre de usuario:');
  if (!username) return;
  const password = prompt('Contraseña:');
  if (!password) return;
  const role = prompt('Rango (LIDER/COLIDER/VETERANO/MIEMBRO):','MIEMBRO');
  const r = await api('/api/admin/users', { method: 'POST', body: { username, password, role }});
  if (r && r.ok) { alert('Usuario creado'); await loadAdminUsers(); } else alert(r.error || 'Error');
});