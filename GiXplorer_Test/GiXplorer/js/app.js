"use strict";


 
/* GiXplorer_app.js */
/* ============================================================
   DATOS DE PRUEBA
   ------------------------------------------------------------
   Más adelante serán sustituidos por GitHub / Codeberg.
   ============================================================ */

const demoTree = [

    {
        type: "owner",
        name: "ZAlexT",
        open: true,

        children: [

            {
                type: "repo",
                name: "Mini_Code",
                open: true,

                children: [

                    {
                        type: "folder",
                        name: "full",
                        open: false,

                        children: [

                            {
                                type: "file",
                                name: "index.js"
                            },

                            {
                                type: "file",
                                name: "script.js"
                            }

                        ]
                    },

                    {
                        type: "folder",
                        name: "02. ATOM",

                        children: [

                            {
                                type: "file",
                                name: "02. ATOM Index.user.js"
                            },

                            {
                                type: "file",
                                name: "03. ATOM Inner.user.js"
                            }

                        ]
                    },

                    {
                        type: "file",
                        name: "README.md"
                    }

                ]
            },


            {
                type: "repo",
                name: "V_Fun",

                children: [

                    {
                        type: "folder",
                        name: "scripts",

                        children: [

                            {
                                type: "file",
                                name: "example.js"
                            }

                        ]
                    }

                ]
            },


            {
                type: "repo",
                name: "vivaldi_forum_mod"
            },


            {
                type: "repo",
                name: "V_Mix"
            }

        ]
    }

];


const treeElement =
    document.getElementById("tree");

const detailElement =
    document.getElementById("detailPanel");

const themeButton =
    document.getElementById("themeToggle");

const searchInput =
    document.getElementById("search");

const splitter =
    document.getElementById("splitter");

const treePanel =
    document.getElementById("treePanel");

// Configuración
const settingsButton =
    document.getElementById("settings");

const settingsPanel =
    document.getElementById("settingsPanel");

const closeSettings =
    document.getElementById("closeSettings");

const settingsProvider =
    document.getElementById("settingsProvider");

// Configuración de interfaz
const settingsTheme =
    document.getElementById("settingsTheme");

const settingsLanguage =
    document.getElementById("settingsLanguage");

const providerUser =
    document.getElementById("providerUser");

const providerToken =
    document.getElementById("providerToken");

const connectionStatus =
    document.getElementById("connectionStatus");

const confirmDelete =
    document.getElementById("confirmDelete");

const confirmMove =
    document.getElementById("confirmMove");

const confirmOverwrite =
    document.getElementById("confirmOverwrite");

const resetConfirmations =
    document.getElementById("resetConfirmations");

const resetData =
    document.getElementById("resetData");

/* ============================================================
   TREE
   ============================================================ */

function renderTree() {

    treeElement.innerHTML = "";

    demoTree.forEach(item => {

        treeElement.appendChild(
            createTreeItem(item)
        );

    });

}


function createTreeItem(item) {

    const container =
        document.createElement("div");


    const row =
        document.createElement("div");

    row.className = "tree-item";


    const icon =
        document.createElement("span");

    icon.className = "tree-icon";


    const name =
        document.createElement("span");

    name.className = "tree-name";

    name.textContent = item.name;


    icon.textContent =
        getIcon(item);


    row.appendChild(icon);
    row.appendChild(name);

    container.appendChild(row);


    row.addEventListener("click", event => {

        event.stopPropagation();

        selectItem(item, row);

        if (item.children) {

            item.open = !item.open;

            renderTree();

        }

    });


    if (item.children && item.open) {

        const children =
            document.createElement("div");

        children.className =
            "tree-children";


        item.children.forEach(child => {

            children.appendChild(
                createTreeItem(child)
            );

        });


        container.appendChild(children);

    }


    return container;
}


function getIcon(item) {

    switch (item.type) {

        case "owner":
            return "👤";

        case "repo":
            return item.open ? "📂" : "📁";

        case "folder":
            return item.open ? "📂" : "📁";

        case "file":
            return "📄";

        default:
            return "•";
    }

}


/* ============================================================
   SELECTION
   ============================================================ */

let selectedItem = null;


function selectItem(item, row) {

    selectedItem = item;


    document
        .querySelectorAll(".tree-item.selected")
        .forEach(element => {

            element.classList.remove("selected");

        });


    row.classList.add("selected");


    showDetails(item);

}


/* ============================================================
   DETAIL
   ============================================================ */

