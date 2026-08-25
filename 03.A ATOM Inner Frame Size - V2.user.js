// ==UserScript==
// @name         03.A ATOM Inner Frame Size | V2
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Ajusta el ancho de los marcos superior e inferior de ATOM
// @match        https://atomgencat.onbmc.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const ANCHO_SUPERIOR = 970;
    const ANCHO_INFERIOR = 500;


    // =========================================================
    // PARTE SUPERIOR
    // =========================================================

    function aplicarSuperior() {

        const pageHolder =
            document.querySelector('#WIN_3_304195600');

        if (!pageHolder) {
            return false;
        }

        // PageHolder principal
        pageHolder.style.width =
            `${ANCHO_SUPERIOR}px`;


        // Fieldset contenedor
        const fieldset =
            pageHolder.closest('fieldset.PageBodyVertical');

        if (fieldset) {
            fieldset.style.width =
                `${ANCHO_SUPERIOR}px`;
        }

        console.log(
            `[ATOM Size] Superior: ${ANCHO_SUPERIOR}px`
        );

        return true;
    }


    // =========================================================
    // PARTE INFERIOR
    // =========================================================

    function aplicarInferior() {

        const pageHolder =
            document.querySelector('#WIN_3_304255200');

        if (!pageHolder) {
            return false;
        }

        // PageHolder principal
        pageHolder.style.width =
            `${ANCHO_INFERIOR}px`;


        // Contenedor interior
        const fixedCH = pageHolder.querySelector(
            '.PageHolderStackViewFixedCH'
        );

        if (fixedCH) {
            fixedCH.style.width =
                `${ANCHO_INFERIOR}px`;
        }


        // Fieldset exterior
        const fieldsetVertical =
            pageHolder.closest('fieldset.PageBodyVertical');

        if (fieldsetVertical) {
            fieldsetVertical.style.width =
                `${ANCHO_INFERIOR}px`;
        }


        // Panel interno
        const panel = pageHolder.querySelector(
            '.StackPanel[arid="304255210"]'
        );

        if (panel) {

            panel.setAttribute(
                'arinitsize',
                ANCHO_INFERIOR
            );

            panel.setAttribute(
                'arminsize',
                ANCHO_INFERIOR
            );

            panel.setAttribute(
                'armaxsize',
                ANCHO_INFERIOR
            );

        }


        // Fieldset interno
        const fieldsetHorizontal = pageHolder.querySelector(
            'fieldset.PageBodyHorizontal'
        );

        if (fieldsetHorizontal) {

            fieldsetHorizontal.style.width =
                `${ANCHO_INFERIOR}px`;

        }


        console.log(
            `[ATOM Size] Inferior: ${ANCHO_INFERIOR}px`
        );

        return true;
    }


    // =========================================================
    // ESPERAR A HELIX
    // =========================================================

    const espera = setInterval(() => {

        const superior = aplicarSuperior();
        const inferior = aplicarInferior();

        if (superior && inferior) {

            clearInterval(espera);

        }

    }, 500);


    // =========================================================
    // VIGILAR CAMBIOS DE HELIX
    // =========================================================

    setInterval(() => {

        aplicarSuperior();
        aplicarInferior();

    }, 1000);

})();