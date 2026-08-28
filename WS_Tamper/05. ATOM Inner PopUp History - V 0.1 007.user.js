// ==UserScript==
// @name         05. ATOM Inner PopUp History | V 0.1 007
// @namespace    http://tampermonkey.net/
// @version      0.1.007
// @match        https://atomgencat.onbmc.com/arsys/forms/onbmc-s/HPD%3AHelp+Desk+Dialogs/Work+Info+History+View/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ============================================================
    // Solo en Work Info History
    // ============================================================

    if (
    !location.pathname.includes("/Work+Info+History+View/")
)
    return;

    // ============================================================
    // CONFIG
    // ============================================================

    const CONFIG = {

        background : "#2b2b2b",
        foreground : "#e0e0e0"

    };

    // ============================================================
    // REGLAS
    // ============================================================

    const REGLAS = [


					// ============================================================
					// 							MIXED
					// ============================================================


        { texto:
`Gestionem l'assistència del tècnic presencial

PREGUEM NO RESPONDRE AQUEST CORREU  `,

            color:"#4a84ec", bold:false },
        { texto:
`Hola,

T'informem que, per tal de poder continuar amb la resolució de la sol·licitud REQ000013434827 relativa a sala 2 del juzgados del vendrell, necessitem que ens facilitis les dades següents:

Ens pot verificar si es refereix que no es visualitza be la TV de la sala de vistes ? O a la pantalla del pc de la sala de vistes?

Pots aportar-nos la informació mitjançant el Portal d’Àtom o utilitzant aquest enllaç: respondre al requeriment d’informació.

Si necessites qualsevol aclariment, contacta amb nosaltres fent referència al número de sol·licitud.
Gràcies,


Assistència tecnològica omnicanal
Tel: 900 82 82 82
atomgencat.onbmc.com
Si has trobat alguna mancança en el servei pots contactar amb nosaltres a través dels canals d'Àtom indicats en aquest correu. Si es tracta d'una resolució incorrecta o incompleta, pots tramitar-la a portal d’Àtom.

Informació bàsica sobre protecció de dades
Tractament: Operativa de les TIC.
Responsable: Centre de Telecomunicacions i Tecnologies de la Informació de la Generalitat de Catalunya.
Finalitat: Resolució d'incidències, consultes, peticions i canvis sobre els serveis TIC que presta el CTTI.
Drets de les persones interessades: Sol·licitar l'accés, rectificació o supressió de les dades, i la limitació o l'oposició al tractament. Per exercir aquests drets disposa de més informació a enllaç
Més informació: enllaç `,

            color:"grey", bold:false},
        { texto:
`Motiu de l'escalat: [Manca de previsió / A sol·licitud de l'usuari / A sol·licitud de responsable CTTI/ Temps de resolució excessiu / Estat incorrecte]
Preguem prioritzeu les accions necessàries per a resoldre el tiquet o l’actualitzeu informant a l’usuari de la data prevista de resolució. `,

            color:"red", bold:false },
        { texto:
`System Assignment
Status has been changed to Assigned `,

            color:"grey", bold:false },
         { texto:
`System Assignment
Status has been changed to In Progress`,

            color:"grey", bold:false },
         { texto:
` System Assignment
Status has been changed to Pending`,

            color:"grey", bold:false },
        { texto:
`Remedy Application Service, Email
This ticket was created from the service request system.`,

            color:"yellow", bold:false },
         { texto:
`TRUNCATE WARNING
Value does not fall within the limits specified for the field and has been truncated.Work Order Application-WO000000`,

            color:"grey", bold:false },
         { texto:
`Remedy Application Service,
This ticket was created from the service request system. `,

            color:"yellow", bold:false },
         { texto:
`System Assignment
Status has been changed to Resolved`,

            color:"green", bold:false },

        { texto:
`AR_ESCALATOR, System Assignment
Status has been changed to In Progress`,

            color:"#4FC3F7"
        },
        { texto:
`, AR_ESCALATOR, System Assignment
Status has been changed to In Progress`,

            color:"#4FC3F7" },
        { texto:
`L’informem que per tal de poder seguir amb la resolució demanem que ens faciliti les següents dades:
Necesitem captura de pantalla .
Restem a l'espera,
Gràcies i salutacions.

Pots aportar-nos la informació responent aquest correu.

Si necessites qualsevol aclariment, contacta amb nosaltres fent referència al número de sol·licitud.Gràcies,
Si has trobat alguna mancança en el servei pots contactar amb nosaltres responent a aquest correu.
Informació bàsica sobre protecció de dadesTractament: Operativa de les TIC.Responsable: Centre de Telecomunicacions i Tecnologies de la Informació de la Generalitat de Catalunya.Finalitat: Resolució d'incidències, consultes, peticions i canvis sobre els serveis TIC que presta el CTTI.Drets de les persones interessades: Sol·licitar l'accés, rectificació o supressió de les dades, i la limitació o l'oposició al tractament. Per exercir aquests drets disposa de més informació a enllaçMés informació: enllaç`,

            color:"grey" },
        { texto:
`Si necessites qualsevol aclariment, el pots sol·licitar mitjançant el Portal d'Àtom o bé posant-te en contacte amb nosaltres amb el número de sol·licitud.Gràcies,
Assistència tecnològica omnicanal
Tel: 900 82 82 82
atomgencat.onbmc.com
Si has trobat alguna mancança en el servei pots contactar amb nosaltres a través dels canals d'Àtom indicats en aquest correu. Si es tracta d'una resolució incorrecta o incompleta, pots tramitar-la a portal d’Àtom.
Informació bàsica sobre protecció de dadesTractament: Operativa de les TIC.Responsable: Centre de Telecomunicacions i Tecnologies de la Informació de la Generalitat de Catalunya.Finalitat: Resolució d'incidències, consultes, peticions i canvis sobre els serveis TIC que presta el CTTI.Drets de les persones interessades: Sol·licitar l'accés, rectificació o supressió de les dades, i la limitació o l'oposició al tractament. Per exercir aquests drets disposa de més informació a enllaçMés informació: enllaç`,

            color:"#9E9E9E" },
        { texto:
`Si necessites qualsevol aclariment, el pots sol·licitar mitjançant el Portal d'Àtom o bé posant-te en contacte amb nosaltres amb el número de sol·licitud.

Gràcies,
Assistència tecnològica omnicanal
Tel: 900 82 82 82
atomgencat.onbmc.com
Si has trobat alguna mancança en el servei pots contactar amb nosaltres a través dels canals d'Àtom indicats en aquest correu. Si es tracta d'una resolució incorrecta o incompleta, pots tramitar-la a portal d’Àtom.
Informació bàsica sobre protecció de dadesTractament: Operativa de les TIC.Responsable: Centre de Telecomunicacions i Tecnologies de la Informació de la Generalitat de Catalunya.Finalitat: Resolució d'incidències, consultes, peticions i canvis sobre els serveis TIC que presta el CTTI.Drets de les persones interessades: Sol·licitar l'accés, rectificació o supressió de les dades, i la limitació o l'oposició al tractament. Per exercir aquests drets disposa de més informació a enllaçMés informació: enllaç `,

            color:"#9E9E9E" },

					// ============================================================
					// 							DNIs
					// ============================================================

        { texto:`46725918S,`									,color:"orange" },
        { texto:`43435552Y`,									color:"#6e7bf0", 	bold:false }, // F
        { texto:`52069097H`,									color:"#6e7bf0", 	bold:false }, // B
        { texto:`43574331A`,									color:"#6e7bf0", 	bold:false }, // J
        { texto:`55363993A`,									color:"#4a84ec", 	bold:false }, // J Maq
        { texto:`35097569Y`,									color:"#4a84ec", 	bold:false }, // P Maq
        { texto:`43512561B`,									color:"#4a84ec", 	bold:false }, // O Maq

        			// ============================================================
					// 							ARC
					// ============================================================

        { texto:`Assignat a : X03_ARCONTE_GSV`,					color:"#6e7bf0", 	bold:false },
        { texto:`Assignat a : X03_ARCONTE_GSV `,				color:"#6e7bf0", 	bold:false },
        { texto:`Assignat a X03_ARCONTE_GSV`,					color:"#6e7bf0", 	bold:false },
        { texto:`AM01_23 - ADMINISTRACIÓ JUSTÍCIA`, 			color:"brown", 		bold:false },
        { texto:`integracioitsm_AM01_23`,						color:"brown", 		bold:false },
        { texto:`Other`,										color:"grey", 		bold:false },
        { texto:`Grup d'Assignació: AM01_23-N3-FOWJ `,			color:"red", 		bold:false },
        { texto:`assistencia@atom.gencat.cat`,					color:"yellow", 	bold:false },
        { texto:`Assignat a : `,								color:"grey", 		bold:false },
        { texto:`ESCALAT N1`,									color:"red", 		bold:false },
        { texto:`Nivell escalat`,								color:"red", 		bold:false },

					// ============================================================
					// 							MIXED
					// ============================================================


        { texto:`, AR_ESCALATOR, `,          					 color:"grey", bold:false },
        { texto:`integracioCRM_ES_B4`,          				 color:"#9E9E9E" },
        { texto:`T'informem que, tal i com ens has indicat, la sol·licitud es reactivarà el dia`,	color:"#9E9E9E" },
        { texto:`This ticket was created from the service request system.`,  	color:"yellow", bold:false },
        { texto:`S'ha creat la relació amb la incidència massiva:`,	color:"red", bold:false },
        { texto:`, Remedy Application Service, Email`,	        color:"grey", bold:false },
        { texto:`CU_FIXA_TELEFONIA FIXA`,						color:"yellow", bold:false },
        { texto:`ES_B4_UTE T-SYSTEMS - INDRA`,					color:"yellow", bold:false },
        { texto:`, Remedy Application Service,`,				color:"grey", bold:false },
        { texto:`, Remedy Application Service, Email `,			color:"grey" },
        { texto:`Email `,										color:"grey" },

					// ============================================================
					// 						INFO MAQUINARI
					// ============================================================

        { texto:`Informació de la màquinaria, dades del DA:`,	color:"orange", bold:false },
        { texto:`Marca:`,										color:"green", bold:false },
        { texto:`Model:`,										color:"green", bold:false },
        { texto:`Número de sèrie:`,								color:"green", bold:false },
        { texto:`Usuari:`,										color:"green", bold:false },
        { texto:`Sistema operatiu:`,							color:"green", bold:false },
        { texto:`Ip1:`,											color:"green", bold:false },
        { texto:`Arquitectura:`,								color:"green", bold:false },
        { texto:`Dades adicionals 1:`,							color:"green", bold:false },
        { texto:`Ip2:`,											color:"green", bold:false },
        { texto:`Dades adicionals 2:`,							color:"green", bold:false },
        { texto:`Adreça mac:`,									color:"green", bold:false },
        { texto:`Correu:`,										color:"green", bold:false },
        { texto:`Departament:`,									color:"green", bold:false },
        { texto:`Organisme:`,									color:"green", bold:false },
        { texto:`Hostname:`,									color:"green", bold:false },
        { texto:`Nom Domini:`,									color:"green", bold:false }

    ];

    // ============================================================
    // INIT
    // ============================================================

    intentarTransformar();

    console.log("History check", Date.now());

