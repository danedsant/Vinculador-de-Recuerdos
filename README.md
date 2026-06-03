# Vinculador de Recuerdos 🌌

![Estado: Deprecado](https://img.shields.io/badge/Estado-Beta-orange)
![Tecnologías: Vanilla JS | HTML | CSS](https://img.shields.io/badge/Stack-Vanilla_JS_%7C_HTML_%7C_CSS-blue)


Un lienzo interactivo y mapa diseñado para visualizar conexiones interpersonales y recuerdos de forma orgánica. Inspirado en redes neuronales, este proyecto personal permite mapear personas, ideas y momentos a través de nodos dinámicos unidos por enlaces que simulan el movimiento de tentáculos con efectos de iluminación llamativos.


 Demo Interactiva: https://memories-linker.vercel.app/

 > [!NOTE]
 > Existe una nueva version en desarrollo rediseñada completamente desde cero aboradando las deficiencias de esta version de prueba

## 🚀 Características

* **Arquitectura de Nodos Dinámicos:**
    * **Recuerdo Principal:** El núcleo del mapa, diseñado para representar a la persona central (el usuario).

    * **Recuerdos Secundarios:** Órbitas conectadas al núcleo que representan a personas cercanas, pilares de vida o gustos fundamentales.

    * **Recuerdos Específicos:** Memorias fotográficas periféricas vinculadas a los nodos principales y secundarios.

* **Físicas y Animaciones Orgánicas:** Los enlaces entre nodos no son líneas estáticas; son curvas de Bézier animadas mediante funciones trigonométricas que simulan la respiración u ondulación orgánica.
* **Sistema de Drag & Drop:** Mueve cualquier nodo libremente por el lienzo. Los enlaces orgánicos seguirán el movimiento en tiempo real.
* **Persistencia de Datos (Importar/Exportar):** Posibilidad de guardar el estado completo del lienzo (incluyendo las imágenes renderizadas en Base64 y las coordenadas) en un archivo `.json` para continuar editándolo luego o compartirlo.

* **Motor Gráfico actual:** Renderizado dinámico de rutas SVG (`<path>`) manipuladas a través de `requestAnimationFrame`.

## ⚠️ Estado Actual y Hoja de Ruta (Roadmap)

Esta versión (Beta) funciona como una prueba de concepto visual, pero actualmente presenta **cuellos de botella de rendimiento** al escalar. 

**Problemas conocidos a solucionar en próximas versiones:**
* **Refactorización de Motor de Renderizado:** La manipulación intensiva del DOM mediante SVG causa caídas de fotogramas (FPS) cuando hay demasiados enlaces en pantalla. Está planificada una migración completa a **HTML5 Canvas** para mejorar drásticamente el rendimiento computacional.

* **Optimización de Almacenamiento:** El sistema de exportación actual codifica las imágenes en Base64 dentro del JSON. Se evaluarán métodos de almacenamiento local comprimido para evitar que los archivos de guardado crezcan desproporcionadamente.

* **Diseño Responsivo:** Actualmente el mapa depende de coordenadas absolutas, lo que puede causar desbordamientos en resoluciones de pantalla más pequeñas. Se implementará un sistema de coordenadas relativas o cámara paneable.

## 📥 Cómo usar

1. Ingresa al link -> https://memories-linker.vercel.app/

3. Comienza haciendo clic en **Añadir Recuerdo Principal** para establecer el centro de tu mapa.
4. Explora las conexiones añadiendo nodos secundarios y arrastrándolos por el espacio.