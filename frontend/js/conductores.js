// =====================================================
// Gestion de Conductores - consumo de la API REST con fetch
// =====================================================

const BASE = `${API_CONDUCTORES}/conductores`;

// Referencias del DOM
const tablaBody   = document.getElementById('tablaBody');
const mensaje     = document.getElementById('mensaje');
const modal       = document.getElementById('modal');
const form        = document.getElementById('formConductor');
const modalTitulo = document.getElementById('modalTitulo');

const statTotal       = document.getElementById('statTotal');
const statDisponibles = document.getElementById('statDisponibles');
const statEnRuta      = document.getElementById('statEnRuta');
const statInactivos   = document.getElementById('statInactivos');

const filtroDocumento = document.getElementById('filtroDocumento');
const filtroLicencia  = document.getElementById('filtroLicencia');
const filtroEstado    = document.getElementById('filtroEstado');

const ESTADO_LABEL = {
    disponible: 'disponible',
    en_ruta: 'en ruta',
    inactivo: 'inactivo',
};

// Estados validos (whitelist) para la clase CSS del badge
const ESTADOS_VALIDOS = ['disponible', 'en_ruta', 'inactivo'];

// Guarda los conductores cargados para que la delegacion de eventos los recupere por id
let conductoresCache = [];

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

// ---------- Cargar y renderizar ----------

