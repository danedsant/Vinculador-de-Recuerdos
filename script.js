// --- Al inicio del script ---

// Detección simple de móvil (ajustar breakpoint si es necesario)
const isMobile = window.innerWidth < 768;
console.log("Es móvil:", isMobile); // Para depuración

// Parametros de las lineas (Ajustados para móvil)
const AMPLITUD_ONDULACION = isMobile ? 6 : 15; // Menor amplitud en móvil
const VELOCIDAD_ONDULACION = isMobile ? 0.0015 : 0.002; // Más lento en móvil
const NUM_VINCULOS_SECUNDARIO = isMobile ? 1 : 3; // SOLO UNA LÍNEA en móvil (MEJORA GRANDE)

// Elementos del DOM
const mapaContenedor = document.querySelector('.mapa-mental');
const svgContenedor = document.getElementById('svg-lineas');
const botonAddPrincipal = document.getElementById('boton-add-principal');
const botonAddSecundario = document.getElementById('boton-add-secundario');
const botonAnadirRecuerdo = document.getElementById('boton-anadir-recuerdo');
const inputImagen = document.getElementById('input-imagen');
// Botones y input para exportar/importar
const botonExportar = document.getElementById('boton-exportar');
const botonImportar = document.getElementById('boton-importar');
const inputImportar = document.getElementById('import-file');

// Almacenamiento de estados
let principalNodeId = null;
let centralNodes = [];    // { id, elemento, x, y, tipo, imgSrc?, alt? }
let nodosData = [];       // { id, elemento, path, parentId, targetX, targetY, offsetTiempo, nombre, imgSrc?, neonColor? }
let lineasVinculo = [];   // { idBase, paths: [path1, path2, ...], parentId, childId, offsetTiempo } -> Vínculos Ppal-Sec
let animationFrameId = null;
let tiempoInicio = performance.now();
let elementoArrastrado = null;
let rectMapaCache = null;
let nodoPadreActivoId = null;
let nextId = 0;
let accionInputArchivo = null;
let frameCount = 0; // Contador de frames para throttling

// --- Funciones Auxiliares ---
function generarId() { return nextId++; }
function findCentralNodeById(id) { return centralNodes.find(node => node.id === id); }
function findMemoryNodeById(id) { return nodosData.find(node => node.id === id); }
function findVinculoByChildId(childId) { return lineasVinculo.find(v => v.childId === childId); }

function getCentroRelativo(elemento, rectMapa) {
    if (!elemento || !rectMapa) return { x: 0, y: 0 };
    const rectElemento = elemento.getBoundingClientRect();
    // Usar tamaños por defecto basados en si es móvil o no, si offsetWidth/Height es 0
    const defaultPrincipalW = isMobile ? 80 : 100;
    const defaultSecundarioW = isMobile ? 70 : 85;
    const defaultRecuerdoW = isMobile ? 60 : 75;
    let defaultWidth = defaultRecuerdoW; // Por defecto
    if (elemento.classList.contains('nodo-principal')) defaultWidth = defaultPrincipalW;
    else if (elemento.classList.contains('nodo-secundario')) defaultWidth = defaultSecundarioW;

    const width = rectElemento.width || parseFloat(elemento.style.width) || elemento.offsetWidth || defaultWidth;
    const height = rectElemento.height || parseFloat(elemento.style.height) || elemento.offsetHeight || defaultWidth; // Asumiendo cuadrados

    return {
        x: (rectElemento.left - rectMapa.left) + width / 2,
        y: (rectElemento.top - rectMapa.top) + height / 2
    };
}

