// ==UserScript==
// @name         04. ATOM Inner PopUp | V 0.1 002
// @namespace    http://tampermonkey.net/
// @version      0.2
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==


// ========================================
// 🎨 ARC POPUP INNER (Work Order Notes)
// ========================================

(function () {

    function transformPopupEditor(root = document) {

        root.querySelectorAll(
            'table.DIVPopup textarea.Editor.readonly'
        ).forEach(textarea => {

            // evitar duplicados
            if (textarea.dataset.arcStyled) return;
            textarea.dataset.arcStyled = "true";

            const wrapper = textarea.parentElement;

            // crear div visual
            const styledDiv = document.createElement("div");
            styledDiv.addEventListener("mousedown", e => e.stopPropagation());
            styledDiv.addEventListener("mouseup", e => e.stopPropagation());
            styledDiv.addEventListener("mousemove", e => e.stopPropagation());
            styledDiv.style.whiteSpace = "pre-wrap";
 //           styledDiv.style.fontFamily = "monospace";
            styledDiv.style.padding = "8px";
            styledDiv.style.height = "100%";
            styledDiv.style.overflow = "auto";
            styledDiv.style.background = "#2b2b2b";
            styledDiv.style.color = "#e0e0e0";
            styledDiv.style.userSelect = "text";
            styledDiv.style.cursor = "text";

            // colorear etiquetas
            const formatted = textarea.value.replace(
                /(^|\n)(\s*>+\s*)([^:\n]+:)/g,
                (match, lineStart, arrows, label) => {
                    return `${lineStart}${arrows}<span style="color:#4FC3F7;font-weight:500;">${label}</span>`;
                }
            );

            styledDiv.innerHTML = formatted;

            // ocultar textarea
            textarea.style.display = "none";

            wrapper.appendChild(styledDiv);
        });
    }

    transformPopupEditor();

    const popupObserver = new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(n => {
                if (n.nodeType === 1) transformPopupEditor(n);
            });
        });
    });

    popupObserver.observe(document.body, { childList: true, subtree: true });

})();


(function() {
    'use strict';

    function aplicarCharcoal() {

        const textareas = document.querySelectorAll(".DIVPopup textarea");

        textareas.forEach(ta => {
            ta.style.setProperty("background-color", "#2b2b2b", "important");
            ta.style.setProperty("color", "white", "important");


        });
    }

    aplicarCharcoal();

    const observer = new MutationObserver(() => {
        aplicarCharcoal();
    });

    observer.observe(document.body, { childList: true, subtree: true });


(function () {
    'use strict';

    function setCharcoal(root = document) {
        root.querySelectorAll(
            'div[ardbn="z1D_WorkInfoToolTip_Info"] textarea.text[readonly]'
        ).forEach(t => {
            t.style.setProperty(
                'background-color',
                '#2b2b2b',
                'important'
            );
            t.style.color = '#e0e0e0';
        });
    }

    // inicial
    setCharcoal();



const style = document.createElement("style");
style.textContent = `
   // -----------------------------------------------
   // Full Window Frame
   //-----------------------------------------------

      // .DIVPopup,
      // .DIVPopup *,
      // .DIVPopupBody,

    .DIVPopupBody * {
        background-color: #2b2b2b !important;
    }
`;
document.head.appendChild(style);


    // dinámico (Helix redibuja)
    const obs = new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(n => {
                if (n.nodeType === 1) setCharcoal(n);
            });
        });
    });

    obs.observe(document.body, { childList: true, subtree: true });
})();

// ==============================
// ⛳ CHARCOAL POPUP BACKGROUND
// ==============================
    const stylePopupOverride = document.createElement("style");
    stylePopupOverride.textContent = `
    textarea[id^="arid_WIN_"][class*="text"] {
        background-color: #2b2b2b !important;
        color: #e0e0e0 !important;
    }
`;
document.head.appendChild(stylePopupOverride);


})();