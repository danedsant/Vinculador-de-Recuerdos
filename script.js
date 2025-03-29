// --- Configuración ---
const AMPLITUD_ONDULACION = 15;
const VELOCIDAD_ONDULACION = 0.002;
const NUM_VINCULOS_SECUNDARIO = 3;

// --- Elementos del DOM ---
console.log("DEBUG: Obteniendo referencias DOM..."); // DEBUG
const mapaContenedor = document.querySelector('.mapa-mental');
const svgContenedor = document.getElementById('svg-lineas');
const botonAddPrincipal = document.getElementById('boton-add-principal');
const botonAddSecundario = document.getElementById('boton-add-secundario');
const botonAnadirRecuerdo = document.getElementById('boton-anadir-recuerdo');
const inputImagen = document.getElementById('input-imagen');
const botonExportar = document.getElementById('boton-exportar');
const botonImportar = document.getElementById('boton-importar');
const inputImportar = document.getElementById('import-file');
const botonBorrar = document.getElementById('boton-borrar');
console.log("DEBUG: Referencias DOM obtenidas."); // DEBUG

// --- Almacenamiento de estado ---
let principalNodeId = null;
let centralNodes = [];
let nodosData = [];
let lineasVinculo = [];
let animationFrameId = null;
let tiempoInicio = performance.now();
let elementoArrastrado = null;
let rectMapaCache = null;
let nodoPadreActivoId = null;
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

function iniciarAnadirNodoPrincipal() {
    console.log("DEBUG: >>> iniciarAnadirNodoPrincipal CALLED"); // DEBUG
    if (principalNodeId !== null) { alert("Ya existe un nodo principal."); return; }
    accionInputArchivo = 'principal';
    console.log("DEBUG: accionInputArchivo =", accionInputArchivo); // DEBUG
    console.log("DEBUG: Intentando inputImagen.click()..."); // DEBUG
    try {
        inputImagen.click();
        console.log("DEBUG: inputImagen.click() ejecutado."); // DEBUG
    } catch (error) {
        console.error("DEBUG: ERROR al ejecutar inputImagen.click():", error); // DEBUG
    }
}

function procesarImagenNodoPrincipal(imagenSrc) {
    console.log("DEBUG: procesarImagenNodoPrincipal CALLED"); // DEBUG
    // ... resto de la función sin cambios ...
    if (principalNodeId !== null) { console.warn("Intento de crear segundo nodo principal cancelado."); return; }
    const tipo = 'principal'; const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-principal');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = "Nodo Principal"; nuevoNodo.appendChild(img);
    rectMapaCache = mapaContenedor.getBoundingClientRect(); const initialX = rectMapaCache.width / 2; const initialY = rectMapaCache.height / 2;
    const nodoWidth = 120; const nodoHeight = 120; nuevoNodo.style.left = `${initialX - nodoWidth / 2}px`; nuevoNodo.style.top = `${initialY - nodoHeight / 2}px`;
    mapaContenedor.appendChild(nuevoNodo);
    const nodoData = { id, elemento: nuevoNodo, x: initialX, y: initialY, tipo, imgSrc: imagenSrc, alt: img.alt };
    centralNodes.push(nodoData); principalNodeId = id;
    nuevoNodo.addEventListener('click', seleccionarNodoPadre); nuevoNodo.addEventListener('mousedown', iniciarArrastreNodoCentral);
    botonAddPrincipal.disabled = true; botonAddSecundario.disabled = false;
    console.log(`Nodo Principal creado con ID: ${id}. Botón Secundario HABILITADO.`);
    _actualizarSeleccionPadre(nuevoNodo, id);
}

