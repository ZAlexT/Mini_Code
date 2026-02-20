// ==UserScript==
// @name         Helix INNER ATOM – Colorize Columns Test
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Colorea columnas específicas en el historial INNER ATOM
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Normaliza texto simple
    function normalizar(txt) {
        return (txt || "").toLowerCase().trim();
    }

    // Busca la tabla que tiene encabezados Type / Notes / Submitter
    function encontrarTablaInnerAtom() {
        const tablas = document.querySelectorAll("table");

        for (let tabla of tablas) {
            const headers = Array.from(tabla.querySelectorAll("th"))
                .map(th => normalizar(th.textContent));

            if (
                headers.includes("type") &&
                headers.includes("notes") &&
                headers.includes("submitter")
            ) {
                return tabla;
            }
        }
        return null;
    }

    function colorearInnerAtom() {

        const tabla = encontrarTablaInnerAtom();
        if (!tabla) return;

        // Mapa de índices por nombre de columna
        const headers = Array.from(tabla.querySelectorAll("th"));
        const mapa = {};
        headers.forEach((th, i) => {
            const key = normalizar(th.textContent);
            mapa[key] = i;
        });

        // Reglas por columna
        const reglas = {
            "type": {
                "customer communication": "red",
                "data acordada": "yellow",
                "request information": "orange",
                "email user": "orange"
            },
            "notes": {
                "assignat a : x03_arconte_gsv": "#6e7bf0",
                "assignat a : es_b4_ute t-systems - indra": "grey",
                "am_23": "brown"
            },
            "submitter": {
                "46725918s": "orange",
                "44795918s": "yellow",
                "46000918s": "yellow",
                "ar_escalator": "orange"
            },
            "files": {
                "1": "red",
                "2": "red",
                "3": "red",
                "4": "red",
                "5": "red"
            }
        };

        // Procesar filas
        tabla.querySelectorAll("tbody tr").forEach(tr => {
            const tds = tr.querySelectorAll("td");

            // Type
            const idxType = mapa["type"];
            if (idxType !== undefined) {
                const td = tds[idxType];
                const val = normalizar(td.textContent);
                for (let key in reglas["type"]) {
                    if (val.includes(key)) {
                        td.style.color = reglas["type"][key];
                    }
                }
            }

            // Notes
            const idxNotes = mapa["notes"];
            if (idxNotes !== undefined) {
                const td = tds[idxNotes];
                const val = normalizar(td.textContent);
                for (let key in reglas["notes"]) {
                    if (val.includes(key)) {
                        td.style.color = reglas["notes"][key];
                    }
                }
            }

            // Submitter
            const idxSub = mapa["submitter"];
            if (idxSub !== undefined) {
                const td = tds[idxSub];
                const val = normalizar(td.textContent);
                for (let key in reglas["submitter"]) {
                    if (val.includes(key)) {
                        td.style.color = reglas["submitter"][key];
                    }
                }
            }

            // Files
            const idxFiles = mapa["files"];
            if (idxFiles !== undefined) {
                const td = tds[idxFiles];
                const val = normalizar(td.textContent);
                for (let key in reglas["files"]) {
                    if (val === key) {
                        td.style.color = reglas["files"][key];
                    }
                }
            }

        });
    }

    // Espera ligera (para que el panel cargue)
    setTimeout(colorearInnerAtom, 1200);

})();
