// ==UserScript==
// @name         INNER ATOM - Coloreado Completo
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Colorea dinámicamente todas las columnas de Inner ATOM según reglas definidas
// @author       AL
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ---------------------
    // REGLAS DE COLOREADO
    // ---------------------

    const typeColors = {
        "Customer Communication": "red",
        "Data Acordada": "yellow",
        "Request Information": "orange",
        "Email User": "orange",
        "Company Assignment": "blue"
    };

    const notesColors = {
        "Assignat a : X03_ARCONTE_GSV": "#6e7bf0",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA": "grey",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA: Text": "grey",
        "AM_23": "brown"
    };

    const submitterColors = {
        "46725918S": "orange",
        "44795918S": "yellow",
        "46000918S": "yellow",
        "AR_ESCALATOR": "orange",
        "AM09_23 - DATA": "brown"
    };

    const filesColors = {
        "1": "red",
        "2": "red",
        "3": "red",
        "4": "red",
        "5": "red"
    };

    // ---------------------
    // FUNCIONES AUXILIARES
    // ---------------------

    function colorSpan(span, color) {
        span.style.color = color;
        span.style.fontWeight = "bold";
    }

    function scanSpans(root=document) {
        root.querySelectorAll("span").forEach(span=>{
            const text = span.textContent.trim();

            // Type
            if(typeColors[text]) {
                colorSpan(span, typeColors[text]);
            }

            // Notes
            if(notesColors[text]) {
                colorSpan(span, notesColors[text]);
            }

            // Submitter
            if(submitterColors[text]) {
                colorSpan(span, submitterColors[text]);
            }

            // Files
            if(filesColors[text]) {
                colorSpan(span, filesColors[text]);
            }
        });
    }

    // ---------------------
    // ESCANEO INICIAL
    // ---------------------
    scanSpans();

    // ---------------------
    // OBSERVER DINÁMICO
    // ---------------------
    const observer = new MutationObserver(mutations=>{
        mutations.forEach(m=>{
            m.addedNodes.forEach(node=>{
                if(node.nodeType===1){ // Es elemento
                    scanSpans(node);
                }
            });
        });
    });

    observer.observe(document.body, { childList:true, subtree:true });

})();