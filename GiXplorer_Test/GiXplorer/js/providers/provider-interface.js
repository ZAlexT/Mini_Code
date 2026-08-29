// GiXplorer_provider-interface.js

"use strict";

// Contrato común de proveedores
const ProviderInterface = {

    contractVersion: 1,

    id: "",
    name: "",
    website: "",
    api: "",

    auth: {
        type: "token"
    },

    capabilities: {
        read: false,
        write: false,
        move: false,
        delete: false,
        rename: false,
        branches: false,
        commits: false
    },

    connect: async function () {},

    getAccount: async function () {},

    getRepositories: async function () {},

    getTree: async function () {},

    getFile: async function () {},

    createFile: async function () {},

    updateFile: async function () {},

    deleteFile: async function () {},

    moveFiles: async function () {},

    createCommit: async function () {}

};