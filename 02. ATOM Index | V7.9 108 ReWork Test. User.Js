// ==UserScript==
// @name         02. ATOM Index | V7.9 108 ReWork Test
// @namespace    http://tampermonkey.net/
// @version      V7.9 108 ReWork Test
// @description  ATOM | Colorize + Blink Modes | Column Structure
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
'use strict';

console.log("[Helix V7.9 108 ReWork Test] Iniciado…");


// =============================================================
// 1. CONFIGURACIÓN GENERAL
// =============================================================

const MODO_PARPADEO = "independiente";

const CONFIG = {
    fondoEstados: true,
    fondoConBordes: false
};

const usuariosBlink = [
    "alejandro lozano morales",
    "juan luis tortola martinez",
    "sonia fernandez fernandez"
];


// =============================================================
// 2. CSS GLOBAL
// =============================================================

const styleHelix = document.createElement("style");

styleHelix.textContent = `
@keyframes helixBlink {
    0%,100% { opacity: 1; }
    50% { opacity: 0; }
}

.Lx-blink {
    animation: helixBlink 1.2s ease-in-out 12;
}

.Lx-noblink {
    animation: none !important;
}
`;

document.head.appendChild(styleHelix);


// =============================================================
// 3. ENTRADAS
//
// PEGAR AQUÍ LAS ENTRADAS DEL 107
//
// La estructura de cada entrada se mantiene:
//
// { texto: '...', color: '...' },
//
// No se modifican nombres ni formato.
// =============================================================


// -------------------------------------------------------------
// ASSIGNEE GROUP
// -------------------------------------------------------------

const assigneeGroupEntries = [
    // PEGAR AQUÍ LAS ENTRADAS DE GROUPS
];


// -------------------------------------------------------------
// ASSIGNEE
// -------------------------------------------------------------

const assigneeEntries = [
    // PEGAR AQUÍ LAS ENTRADAS DE TECHNICIANS
];


// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------

const summaryEntries = [
    // PEGAR AQUÍ LAS ENTRADAS DE SUMMARY
];


// -------------------------------------------------------------
// STATUS
// -------------------------------------------------------------

const statusEntries = [
    // PEGAR AQUÍ LAS ENTRADAS DE STATUS
];


// -------------------------------------------------------------
// REQUEST TYPE
// -------------------------------------------------------------

const requestTypeEntries = [
    // PEGAR AQUÍ LAS ENTRADAS DE TYPES
];


// -------------------------------------------------------------
// PRIORITY
// -------------------------------------------------------------

const priorityEntries = [
    // PEGAR AQUÍ LAS ENTRADAS DE PRIORITY
];


// -------------------------------------------------------------
// REQUEST ID
//
// INC000011390235
// WO0000005426331
//
// Se colorea la entrada COMPLETA.
// -------------------------------------------------------------

const requestIDEntries = [
    // PEGAR AQUÍ SI SE QUIEREN ENTRADAS ADICIONALES
];


// =============================================================
// 4. COLORES DE FECHA
// =============================================================

const coloresFecha = {
    reciente : "green",
    media    : "orange",
    antigua  : "red"
};


// =============================================================
// 5. IDENTIFICACIÓN DE COLUMNAS
//
// El número es el único dato que habrá que modificar si ATOM
// cambia el orden de las columnas.
// =============================================================

const COLUMNAS = {

    assigneeGroup: 0,  // ASSIGNEE GROUP
    parentRequest: 1,  // PARENT REQUEST ID
    status:        2,  // STATUS
    assignee:      3,  // ASSIGNEE
    summary:       4,  // SUMMARY
    priority:      5,  // PRIORITY
    urgency:       6,  // URGENCY
    submitDate:    7,  // SUBMIT DATE
    requestType:   8,  // REQUEST TYPE
    service:       9,  // SERVICE
    requestID:    10,  // REQUEST ID

    // CAMPOS OCULTOS

    company:      11,  // COMPANY
    customerSite: 12,  // CUSTOMER SITE
    department:   13,  // DEPARTMENT
    escalated:    14,  // ESCALATED?
    impact:       15,  // IMPACT

    operationalTier1: 16, // OPERATIONAL CATEGORIZATION TIER 1
    operationalTier2: 17, // OPERATIONAL CATEGORIZATION TIER 2
    operationalTier3: 18, // OPERATIONAL CATEGORIZATION TIER 3

    productTier1: 19, // PRODUCT CATEGORIZATION TIER 1
    productTier2: 20, // PRODUCT CATEGORIZATION TIER 2
    productTier3: 21, // PRODUCT CATEGORIZATION TIER 3

    productName: 22 // PRODUCT NAME
};


// =============================================================
// 6. PARSE FECHA
// =============================================================

