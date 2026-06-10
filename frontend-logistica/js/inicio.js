// =====================================================
// Panel de control (dashboard) - agrega datos de los
// microservicios de vehiculos y conductores.
// =====================================================

const mensaje = document.getElementById('mensaje');

function mostrarMensaje(texto, tipo = 'ok') {
    mensaje.textContent = texto;
    mensaje.className = `mensaje mensaje--${tipo}`;
    mensaje.hidden = false;
    setTimeout(() => { mensaje.hidden = true; }, 4000);
}

// Cuenta cuantos elementos tienen cada estado.
function contarPorEstado(lista, estado) {
    return lista.filter(item => item.estado === estado).length;
}

// Pinta un grupo de tarjetas. ids = { total, ok, ruta, ultimo }.
function pintarResumen(lista, ids, estadoUltimo) {
    document.getElementById(ids.total).textContent  = lista.length;
    document.getElementById(ids.ok).textContent     = contarPorEstado(lista, 'disponible');
    document.getElementById(ids.ruta).textContent   = contarPorEstado(lista, 'en_ruta');
    document.getElementById(ids.ultimo).textContent = contarPorEstado(lista, estadoUltimo);
}

// Marca con un guion las tarjetas de un servicio que no respondio.
function marcarSinDatos(ids) {
    Object.values(ids).forEach(id => {
        document.getElementById(id).textContent = '—';
    });
}

// Resumen de rutas: las rutas no tienen "estado", se calculan
// total, distancia maxima/minima y numero de ciudades unicas.
function pintarResumenRutas(lista, ids) {
    document.getElementById(ids.total).textContent = lista.length;

    if (lista.length) {
        const distancias = lista.map(r => Number(r.distancia)).filter(d => !isNaN(d));
        document.getElementById(ids.max).textContent = Math.max(...distancias).toLocaleString('es-CO');
        document.getElementById(ids.min).textContent = Math.min(...distancias).toLocaleString('es-CO');
    } else {
        document.getElementById(ids.max).textContent = 0;
        document.getElementById(ids.min).textContent = 0;
    }

    const ciudades = new Set();
    lista.forEach(r => { ciudades.add(r.ciudad_origen); ciudades.add(r.ciudad_destino); });
    document.getElementById(ids.ciudades).textContent = ciudades.size;
}

async function cargarLista(url) {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Respuesta no exitosa');
    return json.data;
}

async function cargarDashboard() {
    const vehIds = { total: 'vehTotal', ok: 'vehDisponibles', ruta: 'vehEnRuta', ultimo: 'vehMantenimiento' };
    const conIds = { total: 'conTotal', ok: 'conDisponibles', ruta: 'conEnRuta', ultimo: 'conInactivos' };
    const rutIds = { total: 'rutTotal', max: 'rutDistanciaMax', min: 'rutDistanciaMin', ciudades: 'rutCiudades' };

    const fallos = [];

    // Cada servicio se carga de forma independiente: si uno falla,
    // los otros igual muestran sus datos.
    const [veh, con, rut] = await Promise.allSettled([
        cargarLista(`${API_VEHICULOS}/vehiculos`),
        cargarLista(`${API_CONDUCTORES}/conductores`),
        cargarLista(`${API_RUTAS}/rutas`),
    ]);

    if (veh.status === 'fulfilled') {
        pintarResumen(veh.value, vehIds, 'mantenimiento');
    } else {
        marcarSinDatos(vehIds);
        fallos.push('vehículos');
    }

    if (con.status === 'fulfilled') {
        pintarResumen(con.value, conIds, 'inactivo');
    } else {
        marcarSinDatos(conIds);
        fallos.push('conductores');
    }

    if (rut.status === 'fulfilled') {
        pintarResumenRutas(rut.value, rutIds);
    } else {
        marcarSinDatos(rutIds);
        fallos.push('rutas');
    }

    if (fallos.length) {
        mostrarMensaje(`No se pudo conectar con el servicio de ${fallos.join(' y ')}.`, 'error');
    }
}

cargarDashboard();
