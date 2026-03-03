const API_BASE_URL = "https://payment.services.socketidea.com/api";

// Variable global para guardar los datos del usuario buscado actualmente
let currentUserData = null;

// Verifica si ya hay un token al cargar la página
window.onload = () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        showApp();
    }
};

// --- AUTENTICACIÓN ---
async function login() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const msg = document.getElementById('loginMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/admins/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success && data.data && data.data.token) {
            localStorage.setItem('adminToken', data.data.token);
            showApp();
        } else {
            msg.style.display = 'block';
            msg.innerText = "Error: Credenciales incorrectas";
        }
    } catch (error) {
        console.error("Error en login:", error);
        msg.style.display = 'block';
        msg.innerText = "Error de conexión con la API";
    }
}

function showApp() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'flex';
}

function logout() {
    localStorage.removeItem('adminToken');
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('userTableBody').innerHTML = ''; 
    currentUserData = null;
}

// --- BÚSQUEDA ---
async function searchUser() {
    const searchValue = document.getElementById('searchInput').value.trim();
    const tableBody = document.getElementById('userTableBody');
    const token = localStorage.getItem('adminToken');
    
    if(!searchValue) return alert("Ingresa un número de documento o un email");
    if(!token) return logout(); 

    const isEmail = searchValue.includes('@');
    const queryParam = isEmail ? `email=${searchValue}` : `documentNumber=${searchValue}`;

    try {
        const response = await fetch(`${API_BASE_URL}/users/admin/search?${queryParam}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        });
        
        const data = await response.json();

        if (data.success) {
            currentUserData = data.data || data.user; 
            renderTable([currentUserData], searchValue); 
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${data.message || 'Usuario no encontrado'}</td></tr>`;
            currentUserData = null;
        }
    } catch (error) {
        console.error("Error al conectar con la API:", error);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error de conexión</td></tr>`;
    }
}

function renderTable(users, fallbackSearchValue = '') {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px">
                    <div class="avatar" style="background:#333; padding:8px 12px; border-radius:50%;">${(user.name || user.firstName || 'U').charAt(0)}</div>
                    <div>
                        <div>${user.firstName || user.name || ''} ${user.lastName || ''}</div>
                        <div style="font-size:0.8rem; color:gray">${user.email || 'Sin correo'}</div>
                    </div>
                </div>
            </td>
            <td>${user.documentNumber || fallbackSearchValue}</td>
            <td><span class="status-pill">Active</span></td>
            <td><button class="btn-secondary" onclick="openEditor()">Edit</button></td>
        </tr>
    `).join('');
}

// --- EDICIÓN Y GUARDADO ---
function openEditor() {
    if(!currentUserData) return alert("No hay datos de usuario para editar");

    // Llenamos los campos con la información actual
    document.getElementById('editFirstName').value = currentUserData.firstName || currentUserData.name || '';
    document.getElementById('editLastName').value = currentUserData.lastName || '';
    document.getElementById('editEmail').value = currentUserData.email || '';
    document.getElementById('editDocNumber').value = currentUserData.documentNumber || '';
    document.getElementById('updateMessage').style.display = 'none';

    // Cambiamos a la vista del editor
    document.getElementById('directoryView').style.display = 'none';
    document.getElementById('editorView').style.display = 'block';
}

function closeEditor() {
    document.getElementById('directoryView').style.display = 'block';
    document.getElementById('editorView').style.display = 'none';
}

async function saveUserChanges() {
    const token = localStorage.getItem('adminToken');
    if (!token) return logout();

    const msg = document.getElementById('updateMessage');
    msg.style.display = 'block';
    msg.style.color = '#a0a0a0';
    msg.innerText = "Guardando cambios...";

    // 1. Tomamos lo que el usuario escribió en el formulario
    const newFirstName = document.getElementById('editFirstName').value.trim();
    const newLastName = document.getElementById('editLastName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newDoc = document.getElementById('editDocNumber').value.trim();

    // 2. Construimos el JSON (Payload) como en Postman
    const payload = {
        search: {},
        update: {}
    };

    // Usamos el documento original para buscar al usuario en la BD
    if (currentUserData.documentNumber) {
        payload.search.documentNumber = currentUserData.documentNumber;
    } else if (currentUserData.email) {
        payload.search.email = currentUserData.email;
    }

    // Enviamos los datos actualizados
    if (newFirstName) payload.update.firstName = newFirstName;
    if (newLastName) payload.update.lastName = newLastName;
    if (newEmail) payload.update.email = newEmail;
    if (newDoc) payload.update.documentNumber = newDoc;

    try {
        const response = await fetch(`${API_BASE_URL}/users/admin/update`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            msg.style.color = '#4CAF50';
            msg.innerText = "¡Usuario actualizado exitosamente!";
            
            // Actualizamos la tabla y la variable global con los nuevos datos
            setTimeout(() => {
                document.getElementById('searchInput').value = newDoc || newEmail; 
                searchUser(); 
                closeEditor();
            }, 1500);

        } else {
            msg.style.color = 'red';
            msg.innerText = data.message || "Error al actualizar";
        }
    } catch (error) {
        console.error("Error updating user:", error);
        msg.style.color = 'red';
        msg.innerText = "Error de conexión";
    }
}