function showDetails(item) {

    const icon =
        getIcon(item);


    let typeText =
        "Elemento";


    if (item.type === "repo")
        typeText = "Repositorio";

    if (item.type === "folder")
        typeText = "Carpeta";

    if (item.type === "file")
        typeText = "Archivo";


    detailElement.innerHTML = `

        <div style="
            padding: 28px;
        ">

            <div style="
                font-size: 42px;
                margin-bottom: 12px;
            ">
                ${icon}
            </div>

            <h2 style="
                margin: 0 0 8px;
            ">
                ${escapeHtml(item.name)}
            </h2>

            <div style="
                color: var(--text-secondary);
                font-size: 13px;
                margin-bottom: 20px;
            ">
                ${typeText}
            </div>

            <div style="
                padding: 15px;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: var(--panel);
            ">

                <strong>Preparado para GitHub / Codeberg</strong>

                <p style="
                    color: var(--text-secondary);
                    font-size: 13px;
                ">
                    Esta información será sustituida por
                    los datos reales del repositorio.
                </p>

            </div>

        </div>

    `;

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* ============================================================
   TEMA
   ============================================================ */

function setTheme(theme) {

    document.documentElement.dataset.theme =
        theme;

    localStorage.setItem(
        "theme",
        theme
    );


    themeButton.textContent =
        theme === "dark"
            ? "☀️"
            : "🌙";

}


function loadTheme() {

    const saved =
        localStorage.getItem("theme");


    if (saved) {

        setTheme(saved);

        return;

    }


    const prefersDark =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;


    setTheme(
        prefersDark
            ? "dark"
            : "light"
    );

}


themeButton.addEventListener(
    "click",
    () => {

        const current =
            document.documentElement.dataset.theme;

        setTheme(
            current === "dark"
                ? "light"
                : "dark"
        );

    }
);

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

async function loadSettingsPanel() {

    const data = await getStorage();

    const provider =
        data.providers[data.settings.activeProvider];

    settingsProvider.value =
        data.settings.activeProvider;
		
	settingsTheme.value =
		data.settings.theme;

	settingsLanguage.value =
		data.settings.language;

    providerUser.value =
        provider.user;

    providerToken.value =
        provider.token;

    confirmDelete.checked =
        data.confirmations.delete;

    confirmMove.checked =
        data.confirmations.move;

    confirmOverwrite.checked =
        data.confirmations.overwrite;

    connectionStatus.textContent =
        provider.token
            ? "Configurado"
            : "Sin configurar";
}


settingsButton.addEventListener(
    "click",
    async () => {

        await loadSettingsPanel();

        settingsPanel.style.display =
            "flex";
    }
);


closeSettings.addEventListener(
    "click",
    () => {

        settingsPanel.style.display =
            "none";
    }
);

settingsProvider.addEventListener(
    "change",
    async () => {

        const data =
            await getStorage();

        const provider =
            data.providers[settingsProvider.value];

        providerUser.value =
            provider.user;

        providerToken.value =
            provider.token;

        connectionStatus.textContent =
            provider.token
                ? "Configurado"
                : "Sin configurar";
    }
);

async function saveProviderCredentials() {

    const data =
        await getStorage();

    const id =
        settingsProvider.value;

    data.providers[id] = {

        user:
            providerUser.value.trim(),

        token:
            providerToken.value.trim()
    };

    await saveStorage({
        providers: data.providers
    });

    connectionStatus.textContent =
        data.providers[id].token
            ? "Configurado"
            : "Sin configurar";
}


providerUser.addEventListener(
    "change",
    saveProviderCredentials
);


providerToken.addEventListener(
    "change",
    saveProviderCredentials
);

async function saveConfirmations() {

    await saveStorage({
        confirmations: {
            delete: confirmDelete.checked,
            move: confirmMove.checked,
            overwrite: confirmOverwrite.checked
        }
    });
}


confirmDelete.addEventListener(
    "change",
    saveConfirmations
);

confirmMove.addEventListener(
    "change",
    saveConfirmations
);

confirmOverwrite.addEventListener(
    "change",
    saveConfirmations
);

settingsTheme.addEventListener(
    "change",
    async () => {

        const data =
            await getStorage();

        await saveStorage({
            settings: {
                ...data.settings,
                theme: settingsTheme.value
            }
        });

        setTheme(settingsTheme.value);
    }
);

settingsLanguage.addEventListener(
    "change",
    async () => {

        const data =
            await getStorage();

        await saveStorage({
            settings: {
                ...data.settings,
                language: settingsLanguage.value
            }
        });

        applyLanguage(
            settingsLanguage.value
        );
    }
);

resetConfirmations.addEventListener(
    "click",
    async () => {

        const data =
            await getStorage();

        await saveStorage({
            confirmations:
                DEFAULT_CONFIRMATIONS
        });

        confirmDelete.checked = true;
        confirmMove.checked = true;
        confirmOverwrite.checked = true;
    }
);

		resetData.addEventListener(
			"click",
			async () => {

				const data =
					await getStorage();

				const confirmed =
					confirm(
						t(
							"resetDataConfirm",
							data.settings.language
						)
					);

				if (!confirmed)
					return;

				await resetStorage();

				location.reload();
			}
		);

/* ============================================================
   BUSCADOR
   ============================================================ */

searchInput.addEventListener(
    "input",
    () => {

        const text =
            searchInput.value
                .trim()
                .toLowerCase();


        document
            .querySelectorAll(".tree-item")
            .forEach(row => {

                const name =
                    row
                        .querySelector(".tree-name")
                        .textContent
                        .toLowerCase();


                row.style.display =
                    !text || name.includes(text)
                        ? ""
                        : "none";

            });

    }
);


/* ============================================================
   SPLITTER
   ============================================================ */

let resizing = false;


splitter.addEventListener(
    "mousedown",
    () => {

        resizing = true;

        document.body.style.cursor =
            "col-resize";

        document.body.style.userSelect =
            "none";

    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (!resizing)
            return;


        const workspace =
            document.getElementById("workspace");

        const rect =
            workspace.getBoundingClientRect();


        let width =
            event.clientX - rect.left;


        const min =
            160;

        const max =
            rect.width * 0.7;


        width =
            Math.max(
                min,
                Math.min(max, width)
            );


        treePanel.style.width =
            `${width}px`;

    }
);


document.addEventListener(
    "mouseup",
    () => {

        if (!resizing)
            return;


        resizing = false;

        document.body.style.cursor =
            "";

        document.body.style.userSelect =
            "";

    }
);


/* ============================================================
   INICIO
   ============================================================ */

/* ============================================================
   INICIO
   ============================================================ */

// ============================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================================

async function initApp() {

    const data =
        await getStorage();


    // Aplicar tema guardado

    setTheme(
        data.settings.theme
    );


    // Aplicar idioma guardado

    applyLanguage(
        data.settings.language
    );


    // Aplicar ancho guardado del Tree

    treePanel.style.width =
        `${data.settings.treeWidth}px`;


    // Renderizar árbol

    renderTree();
}


initApp();

initApp();