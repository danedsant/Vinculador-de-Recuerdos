// --- Configuración ---
const AMPLITUD_ONDULACION = 15;
const VELOCIDAD_ONDULACION = 0.002;
const NUM_VINCULOS_SECUNDARIO = 3;

// --- Elementos del DOM ---
const mapaContenedor = document.querySelector('.mapa-mental');
const svgContenedor = document.getElementById('svg-lineas');
const botonAddPrincipal = document.getElementById('boton-add-principal');
const botonAddSecundario = document.getElementById('boton-add-secundario');
const botonAnadirRecuerdo = document.getElementById('boton-anadir-recuerdo');
const inputImagen = document.getElementById('input-imagen');
const botonExportar = document.getElementById('boton-exportar');
const botonImportar = document.getElementById('boton-importar');
const inputImportar = document.getElementById('import-file');
const botonBorrar = document.getElementById('boton-borrar'); // <<< NUEVO Botón Borrar

// --- Almacenamiento de estado ---
let principalNodeId = null;
let centralNodes = [];
let nodosData = [];
let lineasVinculo = [];
let animationFrameId = null;
let tiempoInicio = performance.now();
let elementoArrastrado = null;
let rectMapaCache = null;
let nodoPadreActivoId = null; // <<< ID del nodo SELECCIONADO (Principal o Secundario)
let nextId = 0;
let accionInputArchivo = null;

// --- Funciones Auxiliares ---
function generarId() { return nextId++; }
function findCentralNodeById(id) { return centralNodes.find(node => node.id === id); }
function findMemoryNodeById(id) { return nodosData.find(node => node.id === id); }
function findVinculoByChildId(childId) { return lineasVinculo.find(v => v.childId === childId); }
function getCentroRelativo(elemento, rectMapa) { /* ... sin cambios ... */ }
function generarColorHSL() { /* ... sin cambios ... */ }
function getSoftGlowColor(hslColor) { /* ... sin cambios ... */ }

// --- Funciones de Creación y Procesamiento ---
function iniciarAnadirNodoPrincipal() { /* ... sin cambios ... */ }
function procesarImagenNodoPrincipal(imagenSrc) { /* ... sin cambios ... */ }
function iniciarAnadirNodoSecundario() { /* ... sin cambios ... */ }
function procesarImagenNodoSecundario(imagenSrc, nombreSecundario) { /* ... sin cambios ... */ }
function crearVinculoVisualMultiplesLineas(parentId, childId) { /* ... sin cambios ... */ }
function iniciarAnadirRecuerdo() { /* ... sin cambios ... */ }
function crearNuevoNodoRecuerdo(imagenSrc, nombreRecuerdo) { /* ... sin cambios ... */ }
function manejarSeleccionArchivo(evento) { /* ... sin cambios ... */ }

// --- Funciones de Selección y Arrastre ---

// <<< MODIFICADA: Habilita/Deshabilita botón borrar >>>
function _actualizarSeleccionPadre(nodoElemento, nodoId) {
    if (nodoPadreActivoId === nodoId) return;
    if (nodoPadreActivoId !== null) {
        const nodoPrevio = findCentralNodeById(nodoPadreActivoId);
        nodoPrevio?.elemento.classList.remove('activo');
        console.log(`Desmarcando nodo previo ID: ${nodoPadreActivoId}`);
    }
    nodoElemento.classList.add('activo');
    nodoPadreActivoId = nodoId;
    botonAnadirRecuerdo.disabled = false; // Habilitar añadir recuerdo
    botonBorrar.disabled = false;         // <<< HABILITAR Borrar >>>
    const nodoPadre = findCentralNodeById(nodoPadreActivoId);
    let nombrePadre = nodoPadre?.tipo === 'principal' ? 'Ppal.' : (nodoPadre?.alt || `Sec. ${nodoPadreActivoId}`);
    botonAnadirRecuerdo.textContent = `Añadir Recuerdo a ${nombrePadre}`;
    console.log(`Nodo padre activo cambiado a ID: ${nodoPadreActivoId} (${nombrePadre})`);
}
function seleccionarNodoPadre(evento) { /* ... sin cambios ... */ }
function iniciarArrastreNodoCentral(evento) { /* ... sin cambios ... */ }
function iniciarArrastreRecuerdo(evento) { /* ... sin cambios ... */ }
function arrastrarElemento(evento) { /* ... sin cambios ... */ }
function detenerArrastre() { /* ... sin cambios ... */ }

