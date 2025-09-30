const socket = io();

let currentUser = null;

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
            currentUser = data;
            document.getElementById("login").style.display = "none";
            document.getElementById("chat-container").style.display = "block";
        } else {
            document.getElementById("status").innerText = "Usuario o contraseña incorrectos";
        }
      });
}

socket.on("chat-history", messages => {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    messages.forEach(msg => {
        chat.innerHTML += `<p>[${msg.role}] ${msg.username}: ${msg.message}</p>`;
    });
});

socket.on("chat-message", msg => {
    const chat = document.getElementById("chat");
    chat.innerHTML += `<p>[${msg.role}] ${msg.username}: ${msg.message}</p>`;
    chat.scrollTop = chat.scrollHeight;
});

function sendMessage() {
    const msgInput = document.getElementById("msg");
    if (!msgInput.value) return;
    socket.emit("chat-message", { username: currentUser.username, role: currentUser.role, message: msgInput.value });
    msgInput.value = "";
}