function iniciarAnadirNodoSecundario() {
    console.log("DEBUG: >>> iniciarAnadirNodoSecundario CALLED"); // DEBUG
    if (principalNodeId === null) { alert("Debes añadir un recuerdo principal primero."); return; }
    accionInputArchivo = 'secundario';
    console.log("DEBUG: accionInputArchivo =", accionInputArchivo); // DEBUG
    console.log("DEBUG: Intentando inputImagen.click()..."); // DEBUG
     try {
        inputImagen.click();
        console.log("DEBUG: inputImagen.click() ejecutado."); // DEBUG
    } catch (error) {
        console.error("DEBUG: ERROR al ejecutar inputImagen.click():", error); // DEBUG
    }
}

function procesarImagenNodoSecundario(imagenSrc, nombreSecundario) {
     console.log("DEBUG: procesarImagenNodoSecundario CALLED con nombre:", nombreSecundario); // DEBUG
    // ... resto de la función sin cambios ...
    if (principalNodeId === null) { console.error("CRITICAL: principalNodeId es null."); return; }
    const nodoPrincipal = findCentralNodeById(principalNodeId); if (!nodoPrincipal) { console.error("CRITICAL: No se encontró nodo principal."); return; }
    const tipo = 'secundario'; const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-secundario');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = nombreSecundario; nuevoNodo.appendChild(img);
    rectMapaCache = mapaContenedor.getBoundingClientRect(); const offsetInicial = 180 + Math.random() * 50; const anguloInicial = Math.random() * 2 * Math.PI;
    const baseX = typeof nodoPrincipal.x === 'number' ? nodoPrincipal.x : rectMapaCache.width / 2; const baseY = typeof nodoPrincipal.y === 'number' ? nodoPrincipal.y : rectMapaCache.height / 2;
    const initialX = baseX + offsetInicial * Math.cos(anguloInicial); const initialY = baseY + offsetInicial * Math.sin(anguloInicial);
    const nodoWidth = 100; const nodoHeight = 100; nuevoNodo.style.left = `${initialX - nodoWidth / 2}px`; nuevoNodo.style.top = `${initialY - nodoHeight / 2}px`;
    mapaContenedor.appendChild(nuevoNodo);
    const nodoData = { id, elemento: nuevoNodo, x: initialX, y: initialY, tipo, imgSrc: imagenSrc, alt: img.alt };
    centralNodes.push(nodoData);
    crearVinculoVisualMultiplesLineas(principalNodeId, id);
    nuevoNodo.addEventListener('click', seleccionarNodoPadre); nuevoNodo.addEventListener('mousedown', iniciarArrastreNodoCentral);
    console.log(`Nodo Secundario '${nombreSecundario}' (ID: ${id}) creado y vinculado a Principal ID: ${principalNodeId}`);
}

function crearVinculoVisualMultiplesLineas(parentId, childId) { /* ... sin cambios ... */ }

function iniciarAnadirRecuerdo() {
    console.log("DEBUG: >>> iniciarAnadirRecuerdo CALLED"); // DEBUG
    if (nodoPadreActivoId === null) { alert("Selecciona un nodo Principal o Secundario primero."); return; }
    accionInputArchivo = 'recuerdo';
     console.log("DEBUG: accionInputArchivo =", accionInputArchivo); // DEBUG
    console.log("DEBUG: Intentando inputImagen.click()..."); // DEBUG
     try {
        inputImagen.click();
        console.log("DEBUG: inputImagen.click() ejecutado."); // DEBUG
    } catch (error) {
        console.error("DEBUG: ERROR al ejecutar inputImagen.click():", error); // DEBUG
    }
}

