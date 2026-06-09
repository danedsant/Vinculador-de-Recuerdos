# Starry Memories - Mapa de Recuerdos 🌌

![Estado: Beta](https://img.shields.io/badge/Estado-Beta-orange)
![Tecnologías: Vanilla JS | HTML | CSS](https://img.shields.io/badge/Stack-Vanilla_JS_%7C_HTML_%7C_CSS-blue)


Un lienzo interactivo y mapa diseñado para visualizar conexiones interpersonales y recuerdos de forma orgánica. Inspirado en las constelaciones, este proyecto personal permite vincular personas y momentos emotivos a través de nodos unidos por lineas que simulan el movimiento de tentáculos con efectos de iluminación llamativos.


 Demo Interactiva: https://memories-linker.vercel.app/

 > [!NOTE]
 > Existe una nueva version en desarrollo rediseñada completamente desde cero aboradando las deficiencias de esta version de prueba

## 🚀 Características

* **Arquitectura de Nodos Dinámicos:**
    * **Recuerdo Principal:** El núcleo del mapa, diseñado para representar a la persona central (el usuario).

    * **Recuerdos Secundarios:** Órbitas conectadas al núcleo que representan a personas cercanas, pilares de vida o gustos fundamentales.

    * **Recuerdos Específicos:** Memorias fotográficas vinculadas a los nodos principales y secundarios.

* **Físicas y Animaciones Orgánicas:** Los enlaces entre nodos no son líneas estáticas; son curvas de Bézier animadas mediante funciones trigonométricas que simulan la respiración u ondulación orgánica.
* **Sistema de Drag & Drop:** Mueve cualquier nodo libremente por el lienzo. Los enlaces orgánicos seguirán el movimiento en tiempo real.
* **Persistencia de Datos (Importar/Exportar):** Posibilidad de guardar el estado completo del lienzo en un archivo `.json` para continuar editándolo luego o compartirlo.

* **Motor Gráfico actual:** Renderizado dinámico de rutas SVG (`<path>`) manipuladas a través de `requestAnimationFrame`.

## 📥 Cómo usar

1. Ingresa al link -> https://memories-linker.vercel.app/

3. Comienza haciendo clic en **Añadir Recuerdo Principal** para establecer el centro de tu mapa.
4. Explora las conexiones añadiendo nodos secundarios y arrastrándolos por el espacio.

## ⚠️ Problemas conocidos

Esta versión (Beta) funciona como una prueba de concepto visual, pero actualmente presenta **cuellos de botella de rendimiento** al escalar. 

* **Refactorización de Motor de Renderizado:** La manipulación intensiva del DOM mediante SVG causa caídas de fotogramas (FPS) cuando hay demasiados enlaces en pantalla. Está planificada una migración completa a **HTML5 Canvas** para mejorar drásticamente el rendimiento computacional.

* **Optimización de Almacenamiento:** El sistema de exportación actual codifica las imágenes en Base64 dentro del JSON. Se evaluarán métodos de almacenamiento local comprimido para evitar que los archivos de guardado crezcan desproporcionadamente.

* ~~**Diseño Responsivo:** Actualmente el mapa depende de coordenadas absolutas, lo que puede causar desbordamientos en resoluciones de pantalla más pequeñas. Se implementará un sistema de coordenadas relativas o cámara paneable.~~ (corregido)

## Roadmap para futuras versiones


* **Migración a HTML5 Canvas / WebGL:** Se reemplazará el renderizado SVG por una capa de dibujo en Canvas para delegar los cálculos de iluminación y enlaces a la GPU, asegurando 60 FPS estables.

* ~~**Sistema de Coordenadas Relativas:** Implementación de una cámara virtual paneable, sustituyendo el actual sistema de posicionamiento absoluto para garantizar la responsividad en cualquier dispositivo.~~ 

* **Capa de Dominio:** Clases abstractas puras para la lógica de negocio (`Nodo`, `NodoPrincipal`, `Enlace`).

* **Capa de Presentación:** Desacoplamiento total de la UI y el motor gráfico utilizando el patrón Observer.

* **Capa de Infraestructura:** Servicios dedicados a la comunicación externa y la persistencia.

* **API RESTful:** Desarrollo de servicios para la autenticación sin estado (JWT) y la gestión de grafos relacionales. Esto aprovechará despliegues modernos mediante plataformas en la nube (ej. Vercel o AWS).

* *Base de Datos:** Almacenamiento eficiente de metadatos (coordenadas, jerarquías de nodos, colores) separando estrictamente la información de los archivos multimedia.

* **Compresión en el Cliente:** Uso de la API Canvas para redimensionar y comprimir las imágenes en el navegador antes de cualquier transmisión de red.

* **Integración de un Object Storage:** Las imágenes físicas se delegarán a un servicio de almacenamiento especializado mediante *Presigned URLs*. La base de datos únicamente referenciará las URLs optimizadas servidas a través de un CDN, eliminando la carga de archivos masivos en el servidor principal.

## Changelog

### v1 -  Mar 26, 2025
* Añadido Version Inicial
* Detectados cuellos de botellas en la manipulacion de SVG
* Detectados Bug de Posicionamiento
* 💔
### v1.2 - Jun 6, 2026
* Implementado acceso detalles de nodos en web y vista movil 
* Implementado sistema de paneo
* Implementado borrado de nodos
* Implementado edicion de nombres de nodos
* Implementado color unico para vinculos entre nodo principal y secundario, quedando inutilizable como color para nodos de momentos
* Mejoras de UI
* Implementado fondo de estrellas con animacion leve pulsante 
* Implementado Eliminacion en cascada de nodos asociados a nodo padre
* Reemplazados alertas y confirmaciones por modales con estilos propios
---
* Mejora en la vista de moviles
* Reduccion menor en detalles visuales en vista movil para reducir carga grafica
* Implementado arrastre de nodos en moviles
