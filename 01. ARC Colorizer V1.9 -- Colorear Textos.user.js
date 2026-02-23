// ==UserScript==
// @name         01. ARC Colorizer | V1.9 - Colorear Textos
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Colorear Estados en ARC | Estavos VBox + Detalles + Órgano de Prueba + Tipo + SI
// @author       AL
// @match        https://sc.vistes.justicia.intranet.gencat.cat/*
// @run-at       document-end
// @grant        none
// ==/UserScript==


/*
==========================================================
  01. ARC Colorizer | V1.9 - Colorear Textos
==========================================================

DESCRIPCIÓN:
Este UserScript colorea y anima textos dentro del entorno ARC.
Actúa sobre:

- Estados generales (VBox + Session)
- Señal institucional VBox
- Bloque específico "Órgano de Prueba"
- Tipos concretos dentro del bloque
- Elementos dinámicos recargados vía MutationObserver

Permite aplicar:
- Color
- Negrita
- Parpadeo (blink)
- Efecto Glow

El script está preparado para ampliaciones futuras mediante
objetos configurables y selectores específicos.

----------------------------------------------------------
ÍNDICE DE BLOQUES Y ESTRUCTURA INTERNA
----------------------------------------------------------

1. ESTILOS Y ANIMACIONES
   - @keyframes arcBlink
   - @keyframes arcGlow
   - Clases:
       .arc-blink
       .arc-glow

2. ESTADOS GENERALES
   - VBox States
   - Session States
   - Señal Institucional
   - Configuración por objeto:
       { color, bold, blink, glow }

3. BLOQUE ÓRGANO DE PRUEBA (ESPECÍFICO)
   - Configuración por texto clave
   - Selector CSS asociado
   - Propiedades:
       { selector, color, bold, glow }
   - Preparado para ampliar con nuevas entradas

4. NORMALIZADOR
   - Normalizar(texto)
   - Conversión a minúsculas
   - Limpieza de espacios
   - Comparación robusta mediante includes()

5. PROCESADO DE ESTADOS
   - QuerySelector múltiple:
       zona-lineadatos
       celdaRegistro
       celdaRegistroLinea
       ARC_textoValor
   - Aplicación dinámica de estilos
   - Toggle inteligente de clases animadas

6. PROCESADO BLOQUE ÓRGANO
   - Búsqueda por selector específico
   - Aplicación selectiva de color y efectos
   - No interfiere con estados generales

7. OBSERVER DINÁMICO
   - MutationObserver sobre document.body
   - Reaplicación automática tras recargas internas
   - Debounce con setTimeout (250ms)

----------------------------------------------------------
NOTAS GENERALES
----------------------------------------------------------

- La coincidencia se realiza por texto parcial (includes).
- El sistema está preparado para:
    - Añadir nuevos estados fácilmente.
    - Añadir nuevos bloques específicos.
    - Separar en el futuro Includes independientes.
- No modifica estructura DOM, solo estilos.
- No interfiere con eventos internos de ARC.

==========================================================
*/

