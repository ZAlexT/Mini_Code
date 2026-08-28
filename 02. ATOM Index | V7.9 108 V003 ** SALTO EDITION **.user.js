// ==UserScript==
// @name         02. ATOM Index | V7.9 108 V003 ** SALTO EDITION **
// @namespace    http://tampermonkey.net/
// @version      V7.9 108 V003
// @description  ATOM | Colorize + Blink + Favicon + Bold + Glow
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

/*
==========================================================
  02. Helix ATOM Index | V7.9 107 - Stable Blink Modes
==========================================================

DESCRIPCIÓN:
Este UserScript colorea la tabla ATOM y aplica modos de parpadeo
a ciertos estados, usuarios y tipos. También gestiona el parpadeo
del favicon si hay elementos "Assigned" y adapta tooltips internos.

INDICE DE CONSTANTES Y FUNCIONES PRINCIPALES:

1. CONFIGURACIÓN GENERAL
   - MODO_PARPADEO
       "constante"      → parpadeo continuo
       "intermitente"   → parpadeo controlado por intervalos
       "independiente"  → parpadeo solo para ciertos estados y usuarios
   - CONFIG
       fondoEstados      → habilita color de fondo en estados
       fondoConBordes    → habilita bordes decorativos (no usado)
   - usuariosBlink      → nombres que harán parpadear sus celdas en modo independiente

2. CSS GLOBAL
   - Clases Lx-blink / Lx-noblink
   - Animación helixBlink
   - Estilos aplicables a los estados coloreados

3. RESALTADOS
   - Estados, usuarios, grupos, tipos y entradas comunes
   - Cada objeto tiene: texto, color y opcional fondo/padding

4. PARSE FECHA
   - parseFecha(text) → Convierte texto de fecha/hora en objeto Date
   - coloresFecha     → Define color según antigüedad de la fecha

5. COLOREAR UNA CELDA (colorearTD)
   - Aplica color, fondo y parpadeo
   - Marca la celda como procesada para evitar doble aplicación
   - Respeta el modo de parpadeo (constante, intermitente, independiente)

6. PROCESAR TABLA (colorearTabla)
   - Recorre todas las celdas de la tabla BaseTable y llama a colorearTD

7. INTERMITENCIA CONTROLADA
   - Aplica parpadeo intermitente o independiente
   - Quita y vuelve a aplicar clase Lx-blink cada 45s
   - Evita que se acumulen efectos de parpadeo

8. ALERTA VISUAL EN PESTAÑA
   - Cambia favicon a rojo si hay elementos "Assigned"
   - Parpadeo controlado mediante intervalos
   - Restaura favicon original si no hay Assigned

9. OBSERVER INTELIGENTE
   - Reaplica colores tras refresh de Helix
   - Reengancha automáticamente cuando la tabla cambia

10. TOOLTIP BMC (Opcional / Tests)
   - estilizarTooltipIframe() → Cambia estilos del tooltip interno
   - Desactivar divToolTipHtml mediante CSS

11. REGLAS uBLOCK
   - Bloqueos específicos de ATOM para filtros y tooltips
   - Incluye URLs de imágenes, banners y tooltips para ocultar o reemplazar

NOTAS GENERALES:
- Cada celda procesada se marca con td.dataset.lxProcesado
- Clases Lx-blink y Lx-noblink controlan animaciones
- El parpadeo del favicon y de las celdas respeta MODO_PARPADEO
- Observer se engancha automáticamente tras cada refresh de Helix
==========================================================
*/


