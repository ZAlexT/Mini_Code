// ==UserScript==
// @name         ARC - States Colorize V1.9 - Extended Blocks
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Colorear Estados en ARC | Estavos VBox + Detalles + Órgano de Prueba + Tipo + SI
// @author       AL
// @match        https://sc.vistes.justicia.intranet.gencat.cat/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

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
        'Ocupada Grabando':              { color: 'green', bold: false, blink: true },
        'Ocupada Gravant':               { color: 'green', bold: false, blink: true },
        'Ocupada parada estado erroneo': { color: 'red',   bold: false },
        'Ocupada parada':                { color: 'orange' },

        //-------------------------------------------------------------
        //  						Session States
        //-------------------------------------------------------------
        'En Hora':        				{ color: 'orange'},
        'En Curso':       				{ color: 'red', bold: true, blink: true, glow: false }, //  Green Lime #09ff09 | 🔥 ahora Glow en vez de Blink
        'Finalizada':     				{ color: 'SpringGreen', bold: false },
        'Suspendida':     				{ color: 'blue' },
        'Anulada':        				{ color: 'SandyBrown',   bold: false },
        'Retrasada':   		   			{ color: 'violet' },
        'No celebrada':   				{ color: 'violet' }
    };

    //-------------------------------------------------------------
    // 02 - BLOQUE ÓRGANO DE PRUEBA (ESPECÍFICO)
    // Preparado para ampliar
    //-------------------------------------------------------------
    const bloqueOrgano = {

        'Órgano de Prueba': {
            selector: '.titIdenWeb_A, .titIdenWeb_B', color: 'orange', bold: false },

        'Apremio': {
            selector: '.txt2IdenWeb_A, .txt2IdenWeb_B', color: 'green', bold: true, glow: false },

		'Exhibición de Libros': {
            selector: '.txt2IdenWeb_A, .txt2IdenWeb_B', color: 'green', bold: false, glow: false },

		'Audiencia Previa': {
			selector: '.texto1', color: 'blue', bold: false, glow: true },



        // 👉 03 - Añadir aquí futuras entradas colgantes
        // 'Texto Nuevo': {
		//     selector: '.txtXIdenWeb_B',  //     color: '...',    //     bold: true    // }

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