function parseFecha(text) {

    if (!/^\d{2}\/\d{2}\/\d{4}/.test(text))
        return null;

    const [f, h] = text.split(" ");

    if (!h)
        return null;

    const [d, m, y] = f.split("/").map(Number);
    const [hh, mm, ss] = h.split(":").map(Number);

    return new Date(y, m - 1, d, hh, mm, ss);
}


// =============================================================
// 7. FUNCIÓN DE COLOR
// =============================================================

function aplicarEntrada(td, entrada) {

    const safe = entrada.texto
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const reg = new RegExp(`(${safe})`, "gi");

    let html = td.innerHTML;

    html = html.replace(reg, match => {

        let estilos =
            `color:${entrada.color}; white-space:nowrap;`;

        if (CONFIG.fondoEstados && entrada.fondo) {

            estilos += `
                background:${entrada.fondo};
                box-decoration-break:clone;
                -webkit-box-decoration-break:clone;
                padding:1px 3px;
                border-radius:3px;
                line-height:1;
            `;
        }

        const lower = match.toLowerCase();

        let clases = "Lx-noblink";
        let extraAttr = "";

        if (lower === "high") {
            extraAttr = ' data-estado="High" ';
        }

        if (MODO_PARPADEO === "constante") {

            clases = "Lx-blink";

        } else if (MODO_PARPADEO === "intermitente") {

            clases = "Lx-blink";

        } else if (MODO_PARPADEO === "independiente") {

            if (
                ["assigned", "in progress"].includes(lower) ||
                usuariosBlink.includes(lower)
            ) {
                clases = "Lx-blink";
            }

            if (lower === "high") {
                clases = "Lx-blink";
            }
        }

        return `<span class="${clases}" style="${estilos}" ${extraAttr}>${match}</span>`;
    });

    td.innerHTML = html;
}


// =============================================================
// 8. PROCESAR ENTRADAS DE UNA COLUMNA
// =============================================================

function procesarEntradas(td, entradas) {

    if (!entradas || !entradas.length)
        return;

    entradas.forEach(entrada => {
        aplicarEntrada(td, entrada);
    });
}


// =============================================================
// 9. REQUEST ID
//
// Detecta el tipo completo, independientemente del número.
//
// INC000011390235
// WO0000005426331
// TAS0000000000000
// CRQ0000000000000
// =============================================================

function procesarRequestID(td) {

    const texto = td.textContent.trim();

    if (!/^(INC|WO|TAS|CRQ)\d+$/i.test(texto))
        return;

    let color = null;

    if (/^INC\d+$/i.test(texto)) {
        color = "#6e7bf0";
    }

    if (/^(WO|TAS|CRQ)\d+$/i.test(texto)) {
        color = "Violet";
    }

    if (!color)
        return;

    td.innerHTML =
        `<span class="Lx-noblink"
               style="color:${color}; white-space:nowrap;">
            ${texto}
         </span>`;
}


// =============================================================
// 10. PROCESAR UNA FILA
// =============================================================

function procesarFila(tr) {

    const cells = Array.from(tr.children);

    if (cells.length < 11)
        return;


    // ---------------------------------------------------------
    // REFERENCIA DE COLUMNAS
    // ---------------------------------------------------------

    const assigneeGroup = cells[COLUMNAS.assigneeGroup];
    const parentRequest = cells[COLUMNAS.parentRequest];
    const status        = cells[COLUMNAS.status];
    const assignee      = cells[COLUMNAS.assignee];
    const summary       = cells[COLUMNAS.summary];
    const priority      = cells[COLUMNAS.priority];
    const urgency       = cells[COLUMNAS.urgency];
    const submitDate    = cells[COLUMNAS.submitDate];
    const requestType   = cells[COLUMNAS.requestType];
    const service       = cells[COLUMNAS.service];
    const requestID     = cells[COLUMNAS.requestID];


    // ---------------------------------------------------------
    // ASSIGNEE GROUP
    // ---------------------------------------------------------

    procesarEntradas(
        assigneeGroup,
        assigneeGroupEntries
    );


    // ---------------------------------------------------------
    // ASSIGNEE
    // ---------------------------------------------------------

    procesarEntradas(
        assignee,
        assigneeEntries
    );


    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------

    procesarEntradas(
        summary,
        summaryEntries
    );


    // ---------------------------------------------------------
    // STATUS
    // ---------------------------------------------------------

    procesarEntradas(
        status,
        statusEntries
    );


    // ---------------------------------------------------------
    // PRIORITY
    // ---------------------------------------------------------

    procesarEntradas(
        priority,
        priorityEntries
    );


    // ---------------------------------------------------------
    // REQUEST TYPE
    // ---------------------------------------------------------

    procesarEntradas(
        requestType,
        requestTypeEntries
    );


    // ---------------------------------------------------------
    // REQUEST ID
    // ---------------------------------------------------------

    procesarRequestID(requestID);


    // ---------------------------------------------------------
    // SUBMIT DATE
    // ---------------------------------------------------------

    if (submitDate) {

        const fecha = parseFecha(
            submitDate.textContent.trim()
        );

        if (fecha) {

            const ahora = new Date();

            let colorFecha = coloresFecha.reciente;

            const diffHoras =
                (ahora - fecha) / (1000 * 60 * 60);

            if (
                diffHoras > 24 &&
                diffHoras <= 72
            ) {
                colorFecha = coloresFecha.media;
            }

            else if (diffHoras > 72) {
                colorFecha = coloresFecha.antigua;
            }

            submitDate.style.color = colorFecha;
        }
    }
}


