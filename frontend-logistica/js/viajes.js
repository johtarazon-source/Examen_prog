// =====================================================
// Seguimiento de Viajes - consumo de la API REST con fetch
// =====================================================

const BASE = `${API_VIAJES}/viajes`;

// Referencias del DOM
const tablaBody = document.getElementById('tablaBody');
const mensaje   = document.getElementById('mensaje');

const modalSeg     = document.getElementById('modalSeguimiento');
const segViajeId   = document.getElementById('segViajeId');
const segHistorial = document.getElementById('segHistorial');

const modalNovedad   = document.getElementById('modalNovedad');
const formNovedad    = document.getElementById('formNovedad');
const novedadViajeId = document.getElementById('novedadViajeId');

const filtroEstado = document.getElementById('filtroEstado');
const filtroFecha  = document.getElementById('filtroFecha');

const statTotal       = document.getElementById('statTotal');
const statTransito    = document.getElementById('statTransito');
const statRetrasados  = document.getElementById('statRetrasados');
const statFinalizados = document.getElementById('statFinalizados');

const ESTADO_LABEL = {
    programado: 'programado',
    en_transito: 'en tránsito',
    retrasado: 'retrasado',
    finalizado: 'finalizado',
    cancelado: 'cancelado',
};
const ESTADOS_VALIDOS = ['programado', 'en_transito', 'retrasado', 'finalizado', 'cancelado'];

let viajesCache = [];

// ---------- Utilidades ----------

function esc(valor) {
    const div = document.createElement('div');
    div.textContent = String(valor ?? '');
    return div.innerHTML;
}

function mostrarMensaje(texto, tipo = 'ok') {
    mensaje.textContent = texto;
    mensaje.className = `mensaje mensaje--${tipo}`;
    mensaje.hidden = false;
    setTimeout(() => { mensaje.hidden = true; }, 3500);
}

// Devuelve los botones de accion segun el estado del viaje
function botonesAccion(v) {
    const id = esc(v.id);
    const ver = `<button class="icon-btn" title="Ver seguimiento" data-accion="seguimiento" data-id="${id}">👁️</button>`;

    if (v.estado === 'programado') {
        return `
            <button class="icon-btn" title="Iniciar viaje" data-accion="iniciar" data-id="${id}">▶️</button>
            ${ver}`;
    }
    if (v.estado === 'en_transito' || v.estado === 'retrasado') {
        return `
            <button class="icon-btn" title="Registrar novedad" data-accion="novedad" data-id="${id}">📝</button>
            <button class="icon-btn icon-btn--del" title="Finalizar viaje" data-accion="finalizar" data-id="${id}">🏁</button>
            ${ver}`;
    }
    // finalizado o cancelado: solo ver
    return ver;
}

// ---------- Cargar y renderizar ----------

