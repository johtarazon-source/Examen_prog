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
            <button class="icon-btn" title="Reprogramar" data-accion="reprogramar" data-id="${id}">✏️</button>
            <button class="icon-btn icon-btn--del" title="Cancelar viaje" data-accion="cancelar" data-id="${id}">✖️</button>
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

// ---------- Modal: programar / reprogramar viaje ----------

const modalProg   = document.getElementById('modalProgramar');
const formProg    = document.getElementById('formProgramar');
const progTitulo  = document.getElementById('progTitulo');
const progViajeId = document.getElementById('progViajeId');
const progMsg     = document.getElementById('progMsg');
const selConductor = document.getElementById('progConductor');
const selVehiculo  = document.getElementById('progVehiculo');
const selRuta      = document.getElementById('progRuta');

// Llena un <select> con opciones. items: [{value, label}]
function llenarSelect(sel, items, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>` +
        items.map(it => `<option value="${esc(it.value)}">${esc(it.label)}</option>`).join('');
}

// Carga conductores y vehiculos DISPONIBLES + todas las rutas, desde
// sus respectivos microservicios. La disponibilidad se valida aqui
// (frontend), respetando "sin comunicacion entre microservicios".
async function cargarOpciones() {
    // Conductores disponibles
    try {
        const r = await fetch(`${API_CONDUCTORES}/conductores?estado=disponible`);
        const j = await r.json();
        const items = (j.data || []).map(c => ({
            value: c.id,
            label: `${c.nombres} ${c.apellidos} (${c.numero_licencia})`,
        }));
        llenarSelect(selConductor, items, items.length ? 'Seleccione conductor' : 'No hay conductores disponibles');
    } catch (e) {
        llenarSelect(selConductor, [], 'Error al cargar conductores');
    }

    // Vehiculos disponibles
    try {
        const r = await fetch(`${API_VEHICULOS}/vehiculos?estado=disponible`);
        const j = await r.json();
        const items = (j.data || []).map(v => ({
            value: v.id,
            label: `${v.placa} - ${v.marca} ${v.tipo_vehiculo}`,
        }));
        llenarSelect(selVehiculo, items, items.length ? 'Seleccione vehículo' : 'No hay vehículos disponibles');
    } catch (e) {
        llenarSelect(selVehiculo, [], 'Error al cargar vehículos');
    }

    // Rutas (todas)
    try {
        const r = await fetch(`${API_RUTAS}/rutas`);
        const j = await r.json();
        const items = (j.data || []).map(rt => ({
            value: rt.id,
            label: `${rt.ciudad_origen} → ${rt.ciudad_destino} (${rt.distancia} km)`,
        }));
        llenarSelect(selRuta, items, items.length ? 'Seleccione ruta' : 'No hay rutas registradas');
    } catch (e) {
        llenarSelect(selRuta, [], 'Error al cargar rutas');
    }
}

async function abrirProgramar() {
    formProg.reset();
    progViajeId.value = '';
    progTitulo.textContent = 'Programar viaje';
    progMsg.hidden = true;
    modalProg.hidden = false;
    await cargarOpciones();
}

async function abrirReprogramar(v) {
    formProg.reset();
    progTitulo.textContent = `Reprogramar viaje #${v.id}`;
    progMsg.hidden = true;
    modalProg.hidden = false;
    await cargarOpciones();

    // Preseleccionar los valores actuales (puede que el conductor/vehiculo
    // actual ya no este "disponible"; lo agregamos como opcion para no perderlo)
    progViajeId.value = v.id;
    asegurarOpcion(selConductor, v.conductor_id);
    asegurarOpcion(selVehiculo, v.vehiculo_id);
    asegurarOpcion(selRuta, v.ruta_id);
    selConductor.value = v.conductor_id;
    selVehiculo.value  = v.vehiculo_id;
    selRuta.value      = v.ruta_id;
    document.getElementById('progFechaSalida').value  = v.fecha_salida;
    document.getElementById('progHoraSalida').value   = v.hora_salida;
    document.getElementById('progFechaLlegada').value = v.fecha_estimada_llegada;
    document.getElementById('progObservaciones').value = v.observaciones || '';
}

// Si el valor no esta en el select, lo agrega para no perder la seleccion actual.
function asegurarOpcion(sel, valor) {
    if (![...sel.options].some(o => o.value == valor)) {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = `#${valor} (actual)`;
        sel.appendChild(opt);
    }
}

async function guardarProgramacion(e) {
    e.preventDefault();
    const id = progViajeId.value;
    const datos = {
        conductor_id:           selConductor.value,
        vehiculo_id:            selVehiculo.value,
        ruta_id:                selRuta.value,
        fecha_salida:           document.getElementById('progFechaSalida').value,
        hora_salida:            document.getElementById('progHoraSalida').value,
        fecha_estimada_llegada: document.getElementById('progFechaLlegada').value,
        observaciones:          document.getElementById('progObservaciones').value.trim(),
    };

    // Validacion basica en cliente
    if (!datos.conductor_id || !datos.vehiculo_id || !datos.ruta_id) {
        progMsg.textContent = 'Selecciona conductor, vehículo y ruta';
        progMsg.className = 'mensaje mensaje--error';
        progMsg.hidden = false;
        return;
    }

    const editando = !!id;
    const url    = editando ? `${BASE}/${id}` : BASE;
    const metodo = editando ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });
        const json = await res.json();

        if (!json.success) {
            progMsg.textContent = json.message || 'No se pudo guardar';
            progMsg.className = 'mensaje mensaje--error';
            progMsg.hidden = false;
            return;
        }

        modalProg.hidden = true;
        mostrarMensaje(json.message, 'ok');
        cargarViajes();
    } catch (err) {
        progMsg.textContent = 'Error de conexión con el servidor';
        progMsg.className = 'mensaje mensaje--error';
        progMsg.hidden = false;
    }
}

function cancelarViaje(id) {
    if (!confirm(`¿Cancelar el viaje #${id}?`)) return;
    accionViaje(id, 'cancelar', 'PUT', 'Viaje cancelado');
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
document.getElementById('btnProgramar').addEventListener('click', abrirProgramar);
document.getElementById('btnCancelarProg').addEventListener('click', () => { modalProg.hidden = true; });
formProg.addEventListener('submit', guardarProgramacion);
modalProg.addEventListener('click', e => { if (e.target === modalProg) modalProg.hidden = true; });
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
        case 'cancelar':    cancelarViaje(id); break;
        case 'reprogramar': {
            const viaje = viajesCache.find(v => Number(v.id) === id);
            if (viaje) abrirReprogramar(viaje);
            break;
        }
    }
});

// Carga inicial
cargarViajes();
