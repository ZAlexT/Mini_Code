// GiXplorer_codeberg-provider.js

"use strict";

// Codeberg Provider
const CodebergProvider = {

    contractVersion: 1,

    id: "codeberg",
    name: "Codeberg",

    website: "https://codeberg.org",
    api: "https://codeberg.org/api/v1",

    auth: {
        type: "token"
    },

    capabilities: {
        read: true,
        write: false,
        move: false,
        delete: false,
        rename: false,
        branches: true,
        commits: true
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