const HISTORY_CHECK_INTERVAL = 300;

const historyTimer = setInterval(() => {

    const textarea = document.querySelector(
        'div[ardbn="z1D_WorkInfoToolTip_Info"] textarea'
    );

    if (!textarea)
        return;

    if (textarea.dataset.historyDone)
        return;

    if (!textarea.value)
        return;

    if (textarea.value.trim().length < 20)
        return;

    clearInterval(historyTimer);

    textarea.dataset.historyDone = "1";

    transformar(textarea);

}, HISTORY_CHECK_INTERVAL);

    // ============================================================
    // FUNCTIONS
    // ============================================================

    function intentarTransformar(){

        const textarea = document.querySelector(
            'div[ardbn="z1D_WorkInfoToolTip_Info"] textarea'
        );

        if (!textarea) {
            console.log("No textarea");
            return;
        }

        if (textarea.dataset.historyDone) {
            console.log("Ya transformado");
            return;
        }

        if (!textarea.value) {
            console.log("Textarea vacío");
            return;
        }

        if (textarea.value.trim().length < 20) {
            console.log("Texto corto");
            return;
        }

        textarea.dataset.historyDone="1";

        transformar(textarea);

    }

    function transformar(textarea){

        const wrapper = textarea.parentElement;

        const div = document.createElement("div");

        div.dataset.atomHistory = "1";
        div.style.whiteSpace = "pre-wrap";
        div.style.padding = "8px";
        div.style.height = textarea.style.height || "100%";
        div.style.width = textarea.style.width || "100%";
        div.style.overflow = "auto";
        div.style.background = CONFIG.background;
        div.style.color = CONFIG.foreground;
        div.style.userSelect = "text";
        div.style.cursor = "text";
        div.style.fontFamily = "inherit";
        div.style.fontSize = "inherit";
        div.style.boxSizing = "border-box";

        let html = escapeHTML(textarea.value);

        html = aplicarReglas(html);

        div.innerHTML = html;

        textarea.style.display="none";

        wrapper.insertBefore(div, textarea.nextSibling);

    }

    function aplicarReglas(html){

        REGLAS.forEach(regla=>{

            const patron = escapeRegex(regla.texto)
                .replace(/\r?\n/g,"\\s*\\r?\\n");

            const regex = new RegExp(patron,"g");

            const estilo=[];

            estilo.push(`color:${regla.color}`);

            if(regla.bold)
                estilo.push("font-weight:600");

            html = html.replace(
                regex,
                `<span style="${estilo.join(";")}">$&</span>`
            );

        });

        return html;

    }

    function escapeHTML(texto){

        return texto
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;");

    }

    function escapeRegex(texto){

        return texto.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

    }

})();