async function cargarConductores() {
    const params = new URLSearchParams();
    if (filtroDocumento.value.trim()) params.append('documento', filtroDocumento.value.trim());
    if (filtroLicencia.value.trim())  params.append('licencia', filtroLicencia.value.trim());
    if (filtroEstado.value)           params.append('estado', filtroEstado.value);

    const url = params.toString() ? `${BASE}?${params}` : BASE;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'Error al cargar conductores', 'error');
            return;
        }

        conductoresCache = json.data;
        renderTabla(json.data);
        renderStats(json.data);
    } catch (err) {
        tablaBody.innerHTML = `<tr><td colspan="8" class="tabla__empty">
            No se pudo conectar con el microservicio. ¿Está corriendo en ${API_CONDUCTORES}?
        </td></tr>`;
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

function renderTabla(conductores) {
    if (!conductores.length) {
        tablaBody.innerHTML = `<tr><td colspan="7" class="tabla__empty">No hay conductores registrados.</td></tr>`;
        return;
    }

    tablaBody.innerHTML = conductores.map(c => {
        const estadoClase = ESTADOS_VALIDOS.includes(c.estado) ? c.estado : 'inactivo';
        const estadoTexto = ESTADO_LABEL[c.estado] || c.estado;
        return `
        <tr>
            <td><span class="tabla__placa">${esc(c.documento)}</span></td>
            <td><span class="cell-ico">${ICO.conductor}</span>${esc(c.nombres)} ${esc(c.apellidos)}</td>
            <td>${esc(c.telefono)}</td>
            <td>${esc(c.numero_licencia)} · ${esc(c.categoria_licencia)}</td>
            <td>${esc(c.fecha_vencimiento_licencia)}</td>
            <td><span class="badge badge--${estadoClase}">${esc(estadoTexto)}</span></td>
            <td>
                <div class="acciones">
                    <button class="icon-btn" title="Editar" data-accion="editar" data-id="${esc(c.id)}">${ICO.editar}</button>
                    <button class="icon-btn icon-btn--del" title="Eliminar" data-accion="eliminar" data-id="${esc(c.id)}">${ICO.eliminar}</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderStats(conductores) {
    const total       = conductores.length;
    const disponibles = conductores.filter(c => c.estado === 'disponible').length;
    const enRuta      = conductores.filter(c => c.estado === 'en_ruta').length;
    const inactivos   = conductores.filter(c => c.estado === 'inactivo').length;

    statTotal.textContent       = total;
    statDisponibles.textContent = disponibles;
    statEnRuta.textContent      = enRuta;
    statInactivos.textContent   = inactivos;

    document.getElementById('kpiTotalSub').textContent = `${total} ${total === 1 ? 'conductor' : 'conductores'}`;
    const asignados = total ? Math.round((enRuta / total) * 100) : 0;
    document.getElementById('kpiOcupacion').textContent = `${asignados}% asignados`;

    renderLicencias(conductores);
    renderCategorias(conductores);
}

// Estado de licencias: vigentes vs. por vencer en los proximos 90 dias.
function renderLicencias(conductores) {
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(hoy.getDate() + 90);

    let vigentes = 0;
    let porVencer = 0;
    conductores.forEach(c => {
        const f = new Date(c.fecha_vencimiento_licencia);
        if (isNaN(f)) return;
        if (f < hoy) return;                 // vencida: no cuenta como vigente
        if (f <= limite) porVencer += 1;
        else vigentes += 1;
    });

    const totalValidas = vigentes + porVencer;
    const pct = totalValidas ? Math.round((vigentes / totalValidas) * 100) : 0;

    document.getElementById('licVigentes').textContent = vigentes;
    document.getElementById('licDetalle').textContent = `${porVencer} por vencer (90 días)`;
    document.getElementById('licPct').textContent = `${pct}%`;

    document.getElementById('licRing').style.background =
        `conic-gradient(var(--gold) ${pct * 3.6}deg, rgba(255,255,255,.08) 0deg)`;
}

// Distribucion por categoria de licencia (datos reales).
function renderCategorias(conductores) {
    const cont = document.getElementById('barrasCategoria');
    if (!conductores.length) {
        cont.innerHTML = `<p class="card-panel__empty">Sin datos</p>`;
        return;
    }

    const conteo = {};
    conductores.forEach(c => {
        const cat = (c.categoria_licencia || 'Sin categoría').trim();
        const clave = cat.toUpperCase();
        if (!conteo[clave]) conteo[clave] = { label: cat.toUpperCase(), n: 0 };
        conteo[clave].n += 1;
    });

    const items = Object.values(conteo).sort((a, b) => b.n - a.n);
    const max = Math.max(...items.map(i => i.n));

    cont.innerHTML = items.map(i => `
        <div class="barra">
            <span class="barra__label">${esc(i.label)}</span>
            <div class="barra__track">
                <div class="barra__fill" style="width:${Math.round((i.n / max) * 100)}%"></div>
            </div>
            <span class="barra__val">${i.n}</span>
        </div>
    `).join('');
}

// ---------- Modal ----------

function abrirNuevo() {
    form.reset();
    document.getElementById('conductorId').value = '';
    modalTitulo.textContent = 'Nuevo conductor';
    modal.hidden = false;
}

function abrirEditar(c) {
    document.getElementById('conductorId').value                = c.id;
    document.getElementById('nombres').value                    = c.nombres;
    document.getElementById('apellidos').value                  = c.apellidos;
    document.getElementById('documento').value                  = c.documento;
    document.getElementById('telefono').value                   = c.telefono;
    document.getElementById('correo').value                     = c.correo;
    document.getElementById('numero_licencia').value            = c.numero_licencia;
    document.getElementById('categoria_licencia').value         = c.categoria_licencia;
    document.getElementById('fecha_vencimiento_licencia').value = c.fecha_vencimiento_licencia;
    document.getElementById('estado').value                     = c.estado;
    modalTitulo.textContent = `Editar ${c.nombres} ${c.apellidos}`;
    modal.hidden = false;
}

function cerrarModal() { modal.hidden = true; }

// ---------- Crear / Editar (submit) ----------

async function guardarConductor(e) {
    e.preventDefault();

    const id = document.getElementById('conductorId').value;
    const datos = {
        nombres:                    document.getElementById('nombres').value.trim(),
        apellidos:                  document.getElementById('apellidos').value.trim(),
        documento:                  document.getElementById('documento').value.trim(),
        telefono:                   document.getElementById('telefono').value.trim(),
        correo:                     document.getElementById('correo').value.trim(),
        numero_licencia:            document.getElementById('numero_licencia').value.trim(),
        categoria_licencia:         document.getElementById('categoria_licencia').value.trim(),
        fecha_vencimiento_licencia: document.getElementById('fecha_vencimiento_licencia').value,
        estado:                     document.getElementById('estado').value,
    };

    // Validacion basica en cliente
    const requeridos = ['nombres', 'apellidos', 'documento', 'telefono', 'correo', 'numero_licencia', 'categoria_licencia', 'fecha_vencimiento_licencia'];
    if (requeridos.some(campo => !datos[campo])) {
        mostrarMensaje('Completa todos los campos obligatorios', 'error');
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
        cargarConductores();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eliminar ----------

async function eliminarConductor(id, nombre) {
    if (!confirm(`¿Eliminar al conductor ${nombre}?`)) return;

    try {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo eliminar', 'error');
            return;
        }

        mostrarMensaje(json.message, 'ok');
        cargarConductores();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eventos ----------

document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
document.getElementById('btnBuscar').addEventListener('click', cargarConductores);
filtroDocumento.addEventListener('keyup', e => { if (e.key === 'Enter') cargarConductores(); });
filtroLicencia.addEventListener('keyup', e => { if (e.key === 'Enter') cargarConductores(); });
form.addEventListener('submit', guardarConductor);
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

// Delegacion de eventos para los botones de editar/eliminar de la tabla
tablaBody.addEventListener('click', e => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const conductor = conductoresCache.find(c => Number(c.id) === id);
    if (!conductor) return;

    if (boton.dataset.accion === 'editar') {
        abrirEditar(conductor);
    } else if (boton.dataset.accion === 'eliminar') {
        eliminarConductor(conductor.id, `${conductor.nombres} ${conductor.apellidos}`);
    }
});

// Fecha de "ultima actualizacion" en el encabezado del panel
(function pintarFecha() {
    const el = document.getElementById('dashFecha');
    if (!el) return;
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    el.textContent = `Última actualización: ${fecha}`;
})();

// Carga inicial
cargarConductores();
