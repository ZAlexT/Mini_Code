// GiXplorer_github-provider.js

"use strict";

// GitHub Provider
const GitHubProvider = {

    contractVersion: 1,

    id: "github",
    name: "GitHub",

    website: "https://github.com",
    api: "https://api.github.com",

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