// --- Funciones de Borrado ---

/** Elimina un nodo de recuerdo (DOM, SVG y datos) */
function eliminarRecuerdo(recuerdoData) {
    if (!recuerdoData) return;
    console.log(`Eliminando recuerdo ID: ${recuerdoData.id}, Nombre: ${recuerdoData.nombre}`);
    // Eliminar elemento DOM
    recuerdoData.elemento?.remove();
    // Eliminar path SVG
    recuerdoData.path?.remove();
    // Eliminar de la estructura de datos
    nodosData = nodosData.filter(n => n.id !== recuerdoData.id);
}

/** Elimina las líneas de vínculo de un nodo secundario */
function eliminarLineasVinculo(vinculoData) {
    if (!vinculoData) return;
    console.log(`Eliminando líneas de vínculo para Hijo ID: ${vinculoData.childId}`);
    // Eliminar paths SVG
    vinculoData.paths?.forEach(path => path.remove());
    // Eliminar de la estructura de datos
    lineasVinculo = lineasVinculo.filter(v => v.idBase !== vinculoData.idBase);
}

/** Función principal para borrar el nodo seleccionado */
function borrarNodoSeleccionado() {
    if (nodoPadreActivoId === null) {
        console.warn("Intento de borrar sin nodo seleccionado.");
        return;
    }

    const nodoABorrar = findCentralNodeById(nodoPadreActivoId);
    if (!nodoABorrar) {
        console.error("Error: No se encontró el nodo seleccionado para borrar (ID:", nodoPadreActivoId, ")");
        nodoPadreActivoId = null; // Limpiar selección inválida
        botonBorrar.disabled = true;
        botonAnadirRecuerdo.disabled = true;
        return;
    }

    const tipoNodo = nodoABorrar.tipo;
    const nombreNodo = nodoABorrar.alt || `Nodo ${nodoABorrar.id}`;
    const mensajeConfirmacion = tipoNodo === 'principal'
        ? `¿Seguro que quieres borrar el nodo principal '${nombreNodo}'? Esto eliminará TODO el tablero.`
        : `¿Seguro que quieres borrar el nodo secundario '${nombreNodo}' y TODOS sus recuerdos asociados?`;

    if (!confirm(mensajeConfirmacion)) {
        console.log("Borrado cancelado por el usuario.");
        return;
    }

    console.log(`Iniciando borrado de nodo ID: ${nodoPadreActivoId}, Tipo: ${tipoNodo}`);

    if (tipoNodo === 'principal') {
        // Borrar el principal implica reiniciar todo
        console.log("Borrando nodo principal mediante reinicio.");
        reiniciarAplicacion(); // Limpia todo y resetea botones
    } else if (tipoNodo === 'secundario') {
        const idABorrar = nodoPadreActivoId; // Guardar ID antes de limpiar selección

        // 1. Eliminar recuerdos asociados a este nodo secundario
        const recuerdosAEliminar = nodosData.filter(n => n.parentId === idABorrar);
        recuerdosAEliminar.forEach(recuerdo => eliminarRecuerdo(recuerdo)); // Llama a la función helper

        // 2. Eliminar líneas de vínculo asociadas a este nodo secundario
        const vinculoAEliminar = findVinculoByChildId(idABorrar);
        if (vinculoAEliminar) {
            eliminarLineasVinculo(vinculoAEliminar); // Llama a la función helper
        } else {
            console.warn("No se encontraron líneas de vínculo para el nodo secundario ID:", idABorrar);
        }

        // 3. Eliminar el propio nodo secundario (DOM y datos)
        nodoABorrar.elemento?.remove();
        centralNodes = centralNodes.filter(n => n.id !== idABorrar);
        console.log(`Nodo secundario ID: ${idABorrar} eliminado.`);

        // 4. Limpiar selección y estado de botones
        nodoPadreActivoId = null;
        botonBorrar.disabled = true;
        botonAnadirRecuerdo.disabled = true;
        botonAnadirRecuerdo.textContent = "Añadir Recuerdo";
    } else {
        console.error("Tipo de nodo desconocido para borrar:", tipoNodo);
    }
}


