// =====================================================
// Guardia de sesion - protege las paginas internas
// Consume ms-auth (/validar y /logout) con el token guardado.
// Debe incluirse ANTES de los scripts de cada modulo
// (vehiculos.js / conductores.js) en las paginas protegidas.
// =====================================================

// Todo el guard vive dentro de una IIFE para no contaminar el ambito global
// que comparten vehiculos.js / conductores.js (evita choques de nombres).
(function () {

    const token   = localStorage.getItem('token');
    const usuario = obtenerUsuario();

    // Sin token no hay nada que validar: de vuelta al login.
    if (!token) {
        window.location.replace('login.html');
        return;
    }

    // Validar el token contra el microservicio de autenticacion.
    // Si la sesion ya no es valida, se limpia y se redirige al login.
    validarSesion(token);

    // Cuando el DOM este listo, pintar la barra de usuario.
    document.addEventListener('DOMContentLoaded', () => pintarBarraUsuario(usuario));

// ---------- Utilidades ----------

function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem('usuario')) || null;
    } catch (err) {
        return null;
    }
}

function limpiarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
}

async function validarSesion(token) {
    try {
        const res = await fetch(`${API_AUTH}/validar`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const json = await res.json();

        if (!json.success) {
            limpiarSesion();
            window.location.replace('login.html');
        }
    } catch (err) {
        // Si ms-auth no responde no expulsamos al usuario: solo avisamos
        // por consola para no bloquear el trabajo si el servicio esta caido.
        console.warn(`No se pudo validar la sesión con ${API_AUTH}/validar`, err);
    }
}

async function cerrarSesion() {
    const token = localStorage.getItem('token');

    try {
        await fetch(`${API_AUTH}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ token }),
        });
    } catch (err) {
        // Aunque falle la llamada al servidor, cerramos la sesion local.
        console.warn('No se pudo notificar el cierre de sesión al servidor', err);
    } finally {
        limpiarSesion();
        window.location.replace('login.html');
    }
}

// ---------- Barra de usuario ----------

// Inserta en el hero el nombre del usuario y el boton de cerrar sesion.
// Se construye el DOM con textContent para evitar cualquier riesgo de XSS
// con los datos que llegan del servidor.
function pintarBarraUsuario(usuario) {
    const brand = document.querySelector('.hero__brand');
    if (!brand) return;

    const nombre = usuario?.nombre || usuario?.usuario || 'Usuario';
    const rol    = usuario?.rol ? ` · ${usuario.rol}` : '';

    const barra = document.createElement('div');
    barra.className = 'userbar';

    const info = document.createElement('span');
    info.className = 'userbar__info';
    info.textContent = `👤 ${nombre}`;

    const rolSpan = document.createElement('span');
    rolSpan.className = 'userbar__rol';
    rolSpan.textContent = rol;
    info.appendChild(rolSpan);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost userbar__logout';
    btn.id = 'btnLogout';
    btn.textContent = 'Cerrar sesión';
    btn.addEventListener('click', cerrarSesion);

    barra.appendChild(info);
    barra.appendChild(btn);
    brand.parentElement.insertBefore(barra, brand.nextSibling);
}

})();
