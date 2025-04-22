
const AMPLITUD_ONDULACION = 15; 
const VELOCIDAD_ONDULACION = 0.002;
const NUM_VINCULOS_SECUNDARIO = 3;


const mapaContenedor = document.querySelector('.mapa-mental');
const svgContenedor = document.getElementById('svg-lineas');
const botonAddPrincipal = document.getElementById('boton-add-principal');
const botonAddSecundario = document.getElementById('boton-add-secundario');
const botonAnadirRecuerdo = document.getElementById('boton-anadir-recuerdo');
const inputImagen = document.getElementById('input-imagen');


const botonExportar = document.getElementById('boton-exportar');
const botonImportar = document.getElementById('boton-importar');
const inputImportar = document.getElementById('import-file');


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


function generarId() { return nextId++; }
function findCentralNodeById(id) { return centralNodes.find(node => node.id === id); }
function findMemoryNodeById(id) { return nodosData.find(node => node.id === id); }
function findVinculoByChildId(childId) { return lineasVinculo.find(v => v.childId === childId); }

function getCentroRelativo(elemento, rectMapa) { 
    if (!elemento || !rectMapa) return { x: 0, y: 0 };
    const rectElemento = elemento.getBoundingClientRect();
    const width = rectElemento.width || parseFloat(elemento.style.width) || 0;
    const height = rectElemento.height || parseFloat(elemento.style.height) || 0;
    const robustWidth = width || elemento.offsetWidth;
    const robustHeight = height || elemento.offsetHeight;
    return {
        x: (rectElemento.left - rectMapa.left) + robustWidth / 2,
        y: (rectElemento.top - rectMapa.top) + robustHeight / 2
    };
}


function generarColorHSL() {
    const h = Math.floor(Math.random() * 360); 
    const s = 90 + Math.floor(Math.random() * 11); 
    const l = 55 + Math.floor(Math.random() * 11); 
    return `hsl(${h}, ${s}%, ${l}%)`;
}


function getSoftGlowColor(hslColor) {
    if (!hslColor || !hslColor.startsWith('hsl')) return 'rgba(255, 255, 255, 0.5)'; 
    try {
        let [h, s, l] = hslColor.match(/\d+/g).map(Number);
        l = Math.max(0, l - 10); 
        s = Math.max(0, s - 10); 
        return `hsla(${h}, ${s}%, ${l}%, 0.7)`; 
    } catch (e) {
        return 'rgba(255, 255, 255, 0.5)';
    }
}




function iniciarAnadirNodoPrincipal() { 
    console.log("Iniciando añadir nodo principal...");
    if (principalNodeId !== null) { alert("Ya existe un nodo principal."); return; }
    accionInputArchivo = 'principal'; inputImagen.click();
}

function procesarImagenNodoPrincipal(imagenSrc) { 
    console.log("Procesando imagen para nodo principal...");
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
    console.log("Iniciando añadir nodo secundario...");
    if (principalNodeId === null) { alert("Debes añadir un recuerdo principal primero."); return; }
    accionInputArchivo = 'secundario'; inputImagen.click();
}

function procesarImagenNodoSecundario(imagenSrc, nombreSecundario) {
    console.log(`Procesando imagen para nodo secundario '${nombreSecundario}'...`);
    if (principalNodeId === null) { console.error("CRITICAL: principalNodeId es null."); return; }
    const nodoPrincipal = findCentralNodeById(principalNodeId); if (!nodoPrincipal) { console.error("CRITICAL: No se encontró nodo principal."); return; }

    const tipo = 'secundario'; const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-secundario');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = nombreSecundario; 
    nuevoNodo.appendChild(img);
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


function crearVinculoVisualMultiplesLineas(parentId, childId) {
    console.log(`Creando ${NUM_VINCULOS_SECUNDARIO} vínculos visuales entre Padre ID: ${parentId} e Hijo ID: ${childId}`);
    const idBase = generarId(); 
    const paths = [];
    const offsetTiempoBase = Math.random() * 10000; 

    for (let i = 0; i < NUM_VINCULOS_SECUNDARIO; i++) {
        const pathId = `${idBase}-${i}`;
        const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        nuevoPath.id = `path-${pathId}`;
        nuevoPath.classList.add('linea-tentaculo'); 
        
        const vinculoColor = '#FFD700'; 
        nuevoPath.style.setProperty('--line-color', vinculoColor);
        nuevoPath.style.setProperty('--line-glow-color', vinculoColor);
        nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(vinculoColor));


        
        const firstTentacle = svgContenedor.querySelector('.linea-tentaculo:not(.linea-vinculo-placeholder)'); 
         if (firstTentacle) {
             svgContenedor.insertBefore(nuevoPath, firstTentacle);
         } else {
             svgContenedor.appendChild(nuevoPath);
         }
        nuevoPath.classList.add('linea-vinculo-placeholder'); 
        paths.push(nuevoPath);
    }
    
     paths.forEach(p => p.classList.remove('linea-vinculo-placeholder'));


    lineasVinculo.push({
        idBase: idBase,
        paths: paths, 
        parentId: parentId,
        childId: childId,
        offsetTiempo: offsetTiempoBase 
    });
}