(function() {
'use strict';

console.log("[Helix V7.9 107] Iniciado…");

	//-------------------------------------------------------------
	// 1. CONFIGURACIÓN GENERAL
	//-------------------------------------------------------------

	const MODO_PARPADEO = "independiente";

    const BLINK_TEXTO_ACTIVO = true;     // true = texto parpadea
    const BLINK_FAVICON_ACTIVO = true;   // true = favicon parpadea

	const CONFIG = {
		fondoEstados: true,
		fondoConBordes: false
	};

	const usuariosBlink = [
		"alejandro lozano morales",
		"juan luis tortola martinez",
		"sonia fernandez fernandez"
	];

	//-------------------------------------------------------------
	// 2. CSS GLOBAL
	//-------------------------------------------------------------

	const styleHelix = document.createElement("style");
	styleHelix.textContent = `
	@keyframes helixBlink {
		0%,100% { opacity: 1; }
		50% { opacity: 0; }
	}
    @keyframes helixFaviconBlink {
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

    //-------------------------------------------------------------
    // 3. RESALTADOS
    //-------------------------------------------------------------

	const resaltados = [
    //-------------------------------------------------------------
    // 					ASSIGNEE Technicians FUJI
    //-------------------------------------------------------------

        { texto: 'ALEJANDRO LOZANO MORALES', 							color: 'Orange', glow:'true' },
        { texto: 'OVIDIO PARRON MARTINEZ', 								color: 'Grey' },
		{ texto: 'MARIA PILAR CARRILLO SENDER', 						color: 'Grey' },
        { texto: 'JHONATHAN VIVAS RENDON', 	 							color: 'Grey' },
        { texto: 'Next Text', 						color: 'Grey' },
        { texto: 'Next Text', 						color: 'Grey' },
        { texto: 'Next Text', 						color: 'Grey' },

	//-------------------------------------------------------------
    // 				ASSIGNEE 	Technicians T-Systems
    //-------------------------------------------------------------

		{ texto: 'JUAN LUIS TORTOLA MARTINEZ', 							color: 'green' },
        { texto: 'MIGUEL ANGEL GUEMES ALONSO', 							color: '#4B0082' },
        { texto: 'ERIC RODRIGUEZ LUQUE', 								color: 'Orange' },
        { texto: 'JOAN CARLES MESTRE GUILLEN', 							color: 'violet' },
        { texto: 'EDIFICI CIUTAT DE LA JUSTICIA', 						color: 'Green' },
        { texto: 'ANGEL ROIG LORENZO', 									color: 'blue' },
        { texto: 'FERNANDO JIMENEZ PORTILLO', 							color: 'Blue' },
        { texto: 'DANIEL ESPLUGAS SANCHEZ', 							color: 'red' },
        { texto: 'SONIA FERNANDEZ FERNANDEZ', 							color: '#007FFF' },

    //-------------------------------------------------------------
    // 						ASSIGNEE GROUP
    //-------------------------------------------------------------

        { texto: 'X03_ARCONTE_GSV-N2',									color: '#6e7bf0' },
        { texto: 'X03_ARCONTE_GSV-N3-MAQ', 								color: '#ffff00' },
        { texto: 'X03_ARCONTE_GSV-N3-ESPECIALISTES', 					color: 'Brown' },
        { texto: 'X03_ARCONTE_GSV-N3-SENYAL_INSTITUCIONAL', 			color: 'red' },

    //-------------------------------------------------------------
    // 						   SUMMARY
    //-------------------------------------------------------------

        { texto: '[Desplegament d’ARCONTE pujada de versió de la',  	color: 'Brown' },
		{ texto: '[FASE1]', 											color: 'Brown' },
		{ texto: '[FASE2]',									 			color: 'Brown' },
		{ texto: 'Actualitzar Aplicació. 3h', 							color: 'Brown' },
		{ texto: 'Marxa enrere', 										color: 'Brown' },
		{ texto: 'Proves. 30min', 										color: 'Brown' },
		{ texto: 'Proves. 1h', 											color: 'Brown' },
		{ texto: 'Marxa enrere. 1h', 									color: 'Brown' },
		{ texto: 'Realització de Backups. 30m', 						color: 'Brown' },
		{ texto: 'Proves . 30m', 										color: 'Brown' },
		{ texto: 'Actualitzar Aplicació. 3h', 							color: 'Brown' },
		{ texto: 'Actualitzar Aplicació. 3h', 							color: 'Brown' },
        { texto: 'Revisio de Sales SALA DE VISTES - AUDITORIUM', 		color: 'red' },
        { texto: 'Revisio de Sales SALA DE VISTES ', 					color: 'red' },
		{ texto: 'Incidència Arconte En un ',							color: 'grey' },
        { texto: 'Incidència Arconte ', 	 							color: 'grey' },
        { texto: 'Incidència ', 	 				 	 				color: 'grey' },
        { texto: 'Alta Certificats Digitals SSL, Aplicació i Segell', 	color: 'Pink' },
        { texto: 'Scheduled For Approval', 								color: 'Brown' },
        { texto: 'Staged', 												color: 'Brown' },
        { texto: 'Scheduled', 											color: 'Brown' },
        { texto: 'Aplicació de l', 										color: 'Brown' },
        { texto: 'actualització. 2h', 									color: 'Brown' },
        { texto: 'proves. 30m', 										color: 'Brown' },
        { texto: 'marxa enrere. 1h', 									color: 'Brown' },
        { texto: 'Moviments entre videos', 								color: '#6e7bf0' },
        { texto: 'Petició Sessió en Passat', 							color: '#6e7bf0' },
        { texto: 'Validacions funcionals ARCONTE', 						color: 'Violet' },

    //-------------------------------------------------------------
    // 							Status
    //-------------------------------------------------------------
    //------------------- Texto Color Fondo NO -------------------------

        /*{ texto: 'Assigned', color: 'white', fondo: '#0078d4', padding: '7px 37px', borderRadius: '7px' },//  Códgo pinta fondo in pastilla || // #fcccc */
        { texto: 'Assigned', 											color: 'white', fondo: 'red'}, // #fcccc
        { texto: 'In Progress', 										color: 'Green', fondo: '#ccffcc' }, // #ccffcc
        { texto: 'High', 												color: 'Red', bold: 'true', glow2: 'false' },  // Eliminamos fondo: '#d13438' para evitar el espacio extra #d13438
        { texto: '2-High', 												color: 'Red' }, // Eliminamos fondo: '#d13438' para evitar el espacio extra #d13438

/*   //------------------- Texto Blanco Fondo Color -------------------------
        { texto: 'Assigned', 											color: 'white', 	fondo: '#0078d4' }, // #fcccc
        { texto: 'In Progress', 										color: 'Green', 	fondo: '#ccffcc' }, // #ccffcc
        { texto: '2-High', 												color: 'white', 	fondo: '#d13438' },

*/    //----------------------------------------------------------------------
    //-------------------------------------------------------------
    // 							PRIORITY
    //-------------------------------------------------------------
        { texto: 'Medium', 												color: 'Orange' },
        { texto: 'Low', 												color: 'Grey' },

        { texto: 'Reopen', 												color: 'black' },
        { texto: '3-Medium', 											color: 'Orange' },
        { texto: 'Pending', 											color: 'orange' },
        { texto: '4-Low', 												color: 'Grey' },

    //-------------------------------------------------------------
    // 							REQUEST TYPE
    //-------------------------------------------------------------

        { texto: 'Work Order',  										color: 'Violet' },
        { texto: 'Incident', 											color: 'Grey' },
        { texto: 'WO0000', 												color: 'Violet' },
        { texto: 'TAS0000', 											color: 'Violet' },
        { texto: 'CRQ000', 												color: 'Violet' },
        { texto: 'INC0000', 											color: '#6e7bf0' },

        { texto: 'Change', 												color: 'Violet' },
        { texto: 'Task', 												color: 'Violet' }
    ];

    //-------------------------------------------------------------
    // 4. SUBMIT DATE COLOURS
    //-------------------------------------------------------------

     const coloresFecha = {
        reciente : "green",
        media    : "orange",
        antigua  : "red"
    };

    //-------------------------------------------------------------
    // 4.1 PARSE FECHA // SUBMIT DATE
    //-------------------------------------------------------------
    function parseFecha(text) {
        if (!/^\d{2}\/\d{2}\/\d{4}/.test(text)) return null;
        const [f, h] = text.split(" ");
        const [d, m, y] = f.split("/").map(Number);
        const [hh, mm, ss] = h.split(":").map(Number);
        return new Date(y, m - 1, d, hh, mm, ss);
    }

	//-------------------------------------------------------------
	// 5. COLOREAR UNA CELDA (PROTEGIDO CONTRA DOBLE PROCESO)
	//-------------------------------------------------------------

	function colorearTD(td) {

    if (td.dataset.lxProcesado === "1") return;

    const textoOriginal = td.textContent.trim();
    let html = td.innerHTML;

    resaltados.forEach(r => {

        const safe = r.texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const reg = new RegExp(`(${safe})`, "gi");

        html = html.replace(reg, match => {

          let estilos = `color:${r.color}; white-space:nowrap;`;
           if (r.bold) {
                estilos += `font-weight:700;`;
            }

            if (r.glow) {
                estilos += `text-shadow: 0 0 1px #FFD700, 0 0 3px #FFD700, 0 0 4px #FFD700 !important;`;
               }

            if (r.glow2) {
                estilos += `text-shadow: 0 0 1px green, 0 0 3px green, 0 0 4px green !important;`;
            }

            if (CONFIG.fondoEstados && r.fondo) {
                estilos += `
					background:${r.fondo};
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


        if (BLINK_TEXTO_ACTIVO) {

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
	}

            if (lower === "high") {
    return `<span class="${clases}" style="${estilos}" ${extraAttr}>${match.trim()}</span>`;
}

return `<span class="${clases}" style="${estilos}" ${extraAttr}>${match}</span>`;
        });
    });

    td.innerHTML = html;

        // 🔹 Colorear fecha si corresponde
const fecha = parseFecha(td.textContent.trim());
if (fecha) {
    const ahora = new Date();
    let colorFecha = coloresFecha.reciente;
    const diffHoras = (ahora - fecha) / (1000 * 60 * 60);

    if (diffHoras > 24 && diffHoras <= 72) colorFecha = coloresFecha.media;
    else if (diffHoras > 72) colorFecha = coloresFecha.antigua;

    td.style.color = colorFecha;
}

    td.dataset.lxProcesado = "1";

    // 🔹 Corrección: Favicon y Tooltip dinámicos tras colorear TD
	setTimeout(() => {
		if (BLINK_FAVICON_ACTIVO && hayAssigned()) {
			activarParpadeoFavicon();
		} else {
			desactivarParpadeoFavicon();
		}
		estilizarTooltipIframe();
	}, 50);
	}

//-------------------------------------------------------------
// 6. PROCESAR TABLA
//-------------------------------------------------------------

function colorearTabla() {

    const tabla =
        document.querySelector("table.BaseTable");

    if (!tabla)
        return;


    tabla.querySelectorAll("tbody tr td")
        .forEach(td => {

            //-------------------------------------------------
            // REQUEST ID
            //
            // No depende de la posición de la columna.
            // Busca directamente cualquier celda cuyo contenido
            // sea INC / WO / TAS / CRQ + números.
            //-------------------------------------------------

            procesarRequestID(td);


            //-------------------------------------------------
            // COLOREADO GENERAL
            //-------------------------------------------------

            colorearTD(td);

        });
}
/*
//-------------------------------------------------------------
// 7. PARPADEO GLOBAL SINCRONIZADO // ORIGINAL
//
// Protección doble proceso:
// - Texto: animación CSS.
// - Favicon: mismo ciclo temporal.
// - Ambos empiezan y terminan simultáneamente.
//
// 1,2 s × 12 = 14,4 segundos de parpadeo
// Nuevo ciclo cada 90 segundos.
//-------------------------------------------------------------

const BLINK_ACTIVO = true;   // true = blink / false = sin blink

		const BLINK_DURACION = 1200;		// 1,2 s
		const BLINK_REPETICIONES = 12;		// 12 repeticiones
		const BLINK_CICLO = 90000;			// 90 s



let blinkTimeoutFin = null;
let blinkIntervaloFavicon = null;

*/

		//-------------------------------------------------------------
		// 7. PARPADEO GLOBAL SINCRONIZADO ** SALTO EDITION **
		//
		// Protección doble proceso:
		// - Texto: animación CSS.
		// - Favicon: mismo ciclo temporal.
		// - Ambos empiezan y terminan simultáneamente.
		//
		// 1,2 s × 12 = 14,4 segundos de parpadeo
		// Nuevo ciclo cada 90 segundos.
		//-------------------------------------------------------------

    const BLINK_TEXTO_ACTIVO = false;    // texto NO parpadea
    const BLINK_FAVICON_ACTIVO = true;   // favicon SÍ parpadea

		const BLINK_DURACION = 1600;       // 1,6 s
		const BLINK_REPETICIONES = 4;     // 4 repeticiones
		const BLINK_CICLO = 190000;       // 190 s ≈ 3 min 10 s



let blinkTimeoutFin = null;
let blinkIntervaloFavicon = null;


//-------------------------------------------------------------
// INICIAR CICLO GLOBAL
//-------------------------------------------------------------

function iniciarCicloBlink() {

    //---------------------------------------------------------
    // TEXTO
    //---------------------------------------------------------

    if (
        BLINK_TEXTO_ACTIVO &&
        (
            MODO_PARPADEO === "intermitente" ||
            MODO_PARPADEO === "independiente"
        )
    ) {

        const elementos =
            document.querySelectorAll(".Lx-blink");

        if (elementos.length) {

            elementos.forEach(el =>
                el.classList.remove("Lx-blink")
            );

            void document.body.offsetWidth;

            elementos.forEach(el =>
                el.classList.add("Lx-blink")
            );
        }
    }

    //---------------------------------------------------------
    // FAVICON
    //---------------------------------------------------------

    if (BLINK_FAVICON_ACTIVO) {
        iniciarCicloFavicon();
    }

    //---------------------------------------------------------
    // FINAL DEL CICLO
    //---------------------------------------------------------

    clearTimeout(blinkTimeoutFin);

    blinkTimeoutFin = setTimeout(() => {

        finalizarCicloFavicon();

    }, BLINK_DURACION * BLINK_REPETICIONES);
}


//-------------------------------------------------------------
// CICLO AUTOMÁTICO CADA 90 SEGUNDOS
//-------------------------------------------------------------

setInterval(
    iniciarCicloBlink,
    BLINK_CICLO
);

// =============================================================
// 8. FAVICON
//
// Aviso independiente cuando existe ASSIGNED.
//
// Basado en el sistema de la 107.
// El favicon mantiene su ritmo propio de 1 segundo.
//
// Se reinicia cada 45 segundos para que el aviso vuelva a
// llamar la atención aunque estemos en otra pestaña.
//
// El texto mantiene su ciclo independiente de 90 segundos.
// =============================================================

let faviconOriginal = null;
let faviconRojo = null;
let faviconParpadeando = false;

let intervaloFavicon = null;
let timeoutReinicioFavicon = null;


// =============================================================
// CREAR FAVICON ROJO
// =============================================================

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


// =============================================================
// OBTENER FAVICON ACTUAL
// =============================================================

function obtenerFaviconActual() {

    const link =
        document.querySelector("link[rel*='icon']");

    return link ? link.href : null;
}


// =============================================================
// CAMBIAR FAVICON
// =============================================================

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


// =============================================================
// COMPROBAR ASSIGNED
// =============================================================

function hayAssigned() {

    const tabla =
        document.querySelector("table.BaseTable");

    if (!tabla)
        return false;

    return tabla.textContent
        .toLowerCase()
        .includes("assigned");
}


// =============================================================
// ACTIVAR PARPADEO FAVICON
// =============================================================

function activarParpadeoFavicon() {

    if (faviconParpadeando)
        return;


    //-------------------------------------------------------------
    // Guardar favicon original una sola vez
    //-------------------------------------------------------------

    if (!faviconOriginal)
        faviconOriginal =
            obtenerFaviconActual();


    if (!faviconRojo)
        faviconRojo =
            crearFaviconRojo();


    faviconParpadeando = true;


    //-------------------------------------------------------------
    // PARPADEO
    //
    // Se mantiene el ritmo de la 107:
    // cambio cada 1 segundo.
    //-------------------------------------------------------------

    intervaloFavicon =
        setInterval(() => {

            const link =
                document.querySelector("link[rel*='icon']");

            if (!link)
                return;


            const actual =
                link.href;


            cambiarFavicon(
                actual === faviconRojo
                    ? faviconOriginal
                    : faviconRojo
            );

        }, 1000);


    //-------------------------------------------------------------
    // REINICIO CADA 45 SEGUNDOS
    //
    // No cambia la velocidad del parpadeo.
    // Simplemente vuelve a iniciar el aviso.
    //-------------------------------------------------------------

    timeoutReinicioFavicon =
        setTimeout(() => {

            if (!faviconParpadeando)
                return;


            clearInterval(intervaloFavicon);

            intervaloFavicon = null;


            //-----------------------------------------------------
            // Volver al favicon original un instante
            //-----------------------------------------------------

            cambiarFavicon(faviconOriginal);


            //-----------------------------------------------------
            // Reiniciar el ciclo
            //-----------------------------------------------------

            faviconParpadeando = false;

            activarParpadeoFavicon();

        }, 45000);
}


// =============================================================
// DESACTIVAR PARPADEO FAVICON
// =============================================================

function desactivarParpadeoFavicon() {

    if (intervaloFavicon) {

        clearInterval(intervaloFavicon);

        intervaloFavicon = null;
    }


    if (timeoutReinicioFavicon) {

        clearTimeout(timeoutReinicioFavicon);

        timeoutReinicioFavicon = null;
    }


    faviconParpadeando = false;


    if (faviconOriginal)
        cambiarFavicon(faviconOriginal);
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
//
// No modifica el HTML de la celda.
// Sólo aplica color al TD para no alterar el ancho
// ni la distribución de las columnas.
// =============================================================

function procesarRequestID(td) {

    if (!td)
        return;

    const texto =
        td.textContent.trim();

    if (!/^(INC|WO|TAS|CRQ)\d+$/i.test(texto))
        return;


    let color = null;


    if (/^INC\d+$/i.test(texto)) {

        color = "#6e7bf0";

    }

    else if (/^(WO|TAS|CRQ)\d+$/i.test(texto)) {

        color = "Violet";

    }


    if (!color)
        return;


    td.style.color = color;
}


    //-------------------------------------------------------------
    // 10. OBSERVER INTELIGENTE (REENGANCHE TRAS REFRESH HELIX)
    //-------------------------------------------------------------

    let observerActivo = null;
    let tablaActual = null;
    let pendiente = false;

    function debouncedColor() {
        if (pendiente) return;
        pendiente = true;

        setTimeout(() => {
            pendiente = false;
            colorearTabla();
          //   setTimeout(estilizarTooltipIframe, 300);
        }, 120);
    }

    function engancharObserver(tabla) {
        if (observerActivo) {
            observerActivo.disconnect();
            observerActivo = null;
        }

        observerActivo = new MutationObserver(() => debouncedColor());
        observerActivo.observe(tabla.parentElement, { childList: true, subtree: true });
        tablaActual = tabla;
    }

    function vigilarTabla() {
        const tabla = document.querySelector("table.BaseTable");
        if (!tabla) { setTimeout(vigilarTabla, 500); return; }
        if (tabla !== tablaActual) {
            console.log("[Helix] Nueva tabla detectada → reenganchando observer");
            engancharObserver(tabla);
            colorearTabla();
        }
        setTimeout(vigilarTabla, 2000);
    }

    vigilarTabla();
/*
    //-------------------------------------------------------------
    // 11. TOOLTIP IFRAME
    //-------------------------------------------------------------

    function estilizarTooltipIframe() {
        const iframe = document.querySelector("iframe[src=\"javascript:'<HTML></HTML>'\"]");
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument;
            if (!doc) return;
            const divInterno = doc.querySelector("div[style*='SmallTooltip3.png']");
            if (!divInterno) return;
            divInterno.style.backgroundImage = "none";
            divInterno.style.background = "#5a5a5a";
            divInterno.style.backgroundColor = "#5a5a5a";
            doc.querySelectorAll("td").forEach(td => td.style.color = "#ffffff");
        } catch (e) {}
    }

*/

/*

    //-------------------------------------------------------------
    // 12. ATOM | Entradas para uBlock Origin
    //-------------------------------------------------------------


! ! 27 Nov 2025 https://atomgencat.onbmc.com | ATOM Elementos

 atomgencat.onbmc.com###WIN_10_304196200 > .PageBodyHorizontal
 atomgencat.onbmc.com###WIN_9_304196200 > .PageBodyHorizontal
 atomgencat-dwp.onbmc.com###cb925583-e19f-d33e-d184-0de5920527b3 > .ng-star-inserted.dynamic-container--margin-y-none.row-container__wrapper > .container.row-block__content-wrapper
 ||atomgencat.onbmc.com/arsys/imagepool/SHR%3ASHR%3AConsole-Banner-Slice%21onbmc-s$image
 ||atomgencat.onbmc.com/arsys/imagepool/SHR%3ASHR%3AConsole-Banner-Slice%21onbmc-s?cid=1$image
 atomgencat.onbmc.com###WIN_0_303635200 > .PageBodyVertical
 atomgencat.onbmc.com###WIN_0_304248710 > .PageBodyHorizontal
 atomgencat.onbmc.com###WIN_1_80101 > .PageBodyVertical
 atomgencat.onbmc.com##.ardbn1_1_header.arfid80022.noscroll.StackPanel
 atomgencat.onbmc.com###WIN_3_304196200 > .PageBodyHorizontal
 atomgencat.onbmc.com###WIN_0_303635200 > .PageBodyVertical
 atomgencat.onbmc.com###WIN_6_304196200 > .PageBodyHorizontal
 atomgencat.onbmc.com###WIN_7_304196200 > .PageBodyHorizontal
 atomgencat.onbmc.com###WIN_5_304196200 > .PageBodyHorizontal
 atomgencat.onbmc.com###WIN_0_304279480 > .PageBodyHorizontal > .pbChrome.PageBody

 atomgencat.onbmc.com###WIN_1_80101 > .PageBodyVertical
 atomgencat.onbmc.com##.ardbn1_1_header.arfid80022.noscroll.StackPanel
 atomgencat.onbmc.com###WIN_5_304196100 > .PageHolderStackViewResizable > .PageHolderStackViewFixedCH > .ardbnz2PL_Nav.arfid304196200.StackPanel
 atomgencat.onbmc.com###WIN_4_304196200 > .PageBodyHorizontal

! ! Feb 13, 2026 https://atomgencat.onbmc.com | ATOM ToolTip
! Revisar la siguiente entrada | Pierde el Fondo --
||atomgencat.onbmc.com/arsys/sharedresources/image/SmallTooltip3.png?server=onbmc-s$image,domain=atomgencat.onbmc.com,important
||atomgencat.onbmc.com/arsys/sharedresources/image/WorkOrderSubmitterTooltip.png?server=onbmc-s$image,domain=atomgencat.onbmc.com,important
! atomgencat.onbmc.com###artooltip.divToolTipHtml

! ! 27 Feb 2026 https://atomgencat.onbmc.com
||atomgencat.onbmc.com/arsys/imagepool/SHR%3ASHR%3A5ProcessButton$image
||atomgencat.onbmc.com/arsys/sharedresources/image/SmallTooltip1.png$image,domain=atomgencat.onbmc.com
||atomgencat.onbmc.com/arsys/imagepool/SHR%3ASHR%3AHPD_Help+Desk_399990344_561006988%21onbmc-s?cid=1772659153988$image
||atomgencat.onbmc.com/arsys/imagepool/SHR%3ASHR%3AHPD_Help+Desk_399990344_561006988%21onbmc-s$image
atomgencat.onbmc.com##.ardbnDummyRightMarginPanel
atomgencat.onbmc.com###WIN_1_80021 > .PageBodyVertical > .pbChrome.PageBody
atomgencat.onbmc.com###WIN_1_80021 > .PageBodyVertical
||atomgencat.onbmc.com/arsys/resources/images/titlebar.jpg$image,domain=atomgencat.onbmc.com
atomgencat.onbmc.com###WIN_0_80085 > .PageBodyVertical



! 25 Aug 2026 https://atomgencat.onbmc.com
atomgencat.onbmc.com##.ardbnz2PL_FormControlLeft.arfid304255210.StackPanel

! 27 Aug 2026 https://atomgencat.onbmc.com
atomgencat.onbmc.com##.Char.ardbnf01_chr_ServiceRegistreInicial.arfid2010717515.dfro.df
atomgencat.onbmc.com##.Char.ardbnf01_chr_nivelfuncional1.arfid2010450060.df
atomgencat.onbmc.com##.Char.ardbnf01_chr_nivelfuncional2.arfid2010450061.df
atomgencat.onbmc.com##.Char.ardbnf01_chr_CustomerPersonID.arfid2010250802.df
atomgencat.onbmc.com##.Char.ardbnf01_chr_CustomerEmail.arfid2010250803.df


---------------------------------------------------------------------------------------------------------
*/

/*
    //////////////////     Desactivado | Sólo Tests | Ubicar Bajo CSS GLOBAL |       //////////////////

	//-------------------------------------------------------------
	// MODIFICAR FONDO REAL DEL TOOLTIP (Iframe Interno BMC)
	//-------------------------------------------------------------
	function estilizarTooltipIframe() {
		const iframe = document.querySelector("iframe[src=\"javascript:'<HTML></HTML>'\"]");
		if (!iframe) return;

		try {
			const doc = iframe.contentDocument;
			if (!doc) return;

			const divInterno = doc.querySelector("div[style*='SmallTooltip3.png']");
			if (!divInterno) return;

			// Quitar imagen de fondo
			divInterno.style.backgroundImage = "none";
			divInterno.style.background = "#5a5a5a";
			divInterno.style.backgroundColor = "#5a5a5a";

			// Cambiar texto
			doc.querySelectorAll("td").forEach(td => {
				td.style.color = "#ffffff";
			});

		} catch (e) {
			// Por si el iframe aún no está listo
		}
	}

	++++++++++++++++++++++++++++++++++++++++++++++++++++++
	Ahora haz que se ejecute cuando aparezca tooltip

			Añade esto dentro de tu debouncedColor():

			setTimeout(estilizarTooltipIframe, 300);
	++++++++++++++++++++++++++++++++++++++++++++++++++++++


    //-------------------------------------------------------------
    // DESACTIVAR TOOLTIP BMC (divToolTipHtml)
    //-------------------------------------------------------------
    const styleNoTooltip = document.createElement("style");
    styleNoTooltip.textContent = `
    #divToolTipHtml,
    .divToolTipHtml {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
	`;
    document.head.appendChild(styleNoTooltip);

     /////////////////////////////    Desactivado | Sólo Tests     ///////////////////////////////

*/

})();
