// ==UserScript==
// @name         03. ATOM Inner | V 0.8 003
// @namespace    http://tampermonkey.net/
// @version      0.8 | 003
// @description  Coloreado dinámico (Type, Notes, Submitter, Files) + Fechas x antigüedad
// @author       AL
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
==========================================================
  03. Helix ATOM Inner | Colorear Textos | V 0.8 | 001
==========================================================

DESCRIPCIÓN:
Este UserScript colorea dinámicamente el texto de las columnas
de la tabla interna "Inner ATOM" dentro de los tickets ATOM.
Soporta:
- Textos exactos en Type, Notes, Submitter y Files
- Textos parciales mediante Includes especiales
- Fechas con colores según antigüedad:
    • reciente (<24h) → verde
    • media (24-72h) → naranja
    • antigua (>72h) → rojo

INDICE DE BLOQUES PRINCIPALES:

1️⃣ CONSTANTES DE COLOREADO
   • typeColors       → colores exactos en columna Type
   • notesColors      → colores exactos en columna Notes
   • notesIncludes    → colores para textos parciales en Notes
   • submitterColors  → colores exactos en Submitter
   • submitterIncludes→ colores para textos parciales en submitter
   • filesColors      → colores exactos en Files
   • coloresFecha     → colores para fechas recientes/media/antigua
   • parseFecha(text) → parsea texto "dd/mm/yyyy hh:mm:ss" a objeto Date

2️⃣ FUNCIONES AUXILIARES
   • colorSpan(span, color) → Aplica color y peso de fuente
   • scanSpans(root=document) → Escanea spans visibles y aplica reglas:
       – Exactos primero
       – Includes especiales
       – Coloreado de fechas

3️⃣ ESCANEO INICIAL
   • scanSpans() → Se ejecuta al cargar la página

4️⃣ OBSERVER DINÁMICO
   • MutationObserver → Reaplica colores automáticamente a nodos nuevos

NOTAS:
- Cada span procesado se colorea según texto
- Includes permiten manejar identificadores parciales como "X03_ARCONTE_GSV"
- Compatible con Vivaldi y Edge
==========================================================
*/


