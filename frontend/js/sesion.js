// Barra de usuario y control de acceso. Si no hay token, manda al login.
// Va en una IIFE para no chocar con las variables globales de los otros JS.
(function () {

    // login.html no carga este script, asi que no se bloquea a si mismo.
    if (!localStorage.getItem('token')) {
        window.location.replace('login.html');
        return;
    }

    const usuario = obtenerUsuario() || { nombre: 'Usuario', rol: 'administrador' };

    document.addEventListener('DOMContentLoaded', () => pintarBarraUsuario(usuario));


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

async function cerrarSesion() {
    const token = localStorage.getItem('token');

    // Si habia una sesion real, se notifica el cierre al servidor (mejor esfuerzo).
    if (token) {
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
            console.warn('No se pudo notificar el cierre de sesión al servidor', err);
        }
    }

    // El login es opcional: tras cerrar sesion se recarga la pagina actual.
    limpiarSesion();
    window.location.reload();
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
    // El icono se inserta como SVG (innerHTML controlado por ICO, sin datos del usuario);
    // el nombre se agrega aparte con textContent para evitar cualquier riesgo de XSS.
    const ico = document.createElement('span');
    ico.className = 'userbar__ico';
    ico.innerHTML = ICO.usuario;
    const nombreSpan = document.createElement('span');
    nombreSpan.textContent = nombre;
    info.append(ico, nombreSpan);

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

    // Se coloca dentro de la barra superior (.nav); con margin-left:auto en el
    // CSS se ubica al extremo derecho de la franja.
    const nav = document.querySelector('.nav');
    if (nav) {
        nav.appendChild(barra);
    } else {
        brand.parentElement.insertBefore(barra, brand.nextSibling);
    }
}

})();
