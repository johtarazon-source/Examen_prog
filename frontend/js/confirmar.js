// Reemplazo del confirm() del navegador por un modal propio.
// Se usa con await: if (await confirmar('¿Eliminar?')) { ... }
(function () {

    let resolver = null;

    function crearModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.id = 'modalConfirmar';
        overlay.hidden = true;

        overlay.innerHTML = `
            <div class="modal__box modal__box--confirm">
                <h2 class="modal__title" id="confirmTitulo">Confirmar acción</h2>
                <p class="confirm__texto" id="confirmTexto"></p>
                <div class="form__actions">
                    <button type="button" class="btn btn--ghost" id="confirmCancelar">Cancelar</button>
                    <button type="button" class="btn btn--del" id="confirmAceptar">Eliminar</button>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        const aceptar  = overlay.querySelector('#confirmAceptar');
        const cancelar = overlay.querySelector('#confirmCancelar');

        aceptar.addEventListener('click', () => cerrar(true));
        cancelar.addEventListener('click', () => cerrar(false));
        // Clic fuera o Escape cuenta como cancelar
        overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
        document.addEventListener('keydown', e => {
            if (!overlay.hidden && e.key === 'Escape') cerrar(false);
        });

        return overlay;
    }

    function cerrar(respuesta) {
        const overlay = document.getElementById('modalConfirmar');
        if (overlay) overlay.hidden = true;
        if (resolver) {
            resolver(respuesta);
            resolver = null;
        }
    }

    // Se puede pasar solo el texto, o un objeto { texto, titulo, confirmar }.
    window.confirmar = function (opciones) {
        const cfg = typeof opciones === 'string' ? { texto: opciones } : (opciones || {});

        const overlay = document.getElementById('modalConfirmar') || crearModal();
        overlay.querySelector('#confirmTitulo').textContent = cfg.titulo || 'Confirmar acción';
        overlay.querySelector('#confirmTexto').textContent  = cfg.texto || '¿Deseas continuar?';
        overlay.querySelector('#confirmAceptar').textContent = cfg.confirmar || 'Eliminar';

        overlay.hidden = false;
        overlay.querySelector('#confirmCancelar').focus();

        return new Promise(resolve => { resolver = resolve; });
    };

})();