function crearNuevoNodoRecuerdo(imagenSrc, nombreRecuerdo) {
     console.log("DEBUG: crearNuevoNodoRecuerdo CALLED con nombre:", nombreRecuerdo); // DEBUG
    // ... resto de la función sin cambios ...
     if (nodoPadreActivoId === null) { console.error("Error: nodoPadreActivoId es null."); return; }
    const nodoPadre = findCentralNodeById(nodoPadreActivoId); if (!nodoPadre) { console.error("Error: No se encontró nodo padre activo."); return; }
    const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-recuerdo');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = nombreRecuerdo;
    const tooltip = document.createElement('span'); tooltip.classList.add('tooltip'); tooltip.textContent = nombreRecuerdo;
    nuevoNodo.appendChild(img); nuevoNodo.appendChild(tooltip);
    const neonColor = generarColorHSL(); nuevoNodo.style.setProperty('--neon-glow-color', neonColor);
    rectMapaCache = mapaContenedor.getBoundingClientRect(); const offsetInicial = 120 + Math.random() * 40; const anguloInicial = Math.random() * 2 * Math.PI;
    const baseX = typeof nodoPadre.x === 'number' ? nodoPadre.x : rectMapaCache.width / 2; const baseY = typeof nodoPadre.y === 'number' ? nodoPadre.y : rectMapaCache.height / 2;
    let targetXInicial = baseX + offsetInicial * Math.cos(anguloInicial); let targetYInicial = baseY + offsetInicial * Math.sin(anguloInicial);
    const nodoWidth = 90; const nodoHeight = 90; nuevoNodo.style.left = `${targetXInicial - nodoWidth / 2}px`; nuevoNodo.style.top = `${targetYInicial - nodoHeight / 2}px`;
    mapaContenedor.appendChild(nuevoNodo);
    const pathId = generarId(); const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nuevoPath.id = `path-${pathId}`; nuevoPath.classList.add('linea-tentaculo');
    nuevoPath.style.setProperty('--line-color', neonColor); nuevoPath.style.setProperty('--line-glow-color', neonColor); nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(neonColor));
    svgContenedor.appendChild(nuevoPath); nuevoNodo.addEventListener('mousedown', iniciarArrastreRecuerdo);
    const nuevaData = { id, elemento: nuevoNodo, path: nuevoPath, parentId: nodoPadreActivoId, targetX: targetXInicial, targetY: targetYInicial, offsetTiempo: Math.random() * 10000, nombre: nombreRecuerdo, imgSrc: imagenSrc, neonColor: neonColor };
    nodosData.push(nuevaData); console.log(`Nodo Recuerdo '${nombreRecuerdo}' (ID: ${id}) creado.`);
}

function manejarSeleccionArchivo(evento) {
    console.log("DEBUG: manejarSeleccionArchivo CALLED"); // DEBUG
    const archivo = evento.target.files[0];
    const accionActual = accionInputArchivo;
    console.log("DEBUG: Acción pendiente:", accionActual); // DEBUG
    accionInputArchivo = null;
    inputImagen.value = null;

    if (!archivo || !archivo.type.startsWith('image/')) {
        console.warn("Archivo no válido o no seleccionado."); return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imagenDataUrl = e.target.result;
        console.log("DEBUG: Archivo leído OK, procesando para acción:", accionActual); // DEBUG

        // Añadir try...catch alrededor de los prompts y llamadas por si acaso
        try {
            if (accionActual === 'principal') {
                procesarImagenNodoPrincipal(imagenDataUrl);
            } else if (accionActual === 'secundario') {
                const nombreSecundario = prompt("Introduce un nombre para el nodo secundario:");
                if (nombreSecundario) {
                    procesarImagenNodoSecundario(imagenDataUrl, nombreSecundario);
                } else { console.log("Creación cancelada (sin nombre)."); }
            } else if (accionActual === 'recuerdo') {
                const nombreRecuerdo = prompt("Introduce un nombre para este recuerdo:");
                if (nombreRecuerdo) {
                    crearNuevoNodoRecuerdo(imagenDataUrl, nombreRecuerdo);
                } else { console.log("Creación cancelada (sin nombre)."); }
            } else {
                console.warn("Acción de archivo desconocida:", accionActual);
            }
        } catch (error) {
            console.error("DEBUG: Error durante el procesamiento post-carga de archivo:", error); // DEBUG
            alert("Ocurrió un error al procesar la acción después de cargar la imagen.");
        }
    };
    reader.onerror = () => {
        console.error("Error al leer el archivo.");
        alert("No se pudo leer el archivo seleccionado.");
    };
    reader.readAsText(archivo); // <<< ¡ERROR AQUÍ! Debe ser readAsDataURL
    // CORRECCIÓN: Cambiar a reader.readAsDataURL(archivo);
    // reader.readAsDataURL(archivo);
}
// CORRECCIÓN APLICADA ABAJO DIRECTAMENTE

