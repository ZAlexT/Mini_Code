// ==UserScript==
// @name         02.B ATOM Inner Dark Boxes | V1
// @namespace    http://tampermonkey.net/
// @version      V1
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');

    style.textContent = `
        textarea.text.sr[readonly],
        input.text[readonly] {
           /* background-color: transparent !important; */
            background-color: #2b2b2b !important;
        }
    `;

    document.head.appendChild(style);

})();