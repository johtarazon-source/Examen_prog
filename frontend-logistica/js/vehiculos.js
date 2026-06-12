// =====================================================
// Gestion de Vehiculos - consumo de la API REST con fetch
// =====================================================

const BASE = `${API_VEHICULOS}/vehiculos`;

// Referencias del DOM
const tablaBody   = document.getElementById('tablaBody');
const mensaje     = document.getElementById('mensaje');
const modal       = document.getElementById('modal');
const form        = document.getElementById('formVehiculo');
const modalTitulo = document.getElementById('modalTitulo');

const statTotal         = document.getElementById('statTotal');
const statDisponibles   = document.getElementById('statDisponibles');
const statEnRuta        = document.getElementById('statEnRuta');
const statMantenimiento = document.getElementById('statMantenimiento');

const filtroPlaca  = document.getElementById('filtroPlaca');
const filtroTipo   = document.getElementById('filtroTipo');
const filtroEstado = document.getElementById('filtroEstado');

const ESTADO_LABEL = {
    disponible: 'disponible',
    en_ruta: 'en ruta',
    mantenimiento: 'mantenimiento',
    inactivo: 'inactivo',
};

// Estados validos (whitelist) para la clase CSS del badge
const ESTADOS_VALIDOS = ['disponible', 'en_ruta', 'mantenimiento', 'inactivo'];

// Guarda los vehiculos cargados para que la delegacion de eventos los recupere por id
let vehiculosCache = [];

// ---------- Utilidades ----------

// Escapa texto para insertarlo de forma segura en HTML (evita XSS)
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

function formatCapacidad(kg) {
    const n = Number(kg);
    return isNaN(n) ? kg : `${n.toLocaleString('es-CO')} kg`;
}

// ---------- Cargar y renderizar ----------

async function cargarVehiculos() {
    // Construir query string con los filtros
    const params = new URLSearchParams();
    if (filtroPlaca.value.trim())  params.append('placa', filtroPlaca.value.trim());
    if (filtroTipo.value)          params.append('tipo', filtroTipo.value);
    if (filtroEstado.value)        params.append('estado', filtroEstado.value);

    const url = params.toString() ? `${BASE}?${params}` : BASE;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'Error al cargar vehiculos', 'error');
            return;
        }

        vehiculosCache = json.data;
        renderTabla(json.data);
        renderStats(json.data);
    } catch (err) {
        tablaBody.innerHTML = `<tr><td colspan="7" class="tabla__empty">
            No se pudo conectar con el microservicio. ¿Está corriendo en ${API_VEHICULOS}?
        </td></tr>`;
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

function renderTabla(vehiculos) {
    if (!vehiculos.length) {
        tablaBody.innerHTML = `<tr><td colspan="7" class="tabla__empty">No hay vehículos registrados.</td></tr>`;
        return;
    }

    tablaBody.innerHTML = vehiculos.map(v => {
        // Validar estado contra el whitelist antes de usarlo en la clase CSS
        const estadoClase = ESTADOS_VALIDOS.includes(v.estado) ? v.estado : 'inactivo';
        const estadoTexto = ESTADO_LABEL[v.estado] || v.estado;
        return `
        <tr>
            <td class="tabla__placa">${esc(v.placa)}</td>
            <td>${esc(v.tipo_vehiculo)}</td>
            <td>${esc(v.marca)}</td>
            <td>${esc(v.modelo)}</td>
            <td>${esc(formatCapacidad(v.capacidad_carga))}</td>
            <td><span class="badge badge--${estadoClase}">${esc(estadoTexto)}</span></td>
            <td>
                <div class="acciones">
                    <button class="icon-btn" title="Editar" data-accion="editar" data-id="${esc(v.id)}">${ICO.editar}</button>
                    <button class="icon-btn icon-btn--del" title="Eliminar" data-accion="eliminar" data-id="${esc(v.id)}">${ICO.eliminar}</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderStats(vehiculos) {
    statTotal.textContent         = vehiculos.length;
    statDisponibles.textContent   = vehiculos.filter(v => v.estado === 'disponible').length;
    statEnRuta.textContent        = vehiculos.filter(v => v.estado === 'en_ruta').length;
    statMantenimiento.textContent = vehiculos.filter(v => v.estado === 'mantenimiento').length;
}

// ---------- Modal ----------

function abrirNuevo() {
    form.reset();
    document.getElementById('vehiculoId').value = '';
    modalTitulo.textContent = 'Nuevo vehículo';
    modal.hidden = false;
}

function abrirEditar(v) {
    document.getElementById('vehiculoId').value     = v.id;
    document.getElementById('placa').value          = v.placa;
    document.getElementById('tipo_vehiculo').value  = v.tipo_vehiculo;
    document.getElementById('marca').value          = v.marca;
    document.getElementById('modelo').value         = v.modelo;
    document.getElementById('capacidad_carga').value= v.capacidad_carga;
    document.getElementById('estado').value         = v.estado;
    modalTitulo.textContent = `Editar ${v.placa}`;
    modal.hidden = false;
}

function cerrarModal() { modal.hidden = true; }

// ---------- Crear / Editar (submit) ----------

async function guardarVehiculo(e) {
    e.preventDefault();

    const id = document.getElementById('vehiculoId').value;
    const datos = {
        placa:           document.getElementById('placa').value.trim().toUpperCase(),
        tipo_vehiculo:   document.getElementById('tipo_vehiculo').value.trim(),
        marca:           document.getElementById('marca').value.trim(),
        modelo:          document.getElementById('modelo').value.trim(),
        capacidad_carga: document.getElementById('capacidad_carga').value,
        estado:          document.getElementById('estado').value,
    };

    // Validacion basica en cliente
    if (!datos.placa || !datos.tipo_vehiculo || !datos.marca || !datos.modelo) {
        mostrarMensaje('Completa todos los campos obligatorios', 'error');
        return;
    }
    if (Number(datos.capacidad_carga) <= 0) {
        mostrarMensaje('La capacidad debe ser mayor a cero', 'error');
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
            mostrarMensaje(json.message || 'No se pudo guardar', 'error');
            return;
        }

        cerrarModal();
        mostrarMensaje(json.message, 'ok');
        cargarVehiculos();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eliminar ----------

async function eliminarVehiculo(id, placa) {
    if (!confirm(`¿Eliminar el vehículo ${placa}?`)) return;

    try {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo eliminar', 'error');
            return;
        }

        mostrarMensaje(json.message, 'ok');
        cargarVehiculos();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eventos ----------

document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
document.getElementById('btnBuscar').addEventListener('click', cargarVehiculos);
filtroPlaca.addEventListener('keyup', e => { if (e.key === 'Enter') cargarVehiculos(); });
form.addEventListener('submit', guardarVehiculo);
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

// Delegacion de eventos para los botones de editar/eliminar de la tabla
tablaBody.addEventListener('click', e => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const vehiculo = vehiculosCache.find(v => Number(v.id) === id);
    if (!vehiculo) return;

    if (boton.dataset.accion === 'editar') {
        abrirEditar(vehiculo);
    } else if (boton.dataset.accion === 'eliminar') {
        eliminarVehiculo(vehiculo.id, vehiculo.placa);
    }
});

// Carga inicial
cargarVehiculos();