// --- Funciones de Selección y Arrastre ---
function _actualizarSeleccionPadre(nodoElemento, nodoId) { /* ... sin cambios, ya habilita/deshabilita borrar ... */ }
function seleccionarNodoPadre(evento) { /* ... sin cambios ... */ }
function iniciarArrastreNodoCentral(evento) { /* ... sin cambios ... */ }
function iniciarArrastreRecuerdo(evento) { /* ... sin cambios ... */ }
function arrastrarElemento(evento) { /* ... sin cambios ... */ }
function detenerArrastre() { /* ... sin cambios ... */ }

// --- Funciones de Borrado ---
function eliminarRecuerdo(recuerdoData) { /* ... sin cambios ... */ }
function eliminarLineasVinculo(vinculoData) { /* ... sin cambios ... */ }
function borrarNodoSeleccionado() { /* ... sin cambios ... */ }

// --- Animación ---
function actualizarPathRecuerdo(dataRecuerdo, tiempoActual) { /* ... sin cambios ... */ }
function actualizarPathVinculo(dataVinculo, tiempoActual) { /* ... sin cambios ... */ }
function animar() { /* ... sin cambios ... */ }

// --- Exportar / Importar ---
function prepararDatosParaExportar() { /* ... sin cambios ... */ }
function exportarDatos() { /* ... sin cambios ... */ }
function iniciarImportarDatos() { /* ... sin cambios ... */ }
// <<< CORRECCIÓN: Cambiado readAsText a readAsDataURL >>>
function manejarArchivoImportacion(evento) {
    console.log("DEBUG: Archivo de importación seleccionado."); // DEBUG
    const archivo = evento.target.files[0];
    inputImportar.value = null;

    if (!archivo || !archivo.name.endsWith('.json')) {
        alert("Por favor, selecciona un archivo .json válido."); return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonContent = e.target.result;
            const data = JSON.parse(jsonContent);
            console.log("DEBUG: Archivo JSON leído y parseado."); // DEBUG
            if (data && typeof data === 'object' && data.centralNodes && data.nodosData) {
                if (confirm("Esto reemplazará el tablero actual. ¿Continuar?")) {
                     console.log("DEBUG: Restaurando estado desde archivo..."); // DEBUG
                     restaurarEstadoDesdeDatos(data);
                } else { console.log("Importación cancelada por el usuario."); }
            } else {
                 alert("El archivo JSON no tiene el formato esperado."); console.error("Formato JSON inválido:", data);
            }
        } catch (error) {
            console.error("Error al leer o parsear el archivo JSON:", error);
            alert("Hubo un error al procesar el archivo de importación.");
        }
    };
    reader.onerror = () => { console.error("Error al leer el archivo."); alert("No se pudo leer el archivo seleccionado."); };
    // Leer como TEXTO para JSON
    reader.readAsText(archivo); // <<< Correcto para JSON
}

function restaurarEstadoDesdeDatos(data) { /* ... sin cambios ... */ }

// --- Inicialización y Control ---
function inicializarMapa() { /* ... sin cambios, ya deshabilita borrar ... */ }
function detenerAnimacion() { /* ... sin cambios ... */ }
function reiniciarAplicacion() { /* ... sin cambios ... */ }