(function() {
    'use strict';

    //-------------------------------------------------------------
    // ESTILOS ANIMACIONES
    //-------------------------------------------------------------
    const style = document.createElement("style");
    style.textContent = `

        @keyframes arcBlink {
              0% { opacity: 1; }
             50% { opacity: 0.35; }
            100% { opacity: 1; }
        }
        .arc-blink { animation: arcBlink 1.5s infinite; }

        @keyframes arcGlow {
            0%   { text-shadow: 0 0 4px currentColor; }
            50%  { text-shadow: 0 0 12px currentColor; }
            100% { text-shadow: 0 0 4px currentColor; }
        }
        .arc-glow {
            animation: arcGlow 1.8s infinite ease-in-out;
        }

    `;
    document.head.appendChild(style);

    //-------------------------------------------------------------
    // 01 - ESTADOS GENERALES
    //-------------------------------------------------------------
    const estados = {

		//-------------------------------------------------------------
		//  						VBox States
		//-------------------------------------------------------------
        'Ocupada Grabando':              { color: 'green',		bold: false, blink: true },
        'Ocupada Gravant':               { color: 'green',		bold: false, blink: true },
        'Ocupada parada estado erroneo': { color: 'red',		bold: false },
        'Ocupada parada':                { color: 'orange' },

        //-------------------------------------------------------------
        //  					  Session States
        //-------------------------------------------------------------
        'En Hora':        				{ color: 'orange'},
        'En Curso':       				{ color: 'red', 		bold: true, blink: true, glow: false }, //  Green Lime #09ff09 | 🔥 ahora Glow en vez de Blink
        'Finalizada':     				{ color: 'SpringGreen', bold: false },
        'Suspendida':     				{ color: 'blue' },
        'Anulada':        				{ color: 'SandyBrown',	bold: false },
        'Retrasada':   		   			{ color: 'violet' },
        'No celebrada':   				{ color: 'violet' },

        //-------------------------------------------------------------
        //  				VBox Senyal Institucional
        //-------------------------------------------------------------
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'},
        'En Hora':        				{ color: 'orange'}

    };

    //-------------------------------------------------------------
    // 02 - BLOQUE ÓRGANO DE PRUEBA (ESPECÍFICO)
    // Preparado para ampliar
    //-------------------------------------------------------------
    const bloqueOrgano = {

        'Órgano de Prueba': {
            selector: '.titIdenWeb_A, .titIdenWeb_B', 	color: 'orange', bold: false },

        'Apremio': {
            selector: '.txt2IdenWeb_A, .txt2IdenWeb_B', color: 'green', bold: true, glow: false },

		'Exhibición de Libros': {
            selector: '.txt2IdenWeb_A, .txt2IdenWeb_B', color: 'green', bold: false, glow: false },

		'Audiencia Previa': {
			selector: '.texto1', 						color: 'blue', bold: false, glow: true },



        // 👉 03 - Añadir aquí futuras entradas colgantes
        // 'Texto Nuevo': {
		//     selector: '.txtXIdenWeb_B',  //     		color: '...',    //     bold: true    // }

    };

    //-------------------------------------------------------------
    // Normalizador
    //-------------------------------------------------------------
    function normalizar(texto) {
        return texto.toLowerCase().replace(/\s+/g, ' ').trim();
    }

    const estadosNormalizados = Object.entries(estados).map(([clave, config]) => ({
        clave: normalizar(clave),
        config
    }));

    //-------------------------------------------------------------
    // FUNCIÓN PRINCIPAL
    //-------------------------------------------------------------
    function colorearTextos() {

        //---------------------------------------------------------
        // ESTADOS GENERALES
        //---------------------------------------------------------
        const elementos = document.querySelectorAll(`
            div.zona-lineadatos div.celdaRegistro,
            div.zona-lineadatos div.celdaRegistroLinea,
            .ARC_textoValor .valorT2
        `);

        elementos.forEach(el => {

            const texto = normalizar(el.textContent);
            if (!texto) return;

            for (const estado of estadosNormalizados) {
                if (texto.includes(estado.clave)) {

                    el.style.color = estado.config.color || '';
                    el.style.fontWeight = estado.config.bold ? 'bold' : '';

                    el.classList.toggle('arc-blink', !!estado.config.blink);
                    el.classList.toggle('arc-glow', !!estado.config.glow);

                    return;
                }
            }
        });

        //---------------------------------------------------------
        // BLOQUE ÓRGANO DE PRUEBA
        //---------------------------------------------------------
        Object.entries(bloqueOrgano).forEach(([textoClave, config]) => {

            const elementosBloque = document.querySelectorAll(config.selector);

            elementosBloque.forEach(el => {

                if (normalizar(el.textContent).includes(normalizar(textoClave))) {

                    el.style.color = config.color || '';
                    el.style.fontWeight = config.bold ? 'bold' : '';

                    el.classList.toggle('arc-glow', !!config.glow);
                }
            });
        });
    }

    //-------------------------------------------------------------
    // EJECUCIÓN
    //-------------------------------------------------------------
    colorearTextos();

    const observer = new MutationObserver(() => {
        clearTimeout(window.arcTimeout);
        window.arcTimeout = setTimeout(colorearTextos, 250);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