async function cargarViajes() {
    const params = new URLSearchParams();
    if (filtroEstado.value) params.append('estado', filtroEstado.value);
    if (filtroFecha.value)  params.append('fecha', filtroFecha.value);

    const url = params.toString() ? `${BASE}?${params}` : BASE;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'Error al cargar viajes', 'error');
            return;
        }

        viajesCache = json.data;
        renderTabla(json.data);
        renderStats(json.data);
    } catch (err) {
        tablaBody.innerHTML = `<tr><td colspan="7" class="tabla__empty">
            No se pudo conectar con el microservicio. ¿Está corriendo en ${API_VIAJES}?
        </td></tr>`;
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

function renderTabla(viajes) {
    if (!viajes.length) {
        tablaBody.innerHTML = `<tr><td colspan="7" class="tabla__empty">No hay viajes registrados.</td></tr>`;
        return;
    }

    tablaBody.innerHTML = viajes.map(v => {
        const estadoClase = ESTADOS_VALIDOS.includes(v.estado) ? v.estado : 'cancelado';
        return `
        <tr>
            <td class="tabla__placa">#${esc(v.id)}</td>
            <td>👤 ${esc(v.conductor_id)}</td>
            <td>🚛 ${esc(v.vehiculo_id)}</td>
            <td>🗺️ ${esc(v.ruta_id)}</td>
            <td>${esc(v.fecha_salida)} ${esc(v.hora_salida)}</td>
            <td><span class="badge badge--${estadoClase}">${esc(ESTADO_LABEL[v.estado] || v.estado)}</span></td>
            <td><div class="acciones">${botonesAccion(v)}</div></td>
        </tr>`;
    }).join('');
}

function renderStats(viajes) {
    statTotal.textContent       = viajes.length;
    statTransito.textContent    = viajes.filter(v => v.estado === 'en_transito').length;
    statRetrasados.textContent  = viajes.filter(v => v.estado === 'retrasado').length;
    statFinalizados.textContent = viajes.filter(v => v.estado === 'finalizado').length;
}

// ---------- Acciones de viaje ----------

async function accionViaje(id, ruta, metodo, exito) {
    try {
        const res = await fetch(`${BASE}/${id}/${ruta}`, { method: metodo });
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo completar la acción', 'error');
            return;
        }

        mostrarMensaje(exito, 'ok');
        cargarViajes();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

function iniciarViaje(id)  { accionViaje(id, 'iniciar', 'PUT', 'Viaje iniciado'); }
function finalizarViaje(id) {
    if (!confirm(`¿Finalizar el viaje #${id}?`)) return;
    accionViaje(id, 'finalizar', 'PUT', 'Viaje finalizado');
}

// ---------- Modal: registrar novedad ----------

function abrirNovedad(id) {
    formNovedad.reset();
    novedadViajeId.value = id;
    modalNovedad.hidden = false;
}

async function guardarNovedad(e) {
    e.preventDefault();
    const id = novedadViajeId.value;
    const datos = {
        novedad: document.getElementById('novedadTexto').value.trim(),
        estado:  document.getElementById('novedadEstado').value,
    };

    if (!datos.novedad) {
        mostrarMensaje('La novedad es obligatoria', 'error');
        return;
    }

    try {
        const res = await fetch(`${BASE}/${id}/novedad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo registrar la novedad', 'error');
            return;
        }

        modalNovedad.hidden = true;
        mostrarMensaje('Novedad registrada', 'ok');
        cargarViajes();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Modal: ver seguimiento ----------

async function verSeguimiento(id) {
    try {
        const res = await fetch(`${BASE}/${id}/seguimiento`);
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo cargar el seguimiento', 'error');
            return;
        }

        segViajeId.textContent = `#${id}`;
        const historial = json.data.historial;

        if (!historial.length) {
            segHistorial.innerHTML = `<p class="tabla__empty">Sin novedades registradas.</p>`;
        } else {
            segHistorial.innerHTML = historial.map(h => `
                <div class="timeline__item">
                    <span class="badge badge--${ESTADOS_VALIDOS.includes(h.estado) ? h.estado : 'cancelado'}">${esc(ESTADO_LABEL[h.estado] || h.estado)}</span>
                    <div class="timeline__novedad">${esc(h.novedad || '—')}</div>
                    <div class="timeline__fecha">${esc(h.fecha)} ${esc(h.hora)}</div>
                </div>
            `).join('');
        }

        modalSeg.hidden = false;
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eventos ----------

document.getElementById('btnBuscar').addEventListener('click', cargarViajes);
filtroEstado.addEventListener('change', cargarViajes);
document.getElementById('btnCerrarSeg').addEventListener('click', () => { modalSeg.hidden = true; });
document.getElementById('btnCancelarNovedad').addEventListener('click', () => { modalNovedad.hidden = true; });
formNovedad.addEventListener('submit', guardarNovedad);
modalSeg.addEventListener('click', e => { if (e.target === modalSeg) modalSeg.hidden = true; });
modalNovedad.addEventListener('click', e => { if (e.target === modalNovedad) modalNovedad.hidden = true; });

// Delegacion de eventos para los botones de accion de la tabla
tablaBody.addEventListener('click', e => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    switch (boton.dataset.accion) {
        case 'iniciar':     iniciarViaje(id); break;
        case 'finalizar':   finalizarViaje(id); break;
        case 'novedad':     abrirNovedad(id); break;
        case 'seguimiento': verSeguimiento(id); break;
    }
});

// Carga inicial
cargarViajes();