function iniciarAnadirRecuerdo() { 
    console.log("Iniciando añadir recuerdo...");
    if (nodoPadreActivoId === null) { alert("Selecciona un nodo Principal o Secundario primero."); return; }
    accionInputArchivo = 'recuerdo'; inputImagen.click();
}


function crearNuevoNodoRecuerdo(imagenSrc, nombreRecuerdo) {
    console.log(`Creando recuerdo '${nombreRecuerdo}' para padre ID: ${nodoPadreActivoId}`);
    if (nodoPadreActivoId === null) { console.error("Error: nodoPadreActivoId es null."); return; }
    const nodoPadre = findCentralNodeById(nodoPadreActivoId);
    if (!nodoPadre) { console.error("Error: No se encontró nodo padre activo."); return; }

    const nuevoNodo = document.createElement('div'); const id = generarId();
    nuevoNodo.id = `nodo-${id}`; nuevoNodo.classList.add('nodo', 'nodo-recuerdo');
    const img = document.createElement('img'); img.src = imagenSrc; img.alt = nombreRecuerdo;
    const tooltip = document.createElement('span'); tooltip.classList.add('tooltip'); tooltip.textContent = nombreRecuerdo;
    nuevoNodo.appendChild(img); nuevoNodo.appendChild(tooltip);

    
    const neonColor = generarColorHSL();
    nuevoNodo.style.setProperty('--neon-glow-color', neonColor);
    console.log(`Color Neón generado para Recuerdo ID ${id}: ${neonColor}`);

    rectMapaCache = mapaContenedor.getBoundingClientRect(); const offsetInicial = 120 + Math.random() * 40; const anguloInicial = Math.random() * 2 * Math.PI;
    const baseX = typeof nodoPadre.x === 'number' ? nodoPadre.x : rectMapaCache.width / 2; const baseY = typeof nodoPadre.y === 'number' ? nodoPadre.y : rectMapaCache.height / 2;
    let targetXInicial = baseX + offsetInicial * Math.cos(anguloInicial); let targetYInicial = baseY + offsetInicial * Math.sin(anguloInicial);
    const nodoWidth = 90; const nodoHeight = 90; nuevoNodo.style.left = `${targetXInicial - nodoWidth / 2}px`; nuevoNodo.style.top = `${targetYInicial - nodoHeight / 2}px`;
    mapaContenedor.appendChild(nuevoNodo);

    const pathId = generarId(); const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nuevoPath.id = `path-${pathId}`; nuevoPath.classList.add('linea-tentaculo');
    
    
    nuevoPath.style.setProperty('--line-color', neonColor);
    nuevoPath.style.setProperty('--line-glow-color', neonColor);
    nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(neonColor));


    svgContenedor.appendChild(nuevoPath);
    nuevoNodo.addEventListener('mousedown', iniciarArrastreRecuerdo);

    const nuevaData = {
        id: id, elemento: nuevoNodo, path: nuevoPath, parentId: nodoPadreActivoId,
        targetX: targetXInicial, targetY: targetYInicial,
        offsetTiempo: Math.random() * 10000, nombre: nombreRecuerdo,
        imgSrc: imagenSrc, 
        neonColor: neonColor 
    };
    nodosData.push(nuevaData);
    console.log(`Nodo Recuerdo '${nombreRecuerdo}' (ID: ${id}) creado.`);
}

