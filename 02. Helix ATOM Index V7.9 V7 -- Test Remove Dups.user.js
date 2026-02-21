// ==UserScript==
// @name         02. Helix ATOM Index | V7.9 V7 - Test Remove Dups
// @namespace    http://tampermonkey.net/
// @version      V7.9 V7
// @description  ATOM | Colorize + Blinks + ReCheck 2' + ReColorize + Optimized
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log("[Helix V7.9] Iniciado…");

    //-------------------------------------------------------------
    // CONFIG
    //-------------------------------------------------------------
    const CONFIG = {
        fondoEstados: true,
        parpadeoEstados: true // permite parpadeo en Assigned/In Progress/2-High y Usuarios si aplica
    };

    const usuariosBlink = [				// Nombres en Minúscula
		"alejandro lozano morales",		// T-Systems
		"juan luis tortola martinez",	// T-Systems
		"sonia fernandez fernandez"		// T-Systems | Comodín

];

    //-------------------------------------------------------------
    // CSS GLOBAL
    //-------------------------------------------------------------


    //-------------------------------------------------------------
    // ESTILIZAR TOOLTIP BMC (artooltip + divToolTipHtml)
    //-------------------------------------------------------------
    const styleTooltipCustom = document.createElement("style");
    styleTooltipCustom.textContent = `
    #artooltip,
    #artooltip.divToolTipHtml,
    #artooltip * {
        background: 		#161e21 			!important; // https://www.colorhexa.com/161e21 | Charcoal
        background-color: 	#161e21 			!important; // https://www.colorhexa.com/161e21 | Charcoal
        color: 				#ff4500 			!important; // #ffffff | White
    }

    #artooltip {
        border: 1px solid #444 					!important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4) 	!important;
        border-radius: 4px 						!important;
        padding: 6px 8px 						!important;
        font-size: 12px 						!important;
        color: #ff4500 		                	!important;
    }
`;
    document.head.appendChild(styleTooltipCustom);

    const style = document.createElement("style");
    style.textContent = `
        @keyframes helixBlink {
              0% { opacity: 1; }
             50% { opacity: 0.35; }
            100% { opacity: 1; }
        }
        .Lx-blink { animation: helixBlink 1.2s infinite; }
        .Lx-noblink { animation: none !important; }
    `;
    document.head.appendChild(style);



    //-------------------------------------------------------------
    // RESALTADOS // #FB00FF
    //-------------------------------------------------------------

    const resaltados = [

    //-------------------------------------------------------------
    // 						Technicians FUJI
    //-------------------------------------------------------------

        { texto: 'ALEJANDRO LOZANO MORALES', 							color: 'Orange' },
        { texto: 'OVIDIO PARRON MARTINEZ', 								color: 'Grey' },
		{ texto: 'MARIA PILAR CARRILLO SENDER', 						color: 'Grey' },
        { texto: 'Next Text', 						color: 'Grey' },
        { texto: 'Next Text', 						color: 'Grey' },
        { texto: 'Next Text', 						color: 'Grey' },

	//-------------------------------------------------------------
    // 						Technicians T-Systems
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
    // 							Groups
    //-------------------------------------------------------------

        { texto: 'X03_ARCONTE_GSV-N2',									color: '#6e7bf0' },
        { texto: 'X03_ARCONTE_GSV-N3-MAQ', 								color: 'White' },
        { texto: 'X03_ARCONTE_GSV-N3-ESPECIALISTES', 					color: 'Brown' },
        { texto: 'X03_ARCONTE_GSV-N3-SENYAL_INSTITUCIONAL', 			color: 'red' },

    //-------------------------------------------------------------
    // 						Common Entries
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
        { texto: 'Alta Certificats Digitals SSL, Aplicació i Segell', 	color: 'Pink' },
        { texto: 'Scheduled For Approval', 								color: 'Brown' },
        { texto: 'Staged', 												color: 'Brown' },
        { texto: 'Scheduled', 											color: 'Brown' },
        { texto: 'Aplicació de l', 										color: 'Brown' },
        { texto: 'actualització. 2h', 									color: 'Brown' },
        { texto: 'proves. 30m', 										color: 'Brown' },
        { texto: 'marxa enrere. 1h', 									color: 'Brown' },
        { texto: 'Moviments entre videos', 								color: '#6e7bf0' },

    //-------------------------------------------------------------
    // 							Status
    //-------------------------------------------------------------
        { texto: 'Assigned', 											color: 'red', 	fondo: '#ffcccc' },
        { texto: 'In Progress', 										color: 'Green', fondo: '#ccffcc' },
        { texto: '2-High', 												color: 'Red' },

        { texto: 'Reopen', 												color: 'black' },
        { texto: '3-Medium', 											color: 'Orange' },
        { texto: 'Pending', 											color: 'orange' },
        { texto: '4-Low', 												color: 'Grey' },

    //-------------------------------------------------------------
    // 							TYPES
    //-------------------------------------------------------------

        { texto: 'Work Order',  										color: 'Violet' },
        { texto: 'Incident', 											color: 'Grey' },
        { texto: 'WO0000', 												color: 'Violet' },
        { texto: 'TAS000', 												color: 'Violet' },
        { texto: 'CRQ000', 												color: 'Violet' },
        { texto: 'INC0000', 											color: '#6e7bf0' },

        { texto: 'Change', 												color: 'Violet' },
        { texto: 'Task', 												color: 'Violet' }
    ];

    const coloresFecha = {
        reciente : "green",
        media    : "orange",
        antigua  : "red"
    };

    //-------------------------------------------------------------
    // PARSE FECHA
    //-------------------------------------------------------------
    function parseFecha(text) {
        if (!/^\d{2}\/\d{2}\/\d{4}/.test(text)) return null;
        const [f, h] = text.split(" ");
        const [d, m, y] = f.split("/").map(Number);
        const [hh, mm, ss] = h.split(":").map(Number);
        return new Date(y, m - 1, d, hh, mm, ss);
    }

    //-------------------------------------------------------------
    // COLOREAR UNA CELDA (Recibe Si La Fila Tiene Estado Activo)
    //-------------------------------------------------------------
    function colorearTD(td, filaTieneEstado) {
        const original = td.textContent.trim();
        let html = td.innerHTML;

        resaltados.forEach(r => {
            const safe = r.texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const reg = new RegExp(`(${safe})`, "gi");

            html = html.replace(reg, match => {
                // construir estilo base (sin padding)
                let estilos = `color:${r.color}; white-space:nowrap; line-height:inherit; display:inline;`;

                if (CONFIG.fondoEstados && r.fondo) {
                    estilos += `
                        background:${r.fondo};
                        box-decoration-break:clone;
                        -webkit-box-decoration-break:clone;
                    `;
                }

             // Si es usuario con parpadeo condicional
                if (usuariosBlink.includes(r.texto.toLowerCase())) {
                    const clase = (CONFIG.parpadeoEstados && filaTieneEstado) ? "Lx-blink" : "Lx-noblink";
                    return `<span class="${clase}" style="${estilos}">${match}</span>`;
                }

                // Si es estado con parpadeo
                if (CONFIG.parpadeoEstados && (
                    r.texto.toLowerCase() === "assigned" ||
                    r.texto.toLowerCase() === "2-high" ||
                    r.texto.toLowerCase() === "in progress"
                )) {
                    estilos += ` animation: helixBlink 1.2s infinite;`;
                }

                return `<span style="${estilos}">${match}</span>`;
            });
        });

        // Fechas
        const fecha = parseFecha(original);
        if (fecha) {
            const ahora = new Date();
            const diff = (ahora - fecha) / (1000 * 60 * 60 * 24);
            let color = coloresFecha.reciente;
            if (diff >= 2) color = coloresFecha.antigua;
            else if (diff >= 1) color = coloresFecha.media;
            html = `<span style="color:${color}; white-space:nowrap; line-height:inherit;">${original}</span>`;
        }

        td.innerHTML = html;
    }

    //-------------------------------------------------------------
    // PROCESAR TABLA Fila A Fila (Para Decidir Parpadeo Inmediato)
    //-------------------------------------------------------------
    function colorearTabla() {
        const tabla = document.querySelector("table.BaseTable");
        if (!tabla) return;

        const filas = tabla.querySelectorAll("tbody tr");
        filas.forEach(tr => {
            const textoFila = (tr.textContent || "").toLowerCase();
            const filaTieneEstado = (
                textoFila.indexOf("assigned") !== -1 ||
                textoFila.indexOf("in progress") !== -1 ||
                textoFila.indexOf("work in progress") !== -1 ||
                textoFila.indexOf("implementation in progress") !== -1 ||
                textoFila.indexOf("reopen") !== -1
            );

            tr.querySelectorAll("td").forEach(td => colorearTD(td, filaTieneEstado));
        });
    }

    //-------------------------------------------------------------
    // RESPALDO: Actualizar Parpadeo Cada 2min (ligero)
    //-------------------------------------------------------------
    function actualizarParpadeoLX_respaldo() {
        if (!CONFIG.parpadeoEstados) return;
        const filas = document.querySelectorAll("table.BaseTable tbody tr");
        if (!filas || filas.length === 0) return;
        filas.forEach(tr => {
           						const textoFila = (tr.textContent || "")
							.toLowerCase()
							.replace(/\s+/g, " ");

						const estadosBlink = [
							"assigned",
							"in progress"
						];

						const tieneEstado = estadosBlink.some(e => textoFila.includes(e));

            // encontrar spans que contengan exactamente nombre (case-insensitive)
            tr.querySelectorAll("span").forEach(sp => {
                const txt = (sp.textContent || "").trim().toLowerCase();

                if (usuariosBlink.includes(txt)) {
                    if (tieneEstado) {
                        sp.classList.remove("Lx-noblink");
                        sp.classList.add("Lx-blink");
                    } else {
                        sp.classList.remove("Lx-blink");
                        sp.classList.add("Lx-noblink");
                    }
                }
            });

        });
    }

    //-------------------------------------------------------------
    // OBSERVER + DEBOUNCE (sin bloquear)
    //-------------------------------------------------------------
    let pendiente = false;
    function debouncedColor() {
        if (pendiente) return;
        pendiente = true;
        setTimeout(() => {
            pendiente = false;
            // recoloreado completo (fila a fila -> decide parpadeo inmediato)
            colorearTabla();
        }, 120);


    }

    function activarObserver() {
        const tabla = document.querySelector("table.BaseTable");
        if (!tabla) {
            setTimeout(activarObserver, 200);
            return;
        }
        const target = tabla.parentElement;
        const obs = new MutationObserver(() => {
            debouncedColor();
            // actualización rápida de parpadeo tras mutación (para cambios inmediatos)
            setTimeout(actualizarParpadeoLX_respaldo, 250);
        });
        obs.observe(target, { childList: true, subtree: true });

        // Inicial
        colorearTabla();
        actualizarParpadeoLX_respaldo();
    }

	//-------------------------------------------------------------
	// AUTO-RECOLOR general y respaldo parpadeo (cada 160s = 2m 40s)
	// CPU-friendly: el Observer sigue gestionando cambios inmediatos
	//-------------------------------------------------------------
    setInterval(colorearTabla, 160000);					// Reaplicar colores de seguridad
    setInterval(actualizarParpadeoLX_respaldo, 160000); // Respaldo parpadeo Alejandro


    //-------------------------------------------------------------
    // ALERTA VISUAL EN PESTAÑA (FAVICON ROJO SI HAY ASSIGNED)
    //-------------------------------------------------------------

    let faviconOriginal = null;
    let faviconRojo = null;
    let faviconParpadeando = false;
    let intervaloFavicon = null;

    // Crear Favicon Rojo Dinámico (Círculo Rojo)
    function crearFaviconRojo() {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fill();

        return canvas.toDataURL("image/png");
    }

    // Obtener favicon actual
    function obtenerFaviconActual() {
        const link = document.querySelector("link[rel*='icon']");
        return link ? link.href : null;
    }

    // Cambiar Favicon
    function cambiarFavicon(url) {
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = url;
    }

    // Verificar si hay Assigned
    function hayAssigned() {
        const tabla = document.querySelector("table.BaseTable");
        if (!tabla) return false;
        return tabla.textContent.toLowerCase().includes("assigned");
    }

    // Activar parpadeo
    function activarParpadeoFavicon() {
        if (faviconParpadeando) return;

        faviconOriginal = obtenerFaviconActual();
        faviconRojo = crearFaviconRojo();
        faviconParpadeando = true;

        intervaloFavicon = setInterval(() => {
            const actual = document.querySelector("link[rel*='icon']").href;
            cambiarFavicon(actual === faviconRojo ? faviconOriginal : faviconRojo);
        }, 1000);
    }

    // Desactivar parpadeo
    function desactivarParpadeoFavicon() {
        if (!faviconParpadeando) return;

        clearInterval(intervaloFavicon);
        faviconParpadeando = false;
        cambiarFavicon(faviconOriginal);
    }

    // Revisión ligera cada 2 minutos
    setInterval(() => {
        if (hayAssigned()) {
            activarParpadeoFavicon();
        } else {
            desactivarParpadeoFavicon();
        }
    }, 120000);

    //-------------------------------------------------------------
	// INICIO
	//-------------------------------------------------------------

    activarObserver();


/*

    //-------------------------------------------------------------
    // ATOM | Entradas para uBlock Origin
    //-------------------------------------------------------------

		! ATOM Elementos | 27 Nov 2025 https://atomgencat.onbmc.com | ATOM Elementos
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

		! ATOM Tooltip | Feb 13, 2026 https://atomgencat.onbmc.com | ATOM ToolTip
		||atomgencat.onbmc.com/arsys/sharedresources/image/SmallTooltip3.png?server=onbmc-s$image,domain=atomgencat.onbmc.com,important
		||atomgencat.onbmc.com/arsys/sharedresources/image/WorkOrderSubmitterTooltip.png?server=onbmc-s$image,domain=atomgencat.onbmc.com,important
		! atomgencat.onbmc.com###artooltip.divToolTipHtml


---------------------------------------------------------------------------------------------------------

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
