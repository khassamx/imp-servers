// ... (Código anterior sin cambios)

// Ruta: login
app.post("/login", (req, res) => {
  // Solo necesitamos 'username' de la entrada
  const { username } = req.body; 
  const users = readJSON(USERS_FILE);

  // 1. Buscamos el usuario por el nombre de entrada ('Oliver')
  const user = users.find(u => u.username === username);
  
  // 2. Si el usuario existe, le asignamos el alias 'Keko' para el chat
  if (user) {
    // Retornamos el nombre de usuario de entrada (Oliver) y el alias deseado (Keko)
    res.json({ success: true, inputUsername: user.username, chatAlias: "Keko" });
  } else {
    // Si el usuario no existe en users.json, el login falla
    res.json({ success: false });
  }
});

// ... (Resto del código sigue igual)
