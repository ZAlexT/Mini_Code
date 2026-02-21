// ==UserScript==
// @name         03. Helix ATOM Inner | V 0.5 - Colorear Textos
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Coloreado dinámico de texto definido en columnas de Inner ATOM (INCs)
// @author       AL
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ----------------------------------------------------
    // REGLAS DE COLOREADO
    // ----------------------------------------------------

    const typeColors = {
        "General Information": 		"grey",
        "Customer Communication": 	"yellow",
        "Data Acordada": 			"red",
        "Request Information": 		"orange",
        "Email User": 				"orange",
        "Company Assignment": 		"blue",
        "Resolution": 				"green"
    };

    const notesColors = {
        "This ticket was created from the service request system.": 	"yellow",
        "Assignat a : X03_ARCONTE_GSV": 								"#6e7bf0",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA": 					"grey",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA: Text": 				"grey",
        "Assignat a : ESB4-N4-SUPORT PRESENCIAL": 						"grey",
        "Status has been changed to In Progress": 						"teal",
        "Status has been changed to Resolved": 							"green",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA: Text": 				"grey",
        "AM09_23 - DATA": 												"brown",
        "Resol. - ": 													"green",
        "Status has been changed to Completed": 						"green",
        "Confirmat tancament amb l’usuari.": 							"green",
        "Status has been changed to Closed": 							"green"

    };

    const submitterColors = {
        "46725918S": 				"orange",
        "44795918S": 				"yellow",
        "46000918S": 				"yellow",
        "AR_ESCALATOR": 			"orange",
        "AM09_23 - DATA": 			"brown"
    };

    const filesColors = {
        "0": "grey",
        "1": "red",
        "2": "red",
        "3": "red",
        "4": "red",
        "5": "red"
    };

    // ----------------------------------------------------
    // FUNCIONES AUXILIARES
    // ----------------------------------------------------

    function colorSpan(span, color) {
        span.style.color = color;
        span.style.fontWeight = "450"; // Revisar a 450
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

    // ----------------------------------------------------
    // ESCANEO INICIAL
    // ----------------------------------------------------
    scanSpans();

    // ----------------------------------------------------
    // OBSERVER DINÁMICO
    // ----------------------------------------------------
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
