// CRX VIEWER - Descarga automática de extensiones desde CSV
// UI.Vision RPA 10.0.105 - JS View
//
// CSV esperado:
// Nombre,URL
// Extension 01,https://chromewebstore.google.com/detail/...
// Extension 02,https://chromewebstore.google.com/detail/...
//
// El CSV debe estar en la carpeta de datos de UI.Vision.
// No modifica ni desmonta los ZIP.
// Su única función es descargarlos.

// ======================================================
// CSV
// ======================================================

const rows = uiv.csv.read('extensiones.csv');

const t = uiv.browser;

// ======================================================
// CONFIGURACIÓN - modificar aquí
// ======================================================

const CRX_VIEWER = 'https://robwu.nl/crxviewer/';

const WAIT_VIEWER = '2s';
const WAIT_OPEN   = '12s';
const WAIT_DOWNLOAD = '5s';

// Tiempo máximo para localizar Download
const TIMEOUT_DOWNLOAD = 10;

// ======================================================
// SELECTORES CRX VIEWER
// ======================================================

// Campo donde se introduce la URL de la extensión
const URL_INPUT =
    'css=#advanced-open-form input[name="crx"]';

// Formulario "Open in this viewer"
const OPEN_FORM =
    'css=#advanced-open-form';

// Botón/enlace Download ZIP
const DOWNLOAD =
    'css=#download-link';

// ======================================================
// INICIO
// ======================================================

uiv.log(
    `CSV cargado: ${rows.length} filas`,
    'green'
);

uiv.log(
    '========================================',
    'green'
);

uiv.log(
    'CRX VIEWER - INICIO',
    'green'
);

uiv.log(
    `Extensiones a procesar: ${rows.length - 1}`,
    'blue'
);

uiv.log(
    '========================================',
    'green'
);

// ======================================================
// RECORRER EXTENSIONES
// ======================================================

for (let i = 1; i < rows.length; i++) {

    const row = rows[i];

    const extensionName = row[0];
    const extensionUrl  = row[1];

    uiv.log(
        `========== EXTENSIÓN ${i} / ${rows.length - 1} ==========`,
        'blue'
    );

    uiv.log(
        `Nombre: ${extensionName}`,
        'blue'
    );

    // ==================================================
    // COMPROBAR DATOS
    // ==================================================

    if (!extensionUrl) {

        uiv.log(
            `FALTA URL - se omite: ${extensionName}`,
            'orange'
        );

        continue;
    }

    // ==================================================
    // ABRIR CRX VIEWER
    // ==================================================

    uiv.log(
        'Abriendo CRX Viewer...',
        'blue'
    );

    uiv.open(CRX_VIEWER);

    uiv.sleep(WAIT_VIEWER);

    // ==================================================
    // INTRODUCIR URL
    // ==================================================

    uiv.log(
        'Introduciendo URL...',
        'blue'
    );

    // Asegurar que el campo está vacío
    t.click(URL_INPUT);

    t.type('${KEY_CTRL}A');

    t.type('${KEY_BACKSPACE}');

    // Escribir URL
    t.type(extensionUrl);

    // Dar tiempo a UI.Vision para terminar de introducirla
    uiv.sleep(1);

    // ==================================================
    // OPEN
    // ==================================================

    uiv.log(
        'Pulsando Enter...',
        'blue'
    );

    t.type('${KEY_ENTER}');

    // Esperar a que CRX Viewer procese la extensión
    uiv.log(
        `Esperando carga: ${WAIT_OPEN}s`,
        'blue'
    );

    uiv.sleep(WAIT_OPEN);
	
    // ==================================================
    // COMPROBAR DOWNLOAD
    // ==================================================

    const download = uiv.findElements(
        DOWNLOAD,
        {
            required: false,
            timeout: TIMEOUT_DOWNLOAD
        }
    );

    uiv.log(
        `Download encontrado: ${download.length}`,
        'blue'
    );

    // ==================================================
    // ERROR - NO HAY DOWNLOAD
    // ==================================================

    if (download.length === 0) {

        uiv.log(
            `ERROR: No aparece Download - ${extensionName}`,
            'red'
        );

        // Continuar con la siguiente extensión
        continue;
    }

    // ==================================================
    // DESCARGAR ZIP
    // ==================================================

    uiv.log(
        `Descargando ZIP: ${extensionName}`,
        'green'
    );

    t.click(DOWNLOAD);

    uiv.log(
        `Esperando descarga: ${WAIT_DOWNLOAD}`,
        'blue'
    );

    uiv.sleep(WAIT_DOWNLOAD);

    // ==================================================
    // EXTENSIÓN COMPLETADA
    // ==================================================

    uiv.log(
        `EXTENSIÓN COMPLETADA: ${extensionName}`,
        'green'
    );

    uiv.log(
        '----------------------------------------',
        'blue'
    );
}

// ======================================================
// FIN
// ======================================================

uiv.log(
    '========================================',
    'green'
);

uiv.log(
    'TODAS LAS EXTENSIONES PROCESADAS',
    'green'
);

uiv.log(
    '========================================',
    'green'
);

// ======================================================
// AVISO FINAL
// ======================================================

alert(
    'CRX Viewer\n\n' +
    'Proceso terminado.\n\n' +
    'Las extensiones han sido procesadas.'
);