// --- Event Listeners ---
window.addEventListener('load', () => {
     console.log("DEBUG: Ventana cargada. Configurando listeners..."); // DEBUG
     // Comprobación robusta de elementos
     const elementosFaltantes = [
         !mapaContenedor && 'mapaContenedor', !svgContenedor && 'svgContenedor',
         !botonAddPrincipal && 'botonAddPrincipal', !botonAddSecundario && 'botonAddSecundario',
         !botonAnadirRecuerdo && 'botonAnadirRecuerdo', !inputImagen && 'inputImagen',
         !botonExportar && 'botonExportar', !botonImportar && 'botonImportar',
         !inputImportar && 'inputImportar', !botonBorrar && 'botonBorrar'
     ].filter(Boolean); // Filtra los false

     if (elementosFaltantes.length > 0) {
         console.error("Faltan elementos esenciales en el DOM:", elementosFaltantes.join(', '));
         alert("Error crítico: Faltan elementos necesarios en la página.");
         return;
     }

     reiniciarAplicacion();
     botonAddPrincipal.addEventListener('click', iniciarAnadirNodoPrincipal);
     botonAddSecundario.addEventListener('click', iniciarAnadirNodoSecundario);
     botonAnadirRecuerdo.addEventListener('click', iniciarAnadirRecuerdo);
     // <<< CORRECCIÓN: Estaba mal el listener para imagen (manejarSeleccionArchivo) >>>
     inputImagen.addEventListener('change', manejarSeleccionArchivo);
     botonExportar.addEventListener('click', exportarDatos);
     botonImportar.addEventListener('click', iniciarImportarDatos);
     inputImportar.addEventListener('change', manejarArchivoImportacion);
     botonBorrar.addEventListener('click', borrarNodoSeleccionado);
     console.log("DEBUG: Listeners configurados."); // DEBUG
});
window.addEventListener('resize', () => { /* ... sin cambios ... */ });


// CORRECCIÓN IMPORTANTE APLICADA:
// En la función manejarSeleccionArchivo original (antes de esta edición),
// accidentalmente puse reader.readAsText(archivo) al final.
// Debe ser reader.readAsDataURL(archivo) para obtener la URL de la imagen.
// Lo corrijo aquí directamente:

function manejarSeleccionArchivo(evento) {
    console.log("DEBUG: manejarSeleccionArchivo CALLED"); // DEBUG
    const archivo = evento.target.files[0];
    const accionActual = accionInputArchivo;
    console.log("DEBUG: Acción pendiente:", accionActual); // DEBUG
    accionInputArchivo = null;
    inputImagen.value = null;

    if (!archivo || !archivo.type.startsWith('image/')) {
        console.warn("Archivo no válido o no seleccionado."); return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imagenDataUrl = e.target.result;
        console.log("DEBUG: Archivo leído OK, procesando para acción:", accionActual); // DEBUG

        try {
            if (accionActual === 'principal') {
                procesarImagenNodoPrincipal(imagenDataUrl);
            } else if (accionActual === 'secundario') {
                const nombreSecundario = prompt("Introduce un nombre para el nodo secundario:");
                if (nombreSecundario) {
                    procesarImagenNodoSecundario(imagenDataUrl, nombreSecundario);
                } else { console.log("Creación cancelada (sin nombre)."); }
            } else if (accionActual === 'recuerdo') {
                const nombreRecuerdo = prompt("Introduce un nombre para este recuerdo:");
                if (nombreRecuerdo) {
                    crearNuevoNodoRecuerdo(imagenDataUrl, nombreRecuerdo);
                } else { console.log("Creación cancelada (sin nombre)."); }
            } else {
                console.warn("Acción de archivo desconocida:", accionActual);
            }
        } catch (error) {
            console.error("DEBUG: Error durante el procesamiento post-carga de archivo:", error); // DEBUG
            alert("Ocurrió un error al procesar la acción después de cargar la imagen.");
        }
    };
    reader.onerror = () => {
        console.error("Error al leer el archivo.");
        alert("No se pudo leer el archivo seleccionado.");
    };
    // <<< ¡LA CORRECCIÓN ESTÁ AQUÍ! >>>
    reader.readAsDataURL(archivo); // Usar readAsDataURL para obtener la imagen
}