// =============================================================
// 11. PROCESAR TABLA
// =============================================================

function colorearTabla() {

    const tabla =
        document.querySelector("table.BaseTable");

    if (!tabla)
        return;

    tabla.querySelectorAll("tbody tr")
        .forEach(tr => {

            if (
                tr.classList.contains("hiddentablehdr")
            )
                return;

            procesarFila(tr);
        });
}


// =============================================================
// 12. INTERMITENCIA CONTROLADA
// =============================================================

if (
    MODO_PARPADEO === "intermitente" ||
    MODO_PARPADEO === "independiente"
) {

    setInterval(() => {

        const elementos =
            document.querySelectorAll(".Lx-blink");

        if (!elementos.length)
            return;

        elementos.forEach(el =>
            el.classList.remove("Lx-blink")
        );

        void document.body.offsetWidth;

        elementos.forEach(el =>
            el.classList.add("Lx-blink")
        );

    }, 90000);
}


// =============================================================
// 13. FAVICON
// =============================================================

let faviconOriginal = null;
let faviconRojo = null;
let faviconParpadeando = false;
let intervaloFavicon = null;


function crearFaviconRojo() {

    const canvas =
        document.createElement("canvas");

    canvas.width = 32;
    canvas.height = 32;

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle = "red";

    ctx.beginPath();

    ctx.arc(
        16,
        16,
        14,
        0,
        2 * Math.PI
    );

    ctx.fill();

    return canvas.toDataURL("image/png");
}


function obtenerFaviconActual() {

    const link =
        document.querySelector("link[rel*='icon']");

    return link ? link.href : null;
}


function cambiarFavicon(url) {

    let link =
        document.querySelector("link[rel*='icon']");

    if (!link) {

        link =
            document.createElement("link");

        link.rel = "icon";

        document.head.appendChild(link);
    }

    link.href = url;
}


function hayAssigned() {

    const tabla =
        document.querySelector("table.BaseTable");

    if (!tabla)
        return false;

    return tabla.textContent
        .toLowerCase()
        .includes("assigned");
}


function activarParpadeoFavicon() {

    if (faviconParpadeando)
        return;

    faviconOriginal =
        obtenerFaviconActual();

    faviconRojo =
        crearFaviconRojo();

    faviconParpadeando = true;

    intervaloFavicon =
        setInterval(() => {

            const link =
                document.querySelector("link[rel*='icon']");

            if (!link)
                return;

            const actual = link.href;

            cambiarFavicon(
                actual === faviconRojo
                    ? faviconOriginal
                    : faviconRojo
            );

        }, 1000);
}


function desactivarParpadeoFavicon() {

    if (!faviconParpadeando)
        return;

    clearInterval(intervaloFavicon);

    faviconParpadeando = false;

    cambiarFavicon(faviconOriginal);
}


// =============================================================
// 14. OBSERVER
// =============================================================

let observerActivo = null;
let tablaActual = null;
let pendiente = false;


function debouncedColor() {

    if (pendiente)
        return;

    pendiente = true;

    setTimeout(() => {

        pendiente = false;

        colorearTabla();

        if (hayAssigned()) {
            activarParpadeoFavicon();
        } else {
            desactivarParpadeoFavicon();
        }

    }, 120);
}


function engancharObserver(tabla) {

    if (observerActivo) {

        observerActivo.disconnect();

        observerActivo = null;
    }

    observerActivo =
        new MutationObserver(() =>
            debouncedColor()
        );

    observerActivo.observe(
        tabla.parentElement,
        {
            childList: true,
            subtree: true
        }
    );

    tablaActual = tabla;
}


function vigilarTabla() {

    const tabla =
        document.querySelector("table.BaseTable");

    if (!tabla) {

        setTimeout(
            vigilarTabla,
            500
        );

        return;
    }

    if (tabla !== tablaActual) {

        console.log(
            "[Helix] Nueva tabla detectada → reenganchando observer"
        );

        engancharObserver(tabla);

        colorearTabla();
    }

    setTimeout(
        vigilarTabla,
        2000
    );
}


// =============================================================
// 15. INICIO
// =============================================================

vigilarTabla();

})();
