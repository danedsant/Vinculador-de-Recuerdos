// --- Configuración ---
const AMPLITUD_ONDULACION = 15; // Píxeles de movimiento lateral máximo
const VELOCIDAD_ONDULACION = 0.002; // Qué tan rápido ondulan
const NUM_PUNTOS_CONTROL = 1; // 1 para curva cuadrática (más simple), 2 para cúbica

// --- Elementos del DOM ---
const mapaContenedor = document.querySelector('.mapa-mental');
const nodoCentral = mapaContenedor.querySelector('.nodo-central');
const nodosRecuerdo = Array.from(mapaContenedor.querySelectorAll('.nodo-recuerdo')); // Convertir a Array
const svgContenedor = document.getElementById('svg-lineas');

// --- Almacenamiento de estado ---
let nodosData = []; // Guardará info de cada nodo y su línea
let animationFrameId = null; // Para controlar el loop de animación
let tiempoInicio = performance.now();

// --- Funciones ---

/** Obtiene las coordenadas del centro de un elemento relativas al contenedor del mapa */
function getCentroRelativo(elemento, rectMapa) {
    const rectElemento = elemento.getBoundingClientRect();
    return {
        x: (rectElemento.left - rectMapa.left) + rectElemento.width / 2,
        y: (rectElemento.top - rectMapa.top) + rectElemento.height / 2
    };
}

/** Inicializa los datos de los nodos y crea los paths SVG */
function inicializarMapa() {
    const rectMapa = mapaContenedor.getBoundingClientRect();
    const centroCentral = getCentroRelativo(nodoCentral, rectMapa);
    const numNodos = nodosRecuerdo.length;
    const radioBase = Math.min(rectMapa.width, rectMapa.height) * 0.35; // Radio base para distribución

    nodosData = nodosRecuerdo.map((nodo, index) => {
        // Crear el elemento path SVG para este nodo
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('linea-tentaculo');
        svgContenedor.appendChild(path);

        // Calcular posición base circular (para el target del tentáculo)
        const anguloBase = (2 * Math.PI / numNodos) * index;
        const targetX = centroCentral.x + radioBase * Math.cos(anguloBase);
        const targetY = centroCentral.y + radioBase * Math.sin(anguloBase);

        // Devolver objeto con datos necesarios para la animación
        return {
            elemento: nodo,
            path: path,
            targetX: targetX, // Posición ideal donde termina el tentáculo
            targetY: targetY,
            anguloBase: anguloBase, // Guardar ángulo para ondulación
            offsetTiempo: Math.random() * 10000 // Desfase para que no se muevan igual
        };
    });
}

/** Actualiza la forma de un path SVG para que ondule */
function actualizarPath(data, centroCentral, tiempoActual) {
    const { path, targetX, targetY, anguloBase, offsetTiempo } = data;

    // Calcular ondulación para los puntos de control
    // Usamos el tiempo para animar y un offset para variar entre tentáculos
    const tiempoAnim = (tiempoActual + offsetTiempo) * VELOCIDAD_ONDULACION;
    const ondulacionX = Math.sin(tiempoAnim) * AMPLITUD_ONDULACION;
    // Podemos ondular el control perpendicular al ángulo base del tentáculo
    const controlOffsetX = ondulacionX * Math.sin(anguloBase);
    const controlOffsetY = -ondulacionX * Math.cos(anguloBase); // Negativo para perpendicular

    // Punto de inicio (centro del nodo central)
    const startX = centroCentral.x;
    const startY = centroCentral.y;

    // Punto final (posición target, podríamos añadirle una pequeña ondulación también)
    const endX = targetX; // + controlOffsetX * 0.2; // Pequeña ondulación en el extremo
    const endY = targetY; // + controlOffsetY * 0.2;

    // Punto(s) de control para la curva de Bézier
    // Lo colocamos a mitad de camino entre inicio y fin, y aplicamos la ondulación
    const midX = startX + (endX - startX) / 2;
    const midY = startY + (endY - startY) / 2;
    const controlX = midX + controlOffsetX;
    const controlY = midY + controlOffsetY;

    // Construir el atributo 'd' del path (usando curva cuadrática Q)
    const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;
    // Para curva cúbica (NUM_PUNTOS_CONTROL = 2):
    // const control1X = startX + (endX - startX) / 3 + controlOffsetX;
    // const control1Y = startY + (endY - startY) / 3 + controlOffsetY;
    // const control2X = startX + (endX - startX) * 2 / 3 + controlOffsetX * 0.8; // Ondulación diferente?
    // const control2Y = startY + (endY - startY) * 2 / 3 + controlOffsetY * 0.8;
    // const pathData = `M ${startX},${startY} C ${control1X},${control1Y} ${control2X},${control2Y} ${endX},${endY}`;

    path.setAttribute('d', pathData);

    // Devolver la posición final para el nodo
    return { finalX: endX, finalY: endY };
}

/** Actualiza la posición de un nodo DOM */
function actualizarPosicionNodo(nodo, finalX, finalY) {
    // Posicionamos el nodo en el punto final del path
    // Restamos la mitad del tamaño para centrar el nodo
    nodo.style.left = `${finalX - nodo.offsetWidth / 2}px`;
    nodo.style.top = `${finalY - nodo.offsetHeight / 2}px`;
}

/** Loop principal de animación */
function animar() {
    const tiempoActual = performance.now() - tiempoInicio;
    const rectMapa = mapaContenedor.getBoundingClientRect(); // Obtenerla en cada frame por si cambia
    const centroCentral = getCentroRelativo(nodoCentral, rectMapa);

    nodosData.forEach(data => {
        // Actualizar la forma del path y obtener posición final
        const { finalX, finalY } = actualizarPath(data, centroCentral, tiempoActual);
        // Actualizar la posición del nodo DOM
        actualizarPosicionNodo(data.elemento, finalX, finalY);
    });

    // Solicitar el próximo frame
    animationFrameId = requestAnimationFrame(animar);
}

/** Detiene la animación */
function detenerAnimacion() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/** Reinicia y comienza la animación (útil para resize) */
function reiniciarAnimacion() {
    detenerAnimacion();
    // Limpiar paths SVG anteriores por si acaso
    svgContenedor.innerHTML = '';
    // Reinicializar y comenzar
    inicializarMapa();
    tiempoInicio = performance.now(); // Reiniciar tiempo base
    animar();
}

// --- Ejecución ---

// Inicializar y comenzar animación cuando todo esté cargado
window.addEventListener('load', () => {
    if (!mapaContenedor || !nodoCentral || nodosRecuerdo.length === 0 || !svgContenedor) {
        console.error("Faltan elementos esenciales para el mapa mental.");
        return;
    }
    reiniciarAnimacion();
});

// Reiniciar animación en resize (con debounce)
let resizeTimeoutId = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeoutId);
    resizeTimeoutId = setTimeout(reiniciarAnimacion, 250); // Espera 250ms
});