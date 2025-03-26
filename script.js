// --- Configuración ---
const AMPLITUD_ONDULACION = 15;
const VELOCIDAD_ONDULACION = 0.002;

// --- Elementos del DOM ---
const mapaContenedor = document.querySelector('.mapa-mental');
const nodoCentral = mapaContenedor.querySelector('.nodo-central');
const svgContenedor = document.getElementById('svg-lineas');
const botonAnadir = document.getElementById('boton-anadir');
const inputImagen = document.getElementById('input-imagen');

// --- Almacenamiento de estado ---
let nodosData = []; // Guarda info { elemento, path, targetX, targetY, anguloBase, offsetTiempo }
let animationFrameId = null;
let tiempoInicio = performance.now();
let elementoArrastrado = null; // Qué nodo se está arrastrando
let offsetX = 0; // Offset del mouse dentro del nodo arrastrado
let offsetY = 0;
let rectMapaCache = null; // Cachear las dimensiones del contenedor

// --- Funciones ---

/** Obtiene las coordenadas del centro de un elemento relativas al contenedor del mapa */
function getCentroRelativo(elemento, rectMapa) {
    if (!elemento || !rectMapa) return { x: 0, y: 0 }; // Protección
    const rectElemento = elemento.getBoundingClientRect();
    return {
        x: (rectElemento.left - rectMapa.left) + rectElemento.width / 2,
        y: (rectElemento.top - rectMapa.top) + rectElemento.height / 2
    };
}

/** Actualiza la forma de un path SVG para que ondule hacia su target */
function actualizarPath(data, centroCentral, tiempoActual) {
    // Si no hay path o target, no hacer nada (puede pasar al añadir nodo)
    if (!data.path || typeof data.targetX === 'undefined') return { finalX: 0, finalY: 0 };

    const { path, targetX, targetY, offsetTiempo } = data;
    const startX = centroCentral.x;
    const startY = centroCentral.y;
    const endX = targetX;
    const endY = targetY;

    // Calcular ángulo base dinámicamente (aproximado)
    const anguloBase = Math.atan2(endY - startY, endX - startX);

    const tiempoAnim = (tiempoActual + offsetTiempo) * VELOCIDAD_ONDULACION;
    const ondulacion = Math.sin(tiempoAnim) * AMPLITUD_ONDULACION;
    const controlOffsetX = ondulacion * Math.sin(anguloBase); // Perpendicular
    const controlOffsetY = -ondulacion * Math.cos(anguloBase);

    const midX = startX + (endX - startX) / 2;
    const midY = startY + (endY - startY) / 2;
    const controlX = midX + controlOffsetX;
    const controlY = midY + controlOffsetY;

    const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
    path.setAttribute('d', pathData);

    return { finalX: endX, finalY: endY };
}

/** Actualiza la posición de un nodo DOM (si no se está arrastrando) */
function actualizarPosicionNodo(nodoData) {
    // Solo actualiza si el nodo no está siendo arrastrado por el usuario
    if (nodoData.elemento !== elementoArrastrado) {
        // Necesitamos la posición final calculada por actualizarPath
        // Se la pasaremos en el loop de animación
    }
}

/** Loop principal de animación */
function animar() {
    const tiempoActual = performance.now() - tiempoInicio;
    rectMapaCache = mapaContenedor.getBoundingClientRect(); // Actualizar cache
    const centroCentral = getCentroRelativo(nodoCentral, rectMapaCache);

    nodosData.forEach(data => {
        // Actualizar la forma del path y obtener posición final teórica
        const { finalX, finalY } = actualizarPath(data, centroCentral, tiempoActual);

        // Actualizar posición del nodo DOM si no se está arrastrando
        if (data.elemento !== elementoArrastrado) {
            // Centrar el nodo en la posición final del path
            data.elemento.style.left = `${finalX - data.elemento.offsetWidth / 2}px`;
            data.elemento.style.top = `${finalY - data.elemento.offsetHeight / 2}px`;
        }
    });

    animationFrameId = requestAnimationFrame(animar);
}

// --- Funciones de Arrastrar ---

