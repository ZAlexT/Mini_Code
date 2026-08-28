// ==UserScript==
// @name         01. ARC Procedimiento Autofill | V1
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Rellenar Procedimiento
// @author       AL
// @match        https://sc.vistes.justicia.intranet.gencat.cat/arcvistes/M_CATALOGO/CATALOGO_ini.jsp
// @match        https://preproduccio.sc.vistes.justicia.intranet.gencat.cat/arcvistes/M_CATALOGO/CATALOGO_ini.jsp
// @run-at       document-end
// @grant        none
// ==/UserScript==



(function () {
    'use strict';

    function rellenar() {
        const campo = document.querySelector('#numProcedimiento');

        if (!campo) {
            console.log('[TM] Campo no encontrado');
            return;
        }

        const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
        ).set;

        setter.call(campo, '260801/2026');

        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[TM] Campo rellenado:', campo.value);
    }

    setTimeout(rellenar, 1000);
})();