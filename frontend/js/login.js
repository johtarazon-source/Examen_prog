
const form     = document.getElementById('formLogin');
const mensaje  = document.getElementById('mensaje');

// Si ya existe una sesion iniciada, evitar mostrar el login de nuevo.
if (localStorage.getItem('token')) {
    window.location.replace('inicio.html');
}

function mostrarMensaje(texto, tipo = 'ok') {
    mensaje.textContent = texto;
    mensaje.className = `mensaje mensaje--${tipo}`;
    mensaje.hidden = false;
}

async function iniciarSesion(e) {
    e.preventDefault();

    const usuario    = document.getElementById('usuario').value.trim();
    const contrasena = document.getElementById('contrasena').value;

    if (!usuario || !contrasena) {
        mostrarMensaje('Ingresa usuario y contraseña', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena }),
        });
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo iniciar sesión', 'error');
            return;
        }

        // Guardar token y datos de sesion
        localStorage.setItem('token', json.data.token);
        localStorage.setItem('usuario', JSON.stringify(json.data.usuario));

        mostrarMensaje('Sesión iniciada. Redirigiendo...', 'ok');
        setTimeout(() => { window.location.href = 'inicio.html'; }, 800);
    } catch (err) {
        mostrarMensaje(`Error de conexión con el servidor (${API_AUTH})`, 'error');
    }
}

form.addEventListener('submit', iniciarSesion);