function iniciarArrastre(evento) {
    // Solo arrastrar con el botón izquierdo
    if (evento.button !== 0) return;

    elementoArrastrado = evento.currentTarget; // El nodo donde se hizo mousedown
    rectMapaCache = mapaContenedor.getBoundingClientRect(); // Asegurar cache actualizado

    // Calcular offset del mouse respecto a la esquina superior izquierda del nodo
    const rectNodo = elementoArrastrado.getBoundingClientRect();
    offsetX = evento.clientX - rectNodo.left;
    offsetY = evento.clientY - rectNodo.top;

    // Poner el nodo arrastrado encima temporalmente
    elementoArrastrado.style.zIndex = '50';
    elementoArrastrado.style.cursor = 'grabbing'; // Cambiar cursor

    // Añadir listeners globales para mover y soltar
    window.addEventListener('mousemove', arrastrar);
    window.addEventListener('mouseup', detenerArrastre);
    window.addEventListener('mouseleave', detenerArrastre); // Por si sale de la ventana

    evento.preventDefault(); // Prevenir selección de texto
}

function arrastrar(evento) {
    if (!elementoArrastrado) return;

    // Calcular nueva posición del nodo (esquina superior izquierda) relativa al contenedor
    let nuevaPosX = evento.clientX - rectMapaCache.left - offsetX;
    let nuevaPosY = evento.clientY - rectMapaCache.top - offsetY;

    // Opcional: Limitar el arrastre dentro del contenedor .mapa-mental
    // nuevaPosX = Math.max(0, Math.min(nuevaPosX, rectMapaCache.width - elementoArrastrado.offsetWidth));
    // nuevaPosY = Math.max(0, Math.min(nuevaPosY, rectMapaCache.height - elementoArrastrado.offsetHeight));

    // Aplicar nueva posición al estilo del nodo
    elementoArrastrado.style.left = `${nuevaPosX}px`;
    elementoArrastrado.style.top = `${nuevaPosY}px`;

    // *** ACTUALIZAR EL TARGET para la línea SVG ***
    // Encontrar los datos correspondientes al nodo arrastrado
    const dataNodoArrastrado = nodosData.find(d => d.elemento === elementoArrastrado);
    if (dataNodoArrastrado) {
        // El target es el CENTRO del nodo en su nueva posición
        dataNodoArrastrado.targetX = nuevaPosX + elementoArrastrado.offsetWidth / 2;
        dataNodoArrastrado.targetY = nuevaPosY + elementoArrastrado.offsetHeight / 2;
    }
}

function detenerArrastre() {
    if (!elementoArrastrado) return;

    // Restaurar z-index y cursor
    elementoArrastrado.style.zIndex = '5'; // Volver a z-index normal
    elementoArrastrado.style.cursor = 'pointer';

    // Quitar listeners globales
    window.removeEventListener('mousemove', arrastrar);
    window.removeEventListener('mouseup', detenerArrastre);
    window.removeEventListener('mouseleave', detenerArrastre);

    // Marcar que ya no se arrastra nada
    elementoArrastrado = null;
}

// --- Funciones de Añadir Nodo ---

function clickInputArchivo() {
    inputImagen.click(); // Simular clic en el input oculto
}

function manejarSeleccionArchivo(evento) {
    const archivo = evento.target.files[0];
    if (!archivo || !archivo.type.startsWith('image/')) {
        console.warn("Por favor, selecciona un archivo de imagen.");
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const imagenDataUrl = e.target.result;
        crearNuevoNodoRecuerdo(imagenDataUrl);
    };

    reader.onerror = () => {
        console.error("Error al leer el archivo.");
    };

    reader.readAsDataURL(archivo);

    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    evento.target.value = null;
}

