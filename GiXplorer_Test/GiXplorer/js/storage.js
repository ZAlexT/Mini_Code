"use strict";

// Configuración general
const DEFAULT_SETTINGS = {
    theme: "dark",
    language: "es",
    treeWidth: 190,
    activeProvider: "github"
};

// Credenciales independientes por proveedor
const DEFAULT_PROVIDERS = {
    github: {
        user: "",
        token: ""
    },

    codeberg: {
        user: "",
        token: ""
    }
};

// Confirmaciones independientes
const DEFAULT_CONFIRMATIONS = {
    delete: true,
    move: true,
    overwrite: true
};


// Leer configuración
async function getStorage() {

    const data = await chrome.storage.local.get([
        "settings",
        "providers",
        "confirmations"
    ]);

    return {
        settings: {
            ...DEFAULT_SETTINGS,
            ...data.settings
        },

        providers: {
            ...DEFAULT_PROVIDERS,
            ...data.providers
        },

        confirmations: {
            ...DEFAULT_CONFIRMATIONS,
            ...data.confirmations
        }
    };
}


// Guardar configuración
async function saveStorage(data) {

    await chrome.storage.local.set(data);
}


// Restablecer datos
async function resetStorage() {

    await chrome.storage.local.clear();
}