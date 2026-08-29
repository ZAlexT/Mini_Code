// GiXplorer_provider-manager.js

"use strict";

// Proveedores registrados
const providers = {};


// Registrar proveedor
function registerProvider(provider) {

    if (!provider?.id) {
        throw new Error("Proveedor sin ID");
    }

    providers[provider.id] = provider;
}


// Obtener proveedor por ID
function getProvider(id) {

    return providers[id] || null;
}


// Obtener proveedor activo
async function getActiveProvider() {

    const data = await getStorage();

    return getProvider(
        data.settings.activeProvider
    );
}


// Cambiar proveedor activo
async function setActiveProvider(id) {

    if (!providers[id]) {
        throw new Error(`Proveedor no registrado: ${id}`);
    }

    const data = await getStorage();

    await saveStorage({
        settings: {
            ...data.settings,
            activeProvider: id
        }
    });
}


// Lista de proveedores disponibles
function getProviders() {

    return Object.values(providers);
}