(function() {
    'use strict';


    // ====================================================
    // 1️⃣ BLOQUE: CONSTANTES DE COLOREADO
    // ====================================================
    const typeColors = {
        "General Information": 		"grey",
        "Customer Communication": 	"yellow",
        "Data Acordada": 			"red",
        "Request Information": 		"orange",
        "Email User": 				"orange",
        "Company Assignment": 		"blue",
        "Assignment Change": 		"grey",
        "Incorrect Assignment": 	"red",
        "Reopen req. by customer": 	"red",
        "Resolution": 				"green",
    };

    const notesColors = {

    // ----------------------------------------------------
    // FUJI
    // ----------------------------------------------------
        "Assignat a : X03_ARCONTE_GSV": 								"#6e7bf0",
        "Assignat a : X03_ARCONTE_GSV Text : assignem":					"#6e7bf0",
        "AM09_23 - DATA": 												"brown",
        "NEW Text": 													"grey",

    // ----------------------------------------------------
    // COMMON
    // ----------------------------------------------------
        "This ticket was created from the service request system.": 	"yellow",
        "integracioCRM_ES_B4": 											"grey",
        "integracio_inc_agil": 											"brown",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA": 					"grey",
        "Assignat a : ES_B4_UTE T-SYSTEMS - INDRA: Text": 				"grey",
        "Status has been changed to In Progress": 						"teal",
        "Status has been changed to Resolved": 							"green",
        "Resol. - ": 													"green",
        "Status has been changed to Completed": 						"green",
        "Confirmat tancament amb l’usuari.": 							"green",
        "Status has been changed to Closed": 							"green",


    // ----------------------------------------------------
    // T-SYSTEMS
    // ----------------------------------------------------
        "Assignat a : ESB4-N4-SUPORT PRESENCIAL": 						"grey"

  };

    // 1️⃣a) Includes especiales para coincidencias parciales
        const notesIncludes = {
        "T'informem que, tal i com ens has indicat, la sol·licitud es reactivarà el dia": 	"grey",
        "TRUNCATE WARNING": 							 				"grey",

    // ----------------------------------------------------
    // FUJI
    // ----------------------------------------------------
        "Assignat a : X03_ARCONTE_GSV": 								"#6e7bf0",
        "ES_B4_UTE T-SYSTEMS": 											"grey",
        "AM09_23 - DATA": 												"brown",
        "AM01_23 - ADMINISTRACIÓ JUSTÍCIA": 							"brown",

    // ----------------------------------------------------
    // T-SYSTEMS
    // ----------------------------------------------------
        "T-Systems": 													"brown",

    // ----------------------------------------------------
    // COMMON
    // ----------------------------------------------------
        "Status has been changed to": 					 				"grey",
        "Gestionem l'assistència del":									"#4a84ec", 		// Maquinari
        "NEW TEXT HERE": 	 				 					 		"grey"

    };

    const submitterColors = {

    // ----------------------------------------------------
    // FUJI
    // ----------------------------------------------------
        "46725918S": 								"orange",
        "43435552Y": 								"#6e7bf0", // F
        "52069097H": 								"#6e7bf0", // B
        "43574331A": 								"#6e7bf0", // J
        "55363993A": 				 				"#4a84ec", // J Maq
        "43512561B": 				 				"#4a84ec", // O Maq
        "35097569Y": 				 				"#4a84ec", // P Maq


        "47696387E": 				 				"grey", //   ATOM
        "78850720G": 				 				"grey", //   ATOM
        "43597137Q": 				 				"grey", //   ATOM
        "40971392C": 				 				"grey", //   ATOM
        "43510247C": 				 				"#D3D3D3", //   ATOM Araceli
        "47902211L": 				 				"grey", //   ATOM
        "ATOM": 				 				"grey", //   ATOM
        "ATOM": 				 				"grey", //   ATOM
        "ATOM": 				 				"grey", //   ATOM
        "ATOM": 				 				"grey", //   ATOM
        "ATOM": 				 				"grey", //   ATOM
        "ATOM": 				 				"grey", //   ATOM

        "DNI / NIF Aquí": 							"yellow",
        "Remedy Application Service": 				"grey",
        "AR_ESCALATOR": 							"grey",
        "integracioitsm_AM01_23": 					"grey",
        "integracio_inc_agil": 						"grey",
        "integracioitsm_AM09_23": 					"brown",
        "AM09_23 - DATA": 							"brown",

    // ----------------------------------------------------
    // T-SYSTEMS
    // ----------------------------------------------------
        "35123515P": 							 	"yellow", // JL
        "43414151H": 							 	"#a7ffff"  // F Canillo
    };

    // 1️⃣b) Includes especiales para Submitter (coincidencias parciales)
    const submitterIncludes = {
        "AM09": 									"brown", 		// Texto que contenga "AM09" se coloreará
 		"AM01_23": 									"brown", 		// Texto que contenga "AM01" se coloreará
        "integracio_inc_agil": 						"grey"			//

};


    const filesColors = {
        "0": { color: "grey", bold: false },
        "1": { color: "red", bold: true, },
        "2": { color: "red", bold: true },
        "3": { color: "red", bold: true },
        "4": { color: "red", bold: true },
        "5": { color: "red", bold: true }
};

    // 🔹 Colores para fechas
    const coloresFecha = {
        reciente : "green",
        media    : "orange",
        antigua  : "red"
    };

    // 🔹 Función para parsear fecha
    function parseFecha(text) {
        if (!/^\d{2}\/\d{2}\/\d{4}/.test(text)) return null;
        const [f, h] = text.split(" ");
        const [d, m, y] = f.split("/").map(Number);
        const [hh, mm, ss] = h.split(":").map(Number);
        return new Date(y, m - 1, d, hh, mm, ss);
    }

    // Inner PopUp / Moviment Vídeos
    const stylePopup = document.createElement("style");
    stylePopup.textContent = `
    .lx-popup-label {
        color: orange;
        font-weight: bold;
    }
`;
    document.head.appendChild(stylePopup);



    // ====================================================
    // 2️⃣ BLOQUE: FUNCIONES AUXILIARES
    // ====================================================
    function colorSpan(span, color) {
        span.style.color = color;
        span.style.fontWeight = "450"; // peso de fuente ligero-firme
    }

    function scanSpans(root=document) {
        root.querySelectorAll("span").forEach(span=>{

            if (
                span.closest('div[ardbn="z1D_WorkInfoToolTip_Info"]') ||
                span.closest('[data-atom-history="1"]')
            )
                return;

            const text = span.textContent.trim();

            // 2️⃣a) Type exacto
            if(typeColors[text]) colorSpan(span, typeColors[text]);

            // 2️⃣b) Notes exacto
            if(notesColors[text]) colorSpan(span, notesColors[text]);

            // 2️⃣c) Notes especiales por Include
            for (const key in notesIncludes) {
                if(text.includes(key)) {
                    colorSpan(span, notesIncludes[key]);
                    break;
            // 2️⃣d1) Submitter especiales por Include
            for (const key in submitterIncludes) {
                if(text.includes(key)) {
                    colorSpan(span, submitterIncludes[key]);
                    break; // solo aplica el primero que coincida
    }
}

                }
            }

            // 2️⃣d) Submitter exacto
            if(submitterColors[text]) colorSpan(span, submitterColors[text]);

            // 2️⃣e) Files exacto
            if (filesColors[text]) {
                span.style.color = filesColors[text].color;
                span.style.fontWeight = filesColors[text].bold ? "700" : "450";
                return;
            }

            // 2️⃣f) Colorear fechas
            const fecha = parseFecha(text);
            if (fecha) {
                const ahora = new Date();
                const diffHoras = (ahora - fecha) / (1000 * 60 * 60);
                let colorFecha = coloresFecha.reciente;

                if (diffHoras > 24 && diffHoras <= 72) colorFecha = coloresFecha.media;
                else if (diffHoras > 72) colorFecha = coloresFecha.antigua;

                colorSpan(span, colorFecha);
            }

            //
            // In Progress
            //

            function procesarPopupInner() {

    const popupTextareas = document.querySelectorAll(".DIVPopup textarea.readonly");

    popupTextareas.forEach(textarea => {

        if (textarea.dataset.lxProcesadoPopup) return;

        const textoOriginal = textarea.value;

        const etiquetas = [
            "Òrgan Origen:",
            "Número de procediment origen:",
            "Tipus de procediment:",
            "Òrgan Destí:",
            "Número de procediment destí:",
            "Tipus de procediment:",
            "Està creada la sessió?"
        ];

        let html = textoOriginal;

        etiquetas.forEach(label => {
            const regex = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g");
            html = html.replace(regex, `<span class="lx-popup-label">${label}</span>`);
        });

        const div = document.createElement("div");
        div.className = "Editor readonly";
        div.style.whiteSpace = "pre-wrap";
        div.style.height = "100%";
        div.innerHTML = html;

        textarea.style.display = "none";
        textarea.parentNode.appendChild(div);

        textarea.dataset.lxProcesadoPopup = "1";
    });
}

        });
    }

    // ====================================================
    // 3️⃣ BLOQUE: ESCANEO INICIAL
    // ====================================================
    scanSpans();

    // ====================================================
    // 4️⃣ BLOQUE: OBSERVER DINÁMICO
    // ====================================================
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