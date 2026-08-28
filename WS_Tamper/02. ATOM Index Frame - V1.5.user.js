// ==UserScript==
// @name         02. ATOM Index Frame | V1.5
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Ajusta los tamaños de BaseTable y marco exterior
// @author       AL
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {

    // ==================================================
    // AJUSTES
    // ==================================================

    // ---------- 01. MARCO INDEX ----------
    const CONTAINER_WIDTH  = 700;
    const CONTAINER_HEIGHT = 700;

    // ---------- 02. BASE TABLE ----------
    const WIDTH     = 550; // Ancho
    const HEIGHT    = 204; // Alto
    const MAX_WIDTH = 550; // Barra Superior
    const HDR_WIDTH = 540; // Botones Barra Superior

    // ---------- 03. MARCO INC ----------
    const INC_WIDTH  = 1070;
    const INC_HEIGHT = 744;

    // ---------- 04. DETAILS INC ----------
    const DETAILS_WIDTH  = 1070;
    const DETAILS_HEIGHT = 659;



    // ==================================================
    // APLICAR
    // ==================================================

    function aplicar() {

        const baseTable = document.querySelector("table.BaseTable");

        if (!baseTable) {
            setTimeout(aplicar, 500);
            return;
        }

        const baseInner = baseTable.parentElement;
        const baseOuter = baseInner?.parentElement;
        const tableInner = baseOuter?.parentElement;


        // ==================================================
        // DETECTAR INDEX / INC
        // ==================================================

        const details = document.querySelector(
            ".ardbnz2PLH_Details.arfid304196100.PageHolder"
        );

        const esINC = !!details;


        // ==================================================
        // 1. BASETABLE
        // ==================================================

        if (baseInner) {
            baseInner.style.setProperty(
                "width",
                `${WIDTH}px`,
                "important"
            );

            baseInner.style.setProperty(
                "max-width",
                `${WIDTH}px`,
                "important"
            );

            baseInner.style.setProperty(
                "height",
                `${HEIGHT}px`,
                "important"
            );

            baseInner.style.setProperty(
                "max-height",
                `${HEIGHT}px`,
                "important"
            );
        }


        if (baseOuter) {
            baseOuter.style.setProperty(
                "width",
                `${WIDTH}px`,
                "important"
            );

            baseOuter.style.setProperty(
                "max-width",
                `${WIDTH}px`,
                "important"
            );

            baseOuter.style.setProperty(
                "height",
                `${HEIGHT}px`,
                "important"
            );

            baseOuter.style.setProperty(
                "max-height",
                `${HEIGHT}px`,
                "important"
            );
        }


        if (tableInner) {
            tableInner.style.setProperty(
                "width",
                `${WIDTH}px`,
                "important"
            );

            tableInner.style.setProperty(
                "max-width",
                `${WIDTH}px`,
                "important"
            );

            tableInner.style.setProperty(
                "height",
                `${HEIGHT}px`,
                "important"
            );

            tableInner.style.setProperty(
                "max-height",
                `${HEIGHT}px`,
                "important"
            );
        }


        // ==================================================
        // 2. TABLE HDR
        // ==================================================

        const tableHdr = tableInner
            ? tableInner.parentElement?.querySelector("table.TableHdr")
            : null;

        if (tableHdr) {

            tableHdr.style.setProperty(
                "width",
                `${HDR_WIDTH}px`,
                "important"
            );

            tableHdr.style.setProperty(
                "max-width",
                `${HDR_WIDTH}px`,
                "important"
            );
        }


        // ==================================================
        // 3. CONTENEDOR AR
        // ==================================================

        const arContainer = document.querySelector(
            ".arfid301444200.ardbnz2TH_ConsolidateTable1"
        );

        if (arContainer) {

            arContainer.style.setProperty(
                "width",
                `${MAX_WIDTH}px`,
                "important"
            );

            arContainer.style.setProperty(
                "max-width",
                `${MAX_WIDTH}px`,
                "important"
            );
        }


        // ==================================================
        // 4. MARCOS PRINCIPALES
        // ==================================================

        const main = document.querySelector(
            ".ardbnz2PLH_Main.arfid303610200.PageHolder"
        );

        const home = document.querySelector(
            ".ardbnz2PLH_HomePageContent.arfid304059100.PageHolder"
        );

        const panelHolder = document.querySelector(
            ".ardbnPanelHolder.arfid80100.PageHolder"
        );

        const formContainer = document.querySelector(
            ".ardbnPanelHolder.arfid80100 .FormContainer"
        );


        // ==================================================
        // INDEX
        // ==================================================

        if (!esINC) {

            if (main) {
                main.style.setProperty(
                    "width",
                    `${CONTAINER_WIDTH}px`,
                    "important"
                );

                main.style.setProperty(
                    "max-width",
                    `${CONTAINER_WIDTH}px`,
                    "important"
                );

                main.style.setProperty(
                    "height",
                    `${CONTAINER_HEIGHT}px`,
                    "important"
                );

                main.style.setProperty(
                    "max-height",
                    `${CONTAINER_HEIGHT}px`,
                    "important"
                );
            }


            if (home) {
                home.style.setProperty(
                    "width",
                    `${CONTAINER_WIDTH}px`,
                    "important"
                );

                home.style.setProperty(
                    "max-width",
                    `${CONTAINER_WIDTH}px`,
                    "important"
                );

                home.style.setProperty(
                    "height",
                    `${CONTAINER_HEIGHT}px`,
                    "important"
                );

                home.style.setProperty(
                    "max-height",
                    `${CONTAINER_HEIGHT}px`,
                    "important"
                );
            }
        }


        // ==================================================
        // INC
        // ==================================================

        if (esINC) {

            if (main) {
                main.style.setProperty(
                    "width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                main.style.setProperty(
                    "max-width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                main.style.setProperty(
                    "height",
                    `${INC_HEIGHT}px`,
                    "important"
                );

                main.style.setProperty(
                    "max-height",
                    `${INC_HEIGHT}px`,
                    "important"
                );
            }


            if (home) {
                home.style.setProperty(
                    "width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                home.style.setProperty(
                    "max-width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                home.style.setProperty(
                    "height",
                    `${INC_HEIGHT}px`,
                    "important"
                );

                home.style.setProperty(
                    "max-height",
                    `${INC_HEIGHT}px`,
                    "important"
                );
            }


            // ----------------------------------------------
            // PanelHolder
            // ----------------------------------------------

            if (panelHolder) {

                panelHolder.style.setProperty(
                    "width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                panelHolder.style.setProperty(
                    "max-width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                panelHolder.style.setProperty(
                    "height",
                    `${INC_HEIGHT}px`,
                    "important"
                );

                panelHolder.style.setProperty(
                    "max-height",
                    `${INC_HEIGHT}px`,
                    "important"
                );
            }


            // ----------------------------------------------
            // FormContainer
            // ----------------------------------------------

            if (formContainer) {

                formContainer.style.setProperty(
                    "width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                formContainer.style.setProperty(
                    "max-width",
                    `${INC_WIDTH}px`,
                    "important"
                );

                formContainer.style.setProperty(
                    "height",
                    `${INC_HEIGHT}px`,
                    "important"
                );

                formContainer.style.setProperty(
                    "max-height",
                    `${INC_HEIGHT}px`,
                    "important"
                );
            }


            // ----------------------------------------------
            // Details
            // ----------------------------------------------

            details.style.setProperty(
                "width",
                `${DETAILS_WIDTH}px`,
                "important"
            );

            details.style.setProperty(
                "max-width",
                `${DETAILS_WIDTH}px`,
                "important"
            );

            details.style.setProperty(
                "height",
                `${DETAILS_HEIGHT}px`,
                "important"
            );

            details.style.setProperty(
                "max-height",
                `${DETAILS_HEIGHT}px`,
                "important"
            );
        }


        // ==================================================
        // 5. CONSOLA
        // ==================================================

        console.log(
            "[ATOM] Marco:",
            esINC ? "INC" : "INDEX",
            esINC
                ? `${INC_WIDTH} × ${INC_HEIGHT}`
                : `${CONTAINER_WIDTH} × ${CONTAINER_HEIGHT}`
        );
    }


    // ==================================================
    // INICIO
    // ==================================================

    setTimeout(aplicar, 3000);

})();