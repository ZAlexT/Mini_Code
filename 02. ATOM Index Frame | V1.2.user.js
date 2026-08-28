// ==UserScript==
// @name         02. ATOM Index Frame | V1.2
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Ajusta los tamaños de BaseTable
// @author       AL
// @match        https://atomgencat.onbmc.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {

    // ==================================================
    // AJUSTES
    // ==================================================

    const WIDTH     = 550; // Ancho
    const HEIGHT    = 204; // Alto
    const MAX_WIDTH = 550; // Barra Suoerior
    const HDR_WIDTH = 540; // Botones Barra Suoerior

    // ==================================================
    // APLICAR
    // ==================================================

  function aplicar() {

    const baseTable = document.querySelector("table.BaseTable");

    if (!baseTable) {
        setTimeout(aplicar, 500);
        return;
    }

    const baseInner = baseTable.parentElement;
    const baseOuter = baseInner?.parentElement;
    const tableInner = baseOuter?.parentElement;

    // ==========================================
    // 1. WIDTH + HEIGHT
    // ==========================================

    if (baseInner) {
        baseInner.style.setProperty("width", `${WIDTH}px`, "important");
        baseInner.style.setProperty("max-width", `${WIDTH}px`, "important");
        baseInner.style.setProperty("height", `${HEIGHT}px`, "important");
        baseInner.style.setProperty("max-height", `${HEIGHT}px`, "important");
    }

    if (baseOuter) {
        baseOuter.style.setProperty("width", `${WIDTH}px`, "important");
        baseOuter.style.setProperty("max-width", `${WIDTH}px`, "important");
        baseOuter.style.setProperty("height", `${HEIGHT}px`, "important");
        baseOuter.style.setProperty("max-height", `${HEIGHT}px`, "important");
    }

    if (tableInner) {
        tableInner.style.setProperty("width", `${WIDTH}px`, "important");
        tableInner.style.setProperty("max-width", `${WIDTH}px`, "important");
        tableInner.style.setProperty("height", `${HEIGHT}px`, "important");
        tableInner.style.setProperty("max-height", `${HEIGHT}px`, "important");
    }

      // ==========================================
      // 2. TABLE HDR
      // ==========================================

      const tableHdr = tableInner
      ? tableInner.parentElement?.querySelector("table.TableHdr")
      : null;

      if (tableHdr) {
          tableHdr.style.setProperty(
              "width",
              `${HDR_WIDTH}px`,
              "important"
          );

          tableHdr.style.setProperty(
              "max-width",
              `${HDR_WIDTH}px`,
              "important"
          );
      }

    // ==========================================
    // 3. CONTENEDOR AR
    // ==========================================

    const arContainer = document.querySelector(
        ".arfid301444200.ardbnz2TH_ConsolidateTable1"
    );

    if (arContainer) {
        arContainer.style.setProperty(
            "max-width",
            `${MAX_WIDTH}px`,
            "important"
        );
    }

    console.log("[ATOM] Tamaños aplicados:", {
        WIDTH,
        HEIGHT,
        MAX_WIDTH,
        HDR_WIDTH
    });
}

setTimeout(aplicar, 3000);

})();