function crearNuevoNodoRecuerdo(imagenSrc) {
    // 1. Crear elementos DOM
    const nuevoNodo = document.createElement('div');
    nuevoNodo.classList.add('nodo-recuerdo');

    const img = document.createElement('img');
    img.src = imagenSrc;
    img.alt = "Nuevo Recuerdo"; // Podrías pedir un nombre al usuario

    const tooltip = document.createElement('span');
    tooltip.classList.add('tooltip');
    tooltip.textContent = "Nuevo Recuerdo"; // Texto inicial

    nuevoNodo.appendChild(img);
    nuevoNodo.appendChild(tooltip);

    // 2. Añadir nodo al DOM (en una posición inicial temporal)
    // Colocarlo cerca del centro para que el tentáculo se dibuje desde ahí
    rectMapaCache = mapaContenedor.getBoundingClientRect(); // Actualizar cache
    const centroCentral = getCentroRelativo(nodoCentral, rectMapaCache);
    const offsetInicial = 50; // Píxeles desde el centro
    const anguloInicial = Math.random() * 2 * Math.PI; // Ángulo aleatorio
    let posXInicial = centroCentral.x + offsetInicial * Math.cos(anguloInicial);
    let posYInicial = centroCentral.y + offsetInicial * Math.sin(anguloInicial);

    // Ajustar para la esquina superior izquierda (aproximado inicialmente)
    posXInicial -= 45; // Mitad del ancho aprox. del nodo
    posYInicial -= 45; // Mitad del alto aprox. del nodo

    nuevoNodo.style.left = `${posXInicial}px`;
    nuevoNodo.style.top = `${posYInicial}px`;

    mapaContenedor.appendChild(nuevoNodo);

    // 3. Crear Path SVG
    const nuevoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nuevoPath.classList.add('linea-tentaculo');
    svgContenedor.appendChild(nuevoPath);

    // 4. Añadir Listener para Arrastrar al nuevo nodo
    nuevoNodo.addEventListener('mousedown', iniciarArrastre);

    // 5. Añadir a nodosData
    const nuevaData = {
        elemento: nuevoNodo,
        path: nuevoPath,
        // Target inicial es el centro de su posición inicial
        targetX: posXInicial + nuevoNodo.offsetWidth / 2, // Usar tamaño real si ya está en DOM
        targetY: posYInicial + nuevoNodo.offsetHeight / 2,
        anguloBase: anguloInicial, // Guardar ángulo para posible uso
        offsetTiempo: Math.random() * 10000
    };
    nodosData.push(nuevaData);

    // Podríamos querer redistribuir todos los nodos aquí, o dejar que el usuario lo mueva
    // redistribuirNodos(); // Opcional: Llama a una función que recalcule targets
}

// --- Inicialización y Arranque ---

function inicializarMapa() {
    // Limpiar estado previo
    svgContenedor.innerHTML = ''; // Limpiar SVG
    nodosData = []; // Limpiar array de datos

    // Obtener nodos iniciales del HTML
    const nodosHtml = mapaContenedor.querySelectorAll('.nodo-recuerdo');
    rectMapaCache = mapaContenedor.getBoundingClientRect();
    const centroCentral = getCentroRelativo(nodoCentral, rectMapaCache);
    const numNodos = nodosHtml.length;
    const radioBase = Math.min(rectMapaCache.width, rectMapaCache.height) * 0.35;

    nodosHtml.forEach((nodo, index) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('linea-tentaculo');
        svgContenedor.appendChild(path);

        const anguloBase = (2 * Math.PI / numNodos) * index;
        const targetX = centroCentral.x + radioBase * Math.cos(anguloBase);
        const targetY = centroCentral.y + radioBase * Math.sin(anguloBase);

        // Añadir listener para arrastrar
        nodo.addEventListener('mousedown', iniciarArrastre);

        nodosData.push({
            elemento: nodo,
            path: path,
            targetX: targetX,
            targetY: targetY,
            anguloBase: anguloBase,
            offsetTiempo: Math.random() * 10000
        });
    });
}

function detenerAnimacion() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function reiniciarAnimacion() {
    detenerAnimacion();
    inicializarMapa(); // Re-lee nodos HTML y crea paths/datos iniciales
    tiempoInicio = performance.now();
    animar(); // Comienza el loop
}

// --- Event Listeners ---
window.addEventListener('load', () => {
    if (!mapaContenedor || !nodoCentral || !svgContenedor || !botonAnadir || !inputImagen) {
        console.error("Faltan elementos esenciales.");
        return;
    }
    reiniciarAnimacion(); // Iniciar todo

    // Listeners para añadir nodo
    botonAnadir.addEventListener('click', clickInputArchivo);
    inputImagen.addEventListener('change', manejarSeleccionArchivo);
});

let resizeTimeoutId = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeoutId);
    // Esperar antes de reiniciar en resize para recalcular posiciones base
    resizeTimeoutId = setTimeout(reiniciarAnimacion, 250);
});