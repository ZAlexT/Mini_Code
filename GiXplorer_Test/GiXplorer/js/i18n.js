// GiXplorer_i18n.js

"use strict";

// ============================================================
// TEXTOS DE LA INTERFAZ
// ============================================================

const translations = {

    es: {

        settings: "Configuración",
        provider: "Proveedor",
        user: "Usuario",
        token: "Token",

        testConnection: "Probar conexión",
        configured: "Configurado",
        notConfigured: "Sin configurar",

        confirmations: "Confirmaciones",
        confirmDelete: "Confirmar eliminar",
        confirmMove: "Confirmar mover",
        confirmOverwrite: "Confirmar sobrescribir",

        restoreConfirmations: "Restaurar confirmaciones",
        resetData: "Restablecer datos",

		resetDataConfirm: "¿Restablecer todos los datos de GiXplorer?",

        interface: "Interfaz",
        theme: "Tema",
        language: "Idioma",
		search: "Buscar repositorio, carpeta o archivo...",
		repositories: "Repositorios",
		refresh: "Actualizar",
		selectItem: "Selecciona un repositorio, carpeta o archivo.",
		offline: "Sin conexión",

        dark: "Oscuro",
        light: "Claro",
        system: "Sistema",

        close: "Cerrar",
        cancel: "Cancelar",
        reset: "Restablecer"
    },


    en: {

        settings: "Settings",
        provider: "Provider",
        user: "User",
        token: "Token",

        testConnection: "Test connection",
        configured: "Configured",
        notConfigured: "Not configured",

        confirmations: "Confirmations",
        confirmDelete: "Confirm delete",
        confirmMove: "Confirm move",
        confirmOverwrite: "Confirm overwrite",

        restoreConfirmations: "Restore confirmations",
        resetData: "Reset data",
		
		resetDataConfirm: "Reset all GiXplorer data?",

        interface: "Interface",
        theme: "Theme",
        language: "Language",
		search: "Search repository, folder or file...",
		repositories: "Repositories",
		refresh: "Refresh",
		selectItem: "Select a repository, folder or file.",
		offline: "Offline",

        dark: "Dark",
        light: "Light",
        system: "System",

        close: "Close",
        cancel: "Cancel",
        reset: "Reset"
    }
};


// ============================================================
// OBTENER TEXTO
// ============================================================

function t(key, language = "es") {

    return translations[language]?.[key]
        || translations.es[key]
        || key;
}


// ============================================================
// APLICAR IDIOMA
// ============================================================

function applyLanguage(language) {

    // Textos normales
    document.querySelectorAll("[data-i18n]").forEach(element => {

        const key = element.dataset.i18n;

        element.textContent = t(key, language);
    });


    // Placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {

        const key = element.dataset.i18nPlaceholder;

        element.placeholder = t(key, language);
    });


    // Títulos / tooltips
    document.querySelectorAll("[data-i18n-title]").forEach(element => {

        const key = element.dataset.i18nTitle;

        element.title = t(key, language);
    });
}


// ============================================================
// INICIALIZAR IDIOMA
// ============================================================

async function initLanguage() {

    const data =
        await getStorage();

    applyLanguage(
        data.settings.language
    );
}