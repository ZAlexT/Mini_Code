// ==UserScript==
// @name         02.A ATOM Tooltip - Remove IFRAME Background V1.0.006
// @namespace    http://tampermonkey.net/
// @version      1.0.006
// @description  ATOM Tooltip | Remove IFRAME Background
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';


    // =============================================================
    // CONFIGURACIÓN
    // =============================================================

    const COLOR_FONDO = '#252525';


    // =============================================================
    // BLOQUEO PREVIO DE LOS PNG
    //
    // Se inserta inmediatamente al cargar el script.
    // =============================================================

    const style = document.createElement('style');

    style.textContent = `
        [style*="SmallTooltip3.png"],
        [style*="WorkOrderSubmitterTooltip.png"] {
            background-image: none !important;
            background-color: ${COLOR_FONDO} !important;
        }
    `;

    function insertarCSS() {

        if (document.head) {

            document.head.appendChild(style);

        } else {

            setTimeout(
                insertarCSS,
                0
            );
        }
    }

    insertarCSS();


    // =============================================================
    // APLICAR FONDO AL CONTENIDO DEL IFRAME
    // =============================================================

    function aplicarFondoIframe(iframe) {

        try {

            const doc = iframe.contentDocument;

            if (!doc || !doc.body)
                return false;


            // Fondo general del documento

            doc.documentElement.style.setProperty(
                'background',
                COLOR_FONDO,
                'important'
            );

            doc.documentElement.style.setProperty(
                'background-color',
                COLOR_FONDO,
                'important'
            );

            doc.body.style.setProperty(
                'background',
                COLOR_FONDO,
                'important'
            );

            doc.body.style.setProperty(
                'background-color',
                COLOR_FONDO,
                'important'
            );


            // Eliminar cualquier imagen de fondo
            // aplicada mediante style inline.

            doc.querySelectorAll('[style*="background-image"]')
                .forEach(el => {

                    el.style.setProperty(
                        'background-image',
                        'none',
                        'important'
                    );

                    el.style.setProperty(
                        'background-color',
                        COLOR_FONDO,
                        'important'
                    );
                });


            return true;

        } catch (e) {

            return false;
        }
    }


    // =============================================================
    // PROCESAR TOOLTIP ACTUAL
    // =============================================================

    function procesarTooltip() {

        const tooltip = document.querySelector(
            '#artooltip.divToolTipHtml'
        );

        if (!tooltip)
            return;


        const iframe = tooltip.querySelector(
            'iframe[name="DOCFRM1"]'
        );

        if (!iframe)
            return;


        aplicarFondoIframe(iframe);
    }


    // =============================================================
    // OBSERVER
    //
    // Detecta la creación y modificación del tooltip.
    // =============================================================

    const observer = new MutationObserver(() => {

        procesarTooltip();

    });


    function iniciarObserver() {

        if (!document.documentElement) {

            setTimeout(
                iniciarObserver,
                10
            );

            return;
        }


        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );


        procesarTooltip();
    }


    iniciarObserver();


    // =============================================================
    // REFUERZO
    //
    // ATOM puede crear primero un IFRAME vacío y escribir su
    // contenido posteriormente.
    // =============================================================

    setInterval(
        procesarTooltip,
        100
    );


})();