function generarColorHSL() {
    const h = Math.floor(Math.random() * 360);
    const s = 90 + Math.floor(Math.random() * 11);
    const l = 55 + Math.floor(Math.random() * 11);
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function getSoftGlowColor(hslColor) {
    if (!hslColor || !hslColor.startsWith('hsl')) return 'rgba(255, 255, 255, 0.4)'; // Fallback más tenue
    try {
        let [h, s, l] = hslColor.match(/\d+/g).map(Number);
        l = Math.max(0, l - 15); // Reducir luminosidad más
        s = Math.max(0, s - 15); // Reducir saturación más
        return `hsla(${h}, ${s}%, ${l}%, 0.6)`; // Alpha ligeramente menor
    } catch (e) {
        return 'rgba(255, 255, 255, 0.4)';
    }
}


// --- Funciones de Creación y Procesamiento ---

function iniciarAnadirNodoPrincipal() {
    console.log("Iniciando añadir nodo principal...");
    if (principalNodeId !== null) { alert("Ya existe un nodo principal."); return; }
    accionInputArchivo = 'principal'; inputImagen.click();
}

function procesarImagenNodoPrincipal(imagenSrc) {
    console.log("Procesando imagen para nodo principal...");
    if (principalNodeId !== null) { console.warn("Intento de crear segundo nodo principal cancelado."); return; }

    const tipo = 'principal'; const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`;
    nuevoNodo.classList.add('nodo', 'nodo-principal');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = "Nodo Principal"; nuevoNodo.appendChild(img);

    rectMapaCache = mapaContenedor.getBoundingClientRect();
    const initialX = rectMapaCache.width / 2; const initialY = rectMapaCache.height / 2;
    // Usar tamaño correcto basado en isMobile
    const nodoWidth = isMobile ? 80 : 100;
    const nodoHeight = nodoWidth; // Asumiendo cuadrado
    nuevoNodo.style.left = `${initialX - nodoWidth / 2}px`; nuevoNodo.style.top = `${initialY - nodoHeight / 2}px`;

    mapaContenedor.appendChild(nuevoNodo);
    const nodoData = { id, elemento: nuevoNodo, x: initialX, y: initialY, tipo, imgSrc: imagenSrc, alt: img.alt };
    centralNodes.push(nodoData); principalNodeId = id;

    // Añadir listeners táctiles y de ratón
    nuevoNodo.addEventListener('touchstart', iniciarArrastreNodoCentral, { passive: false });
    nuevoNodo.addEventListener('mousedown', iniciarArrastreNodoCentral);
    nuevoNodo.addEventListener('click', seleccionarNodoPadre); // Click después de arrastre

    botonAddPrincipal.disabled = true;
    botonAddSecundario.disabled = false;
    console.log(`Nodo Principal creado con ID: ${id}. Botón Secundario HABILITADO.`);
    _actualizarSeleccionPadre(nuevoNodo, id);
}

function iniciarAnadirNodoSecundario() {
    console.log("Iniciando añadir nodo secundario...");
    if (principalNodeId === null) { alert("Debes añadir un recuerdo principal primero."); return; }
    accionInputArchivo = 'secundario'; inputImagen.click();
}

function procesarImagenNodoSecundario(imagenSrc, nombreSecundario) {
    console.log(`Procesando imagen para nodo secundario '${nombreSecundario}'...`);
    if (principalNodeId === null) { console.error("CRITICAL: principalNodeId es null."); return; }
    const nodoPrincipal = findCentralNodeById(principalNodeId);
    if (!nodoPrincipal) { console.error("CRITICAL: No se encontró nodo principal."); return; }

    const tipo = 'secundario';
    const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-secundario');
    const img = document.createElement('img'); img.src = imagenSrc;
    img.alt = nombreSecundario; // Guardar nombre en alt
    nuevoNodo.appendChild(img);

    rectMapaCache = mapaContenedor.getBoundingClientRect();
    const offsetInicial = (isMobile ? 120 : 180) + Math.random() * (isMobile ? 30 : 50); // Menor offset en móvil
    const anguloInicial = Math.random() * 2 * Math.PI;
    const baseX = typeof nodoPrincipal.x === 'number' ? nodoPrincipal.x : rectMapaCache.width / 2;
    const baseY = typeof nodoPrincipal.y === 'number' ? nodoPrincipal.y : rectMapaCache.height / 2;
    const initialX = baseX + offsetInicial * Math.cos(anguloInicial);
    const initialY = baseY + offsetInicial * Math.sin(anguloInicial);
    // Usar tamaño correcto basado en isMobile
    const nodoWidth = isMobile ? 70 : 85;
    const nodoHeight = nodoWidth;
    nuevoNodo.style.left = `${initialX - nodoWidth / 2}px`; nuevoNodo.style.top = `${initialY - nodoHeight / 2}px`;

    mapaContenedor.appendChild(nuevoNodo);
    const nodoData = { id, elemento: nuevoNodo, x: initialX, y: initialY, tipo, imgSrc: imagenSrc, alt: img.alt };
    centralNodes.push(nodoData);

    crearVinculoVisualMultiplesLineas(principalNodeId, id); // Usará NUM_VINCULOS_SECUNDARIO (ajustado para móvil)

    // Añadir listeners táctiles y de ratón
    nuevoNodo.addEventListener('touchstart', iniciarArrastreNodoCentral, { passive: false });
    nuevoNodo.addEventListener('mousedown', iniciarArrastreNodoCentral);
    nuevoNodo.addEventListener('click', seleccionarNodoPadre);

    console.log(`Nodo Secundario '${nombreSecundario}' (ID: ${id}) creado y vinculado a Principal ID: ${principalNodeId}`);
}

// Crea Multiples paths SVG ondulantes para vincular (Usa NUM_VINCULOS_SECUNDARIO)
function crearVinculoVisualMultiplesLineas(parentId, childId) {
    console.log(`Creando ${NUM_VINCULOS_SECUNDARIO} vínculos visuales entre Padre ID: ${parentId} e Hijo ID: ${childId}`);
    const idBase = generarId(); // ID base para el grupo de líneas
    const paths = [];
    const offsetTiempoBase = Math.random() * 10000; // Desfase base para este vínculo

    for (let i = 0; i < NUM_VINCULOS_SECUNDARIO; i++) { // El bucle se ejecutará 1 o 3 veces
        const pathId = `${idBase}-${i}`;
        const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        nuevoPath.id = `path-${pathId}`;
        nuevoPath.classList.add('linea-tentaculo'); // Usar el estilo tentáculo
        // Aplicar un color base (dorado) o dejar el blanco por defecto
        const vinculoColor = '#FFD700'; // Dorado usado
        nuevoPath.style.setProperty('--line-color', vinculoColor);
        // El color del glow suave se define en CSS general, pero podemos añadirlo aquí por si acaso
        nuevoPath.style.setProperty('--line-glow-color', vinculoColor);
        nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(vinculoColor));

        // Insertar ANTES que las líneas de recuerdo (si las hay)
        const firstMemoryLine = svgContenedor.querySelector('.linea-tentaculo:not(.linea-vinculo)'); // Evitar seleccionar las propias líneas de vínculo
        if (firstMemoryLine) {
             svgContenedor.insertBefore(nuevoPath, firstMemoryLine);
         } else {
             svgContenedor.appendChild(nuevoPath);
         }
        nuevoPath.classList.add('linea-vinculo'); // Clase para identificar estas líneas si es necesario
        paths.push(nuevoPath);
    }

    lineasVinculo.push({
        idBase: idBase,
        paths: paths, // Array de elementos path
        parentId: parentId,
        childId: childId,
        offsetTiempo: offsetTiempoBase // Guardar solo el offset base
    });
}

function iniciarAnadirRecuerdo() {
    console.log("Iniciando añadir recuerdo...");
    if (nodoPadreActivoId === null) { alert("Selecciona un nodo Principal o Secundario primero."); return; }
    accionInputArchivo = 'recuerdo';
    inputImagen.click();
}

// Creacion de Recuerdo
function crearNuevoNodoRecuerdo(imagenSrc, nombreRecuerdo) {
    console.log(`Creando recuerdo '${nombreRecuerdo}' para padre ID: ${nodoPadreActivoId}`);
    if (nodoPadreActivoId === null) { console.error("Error: nodoPadreActivoId es null."); return; }
    const nodoPadre = findCentralNodeById(nodoPadreActivoId);
    if (!nodoPadre) { console.error("Error: No se encontró nodo padre activo."); return; }

    const nuevoNodo = document.createElement('div');
    const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-recuerdo');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = nombreRecuerdo;
    const tooltip = document.createElement('span'); tooltip.classList.add('tooltip'); tooltip.textContent = nombreRecuerdo;
    nuevoNodo.appendChild(img); nuevoNodo.appendChild(tooltip);

    // Aplicar Color Neón Aleatorio
    const neonColor = generarColorHSL();
    // La animación usa la variable en CSS, aquí solo guardamos el color para la línea y exportación
    console.log(`Color Neón generado para Recuerdo ID ${id}: ${neonColor}`);

    rectMapaCache = mapaContenedor.getBoundingClientRect();
    const offsetInicial = (isMobile ? 90 : 120) + Math.random() * (isMobile ? 20 : 40); // Menor offset móvil
    const anguloInicial = Math.random() * 2 * Math.PI;
    const baseX = typeof nodoPadre.x === 'number' ? nodoPadre.x : rectMapaCache.width / 2;
    const baseY = typeof nodoPadre.y === 'number' ? nodoPadre.y : rectMapaCache.height / 2;
    let targetXInicial = baseX + offsetInicial * Math.cos(anguloInicial);
    let targetYInicial = baseY + offsetInicial * Math.sin(anguloInicial);
    // Usar tamaño correcto basado en isMobile
    const nodoWidth = isMobile ? 60 : 75;
    const nodoHeight = nodoWidth;
    nuevoNodo.style.left = `${targetXInicial - nodoWidth / 2}px`;
    nuevoNodo.style.top = `${targetYInicial - nodoHeight / 2}px`;

    mapaContenedor.appendChild(nuevoNodo);

    const pathId = generarId();
    const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nuevoPath.id = `path-${pathId}`;
    nuevoPath.classList.add('linea-tentaculo');
    // Aplicar color a la línea despues de crearla
    nuevoPath.style.setProperty('--line-color', neonColor);
    nuevoPath.style.setProperty('--line-glow-color', neonColor);
    nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(neonColor));
    svgContenedor.appendChild(nuevoPath);

    // Añadir listeners táctiles y de ratón
    nuevoNodo.addEventListener('touchstart', iniciarArrastreRecuerdo, { passive: false });
    nuevoNodo.addEventListener('mousedown', iniciarArrastreRecuerdo);
    // No añadir listener de click para seleccionar recuerdos como padres

    const nuevaData = {
        id: id, elemento: nuevoNodo, path: nuevoPath, parentId: nodoPadreActivoId,
        targetX: targetXInicial, targetY: targetYInicial,
        offsetTiempo: Math.random() * 10000, nombre: nombreRecuerdo,
        imgSrc: imagenSrc, // Guardar Data URL para exportar
        neonColor: neonColor // Guardar color para exportar/línea
    };
    nodosData.push(nuevaData);
    console.log(`Nodo Recuerdo '${nombreRecuerdo}' (ID: ${id}) creado.`);
}

// Manejar Selección de Archivo de Imagen
function manejarSeleccionArchivo(evento) {
    console.log("Archivo seleccionado, acción pendiente:", accionInputArchivo);
    const archivo = evento.target.files[0];
    const accionActual = accionInputArchivo; // Guardar acción antes de limpiar
    accionInputArchivo = null; // Limpiar para la próxima vez
    inputImagen.value = null; // Permitir seleccionar el mismo archivo de nuevo

    if (!archivo || !archivo.type.startsWith('image/')) {
        console.warn("Archivo no válido o selección cancelada.");
        // Restaurar estado de botones si la acción era añadir y se canceló? Opcional.
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imagenDataUrl = e.target.result;
        console.log("Archivo leído, procesando para acción:", accionActual);

        // Opcional: Redimensionar imagen aquí si es necesario antes de pasarla
        // usando canvas para mejorar rendimiento con imágenes grandes

        if (accionActual === 'principal') {
            procesarImagenNodoPrincipal(imagenDataUrl);
        } else if (accionActual === 'secundario') {
            const nombreSecundario = prompt("Introduce un nombre para el nodo secundario:");
            if (nombreSecundario) {
                procesarImagenNodoSecundario(imagenDataUrl, nombreSecundario);
            } else {
                console.log("Creación de nodo secundario cancelada (sin nombre).");
            }
        } else if (accionActual === 'recuerdo') {
            const nombreRecuerdo = prompt("Introduce un nombre para este recuerdo:");
            if (nombreRecuerdo) {
                crearNuevoNodoRecuerdo(imagenDataUrl, nombreRecuerdo);
            } else {
                console.log("Creación de recuerdo cancelada (sin nombre).");
            }
        } else {
            console.warn("Acción de archivo desconocida:", accionActual);
        }
    };
    reader.onerror = () => {
        console.error("Error al leer el archivo.");
        alert("Hubo un error al leer la imagen.");
    };
    reader.readAsDataURL(archivo);
}


// --- Selección y Arrastre (Adaptado para Táctil) ---

function _actualizarSeleccionPadre(nodoElemento, nodoId) {
    if (nodoPadreActivoId === nodoId) return; // Ya está activo

    // Desmarcar nodo previo
    if (nodoPadreActivoId !== null) {
        const nodoPrevio = findCentralNodeById(nodoPadreActivoId);
        if (nodoPrevio) nodoPrevio.elemento.classList.remove('activo');
        console.log(`Desmarcando nodo previo ID: ${nodoPadreActivoId}`);
    }

    // Marcar nuevo nodo
    nodoElemento.classList.add('activo');
    nodoPadreActivoId = nodoId;
    botonAnadirRecuerdo.disabled = false; // Habilitar botón de añadir recuerdo

    // Actualizar texto del botón
    const nodoPadre = findCentralNodeById(nodoPadreActivoId);
    let nombrePadre = 'Desconocido';
    if (nodoPadre) {
        nombrePadre = nodoPadre.tipo === 'principal' ? 'Ppal.' : (nodoPadre.alt || `Sec. ${nodoPadreActivoId}`);
    }
    botonAnadirRecuerdo.textContent = `Añadir Recuerdo a ${nombrePadre}`;
    console.log(`Nodo padre activo cambiado a ID: ${nodoPadreActivoId} (${nombrePadre})`);
}

// Listener para click en nodos principales/secundarios
function seleccionarNodoPadre(evento) {
    // Evitar seleccionar si se está arrastrando (opcional, podría manejarse en detenerArrastre)
    // if (elementoArrastrado) return;
    const nodoElemento = evento.currentTarget;
    const nodoId = parseInt(nodoElemento.id.split('-')[1]);
    _actualizarSeleccionPadre(nodoElemento, nodoId);
    evento.stopPropagation(); // Evitar que el click se propague al mapa
}


function iniciarArrastreNodoCentral(evento) {
    // Permitir solo botón izquierdo del ratón o evento táctil
    if (evento.type === 'mousedown' && evento.button !== 0) return;

    const isTouchEvent = evento.type.startsWith('touch');
    // Obtener coordenadas correctas para ratón o táctil
    const clientX = isTouchEvent ? evento.touches[0].clientX : evento.clientX;
    const clientY = isTouchEvent ? evento.touches[0].clientY : evento.clientY;

    const nodoElemento = evento.currentTarget;
    const id = parseInt(nodoElemento.id.split('-')[1]);
    rectMapaCache = mapaContenedor.getBoundingClientRect(); // Actualizar caché del mapa
    const rectNodo = nodoElemento.getBoundingClientRect();
    const offsetX = clientX - rectNodo.left;
    const offsetY = clientY - rectNodo.top;

    elementoArrastrado = { tipo: 'central', id: id, offsetX: offsetX, offsetY: offsetY };
    nodoElemento.style.zIndex = '50'; // Poner encima temporalmente
    // No cambiar cursor en táctil
    if (!isTouchEvent) nodoElemento.style.cursor = 'grabbing';

    // Añadir listeners correctos para mover y soltar
    if (isTouchEvent) {
        window.addEventListener('touchmove', arrastrarElemento, { passive: false }); // passive: false para prevenir scroll
        window.addEventListener('touchend', detenerArrastre);
        window.addEventListener('touchcancel', detenerArrastre); // Importante para cancelaciones
    } else {
        window.addEventListener('mousemove', arrastrarElemento);
        window.addEventListener('mouseup', detenerArrastre);
        window.addEventListener('mouseleave', detenerArrastre); // Si el ratón sale de la ventana
    }
    // Prevenir comportamiento por defecto (scroll en táctil, selección de texto en ratón)
    evento.preventDefault();
}

function iniciarArrastreRecuerdo(evento) {
    if (evento.type === 'mousedown' && evento.button !== 0) return;

    const isTouchEvent = evento.type.startsWith('touch');
    const clientX = isTouchEvent ? evento.touches[0].clientX : evento.clientX;
    const clientY = isTouchEvent ? evento.touches[0].clientY : evento.clientY;

    const nodoElemento = evento.currentTarget;
    const id = parseInt(nodoElemento.id.split('-')[1]);
    rectMapaCache = mapaContenedor.getBoundingClientRect();
    const rectNodo = nodoElemento.getBoundingClientRect();
    const offsetX = clientX - rectNodo.left;
    const offsetY = clientY - rectNodo.top;

    elementoArrastrado = { tipo: 'recuerdo', id: id, offsetX: offsetX, offsetY: offsetY };

    // Poner debajo del nodo padre si es posible
    const recuerdoData = findMemoryNodeById(id);
    const padre = recuerdoData ? findCentralNodeById(recuerdoData.parentId) : null;
    // Usar z-index por defecto de CSS si no se puede obtener el del padre
    const defaultZIndexPadre = 10;
    const padreZIndex = padre ? parseInt(window.getComputedStyle(padre.elemento).zIndex) || defaultZIndexPadre : defaultZIndexPadre;
    nodoElemento.style.zIndex = `${padreZIndex - 1}`; // Poner justo debajo
    if (!isTouchEvent) nodoElemento.style.cursor = 'grabbing';

     if (isTouchEvent) {
        window.addEventListener('touchmove', arrastrarElemento, { passive: false });
        window.addEventListener('touchend', detenerArrastre);
        window.addEventListener('touchcancel', detenerArrastre);
    } else {
        window.addEventListener('mousemove', arrastrarElemento);
        window.addEventListener('mouseup', detenerArrastre);
        window.addEventListener('mouseleave', detenerArrastre);
    }
    evento.preventDefault();
}


function arrastrarElemento(evento) {
    if (!elementoArrastrado) return;

    const isTouchEvent = evento.type.startsWith('touch');
    // Obtener coords. Usar changedTouches[0] si touches[0] falla en move (raro)
    const clientX = isTouchEvent ? (evento.touches[0] || evento.changedTouches[0]).clientX : evento.clientX;
    const clientY = isTouchEvent ? (evento.touches[0] || evento.changedTouches[0]).clientY : evento.clientY;

    // Calcular nueva posición relativa al mapa
    let nuevaPosX = clientX - rectMapaCache.left - elementoArrastrado.offsetX;
    let nuevaPosY = clientY - rectMapaCache.top - elementoArrastrado.offsetY;

    // Actualizar posición visual y datos guardados
    if (elementoArrastrado.tipo === 'central') {
        const nodoData = findCentralNodeById(elementoArrastrado.id);
        if (!nodoData) return;
        nodoData.elemento.style.left = `${nuevaPosX}px`;
        nodoData.elemento.style.top = `${nuevaPosY}px`;
        // Recalcular centro basado en tamaño actual (puede ser 0 si no se ha renderizado)
        const width = nodoData.elemento.offsetWidth || (isMobile ? (nodoData.tipo === 'principal' ? 80 : 70) : (nodoData.tipo === 'principal' ? 100 : 85));
        const height = nodoData.elemento.offsetHeight || width;
        nodoData.x = nuevaPosX + width / 2;
        nodoData.y = nuevaPosY + height / 2;
    } else if (elementoArrastrado.tipo === 'recuerdo') {
        const nodoData = findMemoryNodeById(elementoArrastrado.id);
        if (!nodoData) return;
        nodoData.elemento.style.left = `${nuevaPosX}px`;
        nodoData.elemento.style.top = `${nuevaPosY}px`;
        // Recalcular target basado en tamaño actual
        const width = nodoData.elemento.offsetWidth || (isMobile ? 60 : 75);
        const height = nodoData.elemento.offsetHeight || width;
        nodoData.targetX = nuevaPosX + width / 2;
        nodoData.targetY = nuevaPosY + height / 2;
    }

     // Prevenir comportamiento por defecto del navegador durante el arrastre táctil
     if (isTouchEvent) {
        evento.preventDefault();
     }
}

function detenerArrastre(evento) {
    if (!elementoArrastrado) return;

    // Determinar si fue evento táctil (importante para cursores y listeners)
    // No podemos confiar en evento.type aquí si fue mouseleave
    // Una forma es guardar el tipo en elementoArrastrado o detectar listeners activos
    // Solución simple: quitar ambos tipos de listeners siempre
    const wasTouchEvent = 'ontouchstart' in window; // Detección genérica

    let elementoDOM;
    let defaultZIndex = 'auto';
    const defaultCursor = 'pointer'; // Cursor por defecto

    if (elementoArrastrado.tipo === 'central') {
        const nodoData = findCentralNodeById(elementoArrastrado.id);
        if (nodoData) {
            elementoDOM = nodoData.elemento;
            // Usar z-index por defecto basado en CSS si es posible
            defaultZIndex = nodoData.tipo === 'principal' ? '10' : '9';
        }
    } else if (elementoArrastrado.tipo === 'recuerdo') {
        const nodoData = findMemoryNodeById(elementoArrastrado.id);
        if (nodoData) {
            elementoDOM = nodoData.elemento;
            defaultZIndex = '5'; // z-index por defecto para recuerdos
        }
    }

    // Restaurar estilos
    if (elementoDOM) {
        elementoDOM.style.zIndex = defaultZIndex;
        // Solo restaurar cursor si no es táctil (o si la detección fue más precisa)
        if (!wasTouchEvent) { // Asumimos que si hay táctil, no queremos cambiar el cursor
             elementoDOM.style.cursor = defaultCursor;
        }
    }

    elementoArrastrado = null; // Marcar que ya no se arrastra

    // Eliminar TODOS los listeners de movimiento y soltar (más seguro)
    window.removeEventListener('touchmove', arrastrarElemento);
    window.removeEventListener('touchend', detenerArrastre);
    window.removeEventListener('touchcancel', detenerArrastre);
    window.removeEventListener('mousemove', arrastrarElemento);
    window.removeEventListener('mouseup', detenerArrastre);
    window.removeEventListener('mouseleave', detenerArrastre);
}


// --- Animación (Adaptada con Throttling) ---

function actualizarPathRecuerdo(dataRecuerdo, tiempoActual) {
    if (!dataRecuerdo.path) return;
    const nodoPadre = findCentralNodeById(dataRecuerdo.parentId);
    if (!nodoPadre) { dataRecuerdo.path.setAttribute('d', ''); return; } // Ocultar si el padre no existe

    const startX = nodoPadre.x; const startY = nodoPadre.y;
    const endX = dataRecuerdo.targetX; const endY = dataRecuerdo.targetY;

    // No dibujar si inicio y fin son casi iguales
    if (Math.hypot(endX - startX, endY - startY) < 1) {
        dataRecuerdo.path.setAttribute('d', ''); return;
    }

    const anguloBase = Math.atan2(endY - startY, endX - startX);
    const tiempoAnim = (tiempoActual + dataRecuerdo.offsetTiempo) * VELOCIDAD_ONDULACION; // Velocidad ajustada
    const ondulacion = Math.sin(tiempoAnim) * AMPLITUD_ONDULACION; // Amplitud ajustada
    const controlOffsetX = ondulacion * Math.sin(anguloBase);
    const controlOffsetY = -ondulacion * Math.cos(anguloBase);
    const midX = startX + (endX - startX) / 2;
    const midY = startY + (endY - startY) / 2;
    const controlX = midX + controlOffsetX;
    const controlY = midY + controlOffsetY;
    const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
    dataRecuerdo.path.setAttribute('d', pathData);
}

// Actualiza múltiples paths por vínculo (Usa NUM_VINCULOS_SECUNDARIO)
function actualizarPathVinculo(dataVinculo, tiempoActual) {
    const nodoPadre = findCentralNodeById(dataVinculo.parentId);
    const nodoHijo = findCentralNodeById(dataVinculo.childId);
    if (!nodoPadre || !nodoHijo) { dataVinculo.paths.forEach(p => p.setAttribute('d', '')); return; }

    const startX = nodoPadre.x; const startY = nodoPadre.y;
    const endX = nodoHijo.x; const endY = nodoHijo.y;
    if (Math.hypot(endX - startX, endY - startY) < 1) { dataVinculo.paths.forEach(p => p.setAttribute('d', '')); return; }

    const anguloBase = Math.atan2(endY - startY, endX - startX);
    const midX = startX + (endX - startX) / 2;
    const midY = startY + (endY - startY) / 2;

    // Calcular curva para cada path del vínculo (1 o 3 veces)
    dataVinculo.paths.forEach((path, index) => {
        // Añadir un pequeño desfase extra por cada línea dentro del mismo vínculo (solo si hay > 1)
        const tiempoOffsetExtra = (NUM_VINCULOS_SECUNDARIO > 1) ? index * 500 : 0;
        const tiempoAnim = (tiempoActual + dataVinculo.offsetTiempo + tiempoOffsetExtra) * VELOCIDAD_ONDULACION; // Velocidad ajustada

        // Usar una amplitud ligeramente menor para los vínculos múltiples si se desea
        const amplitudVinculo = AMPLITUD_ONDULACION * (NUM_VINCULOS_SECUNDARIO > 1 ? 0.8 : 1.0); // Amplitud ajustada
        const ondulacion = Math.sin(tiempoAnim) * amplitudVinculo;
        const controlOffsetX = ondulacion * Math.sin(anguloBase);
        const controlOffsetY = -ondulacion * Math.cos(anguloBase);
        const controlX = midX + controlOffsetX;
        const controlY = midY + controlOffsetY;
        const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
        path.setAttribute('d', pathData);
    });
}

// Bucle principal de animación con throttling
function animar() {
    const tiempoActual = performance.now() - tiempoInicio;
    rectMapaCache = mapaContenedor.getBoundingClientRect(); // Actualizar tamaño del mapa

    // OPTIMIZACIÓN: Throttling simple - Actualizar líneas cada X frames en móvil
    const updateThisFrame = !isMobile || (frameCount % 2 === 0); // Actualizar cada 2 frames en móvil

    if (updateThisFrame) {
        // Actualizar líneas de VÍNCULO ondulantes
        lineasVinculo.forEach(vinculo => actualizarPathVinculo(vinculo, tiempoActual));
        // Actualizar líneas de RECUERDO
        nodosData.forEach(data => {
            actualizarPathRecuerdo(data, tiempoActual);
        });
    }

     // La lógica de actualizar la posición visual del nodo (si no se arrastra)
     // debería ejecutarse siempre para evitar lag visual al soltarlo.
     nodosData.forEach(data => {
        if (!elementoArrastrado || elementoArrastrado.tipo !== 'recuerdo' || elementoArrastrado.id !== data.id) {
            const el = data.elemento;
            // Usar tamaño por defecto si offsetWidth es 0
            const defaultWidth = isMobile ? 60 : 75;
            const width = el.offsetWidth || defaultWidth;
            const height = el.offsetHeight || defaultWidth;
            el.style.left = `${data.targetX - width / 2}px`;
            el.style.top = `${data.targetY - height / 2}px`;
        }
     });


    frameCount++; // Incrementar contador de frames
    animationFrameId = requestAnimationFrame(animar); // Solicitar siguiente frame
}


// --- Funciones para Exportar y Importar (Sin cambios lógicos relevantes) ---

function prepararDatosParaExportar() {
    const data = {
        version: 1,
        principalNodeId: principalNodeId,
        nextId: nextId,
        centralNodes: centralNodes.map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            tipo: n.tipo,
            imgSrc: n.imgSrc, // Data URL
            alt: n.alt
        })),
        nodosData: nodosData.map(n => ({
            id: n.id,
            parentId: n.parentId,
            targetX: n.targetX,
            targetY: n.targetY,
            nombre: n.nombre,
            imgSrc: n.imgSrc, // Data URL
            neonColor: n.neonColor
        }))
        // lineasVinculo se recrea
    };
    return data;
}

function exportarDatos() {
    try {
        const dataToSave = prepararDatosParaExportar();
        const jsonString = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memory-board-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Datos exportados exitosamente.");
    } catch (error) {
        console.error("Error al exportar datos:", error);
        alert("Hubo un error al exportar los datos.");
    }
}

function iniciarImportarDatos() {
    console.log("Iniciando importación...");
    inputImportar.click();
}

function manejarArchivoImportacion(evento) {
    console.log("Archivo de importación seleccionado.");
    const archivo = evento.target.files[0];
    inputImportar.value = null; // Limpiar para poder importar el mismo archivo

    if (!archivo || !archivo.name.endsWith('.json')) {
        alert("Por favor, selecciona un archivo .json válido."); return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonContent = e.target.result;
            const data = JSON.parse(jsonContent);
            console.log("Archivo JSON leído y parseado.");
            if (data && typeof data === 'object' && data.centralNodes && data.nodosData) {
                if (confirm("Esta acción borrará los recuerdos y vínculos actuales. ¿Continuar?")) {
                     console.log("Restaurando estado desde archivo...");
                     restaurarEstadoDesdeDatos(data);
                } else {
                    console.log("Importación cancelada por el usuario.");
                }
            } else {
                 alert("El archivo JSON no tiene el formato esperado.");
                 console.error("Formato JSON inválido:", data);
            }
        } catch (error) {
            console.error("Error al leer o parsear el archivo JSON:", error);
            alert("Hubo un error al procesar el archivo de importación.");
        }
    };
    reader.onerror = () => {
        console.error("Error al leer el archivo.");
        alert("No se pudo leer el archivo seleccionado.");
    };
    reader.readAsText(archivo); // Leer como texto
}

// --- Restaurar Estado (Adaptado para Táctil y Tamaños Móviles) ---
function restaurarEstadoDesdeDatos(data) {
    detenerAnimacion(); // Detener animación actual
    inicializarMapa(); // Limpia todo primero

    console.log("Restaurando datos...");
    const localIsMobile = window.innerWidth < 768; // Comprobar de nuevo

    try {
        principalNodeId = data.principalNodeId ?? null;
        nextId = data.nextId ?? 0; // Restaurar contador ID
        let maxIdFound = -1; // Para asegurar que nextId sea correcto

        // 1. Restaurar Nodos Centrales
        data.centralNodes.forEach(nodeData => {
            console.log(`Restaurando nodo central ID: ${nodeData.id}, Tipo: ${nodeData.tipo}`);
            maxIdFound = Math.max(maxIdFound, nodeData.id);
            const tipo = nodeData.tipo;
            const nuevoNodo = document.createElement('div');
            nuevoNodo.id = `nodo-${nodeData.id}`;
            nuevoNodo.classList.add('nodo', tipo === 'principal' ? 'nodo-principal' : 'nodo-secundario');
            const img = document.createElement('img');
            img.src = nodeData.imgSrc || ''; // Usar imgSrc guardado (Data URL)
            img.alt = nodeData.alt || (tipo === 'principal' ? 'Principal' : 'Secundario');
            nuevoNodo.appendChild(img);

            // Usar tamaños correctos basados en localIsMobile
            let nodoWidth, nodoHeight;
            if (tipo === 'principal') {
                nodoWidth = localIsMobile ? 80 : 100;
            } else { // secundario
                nodoWidth = localIsMobile ? 70 : 85;
            }
            nodoHeight = nodoWidth; // Asumiendo cuadrados
            // Usar posiciones guardadas (x, y son el centro)
            nuevoNodo.style.left = `${nodeData.x - nodoWidth / 2}px`;
            nuevoNodo.style.top = `${nodeData.y - nodoHeight / 2}px`;
            mapaContenedor.appendChild(nuevoNodo);

            centralNodes.push({
                 id: nodeData.id, elemento: nuevoNodo, x: nodeData.x, y: nodeData.y, tipo: tipo,
                 imgSrc: nodeData.imgSrc, alt: nodeData.alt
            });
            // Añadir listeners táctiles y de ratón
            nuevoNodo.addEventListener('touchstart', iniciarArrastreNodoCentral, { passive: false });
            nuevoNodo.addEventListener('mousedown', iniciarArrastreNodoCentral);
            nuevoNodo.addEventListener('click', seleccionarNodoPadre);
        });

        // 2. Recrear Vínculos Visuales (después de crear todos los centrales)
        centralNodes.forEach(node => {
            // Solo crear vínculo si es secundario y existe un principal
            if(node.tipo === 'secundario' && principalNodeId !== null) {
                // Asegurarse que el nodo principal exista en centralNodes antes de vincular
                if (findCentralNodeById(principalNodeId)) {
                    crearVinculoVisualMultiplesLineas(principalNodeId, node.id);
                } else {
                    console.warn(`No se encontró el nodo principal ID ${principalNodeId} al intentar recrear vínculo para secundario ID ${node.id}`);
                }
            }
        });

        // 3. Restaurar Nodos de Recuerdo
        data.nodosData.forEach(nodeData => {
             console.log(`Restaurando nodo recuerdo ID: ${nodeData.id}, Nombre: ${nodeData.nombre}`);
             maxIdFound = Math.max(maxIdFound, nodeData.id);
             const nuevoNodo = document.createElement('div');
             nuevoNodo.id = `nodo-${nodeData.id}`;
             nuevoNodo.classList.add('nodo', 'nodo-recuerdo');
             const img = document.createElement('img');
             img.src = nodeData.imgSrc || ''; // Usar imgSrc guardado
             img.alt = nodeData.nombre || 'Recuerdo';
             const tooltip = document.createElement('span');
             tooltip.classList.add('tooltip');
             tooltip.textContent = nodeData.nombre || 'Recuerdo';
             nuevoNodo.appendChild(img); nuevoNodo.appendChild(tooltip);

             // El color neón se aplica a la línea, no directamente al nodo (la animación CSS lo usa)

             // Usar tamaño correcto basado en localIsMobile
             const nodoWidth = localIsMobile ? 60 : 75;
             const nodoHeight = nodoWidth;
             // Usar targetX/Y guardados para la posición inicial
             nuevoNodo.style.left = `${nodeData.targetX - nodoWidth / 2}px`;
             nuevoNodo.style.top = `${nodeData.targetY - nodoHeight / 2}px`;
             mapaContenedor.appendChild(nuevoNodo);

             // Crear path SVG
            const pathId = generarId(); // Usar nuevo ID para el path
            maxIdFound = Math.max(maxIdFound, pathId); // Asegurar que nextId sea mayor
            const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            nuevoPath.id = `path-${pathId}`;
            nuevoPath.classList.add('linea-tentaculo');
             if (nodeData.neonColor) { // Aplicar color a la línea
                 nuevoPath.style.setProperty('--line-color', nodeData.neonColor);
                 nuevoPath.style.setProperty('--line-glow-color', nodeData.neonColor);
                 nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(nodeData.neonColor));
             }
             svgContenedor.appendChild(nuevoPath);

            // Añadir listeners táctiles y de ratón
             nuevoNodo.addEventListener('touchstart', iniciarArrastreRecuerdo, { passive: false });
             nuevoNodo.addEventListener('mousedown', iniciarArrastreRecuerdo);

             nodosData.push({
                 id: nodeData.id, elemento: nuevoNodo, path: nuevoPath, parentId: nodeData.parentId,
                 targetX: nodeData.targetX, targetY: nodeData.targetY,
                 offsetTiempo: Math.random() * 10000, // Regenerar offset
                 nombre: nodeData.nombre, imgSrc: nodeData.imgSrc, neonColor: nodeData.neonColor
             });
        });

        // Asegurar que nextId sea mayor que cualquier ID restaurado
        nextId = Math.max(nextId, maxIdFound + 1);

        // Actualizar estado de botones
        if (principalNodeId !== null) {
            botonAddPrincipal.disabled = true;
            botonAddSecundario.disabled = false;
        } else {
            botonAddPrincipal.disabled = false;
            botonAddSecundario.disabled = true;
        }
        botonAnadirRecuerdo.disabled = true; // Requiere selección manual
        botonAnadirRecuerdo.textContent = "Añadir Recuerdo";
        nodoPadreActivoId = null; // Deseleccionar cualquier nodo activo

        // Reiniciar animación
        tiempoInicio = performance.now();
        animar(); // Iniciar animación con el estado restaurado
        console.log("Estado restaurado exitosamente. Next ID:", nextId);
        alert("Recuerdos restaurados <3");

    } catch (error) {
        console.error("Error durante la restauración del estado:", error);
        alert("Hubo un error al restaurar el estado desde el archivo.");
        // Opcional: intentar volver a un estado limpio si falla la restauración
        reiniciarAplicacion();
    }
}


// --- Inicialización y Control ---

function inicializarMapa() {
    console.log("Inicializando mapa...");
    svgContenedor.innerHTML = ''; // Limpiar líneas SVG
    mapaContenedor.querySelectorAll('.nodo').forEach(n => n.remove()); // Eliminar nodos del DOM

    // Resetear variables de estado
    principalNodeId = null;
    centralNodes = [];
    nodosData = [];
    lineasVinculo = [];
    nodoPadreActivoId = null;
    elementoArrastrado = null;
    nextId = 0;
    accionInputArchivo = null;

    // Resetear botones
    botonAddPrincipal.disabled = false;
    botonAddSecundario.disabled = true;
    botonAnadirRecuerdo.disabled = true;
    botonAnadirRecuerdo.textContent = "Añadir Recuerdo";

    console.log("Mapa inicializado.");
}

function detenerAnimacion() {
     if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
     }
}

function reiniciarAplicacion() {
    console.log("Reiniciando aplicación...");
    detenerAnimacion();
    inicializarMapa();
    tiempoInicio = performance.now(); // Resetear tiempo de inicio
    frameCount = 0; // Resetear contador de frames
    animar(); // Iniciar animación
}

// --- Listeners Globales ---
window.addEventListener('load', () => {
    console.log("Ventana cargada. Configurando listeners...");
    // Verificación de elementos esenciales
    if (!mapaContenedor || !svgContenedor || !botonAddPrincipal || !botonAddSecundario || !botonAnadirRecuerdo || !inputImagen || !botonExportar || !botonImportar || !inputImportar) {
        console.error("Faltan elementos esenciales en el DOM.");
        // Podríamos deshabilitar la app aquí o mostrar un mensaje de error
        return;
    }

    reiniciarAplicacion(); // Inicializa y comienza la animación

    // Listeners botones acción (solo se añaden una vez)
    botonAddPrincipal.addEventListener('click', iniciarAnadirNodoPrincipal);
    botonAddSecundario.addEventListener('click', iniciarAnadirNodoSecundario);
    botonAnadirRecuerdo.addEventListener('click', iniciarAnadirRecuerdo);
    inputImagen.addEventListener('change', manejarSeleccionArchivo);

    // Listeners Exportar/Importar
    botonExportar.addEventListener('click', exportarDatos);
    botonImportar.addEventListener('click', iniciarImportarDatos);
    inputImportar.addEventListener('change', manejarArchivoImportacion);

    console.log("Listeners configurados.");
});

// Actualizar caché del tamaño del mapa si la ventana cambia de tamaño
window.addEventListener('resize', () => {
    // Opcional: Podríamos recalcular 'isMobile' aquí y ajustar parámetros dinámicamente,
    // pero por simplicidad, la detección inicial en load suele ser suficiente.
    rectMapaCache = mapaContenedor.getBoundingClientRect();
});
