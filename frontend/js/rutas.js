
const BASE = `${API_RUTAS}/rutas`;

// Referencias del DOM
const tablaBody   = document.getElementById('tablaBody');
const mensaje     = document.getElementById('mensaje');
const modal       = document.getElementById('modal');
const form        = document.getElementById('formRuta');
const modalTitulo = document.getElementById('modalTitulo');

const statTotal        = document.getElementById('statTotal');
const statDistanciaMax = document.getElementById('statDistanciaMax');
const statDistanciaMin = document.getElementById('statDistanciaMin');
const statCiudades     = document.getElementById('statCiudades');

const filtroCiudad = document.getElementById('filtroCiudad');

// Cache de rutas para la delegacion de eventos
let rutasCache = [];

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

function formatDistancia(km) {
    const n = Number(km);
    return isNaN(n) ? km : `${n.toLocaleString('es-CO')} km`;
}

// ---------- Cargar y renderizar ----------

async function cargarRutas() {
    const params = new URLSearchParams();
    if (filtroCiudad.value.trim()) params.append('ciudad', filtroCiudad.value.trim());

    const url = params.toString() ? `${BASE}?${params}` : BASE;

    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'Error al cargar rutas', 'error');
            return;
        }

        rutasCache = json.data;
        renderTabla(json.data);
        renderStats(json.data);
    } catch (err) {
        tablaBody.innerHTML = `<tr><td colspan="6" class="tabla__empty">
            No se pudo conectar con el microservicio. ¿Está corriendo en ${API_RUTAS}?
        </td></tr>`;
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

function renderTabla(rutas) {
    if (!rutas.length) {
        tablaBody.innerHTML = `<tr><td colspan="6" class="tabla__empty">No hay rutas registradas.</td></tr>`;
        return;
    }

    tablaBody.innerHTML = rutas.map(r => `
        <tr>
            <td class="tabla__placa">${esc(r.ciudad_origen)}</td>
            <td>${esc(r.ciudad_destino)}</td>
            <td>${esc(formatDistancia(r.distancia))}</td>
            <td>${esc(r.tiempo_estimado)}</td>
            <td>${esc(r.observaciones || '—')}</td>
            <td>
                <div class="acciones">
                    <button class="icon-btn" title="Editar" data-accion="editar" data-id="${esc(r.id)}">${ICO.editar}</button>
                    <button class="icon-btn icon-btn--del" title="Eliminar" data-accion="eliminar" data-id="${esc(r.id)}">${ICO.eliminar}</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderStats(rutas) {
    statTotal.textContent = rutas.length;
    document.getElementById('kpiTotalSub').textContent = `${rutas.length} ${rutas.length === 1 ? 'ruta' : 'rutas'}`;

    const distancias = rutas.map(r => Number(r.distancia)).filter(d => !isNaN(d));

    if (distancias.length) {
        statDistanciaMax.textContent = Math.max(...distancias).toLocaleString('es-CO');
        statDistanciaMin.textContent = Math.min(...distancias).toLocaleString('es-CO');
    } else {
        statDistanciaMax.textContent = 0;
        statDistanciaMin.textContent = 0;
    }

    // Contar ciudades unicas (origen + destino)
    const ciudades = new Set();
    rutas.forEach(r => { ciudades.add(r.ciudad_origen); ciudades.add(r.ciudad_destino); });
    statCiudades.textContent = ciudades.size;

    renderDistancia(distancias);
    renderOrigenes(rutas);
}

// Panel de distancia: total de la red y promedio por ruta.
function renderDistancia(distancias) {
    const total = distancias.reduce((a, d) => a + d, 0);
    const prom = distancias.length ? Math.round(total / distancias.length) : 0;

    document.getElementById('distTotal').textContent = total.toLocaleString('es-CO');
    document.getElementById('distDetalle').textContent = `${prom.toLocaleString('es-CO')} km promedio por ruta`;
    document.getElementById('distProm').textContent = prom.toLocaleString('es-CO');

    // El anillo se llena segun el promedio respecto al maximo (referencia visual).
    const max = distancias.length ? Math.max(...distancias) : 1;
    const pct = max ? Math.round((prom / max) * 100) : 0;
    document.getElementById('distRing').style.background =
        `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--bg-3) 0deg)`;
}

// Distribucion de rutas por ciudad de origen (datos reales).
function renderOrigenes(rutas) {
    const cont = document.getElementById('barrasOrigen');
    if (!rutas.length) {
        cont.innerHTML = `<p class="card-panel__empty">Sin datos</p>`;
        return;
    }

    const conteo = {};
    rutas.forEach(r => {
        const o = (r.ciudad_origen || 'Sin origen').trim();
        const clave = o.toLowerCase();
        if (!conteo[clave]) conteo[clave] = { label: o, n: 0 };
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

function abrirNueva() {
    form.reset();
    document.getElementById('rutaId').value = '';
    modalTitulo.textContent = 'Nueva ruta';
    modal.hidden = false;
}

function abrirEditar(r) {
    document.getElementById('rutaId').value           = r.id;
    document.getElementById('ciudad_origen').value     = r.ciudad_origen;
    document.getElementById('ciudad_destino').value    = r.ciudad_destino;
    document.getElementById('distancia').value         = r.distancia;
    document.getElementById('tiempo_estimado').value   = r.tiempo_estimado;
    document.getElementById('observaciones').value     = r.observaciones || '';
    modalTitulo.textContent = `Editar ruta`;
    modal.hidden = false;
}

function cerrarModal() { modal.hidden = true; }

// ---------- Crear / Editar (submit) ----------

async function guardarRuta(e) {
    e.preventDefault();

    const id = document.getElementById('rutaId').value;
    const datos = {
        ciudad_origen:   document.getElementById('ciudad_origen').value.trim(),
        ciudad_destino:  document.getElementById('ciudad_destino').value.trim(),
        distancia:       document.getElementById('distancia').value,
        tiempo_estimado: document.getElementById('tiempo_estimado').value.trim(),
        observaciones:   document.getElementById('observaciones').value.trim(),
    };

    // Validacion basica en cliente
    if (!datos.ciudad_origen || !datos.ciudad_destino || !datos.tiempo_estimado) {
        mostrarMensaje('Completa todos los campos obligatorios', 'error');
        return;
    }
    if (Number(datos.distancia) <= 0) {
        mostrarMensaje('La distancia debe ser mayor a cero', 'error');
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
        cargarRutas();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eliminar ----------

async function eliminarRuta(id, descripcion) {
    if (!await confirmar({ titulo: 'Eliminar ruta', texto: `¿Eliminar la ruta ${descripcion}?`, confirmar: 'Eliminar' })) return;

    try {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
        const json = await res.json();

        if (!json.success) {
            mostrarMensaje(json.message || 'No se pudo eliminar', 'error');
            return;
        }

        mostrarMensaje(json.message, 'ok');
        cargarRutas();
    } catch (err) {
        mostrarMensaje('Error de conexión con el servidor', 'error');
    }
}

// ---------- Eventos ----------

document.getElementById('btnNuevo').addEventListener('click', abrirNueva);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
document.getElementById('btnBuscar').addEventListener('click', cargarRutas);
filtroCiudad.addEventListener('keyup', e => { if (e.key === 'Enter') cargarRutas(); });
form.addEventListener('submit', guardarRuta);
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

// Delegacion de eventos para los botones de editar/eliminar
tablaBody.addEventListener('click', e => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const ruta = rutasCache.find(r => Number(r.id) === id);
    if (!ruta) return;

    if (boton.dataset.accion === 'editar') {
        abrirEditar(ruta);
    } else if (boton.dataset.accion === 'eliminar') {
        eliminarRuta(ruta.id, `${ruta.ciudad_origen} → ${ruta.ciudad_destino}`);
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
cargarRutas();