// --- Animación ---
function actualizarPathRecuerdo(dataRecuerdo, tiempoActual) { /* ... sin cambios ... */ }
function actualizarPathVinculo(dataVinculo, tiempoActual) { /* ... sin cambios ... */ }
function animar() { /* ... sin cambios ... */ }

// --- Exportar / Importar ---
function prepararDatosParaExportar() { /* ... sin cambios ... */ }
function exportarDatos() { /* ... sin cambios ... */ }
function iniciarImportarDatos() { /* ... sin cambios ... */ }
function manejarArchivoImportacion(evento) { /* ... sin cambios ... */ }
function restaurarEstadoDesdeDatos(data) { /* ... sin cambios ... */ }

// --- Inicialización y Control ---
// <<< MODIFICADA: Deshabilita botón borrar al inicio >>>
function inicializarMapa() {
    console.log("Inicializando mapa...");
    svgContenedor.innerHTML = ''; mapaContenedor.querySelectorAll('.nodo').forEach(n => n.remove());
    principalNodeId = null; centralNodes = []; nodosData = []; lineasVinculo = [];
    nodoPadreActivoId = null; elementoArrastrado = null; nextId = 0; accionInputArchivo = null;
    botonAddPrincipal.disabled = false; botonAddSecundario.disabled = true;
    botonAnadirRecuerdo.disabled = true; botonAnadirRecuerdo.textContent = "Añadir Recuerdo";
    botonBorrar.disabled = true; // <<< DESHABILITAR Borrar >>>
    console.log("Mapa inicializado. Botones reseteados.");
}
function detenerAnimacion() { /* ... sin cambios ... */ }
function reiniciarAplicacion() { /* ... sin cambios ... */ }

// --- Event Listeners ---
// <<< MODIFICADO: Añadir listener para botón borrar >>>
window.addEventListener('load', () => {
    console.log("Ventana cargada. Configurando listeners...");
    // Añadir verificación de botón borrar
    if (!mapaContenedor || !svgContenedor || !botonAddPrincipal || !botonAddSecundario || !botonAnadirRecuerdo || !inputImagen || !botonExportar || !botonImportar || !inputImportar || !botonBorrar) {
        console.error("Faltan elementos esenciales en el DOM."); return;
    }
    reiniciarAplicacion();
    // Listeners botones acción
    botonAddPrincipal.addEventListener('click', iniciarAnadirNodoPrincipal);
    botonAddSecundario.addEventListener('click', iniciarAnadirNodoSecundario);
    botonAnadirRecuerdo.addEventListener('click', iniciarAnadirRecuerdo);
    inputImagen.addEventListener('change', manejarSeleccionArchivo);
    // Listeners Exportar/Importar
    botonExportar.addEventListener('click', exportarDatos);
    botonImportar.addEventListener('click', iniciarImportarDatos);
    inputImportar.addEventListener('change', manejarArchivoImportacion);
    // Listener Borrar
    botonBorrar.addEventListener('click', borrarNodoSeleccionado); // <<< AÑADIDO >>>

    console.log("Listeners configurados.");
});
window.addEventListener('resize', () => { /* ... sin cambios ... */ });