function manejarSeleccionArchivo(evento) { 
    console.log("Archivo seleccionado, acción pendiente:", accionInputArchivo);
    const archivo = evento.target.files[0]; const accionActual = accionInputArchivo;
    accionInputArchivo = null; inputImagen.value = null;
    if (!archivo || !archivo.type.startsWith('image/')) { console.warn("Archivo no válido."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        const imagenDataUrl = e.target.result; console.log("Archivo leído, procesando para acción:", accionActual);
        if (accionActual === 'principal') { procesarImagenNodoPrincipal(imagenDataUrl); }
        else if (accionActual === 'secundario') { const nombreSecundario = prompt("Introduce un nombre para el nodo secundario:"); if (nombreSecundario) { procesarImagenNodoSecundario(imagenDataUrl, nombreSecundario); } else { console.log("Creación cancelada (sin nombre)."); } }
        else if (accionActual === 'recuerdo') { const nombreRecuerdo = prompt("Introduce un nombre para este recuerdo:"); if (nombreRecuerdo) { crearNuevoNodoRecuerdo(imagenDataUrl, nombreRecuerdo); } else { console.log("Creación cancelada (sin nombre)."); } }
        else { console.warn("Acción de archivo desconocida:", accionActual); }
    };
    reader.onerror = () => { console.error("Error al leer el archivo."); };
    reader.readAsDataURL(archivo);
}


function _actualizarSeleccionPadre(nodoElemento, nodoId) { 
    if (nodoPadreActivoId === nodoId) return; if (nodoPadreActivoId !== null) { const nodoPrevio = findCentralNodeById(nodoPadreActivoId); nodoPrevio?.elemento.classList.remove('activo'); console.log(`Desmarcando nodo previo ID: ${nodoPadreActivoId}`); }
    nodoElemento.classList.add('activo'); nodoPadreActivoId = nodoId; botonAnadirRecuerdo.disabled = false;
    const nodoPadre = findCentralNodeById(nodoPadreActivoId); let nombrePadre = nodoPadre?.tipo === 'principal' ? 'Ppal.' : (nodoPadre?.alt || `Sec. ${nodoPadreActivoId}`); // Usar alt guardado
    botonAnadirRecuerdo.textContent = `Añadir Recuerdo a ${nombrePadre}`; console.log(`Nodo padre activo cambiado a ID: ${nodoPadreActivoId} (${nombrePadre})`);
}
function seleccionarNodoPadre(evento) {  const nodoElemento = evento.currentTarget; const nodoId = parseInt(nodoElemento.id.split('-')[1]); _actualizarSeleccionPadre(nodoElemento, nodoId); evento.stopPropagation(); }
function iniciarArrastreNodoCentral(evento) { if (evento.button !== 0) return; const nodoElemento = evento.currentTarget; const id = parseInt(nodoElemento.id.split('-')[1]); rectMapaCache = mapaContenedor.getBoundingClientRect(); const rectNodo = nodoElemento.getBoundingClientRect(); const offsetX = evento.clientX - rectNodo.left; const offsetY = evento.clientY - rectNodo.top; elementoArrastrado = { tipo: 'central', id: id, offsetX: offsetX, offsetY: offsetY }; nodoElemento.style.zIndex = '50'; nodoElemento.style.cursor = 'grabbing'; window.addEventListener('mousemove', arrastrarElemento); window.addEventListener('mouseup', detenerArrastre); window.addEventListener('mouseleave', detenerArrastre); evento.preventDefault(); }
function iniciarArrastreRecuerdo(evento) { if (evento.button !== 0) return; const nodoElemento = evento.currentTarget; const id = parseInt(nodoElemento.id.split('-')[1]); rectMapaCache = mapaContenedor.getBoundingClientRect(); const rectNodo = nodoElemento.getBoundingClientRect(); const offsetX = evento.clientX - rectNodo.left; const offsetY = evento.clientY - rectNodo.top; elementoArrastrado = { tipo: 'recuerdo', id: id, offsetX: offsetX, offsetY: offsetY }; const recuerdoData = findMemoryNodeById(id); const padre = recuerdoData ? findCentralNodeById(recuerdoData.parentId) : null; const padreZIndex = padre ? parseInt(window.getComputedStyle(padre.elemento).zIndex) || 10 : 10; nodoElemento.style.zIndex = `${padreZIndex - 1}`; nodoElemento.style.cursor = 'grabbing'; window.addEventListener('mousemove', arrastrarElemento); window.addEventListener('mouseup', detenerArrastre); window.addEventListener('mouseleave', detenerArrastre); evento.preventDefault(); }
function arrastrarElemento(evento) { if (!elementoArrastrado) return; let nuevaPosX = evento.clientX - rectMapaCache.left - elementoArrastrado.offsetX; let nuevaPosY = evento.clientY - rectMapaCache.top - elementoArrastrado.offsetY; if (elementoArrastrado.tipo === 'central') { const nodoData = findCentralNodeById(elementoArrastrado.id); if (!nodoData) return; nodoData.elemento.style.left = `${nuevaPosX}px`; nodoData.elemento.style.top = `${nuevaPosY}px`; nodoData.x = nuevaPosX + nodoData.elemento.offsetWidth / 2; nodoData.y = nuevaPosY + nodoData.elemento.offsetHeight / 2; } else if (elementoArrastrado.tipo === 'recuerdo') { const nodoData = findMemoryNodeById(elementoArrastrado.id); if (!nodoData) return; nodoData.elemento.style.left = `${nuevaPosX}px`; nodoData.elemento.style.top = `${nuevaPosY}px`; nodoData.targetX = nuevaPosX + nodoData.elemento.offsetWidth / 2; nodoData.targetY = nuevaPosY + nodoData.elemento.offsetHeight / 2; } }
function detenerArrastre() {if (!elementoArrastrado) return; let elementoDOM; let defaultZIndex = 'auto'; if (elementoArrastrado.tipo === 'central') { const nodoData = findCentralNodeById(elementoArrastrado.id); if (nodoData) { elementoDOM = nodoData.elemento; defaultZIndex = nodoData.tipo === 'principal' ? '10' : '9'; } } else if (elementoArrastrado.tipo === 'recuerdo') { const nodoData = findMemoryNodeById(elementoArrastrado.id); if (nodoData) { elementoDOM = nodoData.elemento; defaultZIndex = '5'; } } if (elementoDOM) { elementoDOM.style.zIndex = defaultZIndex; elementoDOM.style.cursor = 'pointer'; } elementoArrastrado = null; window.removeEventListener('mousemove', arrastrarElemento); window.removeEventListener('mouseup', detenerArrastre); window.removeEventListener('mouseleave', detenerArrastre); }




function actualizarPathRecuerdo(dataRecuerdo, tiempoActual) { 
    if (!dataRecuerdo.path) return; const nodoPadre = findCentralNodeById(dataRecuerdo.parentId); if (!nodoPadre) { dataRecuerdo.path.setAttribute('d', ''); return; }
    const startX = nodoPadre.x; const startY = nodoPadre.y; const endX = dataRecuerdo.targetX; const endY = dataRecuerdo.targetY;
    if (Math.hypot(endX - startX, endY - startY) < 1) { dataRecuerdo.path.setAttribute('d', ''); return; }
    const anguloBase = Math.atan2(endY - startY, endX - startX); const tiempoAnim = (tiempoActual + dataRecuerdo.offsetTiempo) * VELOCIDAD_ONDULACION; const ondulacion = Math.sin(tiempoAnim) * AMPLITUD_ONDULACION;
    const controlOffsetX = ondulacion * Math.sin(anguloBase); const controlOffsetY = -ondulacion * Math.cos(anguloBase); const midX = startX + (endX - startX) / 2; const midY = startY + (endY - startY) / 2;
    const controlX = midX + controlOffsetX; const controlY = midY + controlOffsetY; const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`; dataRecuerdo.path.setAttribute('d', pathData);
}


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

   
    dataVinculo.paths.forEach((path, index) => {
        
        const tiempoOffsetExtra = index * 500; 
        const tiempoAnim = (tiempoActual + dataVinculo.offsetTiempo + tiempoOffsetExtra) * VELOCIDAD_ONDULACION;
        
        const amplitudVinculo = AMPLITUD_ONDULACION * 0.8; 
        const ondulacion = Math.sin(tiempoAnim) * amplitudVinculo;
        const controlOffsetX = ondulacion * Math.sin(anguloBase);
        const controlOffsetY = -ondulacion * Math.cos(anguloBase);
        const controlX = midX + controlOffsetX;
        const controlY = midY + controlOffsetY;
        const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
        path.setAttribute('d', pathData);
    });
}

function animar() {
    const tiempoActual = performance.now() - tiempoInicio;
    rectMapaCache = mapaContenedor.getBoundingClientRect();

    
    lineasVinculo.forEach(vinculo => actualizarPathVinculo(vinculo, tiempoActual));

    
    nodosData.forEach(data => {
        actualizarPathRecuerdo(data, tiempoActual);
        if (!elementoArrastrado || elementoArrastrado.tipo !== 'recuerdo' || elementoArrastrado.id !== data.id) {
            const el = data.elemento;
            
             const width = el.offsetWidth || 90;
             const height = el.offsetHeight || 90;
             el.style.left = `${data.targetX - width / 2}px`;
             el.style.top = `${data.targetY - height / 2}px`;
        }
    });

    animationFrameId = requestAnimationFrame(animar);
}



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
            imgSrc: n.imgSrc, 
            alt: n.alt
        })),
        nodosData: nodosData.map(n => ({
            id: n.id,
            parentId: n.parentId,
            targetX: n.targetX,
            targetY: n.targetY,
            nombre: n.nombre,
            imgSrc: n.imgSrc, 
            neonColor: n.neonColor
            
        }))
        
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
        a.download = `Mapa-de-Vinculos-${Date.getDate()}-${Date.getMonth()}-${Date.getFullYear()}.json`;
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
    inputImportar.value = null; 

    if (!archivo || !archivo.name.endsWith('.json')) {
        alert("Por favor, selecciona un archivo .json válido.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonContent = e.target.result;
            const data = JSON.parse(jsonContent);
            console.log("Archivo JSON leído y parseado.");
            
            if (data && typeof data === 'object' && data.centralNodes && data.nodosData) {
                if (confirm("Esta accion borrara los recuerdos y vinculos actuales, ¿Continuar?")) {
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
    reader.readAsText(archivo); 
}

function restaurarEstadoDesdeDatos(data) {
    detenerAnimacion();
    inicializarMapa(); 

    console.log("Restaurando datos...");

    try {
        principalNodeId = data.principalNodeId ?? null;
        nextId = data.nextId ?? 0; 
        let maxIdFound = -1; 

        
        data.centralNodes.forEach(nodeData => {
            console.log(`Restaurando nodo central ID: ${nodeData.id}, Tipo: ${nodeData.tipo}`);
            maxIdFound = Math.max(maxIdFound, nodeData.id);
            const tipo = nodeData.tipo;
            const nuevoNodo = document.createElement('div');
            nuevoNodo.id = `nodo-${nodeData.id}`;
            nuevoNodo.classList.add('nodo', tipo === 'principal' ? 'nodo-principal' : 'nodo-secundario');
            const img = document.createElement('img');
            img.src = nodeData.imgSrc || ''; 
            img.alt = nodeData.alt || (tipo === 'principal' ? 'Principal' : 'Secundario');
            nuevoNodo.appendChild(img);

            const nodoWidth = tipo === 'principal' ? 120 : 100;
            const nodoHeight = tipo === 'principal' ? 120 : 100;
            
            nuevoNodo.style.left = `${nodeData.x - nodoWidth / 2}px`;
            nuevoNodo.style.top = `${nodeData.y - nodoHeight / 2}px`;
            mapaContenedor.appendChild(nuevoNodo);

            centralNodes.push({
                 id: nodeData.id, elemento: nuevoNodo, x: nodeData.x, y: nodeData.y, tipo: tipo,
                 imgSrc: nodeData.imgSrc, alt: nodeData.alt 
            });
            nuevoNodo.addEventListener('click', seleccionarNodoPadre);
            nuevoNodo.addEventListener('mousedown', iniciarArrastreNodoCentral);
        });

        
        centralNodes.forEach(node => {
            if(node.tipo === 'secundario' && principalNodeId !== null) {
                crearVinculoVisualMultiplesLineas(principalNodeId, node.id);
            }
        });


        
        data.nodosData.forEach(nodeData => {
             console.log(`Restaurando nodo recuerdo ID: ${nodeData.id}, Nombre: ${nodeData.nombre}`);
             maxIdFound = Math.max(maxIdFound, nodeData.id);
             const nuevoNodo = document.createElement('div');
             nuevoNodo.id = `nodo-${nodeData.id}`;
             nuevoNodo.classList.add('nodo', 'nodo-recuerdo');
             const img = document.createElement('img');
             img.src = nodeData.imgSrc || ''; 
             img.alt = nodeData.nombre || 'Recuerdo';
             const tooltip = document.createElement('span');
             tooltip.classList.add('tooltip');
             tooltip.textContent = nodeData.nombre || 'Recuerdo';
             nuevoNodo.appendChild(img); nuevoNodo.appendChild(tooltip);

             if (nodeData.neonColor) { 
                 nuevoNodo.style.setProperty('--neon-glow-color', nodeData.neonColor);
             }

             const nodoWidth = 90; const nodoHeight = 90;
             
             nuevoNodo.style.left = `${nodeData.targetX - nodoWidth / 2}px`;
             nuevoNodo.style.top = `${nodeData.targetY - nodoHeight / 2}px`;
             mapaContenedor.appendChild(nuevoNodo);

             
            const pathId = generarId(); 
            maxIdFound = Math.max(maxIdFound, pathId);
            const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            nuevoPath.id = `path-${pathId}`;
            nuevoPath.classList.add('linea-tentaculo');
             if (nodeData.neonColor) { 
                 nuevoPath.style.setProperty('--line-color', nodeData.neonColor);
                 nuevoPath.style.setProperty('--line-glow-color', nodeData.neonColor);
                 nuevoPath.style.setProperty('--line-glow-color-soft', getSoftGlowColor(nodeData.neonColor));
             }
             svgContenedor.appendChild(nuevoPath);

             nuevoNodo.addEventListener('mousedown', iniciarArrastreRecuerdo);

             nodosData.push({
                 id: nodeData.id, elemento: nuevoNodo, path: nuevoPath, parentId: nodeData.parentId,
                 targetX: nodeData.targetX, targetY: nodeData.targetY,
                 offsetTiempo: Math.random() * 10000, // Regenerar offset
                 nombre: nodeData.nombre, imgSrc: nodeData.imgSrc, neonColor: nodeData.neonColor
             });
        });

       
        nextId = Math.max(nextId, maxIdFound + 1);

        
        if (principalNodeId !== null) {
            botonAddPrincipal.disabled = true;
            botonAddSecundario.disabled = false;
        } else {
            botonAddPrincipal.disabled = false;
            botonAddSecundario.disabled = true;
        }
        botonAnadirRecuerdo.disabled = true; 
        botonAnadirRecuerdo.textContent = "Añadir Recuerdo";
        nodoPadreActivoId = null; 

        
        tiempoInicio = performance.now();
        animar();
        console.log("Estado restaurado exitosamente. Next ID:", nextId);
        alert("Recuerdos restaurados <3  ");

    } catch (error) {
        console.error("Error durante la restauración del estado:", error);
        alert("Hubo un error al restaurar el estado desde el archivo.");
        
        reiniciarAplicacion();
    }
}



function inicializarMapa() { 
    console.log("Inicializando mapa..."); svgContenedor.innerHTML = ''; mapaContenedor.querySelectorAll('.nodo').forEach(n => n.remove());
    principalNodeId = null; centralNodes = []; nodosData = []; lineasVinculo = []; nodoPadreActivoId = null; elementoArrastrado = null;
    nextId = 0; accionInputArchivo = null;
    botonAddPrincipal.disabled = false; botonAddSecundario.disabled = true; botonAnadirRecuerdo.disabled = true;
    botonAnadirRecuerdo.textContent = "Añadir Recuerdo"; console.log("Mapa inicializado.");
}
function detenerAnimacion() {  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } }
function reiniciarAplicacion() { console.log("Reiniciando aplicación..."); detenerAnimacion(); inicializarMapa(); tiempoInicio = performance.now(); animar(); }


window.addEventListener('load', () => {
    console.log("Ventana cargada. Configurando listeners...");
   
    if (!mapaContenedor || !svgContenedor || !botonAddPrincipal || !botonAddSecundario || !botonAnadirRecuerdo || !inputImagen || !botonExportar || !botonImportar || !inputImportar) {
        console.error("Faltan elementos esenciales en el DOM (incluyendo exportar/importar)."); return;
    }
    reiniciarAplicacion();
    
    botonAddPrincipal.addEventListener('click', iniciarAnadirNodoPrincipal);
    botonAddSecundario.addEventListener('click', iniciarAnadirNodoSecundario);
    botonAnadirRecuerdo.addEventListener('click', iniciarAnadirRecuerdo);
    inputImagen.addEventListener('change', manejarSeleccionArchivo);
    
    
    botonExportar.addEventListener('click', exportarDatos);
    botonImportar.addEventListener('click', iniciarImportarDatos);
    inputImportar.addEventListener('change', manejarArchivoImportacion);

    console.log("Listeners configurados.");
});
window.addEventListener('resize', () => { rectMapaCache = mapaContenedor.getBoundingClientRect(); });
