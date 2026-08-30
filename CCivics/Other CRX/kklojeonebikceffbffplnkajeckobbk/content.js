//---------------------------------- GLOBAL STATE ----------------------------------
if (window.__gcBulkEditLoaded) {
} else {
  window.__gcBulkEditLoaded = true;

  const DEBUG_MODE = false;

  const logger = {
    log: (...args) => {
      if (DEBUG_MODE) console.log("[GC-Bulk]", ...args);
    },
    warn: (...args) => {
      if (DEBUG_MODE) console.warn("[GC-Bulk]", ...args);
    },
    error: (...args) => {
      if (DEBUG_MODE) console.error("[GC-Bulk]", ...args);
    },
  };

  let isSelecting = false;
  let startX, startY;
  let selectionBox;
  let selected = [];
  let isKeyboardSelecting = false;
  let altPressed = false;
  let ctrlPressed = false;
  let shiftPressed = false;
  let dragStartY = 0;
  let draggedEventId = null;
  let moveDialogOverlay = null;
  let moveDialogOpen = false;
  let colorDialogOverlay = null;
  let colorDialogOpen = false;
  let renameDialogOverlay = null;
  let renameDialogOpen = false;
  let contextMenuOverlay = null;
  let swapMode = false;
  let selectMode = false;
  let selectModeOverlay = null;
  let swapFirstSelection = [];
  let swapOverlay = null;
  let specificSwapMode = false; // false = Quick Day Swap (default), true = Specific Swap
  let copiedEvents = [];
  let pasteDialogOverlay = null;
  let pasteDialogOpen = false;
  let editBoundariesDialogOverlay = null;
  let editBoundariesDialogOpen = false;
  let undoInProgress = false;
  let eventsBeforeMostRecentChange = [];

  const head = document.head;

  //----------------------------- SELECTION HIGHLIGHT CSS ----------------------------
  const selectionStyleSheet = document.createElement("style");
  selectionStyleSheet.id = "gc-bulk-selection-styles";
  selectionStyleSheet.textContent = `
  :root {
    --gc-highlight-color: #4285f4;
    --gc-highlight-text: white;
  }
  .gc-bulk-selected {
    background-color: var(--gc-highlight-color) !important;
    box-shadow: inset 0 0 0 2px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.3) !important;
  }
  /* Force inner divs to be transparent so highlight shows through.
     These classes are used by GCal for event chip backgrounds. */
  .gc-bulk-selected > div,
  .gc-bulk-selected .lhydbb,
  .gc-bulk-selected .EI28Dd,
  .gc-bulk-selected .GTG3wb {
    background-color: transparent !important;
  }
  /* For events in the expanded all-day row (qLWd9c container), 
     apply color to inner button div instead of outer chip */
  .qLWd9c .gc-bulk-selected {
    background-color: transparent !important;
  }
  .qLWd9c .gc-bulk-selected > div[role="button"] {
    background-color: var(--gc-highlight-color) !important;
  }
  /* Text color for elements that need it (month/schedule view) */
  .gc-bulk-selected.gc-needs-text-color,
  .gc-bulk-selected.gc-needs-text-color span:not(.x5FT4e),
  .gc-bulk-selected.gc-needs-text-color div:not(.x5FT4e) {
    color: var(--gc-highlight-text) !important;
  }
  /* Swap mode first selection styling */
  .gc-swap-first-selection {
    background-color: rgba(156, 39, 176, 0.3) !important;
    outline: 2px dashed #9c27b0 !important;
    outline-offset: -2px !important;
  }
  /* Force inner divs transparent for swap selection too */
  .gc-swap-first-selection > div,
  .gc-swap-first-selection .lhydbb,
  .gc-swap-first-selection .EI28Dd,
  .gc-swap-first-selection .GTG3wb {
    background-color: transparent !important;
  }
  /* For events in the expanded all-day row, apply swap styling to inner button */
  .qLWd9c .gc-swap-first-selection {
    background-color: transparent !important;
    outline: none !important;
  }
  .qLWd9c .gc-swap-first-selection > div[role="button"] {
    background-color: rgba(156, 39, 176, 0.3) !important;
    outline: 2px dashed #9c27b0 !important;
    outline-offset: -2px !important;
  }
  .gc-swap-first-selection.gc-needs-text-color,
  .gc-swap-first-selection.gc-needs-text-color span:not(.x5FT4e),
  .gc-swap-first-selection.gc-needs-text-color div:not(.x5FT4e) {
    color: #4a148c !important;
  }
`;
  document.head.appendChild(selectionStyleSheet);

  function updateHighlightColorCSS(color) {
    const textColor = getContrastTextColor(color);
    document.documentElement.style.setProperty("--gc-highlight-color", color);
    document.documentElement.style.setProperty(
      "--gc-highlight-text",
      textColor,
    );
  }

  //----------------------------- SHARED UTILITIES ----------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isTransientStatus = (s) => s === 429 || (s >= 500 && s < 600);

  // Global cancellation flag for batch operations
  window.gcBulkCancelled = false;

  // Reset cancellation flag - call at start of each batch operation
  function resetCancellation() {
    window.gcBulkCancelled = false;
  }

  // Check if operation was cancelled
  function isCancelled() {
    return window.gcBulkCancelled;
  }

  const runWithConcurrency = async (items, fn, limit, onProgress) => {
    const results = [];
    const executing = new Set();
    let processed = 0;

    for (const item of items) {
      // Check for cancellation before starting new item
      if (window.gcBulkCancelled) {
        break;
      }

      const promise = fn(item).then((result) => {
        executing.delete(promise);
        processed++;
        if (onProgress) onProgress(processed, items.length);
        return result;
      });
      results.push(promise);
      executing.add(promise);

      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }
    // Wait for all currently executing promises to complete
    return Promise.all(results);
  };

  // Default concurrency limit - balanced for API rate limits and performance
  const DEFAULT_CONCURRENCY = 15;

  // Retry configuration for bulk operations - tuned for large operations (hundreds of events)
  // Per-event retry attempts within each batch round
  const MAX_SINGLE_ATTEMPTS = 5;
  // Maximum batch retry rounds (each round retries all failed events with reduced concurrency)
  // Total potential attempts per event = MAX_SINGLE_ATTEMPTS x MAX_RETRY_ROUNDS = 75
  const MAX_RETRY_ROUNDS = 15;

  // Global spinner keyframe (injected once)
  const spinnerStyle = document.createElement("style");
  spinnerStyle.id = "gc-bulk-spinner-style";
  spinnerStyle.textContent = `@keyframes gcBulkSpin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(spinnerStyle);

  // Create non-blocking progress toast in bottom-right corner
  // Returns { overlay, updateText, showCancelled } for updating progress
  // If cancellable is true, adds hover effects and click-to-cancel functionality
  function createProgressToast(id, bgColor, initialText, cancellable = false) {
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.dataset.originalBg = bgColor;
    overlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: ${cancellable ? "auto" : "none"};
    cursor: ${cancellable ? "pointer" : "default"};
    transition: background 0.15s ease;
  `;

    // Add hover effects for cancellable toasts
    if (cancellable) {
      overlay.title = "Click to cancel";

      overlay.addEventListener("mouseenter", () => {
        if (!window.gcBulkCancelled) {
          overlay.style.background = "#8B0000"; // Dark red on hover
        }
      });

      overlay.addEventListener("mouseleave", () => {
        if (!window.gcBulkCancelled) {
          overlay.style.background = overlay.dataset.originalBg;
        }
      });

      overlay.addEventListener("click", () => {
        if (!window.gcBulkCancelled) {
          window.gcBulkCancelled = true;
          // Immediately show cancelling feedback
          textSpan.textContent = "Attempting Cancel...";
          overlay.style.background = "#8B0000";
          overlay.style.cursor = "default";
          overlay.title = "";
        }
      });
    }

    const spinner = document.createElement("div");
    spinner.className = "gc-bulk-spinner";
    spinner.style.cssText = `
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: gcBulkSpin 0.8s linear infinite;
  `;

    const textSpan = document.createElement("span");
    textSpan.textContent = initialText;

    overlay.appendChild(spinner);
    overlay.appendChild(textSpan);
    document.body.appendChild(overlay);

    return {
      overlay,
      updateText: (text) => {
        // Don't update text if cancellation is in progress
        if (window.gcBulkCancelled) return;
        textSpan.textContent = text;
      },
      showCancelled: () => {
        // Remove spinner and show cancelled state
        spinner.remove();
        textSpan.textContent = "Attempted Cancel";
        overlay.style.background = "#666";
        overlay.style.pointerEvents = "none";
        overlay.style.cursor = "default";
        overlay.title = "";
      },
    };
  }

  // Remove progress toast by ID
  function removeProgressToast(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.remove();
  }

  // Get auth token with user feedback on failure
  // Returns token string or null if not authenticated
  async function getAuthToken(actionDescription = "perform this action") {
    const authResponse = await chrome.runtime.sendMessage({
      type: "GET_AUTH_TOKEN",
    });
    if (!authResponse.authenticated) {
      alert(`Please sign in first to ${actionDescription}`);
      return null;
    }
    return authResponse.token;
  }

  // Check if any events are from non-primary calendars and prompt user for confirmation
  // Returns true if operation should proceed, false if user cancelled
  // Helper to check if a calendar ID represents a secondary/shared calendar
  // Primary calendars are email-based (@gmail.com, etc.), secondary calendars use @group.calendar.google.com
  function isSecondaryCalendar(calendarId) {
    if (!calendarId || calendarId === "primary") {
      return false;
    }
    // Secondary calendars (created calendars, shared calendars) end with @group.calendar.google.com
    return calendarId.endsWith("@group.calendar.google.com");
  }

  // Fetch single event by ID, returns event data or status info
  // Used to pre-fetch event details before bulk operations
  // Includes retry logic for transient errors (429, 5xx, 403 rate limits)
  // calendarId defaults to "primary" for backward compatibility
  async function fetchEventById(
    token,
    eventId,
    calendarId = "primary",
    calendarName = null,
    attemptNumber = 1,
  ) {
    const maxAttempts = MAX_SINGLE_ATTEMPTS;
    const delay = 500 + attemptNumber * 500; // 1s, 1.5s, 2s, 2.5s, 3s
    const encodedCalendarId = encodeURIComponent(calendarId);

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${eventId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Event already deleted
      if (res.status === 404 || res.status === 410) {
        return { id: eventId, calendarId, calendarName, gone: true };
      }

      // Handle 403 - check if rate limit or permission issue
      if (res.status === 403) {
        try {
          const errorData = await res.json();
          const isRateLimit = errorData?.error?.errors?.some(
            (e) =>
              e.reason === "rateLimitExceeded" ||
              e.reason === "userRateLimitExceeded",
          );
          if (isRateLimit && attemptNumber < maxAttempts) {
            await sleep(delay * 2);
            return fetchEventById(
              token,
              eventId,
              calendarId,
              calendarName,
              attemptNumber + 1,
            );
          }
        } catch (e) {
          // JSON parse failed, treat as permission error
        }
        return {
          id: eventId,
          calendarId,
          calendarName,
          fetchStatus: res.status,
          idOnly: true,
        };
      }

      // Retry on transient errors (rate limit 429 or server errors 5xx)
      if (isTransientStatus(res.status)) {
        if (attemptNumber < maxAttempts) {
          await sleep(delay);
          return fetchEventById(
            token,
            eventId,
            calendarId,
            calendarName,
            attemptNumber + 1,
          );
        }
        return {
          id: eventId,
          calendarId,
          calendarName,
          fetchStatus: res.status,
          idOnly: true,
        };
      }

      if (!res.ok) {
        return {
          id: eventId,
          calendarId,
          calendarName,
          fetchStatus: res.status,
          idOnly: true,
        };
      }
      const eventData = await res.json();
      // Attach calendarId and calendarName to the response for later use
      eventData.calendarId = calendarId;
      if (calendarName) eventData.calendarName = calendarName;
      return eventData;
    } catch (err) {
      // Network error - retry
      if (attemptNumber < maxAttempts) {
        await sleep(delay);
        return fetchEventById(
          token,
          eventId,
          calendarId,
          calendarName,
          attemptNumber + 1,
        );
      }
      return {
        id: eventId,
        calendarId,
        calendarName,
        fetchStatus: "network-error",
        idOnly: true,
      };
    }
  }

  //----------------------------- DARK MODE DETECTOR START ----------------------------
  function detectTheme() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return "light";
    return meta.content;
  }

  // Calculate relative luminance of a color to determine if text should be white or black
  function getContrastTextColor(hexColor) {
    // Handle named colors or invalid input
    if (!hexColor || typeof hexColor !== "string") return "white";

    // Convert named colors to hex
    const namedColors = {
      red: "#ff0000",
      blue: "#0000ff",
      green: "#008000",
      yellow: "#ffff00",
      orange: "#ffa500",
      purple: "#800080",
      pink: "#ffc0cb",
      white: "#ffffff",
      black: "#000000",
      gray: "#808080",
      grey: "#808080",
      cyan: "#00ffff",
      magenta: "#ff00ff",
      lime: "#00ff00",
      aqua: "#00ffff",
      teal: "#008080",
      navy: "#000080",
      maroon: "#800000",
      olive: "#808000",
      silver: "#c0c0c0",
    };

    let hex = hexColor.toLowerCase();
    if (namedColors[hex]) hex = namedColors[hex];

    // Remove # if present
    hex = hex.replace("#", "");

    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Validate hex
    if (!/^[0-9a-f]{6}$/i.test(hex)) return "white";

    // Parse RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance (WCAG formula)
    const luminance =
      0.2126 * (r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)) +
      0.7152 * (g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)) +
      0.0722 * (b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4));

    // Return white for dark colors, black for light colors
    return luminance > 0.4 ? "#1a1a1a" : "white";
  }

  // Get contrasting badge background based on text color
  function getContrastBadgeBackground(textColor) {
    return textColor === "white" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
  }

  // Format keybind for display (e.g., "Alt+U")
  function formatKeybind(keybind) {
    if (!keybind) return "Alt+U";
    const parts = [];
    if (keybind.modifier) {
      const mods = keybind.modifier.split("+");
      mods.forEach((m) => {
        parts.push(m.charAt(0).toUpperCase() + m.slice(1));
      });
    }
    if (keybind.key) {
      parts.push(keybind.key.toUpperCase());
    }
    return parts.join("+") || "Alt+U";
  }

  // Get action display name and details
  function getActionDetails(eventsToUndo) {
    if (!eventsToUndo || !eventsToUndo.action) {
      return null;
    }

    const count = eventsToUndo.events?.length || 0;
    const action = eventsToUndo.action;

    const actionNames = {
      move: "Move",
      delete: "Delete",
      create: "Create",
      color: "Color",
      rename: "Rename",
      swap: "Swap",
      editBoundaries: "Edit Times",
      paste: "Paste",
    };

    const actionName = actionNames[action] || action;

    // Build detail string
    let detail = `${count} event${count !== 1 ? "s" : ""}`;

    if (action === "move" && eventsToUndo.delta) {
      const mins = Math.abs(eventsToUndo.delta);
      const hours = Math.floor(mins / 60);
      const remainMins = mins % 60;
      const dir = eventsToUndo.delta > 0 ? "later" : "earlier";
      if (hours > 0 && remainMins > 0) {
        detail += ` ${hours}h ${remainMins}m ${dir}`;
      } else if (hours > 0) {
        detail += ` ${hours}h ${dir}`;
      } else {
        detail += ` ${remainMins}m ${dir}`;
      }
    } else if (action === "editBoundaries") {
      const parts = [];
      if (eventsToUndo.startDelta) {
        const m = Math.abs(eventsToUndo.startDelta);
        parts.push(`start ${eventsToUndo.startDelta > 0 ? "+" : "-"}${m}m`);
      }
      if (eventsToUndo.endDelta) {
        const m = Math.abs(eventsToUndo.endDelta);
        parts.push(`end ${eventsToUndo.endDelta > 0 ? "+" : "-"}${m}m`);
      }
      if (parts.length > 0) {
        detail += ` (${parts.join(", ")})`;
      }
    }

    return { actionName, detail };
  }

  // Create or update the undo info box
  function createOrUpdateUndoInfoBox(counterElem, isDark) {
    let undoBox = document.querySelector(".gc-undo-info-box");

    if (!undoBox) {
      undoBox = document.createElement("div");
      undoBox.classList.add("gc-undo-info-box");
      undoBox.style.cssText = `
        margin: 8px auto 12px;
        padding: 8px 12px;
        background: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"};
        border-radius: 6px;
        font-size: 11px;
        color: ${isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"};
        display: none;
        flex-direction: column;
        gap: 2px;
        transition: all 0.2s ease;
        cursor: pointer;
      `;

      // Header line (action + keybind)
      const header = document.createElement("div");
      header.className = "gc-undo-header";
      header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
      `;

      const undoIcon = document.createElement("span");
      undoIcon.textContent = "↩";
      undoIcon.style.fontSize = "12px";

      const actionSpan = document.createElement("span");
      actionSpan.className = "gc-undo-action";

      const keybindSpan = document.createElement("span");
      keybindSpan.className = "gc-undo-keybind";
      keybindSpan.style.cssText = `
        background: ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"};
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 10px;
        margin-left: auto;
      `;

      header.appendChild(undoIcon);
      header.appendChild(actionSpan);
      header.appendChild(keybindSpan);

      // Detail line
      const detailSpan = document.createElement("div");
      detailSpan.className = "gc-undo-detail";
      detailSpan.style.cssText = `
        font-size: 10px;
        opacity: 0.8;
        padding-left: 16px;
      `;

      undoBox.appendChild(header);
      undoBox.appendChild(detailSpan);

      // Click to undo
      undoBox.addEventListener("click", () => {
        if (window.eventsToUndo && window.eventsToUndo.action) {
          UndoLastAction();
        }
      });

      // Hover effect
      undoBox.addEventListener("mouseenter", () => {
        undoBox.style.background = isDark
          ? "rgba(255,255,255,0.12)"
          : "rgba(0,0,0,0.08)";
      });
      undoBox.addEventListener("mouseleave", () => {
        undoBox.style.background = isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(0,0,0,0.05)";
      });

      counterElem.insertAdjacentElement("afterend", undoBox);
    }

    // Update content
    updateUndoInfoBox();
  }

  // Update the undo info box content
  function updateUndoInfoBox() {
    const undoBox = document.querySelector(".gc-undo-info-box");
    if (!undoBox) return;

    const eventsToUndo = window.eventsToUndo;
    const details = getActionDetails(eventsToUndo);

    if (!details) {
      undoBox.style.display = "none";
      return;
    }

    undoBox.style.display = "flex";

    const actionSpan = undoBox.querySelector(".gc-undo-action");
    const keybindSpan = undoBox.querySelector(".gc-undo-keybind");
    const detailSpan = undoBox.querySelector(".gc-undo-detail");

    const keybinds = window.keybinds || {};
    const undoKeybind = keybinds.undo || { modifier: "alt", key: "u" };

    actionSpan.textContent = `Undo ${details.actionName}`;
    keybindSpan.textContent = formatKeybind(undoKeybind);
    detailSpan.textContent = details.detail;
  }

  // Create or update the Action Menu button
  function createOrUpdateActionMenuButton(undoBox, isDark) {
    let actionBtn = document.querySelector(".gc-action-menu-btn");

    if (!actionBtn) {
      actionBtn = document.createElement("div");
      actionBtn.classList.add("gc-action-menu-btn");
      actionBtn.style.cssText = `
        margin: 0 auto 12px;
        padding: 8px 12px;
        background: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"};
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        color: ${isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      // Menu icon
      const menuIcon = document.createElement("span");
      menuIcon.textContent = "☰";
      menuIcon.style.fontSize = "14px";

      // Text
      const textSpan = document.createElement("span");
      textSpan.className = "gc-action-menu-text";
      textSpan.textContent = "Action Menu";

      // Keybind badge
      const keybindSpan = document.createElement("span");
      keybindSpan.className = "gc-action-menu-keybind";
      keybindSpan.style.cssText = `
        background: ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"};
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 10px;
        margin-left: auto;
      `;

      actionBtn.appendChild(menuIcon);
      actionBtn.appendChild(textSpan);
      actionBtn.appendChild(keybindSpan);

      // Click to open action menu
      actionBtn.addEventListener("click", () => {
        // Exit Select Mode when opening Action Menu
        if (selectMode) exitSelectMode();
        // Get button position for menu placement
        const rect = actionBtn.getBoundingClientRect();
        const x = rect.right + 10;
        const y = rect.top;
        showBulkActionsContextMenu(x, y, null);
      });

      // Hover effect
      actionBtn.addEventListener("mouseenter", () => {
        actionBtn.style.background = isDark
          ? "rgba(255,255,255,0.12)"
          : "rgba(0,0,0,0.08)";
      });
      actionBtn.addEventListener("mouseleave", () => {
        actionBtn.style.background = isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(0,0,0,0.05)";
      });

      undoBox.insertAdjacentElement("afterend", actionBtn);
    }

    // Update keybind
    const keybinds = window.keybinds || {};
    const contextKeybind = keybinds.contextmenu || {
      modifier: "shift+alt",
      key: "rightclick",
    };
    const keybindSpan = actionBtn.querySelector(".gc-action-menu-keybind");
    if (keybindSpan) {
      keybindSpan.textContent = formatKeybind(contextKeybind);
    }
  }

  // Create or update the Select Mode button
  function createOrUpdateSelectModeButton(actionBtn, isDark) {
    let selectBtn = document.querySelector(".gc-select-mode-btn");

    if (!selectBtn) {
      selectBtn = document.createElement("div");
      selectBtn.classList.add("gc-select-mode-btn");
      selectBtn.style.cssText = `
        margin: 0 auto 12px;
        padding: 8px 12px;
        background: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"};
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        color: ${isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      // Crosshair icon
      const selectIcon = document.createElement("span");
      selectIcon.textContent = "⊞";
      selectIcon.style.fontSize = "14px";

      // Text
      const textSpan = document.createElement("span");
      textSpan.className = "gc-select-mode-text";
      textSpan.textContent = "Select Mode";

      selectBtn.appendChild(selectIcon);
      selectBtn.appendChild(textSpan);

      // Click to toggle select mode
      selectBtn.addEventListener("click", () => {
        if (selectMode) {
          exitSelectMode();
        } else {
          enterSelectMode();
        }
      });

      // Hover effect
      selectBtn.addEventListener("mouseenter", () => {
        if (!selectMode) {
          selectBtn.style.background = isDark
            ? "rgba(255,255,255,0.12)"
            : "rgba(0,0,0,0.08)";
        }
      });
      selectBtn.addEventListener("mouseleave", () => {
        if (!selectMode) {
          selectBtn.style.background = isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.05)";
        }
      });

      actionBtn.insertAdjacentElement("afterend", selectBtn);
    }

    // Update visual state based on selectMode
    updateSelectModeButtonState(selectBtn, isDark);
  }

  // Update select mode button visual state
  function updateSelectModeButtonState(selectBtn, isDark) {
    if (!selectBtn) selectBtn = document.querySelector(".gc-select-mode-btn");
    if (!selectBtn) return;

    if (selectMode) {
      const highlightColor = window.highlightColor || "#4285f4";
      selectBtn.style.background = highlightColor;
      selectBtn.style.color = getContrastTextColor(highlightColor);
    } else {
      if (isDark === undefined) {
        isDark = detectTheme() === "#1B1B1B";
      }
      selectBtn.style.background = isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.05)";
      selectBtn.style.color = isDark
        ? "rgba(255,255,255,0.8)"
        : "rgba(0,0,0,0.7)";
    }
  }

  // Enter Select Mode
  function enterSelectMode() {
    selectMode = true;
    updateSelectModeButtonState();

    // Add crosshair cursor to calendar grid
    const calendarStyle = document.createElement("style");
    calendarStyle.id = "gc-select-mode-cursor";
    calendarStyle.textContent = `
      [data-view-id], [role="main"], .kbexIf, .kjtpBd {
        cursor: crosshair !important;
      }
      [data-view-id] *, [role="main"] *, .kbexIf *, .kjtpBd * {
        cursor: crosshair !important;
      }
    `;
    document.head.appendChild(calendarStyle);

    // Show select mode overlay
    selectModeOverlay = document.createElement("div");
    selectModeOverlay.id = "gc-select-mode-overlay";
    selectModeOverlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, ${
        window.highlightColor || "#4285f4"
      } 0%, ${adjustColor(window.highlightColor || "#4285f4", -30)} 100%);
      color: ${getContrastTextColor(window.highlightColor || "#4285f4")};
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: gcSelectSlideIn 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes gcSelectSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    selectModeOverlay.appendChild(style);

    const title = document.createElement("div");
    title.style.cssText = `font-size: 16px; font-weight: 600;`;
    title.textContent = `⊞ Select Mode Active`;

    const instructions = document.createElement("div");
    instructions.style.cssText = `font-size: 12px; opacity: 0.9; text-align: center; line-height: 1.4;`;
    instructions.innerHTML = `Click events to select/deselect<br>Click + drag to box select`;

    // Button container for side-by-side layout
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 8px;
    `;

    const deselectBtn = document.createElement("button");
    deselectBtn.textContent = "Deselect All";
    deselectBtn.style.cssText = `
      padding: 6px 12px;
      background: rgba(255,255,255,0.35);
      color: inherit;
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;
    deselectBtn.addEventListener("mouseenter", () => {
      deselectBtn.style.background = "rgba(255,255,255,0.5)";
    });
    deselectBtn.addEventListener("mouseleave", () => {
      deselectBtn.style.background = "rgba(255,255,255,0.35)";
    });
    deselectBtn.addEventListener("click", () => {
      deselectAllEvents();
    });

    const exitBtn = document.createElement("button");
    exitBtn.textContent = "Exit (Esc)";
    exitBtn.style.cssText = `
      padding: 6px 12px;
      background: rgba(255,255,255,0.35);
      color: inherit;
      border: 1px solid rgba(255,255,255,0.5);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;
    exitBtn.addEventListener("mouseenter", () => {
      exitBtn.style.background = "rgba(255,255,255,0.5)";
    });
    exitBtn.addEventListener("mouseleave", () => {
      exitBtn.style.background = "rgba(255,255,255,0.35)";
    });
    exitBtn.addEventListener("click", exitSelectMode);

    buttonContainer.appendChild(deselectBtn);
    buttonContainer.appendChild(exitBtn);

    selectModeOverlay.appendChild(title);
    selectModeOverlay.appendChild(instructions);
    selectModeOverlay.appendChild(buttonContainer);
    document.body.appendChild(selectModeOverlay);

    // Listen for Escape to exit
    const handleSelectEscape = (e) => {
      if (e.key === "Escape") {
        exitSelectMode();
      }
    };
    document.addEventListener("keydown", handleSelectEscape);
    window.selectEscapeHandler = handleSelectEscape;

    // Listen for navigation changes to auto-exit
    const handleNavigation = () => {
      if (selectMode) {
        exitSelectMode();
      }
    };
    window.addEventListener("popstate", handleNavigation);
    window.selectNavigationHandler = handleNavigation;
  }

  // Exit Select Mode
  function exitSelectMode() {
    selectMode = false;
    updateSelectModeButtonState();

    // Remove crosshair cursor style
    const cursorStyle = document.getElementById("gc-select-mode-cursor");
    if (cursorStyle) cursorStyle.remove();

    // Remove overlay
    if (selectModeOverlay) {
      selectModeOverlay.remove();
      selectModeOverlay = null;
    }

    // Clean up event listeners
    if (window.selectEscapeHandler) {
      document.removeEventListener("keydown", window.selectEscapeHandler);
      window.selectEscapeHandler = null;
    }
    if (window.selectNavigationHandler) {
      window.removeEventListener("popstate", window.selectNavigationHandler);
      window.selectNavigationHandler = null;
    }
  }

  // Helper to darken/lighten a color
  function adjustColor(hex, amount) {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(0, 2), 16) + amount),
    );
    const g = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(2, 2), 16) + amount),
    );
    const b = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(4, 2), 16) + amount),
    );
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Watch for theme changes
  const themeObserver = new MutationObserver(() => {
    const isDark = detectTheme() === "#1B1B1B";

    //update counter based on theme changes
    const counterElem = document.querySelector(".gc-selected-counter");
    if (counterElem) {
      const highlightColor = window.highlightColor || "#4285f4";
      const textColor = getContrastTextColor(highlightColor);
      counterElem.style.color = textColor;
      const countSpan = counterElem.querySelector(".gc-counter-count");
      if (countSpan) {
        countSpan.style.background = getContrastBadgeBackground(textColor);
      }
    }

    // Update undo box theme
    const undoBox = document.querySelector(".gc-undo-info-box");
    if (undoBox) {
      undoBox.style.background = isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.05)";
      undoBox.style.color = isDark
        ? "rgba(255,255,255,0.7)"
        : "rgba(0,0,0,0.6)";
      const keybindSpan = undoBox.querySelector(".gc-undo-keybind");
      if (keybindSpan) {
        keybindSpan.style.background = isDark
          ? "rgba(255,255,255,0.15)"
          : "rgba(0,0,0,0.1)";
      }
    }

    // Update action menu button theme
    const actionBtn = document.querySelector(".gc-action-menu-btn");
    if (actionBtn) {
      actionBtn.style.background = isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.05)";
      actionBtn.style.color = isDark
        ? "rgba(255,255,255,0.8)"
        : "rgba(0,0,0,0.7)";
      const keybindSpan = actionBtn.querySelector(".gc-action-menu-keybind");
      if (keybindSpan) {
        keybindSpan.style.background = isDark
          ? "rgba(255,255,255,0.15)"
          : "rgba(0,0,0,0.1)";
      }
    }

    // Update select mode button theme (only if not active)
    updateSelectModeButtonState(null, isDark);
  });

  themeObserver.observe(head, {
    attributes: true,
    subtree: true,
    attributes: true,
  });

  //--------------GET UP TO DATE WITH STORAGE, HIGHLIGHTCOLOR AND EVENTS-TO-UNDO ------------------

  // Load highlight color from chrome.storage
  chrome.storage.local.get("highlightColor", ({ highlightColor }) => {
    window.highlightColor = highlightColor || "#4285f4";
    updateHighlightColorCSS(window.highlightColor);
  });

  // Receive updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "HIGHLIGHT_COLOR_UPDATED") {
      window.highlightColor = msg.color;
      updateHighlightColorCSS(msg.color);

      // Update counter color
      const counterElem = document.querySelector(".gc-selected-counter");
      if (counterElem) {
        const textColor = getContrastTextColor(msg.color);
        counterElem.style.background = msg.color;
        counterElem.style.boxShadow = `0 2px 8px ${msg.color}4D`;
        counterElem.style.color = textColor;
        const countSpan = counterElem.querySelector(".gc-counter-count");
        if (countSpan) {
          countSpan.style.background = getContrastBadgeBackground(textColor);
        }
      }

      // Update Select Mode button color (if in select mode)
      if (selectMode) {
        updateSelectModeButtonState();
      }

      // Update Select Mode overlay color (if visible)
      if (selectModeOverlay) {
        const textColor = getContrastTextColor(msg.color);
        selectModeOverlay.style.background = `linear-gradient(135deg, ${
          msg.color
        } 0%, ${adjustColor(msg.color, -30)} 100%)`;
        selectModeOverlay.style.color = textColor;
      }
    }
  });

  // Load eventsToUndo from chrome.storage
  chrome.storage.local.get("eventsToUndo", ({ eventsToUndo }) => {
    window.eventsToUndo = eventsToUndo || [];
    updateUndoInfoBox();
  });

  // Receive updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "EVENTS_TO_UNDO_UPDATED") {
      window.eventsToUndo = msg.events;
      updateUndoInfoBox();
    }
  });

  // Load modifier key preference from chrome.storage
  chrome.storage.local.get("modifierKey", ({ modifierKey }) => {
    window.modifierKey = modifierKey || "alt"; // default to alt
  });

  // Receive updates for modifier key
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "MODIFIER_KEY_UPDATED") {
      window.modifierKey = msg.modifierKey;
    }
  });

  // Default keybinds
  const DEFAULT_KEYBINDS = {
    select: { modifier: "alt", key: "s" },
    deselect: { modifier: "alt", key: "a" },
    move: { modifier: "alt", key: "b" },
    delete: { modifier: "alt", key: "delete" },
    undo: { modifier: "alt", key: "u" },
    color: { modifier: "alt", key: "c" },
    rename: { modifier: "alt", key: "r" },
    swap: { modifier: "alt", key: "w" },
    copy: { modifier: "shift+alt", key: "c" },
    paste: { modifier: "shift+alt", key: "v" },
    edit: { modifier: "alt", key: "e" },
    contextmenu: { modifier: "shift+alt", key: "rightclick" },
  };

  // Load keybinds from chrome.storage
  chrome.storage.local.get("keybinds", ({ keybinds }) => {
    window.keybinds = { ...DEFAULT_KEYBINDS, ...keybinds };
  });

  // Receive updates for keybinds
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "KEYBINDS_UPDATED") {
      window.keybinds = { ...DEFAULT_KEYBINDS, ...msg.keybinds };
    }
  });

  // Load hide all-day tasks preference from chrome.storage
  chrome.storage.local.get("hideAllDayTasks", ({ hideAllDayTasks }) => {
    window.hideAllDayTasks = hideAllDayTasks || false;
    applyHideAllDayTasks();
  });

  // Receive updates for hide all-day tasks
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "HIDE_ALL_DAY_TASKS_UPDATED") {
      window.hideAllDayTasks = msg.hidden;
      applyHideAllDayTasks();
    }
  });

  // Helper to check if we're in month view
  function isMonthView() {
    return (
      document.querySelector('[data-view="month"]') !== null ||
      document.querySelector(".yZeP2d") !== null
    );
  }

  // Apply hide/show to all-day tasks section
  function applyHideAllDayTasks() {
    // Week/Day view: hide the all-day row at the top
    const allDayElements = document.querySelectorAll(".Qotkjb");
    allDayElements.forEach((el) => {
      el.style.display = window.hideAllDayTasks ? "none" : "";
    });
    // Also hide the expand all-day section button
    const expandButton = document.getElementById(
      "expand-all-day-section-button",
    );
    if (expandButton) {
      expandButton.style.display = window.hideAllDayTasks ? "none" : "";
    }

    // Month view: hide all-day events (tasks and multi-day events)
    if (isMonthView()) {
      applyHideAllDayInMonthView();
    }
  }

  // Hide all-day events in Month view
  function applyHideAllDayInMonthView() {
    // Get all month view events with data-eventchip attribute
    const monthEvents = document.querySelectorAll(
      "[data-eventchip][data-eventid]",
    );

    monthEvents.forEach((eventEl) => {
      const eventId = eventEl.getAttribute("data-eventid") || "";
      const eventText = eventEl.textContent || "";

      // Check if this is an all-day event:
      // 1. Tasks always start with "tasks_"
      // 2. All-day calendar events don't have a time pattern (like "9:05am" or "10:30pm")
      const isTask = eventId.startsWith("tasks_");
      // Time pattern: matches times like "9am", "10:30pm", "12pm", etc.
      const hasTimeInText = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(eventText);
      const isAllDayEvent = isTask || !hasTimeInText;

      if (isAllDayEvent) {
        eventEl.style.display = window.hideAllDayTasks ? "none" : "";
      }
    });
  }

  // Observer to reapply hide setting when Google Calendar refreshes UI
  const allDayTasksObserver = new MutationObserver(() => {
    if (window.hideAllDayTasks) {
      applyHideAllDayTasks();
    }
    if (window.hourRangeEnabled) {
      applyHourRange();
    }
    if (window.hidePreviousHours || window.superStrictMode) {
      applyClipping();
    }
  });

  // Start observing the body for changes (Google Calendar dynamically updates the DOM)
  allDayTasksObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // ------------------ HOUR RANGE FEATURE ------------------
  window.hourRangeEnabled = false;
  window.hourRangeStart = 1;
  window.hourRangeEnd = 23;
  window.hourRangeStrictMode = false;
  window.superStrictMode = false;
  window.hidePreviousHours = false;
  window.onlyAffectToday = false;

  // Load hour range preference from chrome.storage
  chrome.storage.local.get("hourRange", ({ hourRange }) => {
    if (hourRange) {
      window.hourRangeEnabled = hourRange.enabled || false;
      window.hourRangeStart = hourRange.startHour ?? 1;
      window.hourRangeEnd = hourRange.endHour ?? 23;
      window.hourRangeStrictMode = hourRange.strictMode || false;
      window.superStrictMode = hourRange.superStrictMode || false;
      window.hidePreviousHours = hourRange.hidePreviousHours || false;
      window.onlyAffectToday = hourRange.onlyAffectToday || false;
      applyHourRange();
      applyClipping();
    }
  });

  // Receive updates for hour range
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "HOUR_RANGE_UPDATED") {
      window.hourRangeEnabled = msg.enabled;
      window.hourRangeStart = msg.startHour;
      window.hourRangeEnd = msg.endHour;
      window.hourRangeStrictMode = msg.strictMode || false;
      window.superStrictMode = msg.superStrictMode || false;
      window.hidePreviousHours = msg.hidePreviousHours || false;
      window.onlyAffectToday = msg.onlyAffectToday || false;
      applyHourRange();
      applyClipping();
    }
  });

  // Get event start and end hours from element's position and height
  // Google Calendar uses 48px per hour in week/day view
  // Returns { startHour, endHour } or null if unable to determine
  function getEventTimeRange(eventEl) {
    const PIXELS_PER_HOUR = 48;

    const topStyle = eventEl.style.top;
    if (!topStyle) return null; // No position = all-day or unsupported, will be shown

    const topMatch = topStyle.match(/^([\d.]+)px$/);
    if (!topMatch) return null;

    const topPx = parseFloat(topMatch[1]);
    const startHour = topPx / PIXELS_PER_HOUR;

    // Parse height for end time calculation
    // Default 22px for point-in-time tasks (no duration specified)
    let heightPx = 22;
    const heightStyle = eventEl.style.height;
    if (heightStyle) {
      const heightMatch = heightStyle.match(/^([\d.]+)px$/);
      if (heightMatch) {
        heightPx = parseFloat(heightMatch[1]);
      }
    }

    const endHour = (topPx + heightPx) / PIXELS_PER_HOUR;

    return { startHour, endHour };
  }

  // Check if an event element is in today's column
  // Today's column contains the current time marker (.LvQ60d)
  function isEventInTodayColumn(eventEl) {
    // Find the current time marker
    const timeMarker = document.querySelector(".LvQ60d");
    if (!timeMarker) {
      return false;
    }

    // Method 1: Compare gridcell ancestors
    const todayGridCell = timeMarker.closest('[role="gridcell"]');
    const eventGridCell = eventEl.closest('[role="gridcell"]');

    if (todayGridCell && eventGridCell) {
      // Compare data-column-index if available
      const todayColIndex = todayGridCell.getAttribute("data-column-index");
      const eventColIndex = eventGridCell.getAttribute("data-column-index");

      if (todayColIndex !== null && eventColIndex !== null) {
        return todayColIndex === eventColIndex;
      }

      // Fallback to direct comparison
      return eventGridCell === todayGridCell;
    }

    // Method 2: Check if event and time marker share the same column container
    // by looking at their horizontal position
    const markerRect = timeMarker.getBoundingClientRect();
    const eventRect = eventEl.getBoundingClientRect();

    // Check if event's horizontal center is within marker's column
    const eventCenterX = eventRect.left + eventRect.width / 2;
    return eventCenterX >= markerRect.left && eventCenterX <= markerRect.right;
  }

  // Apply hour range filter by hiding/showing events based on overlap with range
  function applyHourRange() {
    // Select ALL events and tasks using the universal class
    const events = document.querySelectorAll(".GTG3wb");

    events.forEach((eventEl) => {
      if (!window.hourRangeEnabled) {
        // Show all events when feature is disabled
        eventEl.style.display = "";
        return;
      }

      // If "Only Affect Today" is enabled, skip events not in today's column
      if (window.onlyAffectToday && !isEventInTodayColumn(eventEl)) {
        eventEl.style.display = "";
        return;
      }

      const timeRange = getEventTimeRange(eventEl);

      // If we can't determine the time (e.g., all-day events), show it
      if (timeRange === null) {
        eventEl.style.display = "";
        return;
      }

      const { startHour, endHour } = timeRange;
      const rangeStart = window.hourRangeStart;
      const rangeEnd = window.hourRangeEnd;

      // Tolerance for floating point comparison (~3 minutes)
      // Needed because pixel positions don't align exactly to hour boundaries
      const EPSILON = 0.05;

      let shouldShow;
      if (window.hourRangeStrictMode) {
        // Strict mode: event must start AND end within range
        // Start inclusive (>= rangeStart), end exclusive for events starting at rangeEnd
        shouldShow =
          startHour >= rangeStart - EPSILON &&
          startHour < rangeEnd - EPSILON &&
          endHour <= rangeEnd + EPSILON;
      } else {
        // Normal mode: show if event overlaps with range
        shouldShow = startHour < rangeEnd && endHour > rangeStart - EPSILON;
      }

      eventEl.style.display = shouldShow ? "" : "none";
    });
  }

  // ------------------ TEMPORARY REVEAL FOR CLIPPED EVENTS ------------------
  // When user clicks on visible portion of a clipped event and the info box appears,
  // temporarily unclip that event so they can see the full event details
  let temporarilyRevealedEventId = null;
  let temporarilyRevealedEventEl = null;
  let originalClipPath = null;

  // Unified clipping function for Super Strict Mode and Hide Previous Hours
  // Handles clipping at range boundaries and current time marker
  function applyClipping() {
    const PIXELS_PER_HOUR = 48;
    const events = document.querySelectorAll(".GTG3wb");

    // If neither feature is enabled, remove all clipping
    if (!window.superStrictMode && !window.hidePreviousHours) {
      events.forEach((eventEl) => {
        eventEl.style.clipPath = "";
      });
      return;
    }

    // Check if event info box is currently open (to skip temporarily revealed event)
    // The jefcFd element exists when info box is open and contains the event ID
    const infoBoxOpen = document.querySelector(".jefcFd");

    // Get current time marker position (for Hide Previous Hours)
    const timeMarker = document.querySelector(".LvQ60d");
    const markerTopPx = timeMarker ? parseFloat(timeMarker.style.top) || 0 : 0;
    const currentTimeHour = markerTopPx / PIXELS_PER_HOUR;

    // Calculate range boundaries in pixels
    const rangeStartPx = window.hourRangeStart * PIXELS_PER_HOUR;
    const rangeEndPx = window.hourRangeEnd * PIXELS_PER_HOUR;

    events.forEach((eventEl) => {
      // Skip the temporarily revealed event if info box is open
      if (infoBoxOpen && temporarilyRevealedEventEl === eventEl) {
        return;
      }

      // If "Only Affect Today" is enabled, skip events not in today's column
      if (window.onlyAffectToday && !isEventInTodayColumn(eventEl)) {
        eventEl.style.clipPath = "";
        return;
      }

      // Get event's position and size
      const topStyle = eventEl.style.top;
      if (!topStyle) {
        eventEl.style.clipPath = "";
        return;
      }

      const topMatch = topStyle.match(/^([\d.]+)px$/);
      if (!topMatch) {
        eventEl.style.clipPath = "";
        return;
      }

      const eventTop = parseFloat(topMatch[1]);
      const heightStyle = eventEl.style.height;
      let eventHeight = 22; // default for tasks
      if (heightStyle) {
        const heightMatch = heightStyle.match(/^([\d.]+)px$/);
        if (heightMatch) {
          eventHeight = parseFloat(heightMatch[1]);
        }
      }
      const eventBottom = eventTop + eventHeight;

      // Determine effective clipping boundaries
      // When hour range is enabled, use range boundaries
      // When only Hide Previous Hours is on, use 0 as start (no range restriction)
      let effectiveTopBoundary = window.hourRangeEnabled ? rangeStartPx : 0;
      // Add a small buffer (2px) to ensure events starting exactly at range end are fully hidden
      const effectiveBottomBoundary = rangeEndPx - 2;

      // If Hide Previous Hours is on and current time is after the effective top boundary, use current time
      if (
        window.hidePreviousHours &&
        timeMarker &&
        markerTopPx > effectiveTopBoundary
      ) {
        effectiveTopBoundary = markerTopPx;
      }

      // Calculate clip amounts
      let topClip = 0;
      let bottomClip = 0;

      // Super Strict Mode: clip at range boundaries (top and bottom)
      // Hide Previous Hours: clip above current time (or range start)
      if (window.superStrictMode || window.hidePreviousHours) {
        // Clip top if event starts before effective top boundary
        if (eventTop < effectiveTopBoundary) {
          topClip = effectiveTopBoundary - eventTop;
        }
      }

      if (window.superStrictMode) {
        // Clip bottom if event ends after range end
        if (eventBottom > effectiveBottomBoundary) {
          bottomClip = eventBottom - effectiveBottomBoundary;
        }
      }

      // If clipping would hide the entire event, clip it fully
      if (topClip + bottomClip >= eventHeight) {
        eventEl.style.clipPath = "inset(100% 0 0 0)";
        return;
      }

      // Apply clip if needed
      if (topClip > 0 || bottomClip > 0) {
        eventEl.style.clipPath = `inset(${topClip}px 0 ${bottomClip}px 0)`;
      } else {
        eventEl.style.clipPath = "";
      }
    });
  }

  // Update clipping every minute to track current time
  setInterval(() => {
    if (window.hidePreviousHours || window.superStrictMode) {
      applyClipping();
    }
  }, 60000);

  // Extract event ID from info box's jslog attribute
  function extractEventIdFromInfoBox(infoBox) {
    const jslogAttr = infoBox.getAttribute("jslog");
    if (!jslogAttr) return null;
    // Info box uses 35389 code, calendar events use 35463
    // Match either pattern: looks for 2:["eventId"...] after the code number
    const match = jslogAttr.match(/\d+;\s*2:\["([^"]+)"/);
    return match?.[1] ?? null;
  }

  // Find calendar event element by its event ID
  function findEventElementById(eventId) {
    if (!eventId) return null;
    const events = document.querySelectorAll(".GTG3wb");
    for (const event of events) {
      const id = extractEventId(event);
      if (id === eventId) {
        return event;
      }
    }
    return null;
  }

  // Temporarily reveal a clipped event
  function temporarilyRevealEvent(eventId) {
    // Don't do anything if clipping is not active
    if (!window.superStrictMode && !window.hidePreviousHours) return;

    const eventEl = findEventElementById(eventId);
    if (!eventEl) return;

    // Store original clip-path and event reference
    temporarilyRevealedEventId = eventId;
    temporarilyRevealedEventEl = eventEl;
    originalClipPath = eventEl.style.clipPath || "";

    // Remove clipping to reveal full event
    eventEl.style.clipPath = "";
  }

  // Restore clipping on previously revealed event
  function restoreEventClipping() {
    if (temporarilyRevealedEventEl && originalClipPath !== null) {
      // Re-apply clipping by calling applyClipping (which recalculates based on current state)
      applyClipping();
    }
    temporarilyRevealedEventId = null;
    temporarilyRevealedEventEl = null;
    originalClipPath = null;
  }

  // Observer for event info box appearance/disappearance
  const eventInfoBoxObserver = new MutationObserver((mutations) => {
    // The info box content element with jslog attribute has class "jefcFd"
    // This element contains the event ID and disappears when info box closes
    const infoBoxContent = document.querySelector(".jefcFd");

    if (infoBoxContent) {
      // Info box appeared - extract event ID and reveal that event
      const eventId = extractEventIdFromInfoBox(infoBoxContent);
      if (eventId && eventId !== temporarilyRevealedEventId) {
        // Restore any previously revealed event first
        restoreEventClipping();
        // Reveal the new event
        temporarilyRevealEvent(eventId);
      }
    } else {
      // Info box closed - restore clipping
      if (temporarilyRevealedEventId) {
        restoreEventClipping();
      }
    }
  });

  // Start observing for info box changes
  eventInfoBoxObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  //-----------------------------MAKING SURE WE ARE ON THE CALENDAR GRID ------------------

  function checkIfCalendarView() {
    // Check for Week view
    const weekView =
      document.querySelector("#YPCqFe > div.mXmivb.ogB5bf.u4s1Oc.j0nwNb") !==
      null;
    // Check for Day view (same container but with day-specific class)
    const dayView =
      document.querySelector("#YPCqFe > div.mXmivb.ogB5bf.PtFxWd") !== null;
    // Check for Month view (different structure)
    const monthView =
      document.querySelector('[data-view="month"]') !== null ||
      document.querySelector(".yZeP2d") !== null;
    // Check for Schedule/List view (events have [role="button"][data-eventid] inside rows)
    const scheduleView =
      document.querySelector('[data-view="schedule"]') !== null ||
      document.querySelector(".Gp6xNe") !== null;
    // Fallback: check if there are any calendar events visible (include month view chips)
    const hasEvents =
      document.querySelectorAll('[role="button"][data-eventid]').length > 0 ||
      document.querySelectorAll("[data-eventchip][data-eventid]").length > 0;

    return weekView || dayView || monthView || scheduleView || hasEvents;
  }

  // Helper to check if current view is month or schedule (events have white text by default)
  function isMonthOrScheduleView() {
    const monthView =
      document.querySelector('[data-view="month"]') !== null ||
      document.querySelector(".yZeP2d") !== null;
    const scheduleView =
      document.querySelector('[data-view="schedule"]') !== null ||
      document.querySelector(".Gp6xNe") !== null;
    return monthView || scheduleView;
  }

  // Helper to check if an event element needs text color adjustment (month/schedule view events)
  function isEventNeedingTextColor(event) {
    // Month view events have data-eventchip attribute
    if (event.hasAttribute("data-eventchip")) return true;
    // Schedule view events have class YOmXMd (the row)
    if (event.classList.contains("YOmXMd")) return true;
    // Schedule view events are inside a gridcell parent
    if (event.closest('[role="gridcell"]')) return true;
    // Fallback: check if we're in schedule or month view
    return isMonthOrScheduleView();
  }

  // Helper to get the visual element for styling (may differ from the event element with ID)
  function getVisualEventElement(event) {
    // For schedule view, we want to style the row (YOmXMd), not the button inside
    const scheduleRow = event.closest(".YOmXMd");
    if (scheduleRow) return scheduleRow;
    return event;
  }

  // Helper to get all calendar event elements across all view types
  function getAllCalendarEvents() {
    // Week/Day view: events have [role="button"][data-eventid]
    // Exclude elements inside info popup (#xDetDlg, .jetcFd) - they share data-eventid but aren't calendar events
    // Also exclude NESTED event elements - only keep the outermost container
    const standardEvents = Array.from(
      document.querySelectorAll('[role="button"][data-eventid]'),
    ).filter((el) => {
      // Exclude popup elements
      if (el.closest("#xDetDlg") || el.closest(".jetcFd")) return false;
      // Exclude nested event elements - check if there's an ancestor that also matches
      // the event selector (meaning this element is an inner/child event element)
      const parent = el.parentElement;
      if (parent && parent.closest('[role="button"][data-eventid]')) {
        return false; // This is a nested element, skip it
      }
      return true;
    });
    // Month view: events have [data-eventchip][data-eventid] (the chip container has data-eventid)
    // But we need to exclude containers that have a child [role="button"][data-eventid]
    // (those are schedule view rows where we want to select the button, not the container)
    const monthEvents = document.querySelectorAll(
      "[data-eventchip][data-eventid]",
    );
    const filteredMonthEvents = Array.from(monthEvents).filter((el) => {
      // Only include if there's NO child button with data-eventid (true month view)
      // Also exclude elements inside the info popup
      if (el.closest("#xDetDlg") || el.closest(".jetcFd")) return false;
      // Exclude nested elements
      const parent = el.parentElement;
      if (parent && parent.closest("[data-eventchip][data-eventid]")) {
        return false;
      }
      return !el.querySelector('[role="button"][data-eventid]');
    });
    // Schedule view: target the row elements that contain events
    const scheduleRows = document.querySelectorAll(".YOmXMd");
    const scheduleEvents = Array.from(scheduleRows).filter((row) => {
      // Only include rows that have a button with data-eventid inside
      return row.querySelector('[role="button"][data-eventid]');
    });
    // Combine and return unique elements
    const allEvents = new Set([
      ...standardEvents,
      ...filteredMonthEvents,
      ...scheduleEvents,
    ]);
    // Filter out standard events that are inside schedule rows (we use the row instead)
    return Array.from(allEvents).filter((el) => {
      if (
        el.matches('[role="button"][data-eventid]') &&
        el.closest(".YOmXMd")
      ) {
        return false; // Skip buttons inside schedule rows
      }
      return true;
    });
  }

  // Helper to find the closest event element from a clicked element
  function findEventElement(element) {
    // Try schedule view row first (YOmXMd class)
    let scheduleRow = element?.closest(".YOmXMd");
    if (
      scheduleRow &&
      scheduleRow.querySelector('[role="button"][data-eventid]')
    ) {
      return scheduleRow;
    }
    // Try standard week/day view selector (the button, but not inside schedule row)
    let eventEl = element?.closest('[role="button"][data-eventid]');
    if (eventEl && !eventEl.closest(".YOmXMd")) {
      return eventEl;
    }
    // Try month view selector (the data-eventchip container)
    // Only use this if the container doesn't have a button child with data-eventid
    eventEl = element?.closest("[data-eventchip][data-eventid]");
    if (eventEl && !eventEl.querySelector('[role="button"][data-eventid]')) {
      return eventEl;
    }
    return null;
  }

  //---------------------------------- SELECTION LOGIC/HELPERS --------------------------------
  const CLICK_THRESHOLD = 8;

  function isOverlapping(rectA, rectB) {
    return (
      rectA.left < rectB.right &&
      rectA.right > rectB.left &&
      rectA.top < rectB.bottom &&
      rectA.bottom > rectB.top
    );
  }

  // Get the visible bounding rect of an event, accounting for clipping
  function getVisibleEventRect(eventEl) {
    const rect = eventEl.getBoundingClientRect();

    // If no clipping is active, return normal rect
    if (!window.superStrictMode && !window.hidePreviousHours) {
      return rect;
    }

    // Check if event has clip-path applied (check both inline and computed styles)
    let clipPath = eventEl.style.clipPath;
    if (!clipPath || clipPath === "none" || clipPath === "") {
      // Also check computed style in case clip-path is applied via CSS class
      const computedStyle = window.getComputedStyle(eventEl);
      clipPath = computedStyle.clipPath;
    }

    if (!clipPath || clipPath === "none" || clipPath === "") {
      return rect;
    }

    // Parse inset clip-path: inset(top right bottom left) or inset(top 0 bottom 0)
    const insetMatch = clipPath.match(/inset\(([^)]+)\)/);
    if (!insetMatch) {
      return rect;
    }

    const values = insetMatch[1].split(/\s+/).map((v) => parseFloat(v) || 0);
    let topClip = 0,
      rightClip = 0,
      bottomClip = 0,
      leftClip = 0;

    // CSS inset() can have 1-4 values:
    // 1 value: all sides
    // 2 values: top/bottom, left/right
    // 3 values: top, left/right, bottom
    // 4 values: top, right, bottom, left
    if (values.length === 4) {
      [topClip, rightClip, bottomClip, leftClip] = values;
    } else if (values.length === 3) {
      // inset(top leftRight bottom) format
      topClip = values[0];
      rightClip = values[1];
      leftClip = values[1];
      bottomClip = values[2];
    } else if (values.length === 2) {
      // inset(topBottom leftRight) format
      topClip = values[0];
      bottomClip = values[0];
      rightClip = values[1];
      leftClip = values[1];
    } else if (values.length === 1) {
      // All sides same
      if (clipPath.includes("100%")) {
        // Fully clipped - return a zero-size rect
        return {
          left: rect.left,
          right: rect.left,
          top: rect.top,
          bottom: rect.top,
          width: 0,
          height: 0,
        };
      }
      topClip = rightClip = bottomClip = leftClip = values[0];
    }

    // Return adjusted rect
    const adjustedRect = {
      left: rect.left + leftClip,
      right: rect.right - rightClip,
      top: rect.top + topClip,
      bottom: rect.bottom - bottomClip,
      width: rect.width - leftClip - rightClip,
      height: rect.height - topClip - bottomClip,
    };

    // If clipping results in zero or negative dimensions, return a zero-size rect
    if (adjustedRect.width <= 0 || adjustedRect.height <= 0) {
      return {
        left: rect.left,
        right: rect.left,
        top: rect.top,
        bottom: rect.top,
        width: 0,
        height: 0,
      };
    }

    return adjustedRect;
  }

  // Check if a point is within the visible bounds of an event (accounting for clipping)
  function isPointInVisibleEvent(x, y, eventEl) {
    const visibleRect = getVisibleEventRect(eventEl);
    return (
      x >= visibleRect.left &&
      x <= visibleRect.right &&
      y >= visibleRect.top &&
      y <= visibleRect.bottom
    );
  }

  // Extract both event ID and calendar ID from an event element
  // Returns { eventId, calendarId, calendarName } where calendarId defaults to "primary"
  function extractEventInfo(event) {
    // For schedule view rows, get the event info from the child button
    if (event.classList.contains("YOmXMd")) {
      const childButton = event.querySelector('[role="button"][data-eventid]');
      if (childButton) {
        return extractEventInfo(childButton);
      }
    }

    // Try to extract calendar name from child element with class XuJrye
    // The text is in format "Calendar: CalendarName, No location, Color: ..."
    // We only want the calendar name part (before the first comma after "Calendar:")
    let calendarName = null;
    const calendarNameEl = event.querySelector(".XuJrye");
    if (calendarNameEl) {
      const text = calendarNameEl.textContent || "";
      const match = text.match(/Calendar:\s*([^,]+)/i);
      if (match?.[1]) {
        calendarName = match[1].trim();
      }
    }

    // Use jslog parsing as the primary method since it has the full calendar ID
    // jslog format: "35463; 2:["eventId",...]; 1:["calendarId",...]"
    const jslogAttr = event.getAttribute("jslog");
    if (jslogAttr) {
      let eventId = null;
      let calendarId = "primary";

      // Extract event ID from 2:[...] array - event ID is at index 0
      const eventIdMatch = jslogAttr.match(/2:\["([^"]+)"/);
      if (eventIdMatch?.[1]) {
        eventId = eventIdMatch[1];
      }

      // Extract calendar ID from 1:[...] array - calendar ID is at index 0
      const calendarIdMatch = jslogAttr.match(/1:\["([^"]+)"/);
      if (calendarIdMatch?.[1]) {
        calendarId = calendarIdMatch[1];
      }

      if (eventId) {
        return { eventId, calendarId, calendarName };
      }
    }

    // Fallback to data-eventid attribute (base64 encoded)
    // Note: The calendar ID in data-eventid may be truncated, so jslog is preferred
    const dataEventId = event.getAttribute("data-eventid");
    if (dataEventId) {
      try {
        const decoded = atob(dataEventId);
        // The decoded string contains the event ID followed by calendar email, split on space
        const parts = decoded.split(" ");
        const eventId = parts[0];
        // The calendar ID here may be truncated (e.g., "@g" instead of "@gmail.com")
        // so we only use it if jslog parsing failed
        const calendarId = parts[1] || "primary";
        if (eventId) return { eventId, calendarId, calendarName };
      } catch (e) {
        // Decoding failed
      }
    }

    return null;
  }

  // Legacy function for backward compatibility - just returns event ID
  function extractEventId(event) {
    const info = extractEventInfo(event);
    return info?.eventId ?? null;
  }

  function clearAllSelections() {
    // Simply remove the selection classes - CSS handles all styling
    // No need to store/restore original styles
    document.querySelectorAll(".gc-bulk-selected").forEach((el) => {
      el.classList.remove("gc-bulk-selected", "gc-needs-text-color");
    });
    selected = [];
  }

  function toggleEventSelection(event) {
    const eventInfo = extractEventInfo(event);
    if (!eventInfo) return;

    // Check the selected array (source of truth) instead of DOM class
    // This prevents issues with multi-day events where multiple DOM elements
    // share the same eventId
    const alreadySelected = selected.some(
      (s) => s.eventId === eventInfo.eventId,
    );

    if (alreadySelected) {
      // Deselect: remove classes from ALL DOM elements with this eventId
      // (multi-day events can appear as multiple DOM elements)
      document.querySelectorAll(".gc-bulk-selected").forEach((el) => {
        const elInfo = extractEventInfo(el);
        if (elInfo && elInfo.eventId === eventInfo.eventId) {
          el.classList.remove("gc-bulk-selected", "gc-needs-text-color");
        }
      });
      selected = selected.filter((s) => s.eventId !== eventInfo.eventId);
    } else {
      // Select: add the selection class to ALL DOM elements with this eventId
      // First, find all event elements with the same eventId
      const allEventElements = document.querySelectorAll(
        "[data-eventid], [data-eventchip], [jslog]",
      );
      allEventElements.forEach((el) => {
        // Skip elements inside the info popup (they share the same data-eventid)
        if (el.closest("#xDetDlg") || el.closest(".jetcFd")) return;
        // Skip nested event elements - only apply to outermost container
        const parent = el.parentElement;
        if (parent && parent.closest("[data-eventid]")) return;
        const elInfo = extractEventInfo(el);
        if (elInfo && elInfo.eventId === eventInfo.eventId) {
          el.classList.add("gc-bulk-selected");
          if (isEventNeedingTextColor(el)) {
            el.classList.add("gc-needs-text-color");
          }
        }
      });
      selected.push(eventInfo);
    }
  }

  function cleanupSelectionBox() {
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  }

  //--------------------------------- MARQUEE SELECTION --------------------------------
  function startMarqueeSelection(e) {
    if (!checkIfCalendarView()) {
      isKeyboardSelecting = false;
      return;
    }

    cleanupSelectionBox();

    isSelecting = true;
    startX = e.pageX;
    startY = e.pageY;

    const selectionBoxColor = window.highlightColor || "red";

    selectionBox = document.createElement("div");
    selectionBox.style.cssText = `
    position: fixed;
    border: 2px dashed ${selectionBoxColor};
    background-color: color-mix(in srgb, ${selectionBoxColor} 30%, transparent);
    left: ${startX}px;
    top: ${startY}px;
    pointer-events: none;
    z-index: 999999;
  `;

    document.body.appendChild(selectionBox);
    e.preventDefault();
  }

  function updateSelectionBox(e) {
    if (!isSelecting || !selectionBox) return;

    const x = Math.min(e.pageX, startX);
    const y = Math.min(e.pageY, startY);
    const width = Math.abs(e.pageX - startX);
    const height = Math.abs(e.pageY - startY);

    selectionBox.style.left = `${x}px`;
    selectionBox.style.top = `${y}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  function finishMarqueeSelection() {
    if (!isSelecting || !selectionBox) return;

    isSelecting = false;
    isKeyboardSelecting = false;

    const rect = selectionBox.getBoundingClientRect();

    const isClick =
      rect.width < CLICK_THRESHOLD && rect.height < CLICK_THRESHOLD;

    // CLICK ? toggle ONLY the topmost event
    if (isClick) {
      const clickedEl = document.elementFromPoint(rect.left, rect.top);
      const eventEl = findEventElement(clickedEl);

      // Check if click is within visible bounds (not in clipped region)
      if (eventEl && isPointInVisibleEvent(rect.left, rect.top, eventEl)) {
        toggleEventSelection(eventEl);
      }

      cleanupSelectionBox();
      updateSelectionCounter();
      return;
    }

    // DRAG ? marquee selection
    // Track which eventIds we've already processed to handle multi-day events
    // (which have multiple DOM elements with the same eventId)
    const processedEventIds = new Set();
    const gcEvents = getAllCalendarEvents();

    gcEvents.forEach((event) => {
      // Use visible rect (accounts for clipping) instead of raw bounding rect
      const eventRect = getVisibleEventRect(event);
      if (isOverlapping(rect, eventRect)) {
        const eventInfo = extractEventInfo(event);
        if (eventInfo && !processedEventIds.has(eventInfo.eventId)) {
          processedEventIds.add(eventInfo.eventId);
          toggleEventSelection(event);
        }
      }
    });

    cleanupSelectionBox();
    updateSelectionCounter();
  }

  function updateSelectionCounter() {
    const counterElem = document.querySelector(".gc-selected-counter");
    if (counterElem) {
      const countSpan = counterElem.querySelector(".gc-counter-count");
      if (countSpan) {
        countSpan.textContent = selected.length;
      } else {
        counterElem.textContent = "Selected Events: " + selected.length;
      }
    }
  }

  // Get names of selected events from DOM for display
  function getSelectedEventNames() {
    const eventNames = [];
    const gcEvents = getAllCalendarEvents();

    gcEvents.forEach((event) => {
      if (
        event.classList.contains("gc-bulk-selected") ||
        event.classList.contains("gc-swap-first-selection")
      ) {
        const eventId = extractEventId(event);
        if (eventId && selected.includes(eventId)) {
          // Try to get the event name from the element's text content
          const name = event.textContent?.trim() || "Untitled Event";
          eventNames.push({
            id: eventId,
            name: name.substring(0, 30) + (name.length > 30 ? "..." : ""),
          });
        }
      }
    });

    return eventNames;
  }

  //---------------------------------- MOUSE HANDLERS ----------------------------------
  function handleMouseDown(e) {
    // Right click with context menu modifier - prevent shift text selection
    if (e.button === 2 && isContextMenuModifierActive()) {
      e.preventDefault();
      return;
    }

    // Middle click + modifier for selection (original behavior)
    if (e.button === 1 && isSelectModifierActive()) {
      startMarqueeSelection(e);
      return;
    }

    // Select Mode: left click for selection
    if (selectMode && e.button === 0) {
      // Check if click is within calendar grid area
      const calendarGrid =
        document.querySelector("[data-view-id]") ||
        document.querySelector("[role='main']") ||
        document.querySelector(".kbexIf") ||
        document.querySelector(".kjtpBd");

      if (calendarGrid && calendarGrid.contains(e.target)) {
        // Block default GCal behavior
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        startMarqueeSelection(e);
        return;
      }
    }
  }

  // Handle click events - blocks GCal default behavior in Select Mode
  function handleClick(e) {
    if (selectMode && e.button === 0) {
      // Check if click is within calendar grid area
      const calendarGrid =
        document.querySelector("[data-view-id]") ||
        document.querySelector("[role='main']") ||
        document.querySelector(".kbexIf") ||
        document.querySelector(".kjtpBd");

      if (calendarGrid && calendarGrid.contains(e.target)) {
        // Block default GCal behavior (opening event details, creating events)
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }

  function handleContextMenu(e) {
    // Check if context menu modifier is active
    if (isContextMenuModifierActive()) {
      // Exit Select Mode when using Action Menu
      if (selectMode) exitSelectMode();

      // Always block default right-click when our keybind modifier is active
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // If menu is already open, close it (toggle behavior)
      if (contextMenuOverlay) {
        closeContextMenu();
        return false;
      }

      // Find if there's an event under the cursor
      const clickedEl = document.elementFromPoint(e.clientX, e.clientY);
      let eventUnderCursor = findEventElement(clickedEl);

      // Check if click is within visible bounds (not in clipped region)
      if (
        eventUnderCursor &&
        !isPointInVisibleEvent(e.clientX, e.clientY, eventUnderCursor)
      ) {
        eventUnderCursor = null;
      }

      // Show menu if we have selected events OR if there's an event under the cursor
      if (selected.length > 0 || eventUnderCursor) {
        showBulkActionsContextMenu(e.pageX, e.pageY, eventUnderCursor);
      }
      return false;
    }
  }

  // Helper to check if context menu keybind modifier is active
  function isContextMenuModifierActive() {
    const keybinds = window.keybinds || DEFAULT_KEYBINDS;
    const keybind = keybinds.contextmenu;
    if (!keybind || !keybind.modifier) return altPressed; // fallback to alt

    const modifiers = keybind.modifier.split("+");
    return modifiers.every((mod) => {
      switch (mod) {
        case "alt":
          return altPressed;
        case "ctrl":
          return ctrlPressed;
        case "shift":
          return shiftPressed;
        default:
          return false;
      }
    });
  }

  // Show the bulk actions context menu
  function showBulkActionsContextMenu(x, y, eventUnderCursor = null) {
    // Remove existing menu if any
    if (contextMenuOverlay) {
      contextMenuOverlay.remove();
      contextMenuOverlay = null;
    }

    // Create overlay to catch clicks outside
    contextMenuOverlay = document.createElement("div");
    contextMenuOverlay.id = "gc-bulk-context-overlay";
    contextMenuOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
  `;

    // Create menu container
    const menu = document.createElement("div");
    menu.id = "gc-bulk-context-menu";
    menu.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08);
    min-width: 180px;
    padding: 6px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    z-index: 10000;
    animation: gcMenuFadeIn 0.15s ease-out;
  `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
    @keyframes gcMenuFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .gc-menu-item {
      padding: 8px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #333;
      transition: background 0.1s;
    }
    .gc-menu-item:hover {
      background: #f0f0f0;
    }
    .gc-menu-item.gc-menu-item-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .gc-menu-item.gc-menu-item-disabled:hover {
      background: transparent;
    }
    .gc-menu-item svg {
      width: 16px;
      height: 16px;
      fill: #555;
    }
    .gc-menu-separator {
      height: 1px;
      background: #e0e0e0;
      margin: 6px 0;
    }
    .gc-menu-item-highlight {
      background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
      color: white !important;
      border-radius: 4px;
      margin: 2px 6px;
      padding: 8px 10px !important;
    }
    .gc-menu-item-highlight:hover {
      background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%) !important;
    }
    .gc-menu-item-highlight svg {
      fill: white !important;
    }
    .gc-menu-header {
      padding: 6px 16px 8px;
      font-size: 11px;
      color: #888;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .gc-menu-events-list {
      max-height: 120px;
      overflow-y: auto;
      padding: 4px 16px 8px;
      margin-bottom: 4px;
      border-bottom: 1px solid #e0e0e0;
    }
    .gc-menu-event-item {
      font-size: 12px;
      color: #555;
      padding: 2px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .gc-menu-event-item::before {
      content: "";
      width: 8px;
      height: 8px;
      background: #4285f4;
      border-radius: 2px;
      flex-shrink: 0;
    }
  `;
    menu.appendChild(style);

    // Header showing selection count
    const header = document.createElement("div");
    header.className = "gc-menu-header";
    if (selected.length === 0 && eventUnderCursor) {
      header.textContent = "Quick Actions";
    } else {
      header.textContent = `${selected.length} event${
        selected.length > 1 ? "s" : ""
      } selected`;
    }
    menu.appendChild(header);

    // Show list of selected events (up to 5, with "and X more" if more)
    const eventNames = getSelectedEventNames();
    if (eventNames.length > 0) {
      const eventsList = document.createElement("div");
      eventsList.className = "gc-menu-events-list";

      const maxShow = 5;
      const toShow = eventNames.slice(0, maxShow);

      toShow.forEach((evt) => {
        const eventItem = document.createElement("div");
        eventItem.className = "gc-menu-event-item";
        eventItem.textContent = evt.name;
        eventItem.title = evt.name;
        eventsList.appendChild(eventItem);
      });

      if (eventNames.length > maxShow) {
        const moreItem = document.createElement("div");
        moreItem.className = "gc-menu-event-item";
        moreItem.style.color = "#888";
        moreItem.style.fontStyle = "italic";
        moreItem.textContent = `and ${eventNames.length - maxShow} more...`;
        eventsList.appendChild(moreItem);
      }

      menu.appendChild(eventsList);
    } else if (eventUnderCursor) {
      // Show the event under cursor when no events are selected
      const eventName =
        eventUnderCursor.textContent?.trim() || "Untitled Event";
      const eventsList = document.createElement("div");
      eventsList.className = "gc-menu-events-list";
      const eventItem = document.createElement("div");
      eventItem.className = "gc-menu-event-item";
      eventItem.textContent =
        eventName.substring(0, 30) + (eventName.length > 30 ? "..." : "");
      eventItem.title = eventName;
      eventsList.appendChild(eventItem);
      menu.appendChild(eventsList);
    }

    // Menu items
    const menuItems = [];

    // Check if the event under cursor is already selected
    const eventUnderCursorId = eventUnderCursor
      ? extractEventId(eventUnderCursor)
      : null;
    const isEventUnderCursorSelected =
      eventUnderCursorId && selected.includes(eventUnderCursorId);

    // Add "Select Event" action if there's an event under cursor that's not already selected
    if (eventUnderCursor && !isEventUnderCursorSelected) {
      menuItems.push({
        label: "Select Event",
        icon: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
        action: () => {
          toggleEventSelection(eventUnderCursor);
          updateSelectionCounter();
        },
        highlight: selected.length === 0,
      });
      if (selected.length > 0) {
        menuItems.push({ separator: true });
      }
    }

    // Add "Unselect Event" action if there's an event under cursor that is already selected
    if (eventUnderCursor && isEventUnderCursorSelected) {
      menuItems.push({
        label: "Unselect Event",
        icon: `<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>`,
        action: () => {
          toggleEventSelection(eventUnderCursor);
          updateSelectionCounter();
        },
      });
      if (selected.length > 1) {
        menuItems.push({ separator: true });
      }
    }

    // If in swap mode with a second selection, show Swap action prominently at top
    if (
      swapMode &&
      swapFirstSelection.length > 0 &&
      selected.length === swapFirstSelection.length
    ) {
      menuItems.push({
        label: `Swap ${selected.length} Event${selected.length > 1 ? "s" : ""}`,
        icon: `<svg viewBox="0 0 24 24"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>`,
        action: () => executeSwap(),
        highlight: true,
      });
      menuItems.push({ separator: true });
    }

    // Only show bulk actions if there are selected events
    if (selected.length > 0) {
      menuItems.push(
        {
          label: "Move Events",
          icon: `<svg viewBox="0 0 24 24"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z"/></svg>`,
          action: () => showMoveEventsDialog(),
        },
        {
          label: "Delete Events",
          icon: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
          action: () => {
            resetSelectionState();
            deleteEvents(selected);
          },
        },
        {
          label: "Change Color",
          icon: `<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
          action: () => showColorEventsDialog(),
        },
        {
          label: "Rename Events",
          icon: `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
          action: () => showRenameEventsDialog(),
        },
        {
          label: "Edit Times",
          icon: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
          action: () => showEditBoundariesDialog(),
        },
        { separator: true },
        {
          label: "Copy Events",
          icon: `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
          action: () => copyEvents(),
        },
        {
          label: "Paste Events",
          icon: `<svg viewBox="0 0 24 24"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>`,
          action: () => showPasteEventsDialog(),
          disabled: !copiedEvents || copiedEvents.length === 0,
        },
        { separator: true },
        {
          label: "Undo Last Action",
          icon: `<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>`,
          action: () => UndoLastAction(),
        },
      );
    } // Close the if (selected.length > 0) block

    // Add Deselect All if there are any selected events (available even when opening menu on unselected event)
    if (selected.length > 0) {
      menuItems.push({ separator: true });
      menuItems.push({
        label: "Deselect All",
        icon: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
        action: () => deselectAllEvents(),
      });
    }

    menuItems.forEach((item) => {
      if (item.separator) {
        const sep = document.createElement("div");
        sep.className = "gc-menu-separator";
        menu.appendChild(sep);
      } else {
        const menuItem = document.createElement("div");
        let className = "gc-menu-item";
        if (item.highlight) className += " gc-menu-item-highlight";
        if (item.disabled) className += " gc-menu-item-disabled";
        menuItem.className = className;
        menuItem.innerHTML = `${item.icon}<span>${item.label}</span>`;
        if (!item.disabled) {
          menuItem.addEventListener("click", () => {
            closeContextMenu();
            item.action();
          });
        }
        menu.appendChild(menuItem);
      }
    });

    contextMenuOverlay.appendChild(menu);
    document.body.appendChild(contextMenuOverlay);

    // Adjust position if menu goes off screen
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${x - menuRect.width}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${y - menuRect.height}px`;
    }

    // Close menu when clicking outside or pressing Escape
    contextMenuOverlay.addEventListener("click", (e) => {
      if (e.target === contextMenuOverlay) {
        closeContextMenu();
      }
    });

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeContextMenu();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }

  function closeContextMenu() {
    if (contextMenuOverlay) {
      contextMenuOverlay.remove();
      contextMenuOverlay = null;
    }
  }

  function handleMouseMove(e) {
    window.lastMouseX = e.pageX;
    window.lastMouseY = e.pageY;

    updateSelectionBox(e);
  }

  function handleMouseUp(e) {
    if (isSelecting && !isKeyboardSelecting) {
      finishMarqueeSelection();
    }
  }

  //---------------------------------- KEYBOARD HANDLERS -------------------------------
  // Track pressed keys
  let pressedKeys = new Set();

  // Helper to check if a keybind matches current state
  function isKeybindActive(action) {
    const keybinds = window.keybinds || DEFAULT_KEYBINDS;
    const keybind = keybinds[action];
    if (!keybind) return false;

    // Check modifier - must be EXACT match (no extra modifiers)
    const modifiers = keybind.modifier ? keybind.modifier.split("+") : [];

    // Check that required modifiers are pressed
    const requiredModifiersPressed = modifiers.every((mod) => {
      switch (mod) {
        case "alt":
          return altPressed;
        case "ctrl":
          return ctrlPressed;
        case "shift":
          return shiftPressed;
        default:
          return false;
      }
    });

    // Check that NO extra modifiers are pressed
    const altRequired = modifiers.includes("alt");
    const ctrlRequired = modifiers.includes("ctrl");
    const shiftRequired = modifiers.includes("shift");

    const noExtraModifiers =
      altPressed === altRequired &&
      ctrlPressed === ctrlRequired &&
      shiftPressed === shiftRequired;

    if (!requiredModifiersPressed || !noExtraModifiers) return false;

    // Check if the action key is pressed
    const actionKey = keybind.key?.toLowerCase();
    return pressedKeys.has(actionKey);
  }

  // Helper to check if select keybind modifier is active (for mouse selection)
  function isSelectModifierActive() {
    const keybinds = window.keybinds || DEFAULT_KEYBINDS;
    const keybind = keybinds.select;
    if (!keybind || !keybind.modifier) return altPressed; // fallback

    const modifiers = keybind.modifier.split("+");
    return modifiers.every((mod) => {
      switch (mod) {
        case "alt":
          return altPressed;
        case "ctrl":
          return ctrlPressed;
        case "shift":
          return shiftPressed;
        default:
          return false;
      }
    });
  }

  function handleKeyDown(e) {
    if (e.repeat) return; //ensure one toggle per key press

    // Track modifier keys
    if (e.key === "Alt") altPressed = true;
    if (e.key === "Control") ctrlPressed = true;
    if (e.key === "Shift") shiftPressed = true;

    // Track action keys
    const key = e.key.toLowerCase();
    pressedKeys.add(key);

    // Check each action
    if (isKeybindActive("deselect") && selected.length > 0) {
      // Don't exit select mode - deselecting should work within select mode
      deselectAllEvents();
      e.preventDefault();
    }

    if (isKeybindActive("undo")) {
      if (selectMode) exitSelectMode();
      UndoLastAction();
      e.preventDefault();
    }

    if (isKeybindActive("delete") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      resetSelectionState();
      deleteEvents(selected);
      e.preventDefault();
    }

    if (isKeybindActive("select") && !isKeyboardSelecting && !isSelecting) {
      // Don't exit select mode - box selection should work within select mode
      isKeyboardSelecting = true;
      startMarqueeSelection({
        pageX: window.lastMouseX,
        pageY: window.lastMouseY,
        preventDefault: () => {},
      });
      e.preventDefault();
    }

    if (isKeybindActive("move") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      if (moveDialogOpen) {
        if (moveDialogOverlay) {
          document.body.removeChild(moveDialogOverlay);
          moveDialogOverlay = null;
        }
        moveDialogOpen = false;
      } else {
        showMoveEventsDialog();
      }
      e.preventDefault();
    }

    if (isKeybindActive("color") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      if (colorDialogOpen) {
        if (colorDialogOverlay) {
          document.body.removeChild(colorDialogOverlay);
          colorDialogOverlay = null;
        }
        colorDialogOpen = false;
      } else {
        showColorEventsDialog();
      }
      e.preventDefault();
    }

    if (isKeybindActive("rename") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      if (renameDialogOpen) {
        if (renameDialogOverlay) {
          document.body.removeChild(renameDialogOverlay);
          renameDialogOverlay = null;
        }
        renameDialogOpen = false;
      } else {
        showRenameEventsDialog();
      }
      e.preventDefault();
    }

    if (isKeybindActive("swap") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      if (swapMode) {
        // Already in swap mode - execute the swap with current selection as second group
        executeSwap();
      } else {
        // Enter swap mode with current selection as first group
        enterSwapMode();
      }
      e.preventDefault();
    }

    if (isKeybindActive("copy") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      copyEvents();
      e.preventDefault();
    }

    if (isKeybindActive("paste") && copiedEvents.length > 0) {
      if (selectMode) exitSelectMode();
      if (pasteDialogOpen) {
        if (pasteDialogOverlay) {
          document.body.removeChild(pasteDialogOverlay);
          pasteDialogOverlay = null;
        }
        pasteDialogOpen = false;
      } else {
        showPasteEventsDialog();
      }
      e.preventDefault();
    }

    if (isKeybindActive("edit") && selected.length > 0) {
      if (selectMode) exitSelectMode();
      if (editBoundariesDialogOpen) {
        if (editBoundariesDialogOverlay) {
          document.body.removeChild(editBoundariesDialogOverlay);
          editBoundariesDialogOverlay = null;
        }
        editBoundariesDialogOpen = false;
      } else {
        showEditBoundariesDialog();
      }
      e.preventDefault();
    }
  }

  function handleKeyUp(e) {
    // Track modifier keys
    if (e.key === "Alt") altPressed = false;
    if (e.key === "Control") ctrlPressed = false;
    if (e.key === "Shift") shiftPressed = false;

    // Remove action key from pressed set
    const key = e.key.toLowerCase();
    pressedKeys.delete(key);

    // Finish marquee selection if select keybind is released
    if (isKeyboardSelecting && !isKeybindActive("select")) {
      finishMarqueeSelection();
    }
  }

  //---------------------------------- DESELECT LOGIC ----------------------------------
  function deselectAllEvents() {
    if (!checkIfCalendarView()) return;

    // Use direct DOM query for gc-bulk-selected class - this is the source of truth
    // for visual selection state, regardless of which view type was used to select
    clearAllSelections();

    // Update counter
    let counterElem = document.querySelector(".gc-selected-counter");
    if (counterElem) {
      const countSpan = counterElem.querySelector(".gc-counter-count");
      if (countSpan) {
        countSpan.textContent = selected.length;
      }
    }
  }

  //---------------------------------- DELETE EVENTS -----------------------------------
  async function deleteEvents(eventInfos) {
    if (!checkIfCalendarView()) return;

    const confirmedDelete = confirm(
      "Are you sure you want to delete the selected events?",
    );
    if (!confirmedDelete) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("delete events");
    if (!token) return;

    // Reset events for undo at start of each new operation
    eventsBeforeMostRecentChange = [];

    // Reset cancellation flag at start of operation
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "delete-events-overlay",
      "rgba(220, 53, 69, 0.95)",
      "Fetching event details...",
      true, // cancellable
    );

    // Fetch all event details with concurrency control to avoid rate limiting
    const fetched = await runWithConcurrency(
      eventInfos,
      (info) =>
        fetchEventById(token, info.eventId, info.calendarId, info.calendarName),
      DEFAULT_CONCURRENCY,
      (processed, total) => {
        updateText(`Fetching event details... ${processed}/${total}`);
      },
    );

    // Check for cancellation after fetch phase
    if (isCancelled()) {
      showCancelled();
      setTimeout(() => removeProgressToast("delete-events-overlay"), 2500);
      return;
    }

    // delete single with retry logic
    const deleteSingle = async (event, attemptNumber = 1) => {
      const maxAttempts = MAX_SINGLE_ATTEMPTS;
      const delay = 1000 + attemptNumber * 500;
      const calendarId = encodeURIComponent(event.calendarId || "primary");

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Success cases
        if (res.status === 410 || res.status === 404)
          return { ok: true, event, skipped: false };
        if (res.ok) return { ok: true, event, skipped: false };

        // Get response body for all non-success cases
        const responseText = await res.text();

        // Check if 403 is a rate limit (should retry) or permission issue (should skip)
        if (res.status === 403) {
          try {
            const errorData = JSON.parse(responseText);
            const isRateLimit = errorData?.error?.errors?.some(
              (e) =>
                e.reason === "rateLimitExceeded" ||
                e.reason === "userRateLimitExceeded",
            );

            if (isRateLimit) {
              // Rate limit - retry
              if (attemptNumber < maxAttempts) {
                await sleep(delay * 2);
                return deleteSingle(event, attemptNumber + 1);
              }
              return { ok: false, skipped: false, event, status: res.status };
            } else {
              // True permission denial - skip
              return { ok: true, skipped: true };
            }
          } catch (e) {
            return { ok: true, skipped: true };
          }
        }

        // Transient errors - retry
        if (isTransientStatus(res.status)) {
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return deleteSingle(event, attemptNumber + 1);
          }
          return { ok: false, skipped: false, event, status: res.status };
        }

        // Permanent errors
        return {
          ok: false,
          skipped: false,
          event,
          status: res.status,
          reason: "permanent",
        };
      } catch (err) {
        if (attemptNumber < maxAttempts) {
          await sleep(delay);
          return deleteSingle(event, attemptNumber + 1);
        }
        return { ok: false, skipped: false, event, error: err };
      }
    };

    // Keep events we fetched successfully, skip events already gone or dont have permission to view
    const validEvents = fetched.filter((ev) => !ev.gone && !ev.fetchStatus);

    // Retry loop - keeps trying until all events succeed or max retries reached
    let eventsToProcess = validEvents;
    const allSuccesses = [];
    const allSkipped = [];
    let retryRound = 0;
    const maxRetryRounds = MAX_RETRY_ROUNDS;

    while (
      eventsToProcess.length > 0 &&
      retryRound <= maxRetryRounds &&
      !isCancelled()
    ) {
      let lastUpdateTime = 0;
      const onProgress = (processed, total) => {
        const now = Date.now();
        if (now - lastUpdateTime > 150) {
          updateText(
            `Deleting Events... ${allSuccesses.length + processed}/${
              validEvents.length
            }`,
          );
          lastUpdateTime = now;
        }
      };

      // Reduce concurrency on retries to be gentler on rate limits
      const concurrency =
        retryRound > 0
          ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
          : DEFAULT_CONCURRENCY;

      const results = await runWithConcurrency(
        eventsToProcess,
        deleteSingle,
        concurrency,
        onProgress,
      );

      // Collect successes and failures
      const successes = results.filter((r) => r.ok && !r.skipped);
      const skipped = results.filter((r) => r.ok && r.skipped);
      const failures = results.filter((r) => !r.ok);

      successes.forEach((r) => allSuccesses.push(r.event));
      skipped.forEach((r) => allSkipped.push(r.event));

      // If all succeeded, we're done
      if (failures.length === 0) {
        eventsToProcess = [];
        break;
      }

      // Extract failed events for retry (exclude permanent failures)
      const failedEvents = failures
        .filter((f) => f.reason !== "permanent")
        .map((f) => f.event)
        .filter((e) => e !== undefined);

      // If no retryable events or max retries reached, stop
      if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
        if (failedEvents.length > 0) {
          logger.warn(
            `Giving up on ${failedEvents.length} events after ${retryRound} retry rounds`,
          );
        }
        eventsToProcess = [];
        break;
      }

      // Automatic retry - wait and try again
      retryRound++;
      eventsToProcess = failedEvents;

      // Progressive delay: 2s, 3s, 4s, 5s... up to 10s
      const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
      await sleep(retryDelay);
    }

    // Handle cancellation
    if (isCancelled()) {
      showCancelled();
      // If some events were successfully deleted, save them to undo
      if (allSuccesses.length > 0) {
        eventsBeforeMostRecentChange.push(...allSuccesses);
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: eventsBeforeMostRecentChange,
            action: "delete",
            delta: undefined,
          },
        });
      }
      // Show cancelled message for 2.5 seconds then remove and reload if needed
      setTimeout(() => {
        removeProgressToast("delete-events-overlay");
        if (allSuccesses.length > 0) {
          window.location.reload();
        }
      }, 2500);
      return;
    }

    // Remove overlay
    removeProgressToast("delete-events-overlay");

    // Handle results
    if (allSuccesses.length > 0) {
      // Consume 1 action for the bulk delete operation

      // Collect all events for undo
      eventsBeforeMostRecentChange.push(...allSuccesses);

      // Send single message to background to update local storage with eventsToUndo
      await chrome.runtime.sendMessage({
        type: "UPDATE_EVENTS_TO_UNDO",
        eventsToUndo: {
          events: eventsBeforeMostRecentChange,
          action: "delete",
          delta: undefined,
        },
      });

      // Calculate any failed events
      const goneCount = fetched.filter((e) => e.gone).length;
      const fetchFailedCount =
        eventInfos.length - validEvents.length - goneCount;
      const deleteFailedCount =
        validEvents.length - allSuccesses.length - allSkipped.length;
      const totalFailed = fetchFailedCount + deleteFailedCount;

      // Build detailed feedback message
      let message = `Deleted ${allSuccesses.length} event${
        allSuccesses.length !== 1 ? "s" : ""
      } successfully.`;
      if (allSkipped.length > 0) {
        message += `\n${allSkipped.length} event${
          allSkipped.length !== 1 ? "s" : ""
        } skipped (no permission).`;
      }
      if (totalFailed > 0) {
        message += `\n${totalFailed} event${
          totalFailed !== 1 ? "s" : ""
        } failed due to API errors.`;
      }

      // Warn user if some events couldn't be deleted or were skipped
      if (totalFailed > 0 || allSkipped.length > 0) {
        alert(message);
      }

      // Guarantee reload happens after all operations complete
      setTimeout(() => {
        window.location.reload();
      }, 50);
    } else if (allSkipped.length > 0) {
      // All events were skipped (none owned)
      alert(
        "No events were deleted. You don't have permission to delete the selected events.",
      );
    } else {
      alert("Failed to delete events. Please try again later.");
    }
  }

  //------------------------------------------------- MOVE EVENT POPUP ---------------------------------------------------
  function showMoveEventsDialog() {
    if (moveDialogOpen) return;
    if (!checkIfCalendarView()) return;

    moveDialogOpen = true;

    const overlay = document.createElement("div");
    moveDialogOverlay = overlay;

    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    border: 1px solid #e0e0e0;
    min-width: 320px;
  `;

    const label = document.createElement("div");
    label.textContent = `Move ${selected.length} event${
      selected.length > 1 ? "s" : ""
    }`;
    label.style.cssText = `margin-bottom: 15px; font-size: 16px; color: #333; font-weight: 500;`;

    // Mode toggle
    const modeContainer = document.createElement("div");
    modeContainer.style.cssText = `
    display: flex;
    gap: 0;
    justify-content: center;
    margin-bottom: 15px;
  `;

    const offsetModeBtn = document.createElement("button");
    offsetModeBtn.textContent = "By Offset";
    offsetModeBtn.style.cssText = `
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: 1px solid #4285f4;
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    font-size: 13px;
  `;

    const dateModeBtn = document.createElement("button");
    dateModeBtn.textContent = "To Specific Date";
    dateModeBtn.style.cssText = `
    padding: 8px 16px;
    background: #f1f1f1;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    font-size: 13px;
  `;

    modeContainer.appendChild(offsetModeBtn);
    modeContainer.appendChild(dateModeBtn);

    // Offset mode container
    const offsetContainer = document.createElement("div");
    offsetContainer.id = "move-offset-container";
    offsetContainer.style.cssText = `margin-bottom: 10px;`;

    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
  `;

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.placeholder = "Enter offset";
    quantityInput.value = "15";
    quantityInput.id = "move-quantity-input";
    quantityInput.style.cssText = `
    width: 120px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
  `;

    const unitSelect = document.createElement("select");
    unitSelect.id = "move-unit-select";
    unitSelect.style.cssText = `
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    color: black;
  `;

    const minutesOption = document.createElement("option");
    minutesOption.value = "minutes";
    minutesOption.textContent = "Minutes";

    const hoursOption = document.createElement("option");
    hoursOption.value = "hours";
    hoursOption.textContent = "Hours";

    const daysOption = document.createElement("option");
    daysOption.value = "days";
    daysOption.textContent = "Days";

    const weeksOption = document.createElement("option");
    weeksOption.value = "weeks";
    weeksOption.textContent = "Weeks";

    unitSelect.appendChild(minutesOption);
    unitSelect.appendChild(hoursOption);
    unitSelect.appendChild(daysOption);
    unitSelect.appendChild(weeksOption);

    inputContainer.appendChild(quantityInput);
    inputContainer.appendChild(unitSelect);

    const helpText = document.createElement("div");
    helpText.style.cssText = `font-size: 11px; color: #666;`;
    helpText.textContent =
      "Use negative values to move earlier, positive for later";

    offsetContainer.appendChild(inputContainer);
    offsetContainer.appendChild(helpText);

    // Date mode container (hidden initially)
    const dateContainer = document.createElement("div");
    dateContainer.id = "move-date-container";
    dateContainer.style.cssText = `margin-bottom: 10px; display: none;`;

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.id = "move-date-input";
    // Default to today
    const today = new Date();
    dateInput.value = today.toISOString().split("T")[0];
    dateInput.style.cssText = `
    width: 200px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
    margin-bottom: 10px;
  `;

    const dateHelpText = document.createElement("div");
    dateHelpText.style.cssText = `font-size: 11px; color: #666;`;
    dateHelpText.textContent =
      "Events will be moved so the earliest starts on this date (keeping relative positions and times)";

    const dateWarningText = document.createElement("div");
    dateWarningText.id = "move-date-warning";
    dateWarningText.style.cssText = `font-size: 11px; color: #999; margin-top: 5px; display: none;`;
    dateWarningText.textContent = "Loading event dates...";

    dateContainer.appendChild(dateInput);
    dateContainer.appendChild(dateHelpText);
    dateContainer.appendChild(dateWarningText);

    // Mode toggle logic
    let useSpecificDate = false;
    let earliestEventDateStr = null; // Will be fetched when date mode is activated

    const updateSubmitButtonState = () => {
      if (useSpecificDate && earliestEventDateStr) {
        const selectedDate = dateInput.value;
        if (selectedDate === earliestEventDateStr) {
          submitBtn.disabled = true;
          submitBtn.style.background = "#ccc";
          submitBtn.style.cursor = "not-allowed";
          dateWarningText.textContent =
            "Selected date matches earliest event - no movement will occur";
          dateWarningText.style.color = "#e67c00";
          dateWarningText.style.display = "block";
        } else {
          submitBtn.disabled = false;
          submitBtn.style.background = "#4285f4";
          submitBtn.style.cursor = "pointer";
          dateWarningText.style.display = "none";
        }
      } else if (useSpecificDate && !earliestEventDateStr) {
        // Still loading
        dateWarningText.style.display = "block";
        dateWarningText.style.color = "#999";
        dateWarningText.textContent = "Loading event dates...";
      } else {
        submitBtn.disabled = false;
        submitBtn.style.background = "#4285f4";
        submitBtn.style.cursor = "pointer";
      }
    };

    const fetchEarliestEventDate = async () => {
      try {
        const token = await getAuthToken("move events");
        if (!token) return;

        const events = await runWithConcurrency(
          selected,
          (id) => fetchEventById(token, id),
          DEFAULT_CONCURRENCY,
        );
        const validEvents = events.filter((e) => !e.gone && !e.fetchStatus);

        if (validEvents.length > 0) {
          let earliestDate = null;
          validEvents.forEach((ev) => {
            const evDate = new Date(ev.start.dateTime || ev.start.date);
            if (!earliestDate || evDate < earliestDate) {
              earliestDate = evDate;
            }
          });
          earliestEventDateStr = earliestDate.toISOString().split("T")[0];
          updateSubmitButtonState();
        }
      } catch (err) {
        logger.error("Error fetching earliest event date:", err);
      }
    };

    offsetModeBtn.addEventListener("click", () => {
      useSpecificDate = false;
      offsetModeBtn.style.background = "#4285f4";
      offsetModeBtn.style.color = "white";
      offsetModeBtn.style.borderColor = "#4285f4";
      dateModeBtn.style.background = "#f1f1f1";
      dateModeBtn.style.color = "#333";
      dateModeBtn.style.borderColor = "#ccc";
      offsetContainer.style.display = "block";
      dateContainer.style.display = "none";
      updateSubmitButtonState();
      quantityInput.focus();
    });

    dateModeBtn.addEventListener("click", () => {
      useSpecificDate = true;
      dateModeBtn.style.background = "#4285f4";
      dateModeBtn.style.color = "white";
      dateModeBtn.style.borderColor = "#4285f4";
      offsetModeBtn.style.background = "#f1f1f1";
      offsetModeBtn.style.color = "#333";
      offsetModeBtn.style.borderColor = "#ccc";
      offsetContainer.style.display = "none";
      dateContainer.style.display = "block";
      updateSubmitButtonState();
      dateInput.focus();
      // Fetch earliest event date if not already done
      if (!earliestEventDateStr) {
        fetchEarliestEventDate();
      }
    });

    dateInput.addEventListener("change", updateSubmitButtonState);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = `margin-top: 15px; display: flex; gap: 10px; justify-content: center;`;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Move Events";
    submitBtn.style.cssText = `
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #f1f1f1;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const handleClose = () => {
      if (moveDialogOverlay) {
        document.body.removeChild(moveDialogOverlay);
        moveDialogOverlay = null;
      }
      moveDialogOpen = false;
    };

    const handleSubmit = () => {
      if (submitBtn.disabled) return;

      if (useSpecificDate) {
        const targetDate = dateInput.value;
        if (targetDate) {
          moveEventsToDate(selected, targetDate);
        }
      } else {
        const quantity = parseInt(quantityInput.value);
        const unit = unitSelect.value;
        if (!isNaN(quantity) && quantity !== 0) {
          moveEvents(selected, quantity, unit);
        }
      }
      handleClose();
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleClose);

    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
      if (e.key === "Escape") handleClose();
    };

    quantityInput.addEventListener("keydown", handleKeydown);
    dateInput.addEventListener("keydown", handleKeydown);

    buttonsDiv.appendChild(submitBtn);
    buttonsDiv.appendChild(cancelBtn);
    dialog.appendChild(label);
    dialog.appendChild(modeContainer);
    dialog.appendChild(offsetContainer);
    dialog.appendChild(dateContainer);
    dialog.appendChild(buttonsDiv);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    quantityInput.focus();
    quantityInput.select();
  }

  // -----------------------------------------------------MOVE EVENTS------------------------------------------------
  function convertToMinutes(quantity, unit) {
    switch (unit) {
      case "minutes":
        return quantity;
      case "hours":
        return quantity * 60;
      case "days":
        return quantity * 60 * 24;
      case "weeks":
        return quantity * 60 * 24 * 7;
      default:
        return 0;
    }
  }

  async function moveEvents(eventInfos, quantity, unit) {
    const minutes = convertToMinutes(quantity, unit);

    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("move events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "move-events-overlay",
      "rgba(66, 133, 244, 0.95)",
      "Fetching event details...",
      true,
    );

    // Fetch event details with concurrency control to avoid rate limiting
    const fetched = await runWithConcurrency(
      eventInfos,
      (info) =>
        fetchEventById(token, info.eventId, info.calendarId, info.calendarName),
      DEFAULT_CONCURRENCY,
      (processed, total) => {
        updateText(`Fetching event details... ${processed}/${total}`);
      },
    );

    // Check for cancellation after fetch phase
    if (isCancelled()) {
      showCancelled();
      setTimeout(() => removeProgressToast("move-events-overlay"), 2500);
      return;
    }

    // Move single event with aggressive retry (up to 15 attempts)
    const moveSingle = async (event, attemptNumber = 1) => {
      const maxAttempts = 15;
      const calendarId = encodeURIComponent(event.calendarId || "primary");

      // validate start/end
      const startTime = new Date(
        event.start?.dateTime || event.start?.date || NaN,
      );
      const endTime = new Date(event.end?.dateTime || event.end?.date || NaN);
      if (isNaN(startTime) || isNaN(endTime)) {
        logger.error(
          `Invalid time for event ${event.summary}:`,
          event.start,
          event.end,
        );
        return { ok: false, skipped: false, event, reason: "invalid_time" };
      }

      startTime.setMinutes(startTime.getMinutes() + minutes);
      endTime.setMinutes(endTime.getMinutes() + minutes);

      const payload = {
        start: {
          dateTime: event.start?.dateTime ? startTime.toISOString() : undefined,
          date:
            event.start?.date && !event.start?.dateTime
              ? startTime.toISOString().split("T")[0]
              : undefined,
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime ? endTime.toISOString() : undefined,
          date:
            event.end?.date && !event.end?.dateTime
              ? endTime.toISOString().split("T")[0]
              : undefined,
          timeZone: event.end?.timeZone,
        },
      };

      // Optimized: reduced initial delay from 500ms to 300ms for faster retries
      let delay = 300 * Math.pow(1.5, attemptNumber - 1);

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        // Success cases
        if (res.status === 404 || res.status === 410)
          return { ok: true, event, skipped: false };
        if (res.ok) return { ok: true, event, skipped: false };

        // Get response body for all non-success cases
        const responseText = await res.text();

        // Check if 403 is a rate limit (should retry) or permission issue (should skip)
        if (res.status === 403) {
          try {
            const errorData = JSON.parse(responseText);
            const isRateLimit = errorData?.error?.errors?.some(
              (e) =>
                e.reason === "rateLimitExceeded" ||
                e.reason === "userRateLimitExceeded",
            );

            if (isRateLimit) {
              // Rate limit - treat as transient and retry with longer delay
              logger.warn(
                `Rate limit hit for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
              );
              if (attemptNumber < maxAttempts) {
                await sleep(delay * 2); // Double delay for rate limits
                return moveSingle(event, attemptNumber + 1);
              } else {
                logger.error(
                  `Max retries reached (rate limit) for event ${event.summary}`,
                );
                return {
                  ok: false,
                  skipped: false,
                  event,
                  status: res.status,
                  reason: "rate_limit_exceeded",
                  response: responseText,
                };
              }
            } else {
              // True permission denial - skip
              logger.log(
                `Skipping event (403 - no permission): ${event.summary}`,
              );
              logger.log("API error response:", responseText);
              return { ok: true, skipped: true };
            }
          } catch (e) {
            // Can't parse response, assume permission issue and skip
            logger.log(
              `Skipping event (403 - unparseable response): ${event.summary}`,
            );
            return { ok: true, skipped: true };
          }
        }

        // Transient errors - retry
        if (isTransientStatus(res.status)) {
          logger.warn(
            `Transient error (${res.status}) for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
          );
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return moveSingle(event, attemptNumber + 1);
          } else {
            logger.error(
              `Max retries reached for event ${event.summary}, status: ${res.status}, response:`,
              responseText,
            );
            return {
              ok: false,
              skipped: false,
              event,
              status: res.status,
              reason: "max_retries",
              response: responseText,
            };
          }
        } else {
          // Other permanent errors
          logger.error(
            `Permanent error (${res.status}) for event ${event.summary}:`,
            responseText,
          );
          return {
            ok: false,
            skipped: false,
            event,
            status: res.status,
            reason: "permanent",
            response: responseText,
          };
        }
      } catch (err) {
        logger.warn(
          `Network error for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}:`,
          err,
        );
        if (attemptNumber < maxAttempts) {
          await sleep(delay);
          return moveSingle(event, attemptNumber + 1);
        } else {
          logger.error(
            `Max retries reached for event ${event.summary} (network error):`,
            err,
          );
          return {
            ok: false,
            skipped: false,
            event,
            error: err,
            reason: "max_retries",
          };
        }
      }
    };

    // Process all valid events using concurrency pool (no stalling on slow requests)
    const validEvents = fetched.filter((ev) => !ev.gone && !ev.fetchStatus);

    let lastUpdateTime = 0;
    const onProgress = (processed, total) => {
      const now = Date.now();
      if (now - lastUpdateTime > 150) {
        updateText(`Moving Events... ${processed}/${total}`);
        lastUpdateTime = now;
      }
    };

    const results = await runWithConcurrency(
      validEvents,
      moveSingle,
      DEFAULT_CONCURRENCY,
      onProgress,
    );

    // Only count actual failures (not skipped/permission-denied)
    const failures = results.filter((r) => !r.ok);
    const successes = results.filter((r) => r.ok && !r.skipped);

    const skipped = results.filter((r) => r.ok && r.skipped);

    // Handle cancellation
    if (isCancelled()) {
      showCancelled();
      if (successes.length > 0) {
        const eventsForUndo = successes.map((s) => s.event);
        eventsBeforeMostRecentChange.push(...eventsForUndo);
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: eventsBeforeMostRecentChange,
            action: "move",
            delta: minutes,
          },
        });
      }
      setTimeout(() => {
        removeProgressToast("move-events-overlay");
        if (successes.length > 0) {
          window.location.reload();
        }
      }, 2500);
      return;
    }

    // Remove overlay
    removeProgressToast("move-events-overlay");

    // Handle results
    if (failures.length > 0) {
      const failureList = failures
        .map((f) => `- ${f.event.summary}`)
        .join("\n");
      alert(
        `Failed to move ${failures.length} event(s) after multiple retries:\n${failureList}\n\n` +
          `These events could not be moved and remain at their original times. ` +
          `Please try again later or move them manually.`,
      );
      logger.error("Move failures:", failures);
      // Do NOT reload - events failed to move
    } else {
      // All operations completed successfully (owned events moved, non-owned skipped)
      if (successes.length > 0) {
        // Consume 1 action for the bulk move operation

        // Collect all events for undo (optimized: single message instead of per-event)
        const eventsForUndo = successes.map((s) => s.event);
        eventsBeforeMostRecentChange.push(...eventsForUndo);

        // Send single message to background to update local storage with eventsToUndo
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: eventsBeforeMostRecentChange,
            action: "move",
            delta: minutes,
          },
        });

        // Guarantee reload happens after all operations complete
        // Use setTimeout to ensure the message is fully processed
        setTimeout(() => {
          window.location.reload();
        }, 50);
      } else {
        // All events were skipped (none owned)
        alert(
          "No events were moved. You don't have permission to modify the selected events.",
        );
      }
    }
  }

  // -----------------------------------------------------MOVE EVENTS TO SPECIFIC DATE------------------------------------------------
  async function moveEventsToDate(eventInfos, targetDateStr) {
    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("move events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "move-to-date-overlay",
      "rgba(66, 133, 244, 0.95)",
      "Fetching event details...",
      true,
    );

    try {
      // Fetch all event details with concurrency control
      const events = await runWithConcurrency(
        eventInfos,
        (info) =>
          fetchEventById(
            token,
            info.eventId,
            info.calendarId,
            info.calendarName,
          ),
        DEFAULT_CONCURRENCY,
        (processed, total) => {
          updateText(`Fetching event details... ${processed}/${total}`);
        },
      );

      // Check for cancellation after fetch phase
      if (isCancelled()) {
        showCancelled();
        setTimeout(() => removeProgressToast("move-to-date-overlay"), 2500);
        return;
      }

      const validEvents = events.filter((ev) => !ev.gone && !ev.fetchStatus);

      if (validEvents.length === 0) {
        throw new Error(
          "Could not fetch selected events. They may have been deleted.",
        );
      }

      // Find the earliest event to use as reference
      let earliestEvent = validEvents[0];
      let earliestDate = null;

      validEvents.forEach((ev) => {
        const evDate = new Date(ev.start.dateTime || ev.start.date);
        if (!earliestDate || evDate < earliestDate) {
          earliestDate = evDate;
          earliestEvent = ev;
        }
      });

      // Calculate the offset from earliest event to target date
      const targetDate = new Date(targetDateStr + "T00:00:00");
      const earliestEventDate = new Date(
        earliestEvent.start.dateTime || earliestEvent.start.date,
      );

      // Keep the time of day, just change the date
      const offsetMs =
        targetDate.getTime() -
        new Date(earliestEventDate.toDateString()).getTime();

      // Convert to minutes for undo tracking
      const offsetMinutes = offsetMs / (1000 * 60);

      updateText(`Moving ${validEvents.length} events...`);

      // Move single event with retry logic
      const moveSingle = async (event, attemptNumber = 1) => {
        const maxAttempts = 15;
        const delay = 300 * Math.pow(1.5, attemptNumber - 1);
        const calendarId = encodeURIComponent(event.calendarId || "primary");

        // Calculate new times
        let payload;

        if (event.start.dateTime) {
          // Timed event
          const startDate = new Date(event.start.dateTime);
          const endDate = new Date(event.end.dateTime);
          startDate.setTime(startDate.getTime() + offsetMs);
          endDate.setTime(endDate.getTime() + offsetMs);
          payload = {
            start: {
              dateTime: startDate.toISOString(),
              timeZone: event.start.timeZone,
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: event.end.timeZone,
            },
          };
        } else {
          // All-day event
          const startDate = new Date(event.start.date);
          const endDate = new Date(event.end.date);
          startDate.setTime(startDate.getTime() + offsetMs);
          endDate.setTime(endDate.getTime() + offsetMs);
          payload = {
            start: { date: startDate.toISOString().split("T")[0] },
            end: { date: endDate.toISOString().split("T")[0] },
          };
        }

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );

          // Success cases
          if (res.status === 404 || res.status === 410)
            return { ok: true, event, skipped: false };
          if (res.ok) return { ok: true, event, skipped: false };

          // Get response body for all non-success cases
          const responseText = await res.text();

          // Check if 403 is a rate limit (should retry) or permission issue (should skip)
          if (res.status === 403) {
            try {
              const errorData = JSON.parse(responseText);
              const isRateLimit = errorData?.error?.errors?.some(
                (e) =>
                  e.reason === "rateLimitExceeded" ||
                  e.reason === "userRateLimitExceeded",
              );

              if (isRateLimit) {
                logger.warn(
                  `Rate limit hit for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
                );
                if (attemptNumber < maxAttempts) {
                  await sleep(delay * 2);
                  return moveSingle(event, attemptNumber + 1);
                } else {
                  return {
                    ok: false,
                    skipped: false,
                    event,
                    status: res.status,
                    reason: "rate_limit_exceeded",
                  };
                }
              } else {
                logger.log(
                  `Skipping event (403 - no permission): ${event.summary}`,
                );
                return { ok: true, skipped: true };
              }
            } catch (e) {
              logger.log(
                `Skipping event (403 - unparseable response): ${event.summary}`,
              );
              return { ok: true, skipped: true };
            }
          }

          // Transient errors - retry
          if (isTransientStatus(res.status)) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return moveSingle(event, attemptNumber + 1);
            } else {
              return {
                ok: false,
                skipped: false,
                event,
                status: res.status,
                reason: "max_retries",
              };
            }
          } else {
            return {
              ok: false,
              skipped: false,
              event,
              status: res.status,
              reason: "permanent",
            };
          }
        } catch (err) {
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return moveSingle(event, attemptNumber + 1);
          } else {
            return {
              ok: false,
              skipped: false,
              event,
              error: err,
              reason: "max_retries",
            };
          }
        }
      };

      // Process using concurrency pool
      let lastUpdateTime = 0;
      const onProgress = (processed, total) => {
        const now = Date.now();
        if (now - lastUpdateTime > 150) {
          updateText(`Moving... ${processed}/${total}`);
          lastUpdateTime = now;
        }
      };

      const results = await runWithConcurrency(
        validEvents,
        moveSingle,
        DEFAULT_CONCURRENCY,
        onProgress,
      );

      const failures = results.filter((r) => !r.ok);
      const successes = results.filter((r) => r.ok && !r.skipped);

      // Handle cancellation
      if (isCancelled()) {
        showCancelled();
        if (successes.length > 0) {
          const eventsForUndo = successes.map((s) => s.event);
          eventsBeforeMostRecentChange.push(...eventsForUndo);
          await chrome.runtime.sendMessage({
            type: "UPDATE_EVENTS_TO_UNDO",
            eventsToUndo: {
              events: eventsBeforeMostRecentChange,
              action: "move",
              delta: offsetMinutes,
            },
          });
        }
        setTimeout(() => {
          removeProgressToast("move-to-date-overlay");
          if (successes.length > 0) {
            window.location.reload();
          }
        }, 2500);
        return;
      }

      // Remove overlay
      removeProgressToast("move-to-date-overlay");

      // Handle results
      if (failures.length > 0) {
        const failureList = failures
          .map((f) => `- ${f.event.summary}`)
          .join("\n");
        alert(
          `Failed to move ${failures.length} event(s) after multiple retries:\n${failureList}\n\n` +
            `These events could not be moved and remain at their original times. ` +
            `Please try again later or move them manually.`,
        );
        logger.error("Move to date failures:", failures);
      } else {
        if (successes.length > 0) {
          // Consume 1 action for the bulk move operation

          // Collect all events for undo
          const eventsForUndo = successes.map((s) => s.event);
          eventsBeforeMostRecentChange.push(...eventsForUndo);

          // Send single message to background to update local storage with eventsToUndo
          await chrome.runtime.sendMessage({
            type: "UPDATE_EVENTS_TO_UNDO",
            eventsToUndo: {
              events: eventsBeforeMostRecentChange,
              action: "move",
              delta: offsetMinutes,
            },
          });

          // Reload to reflect changes
          setTimeout(() => {
            window.location.reload();
          }, 50);
        } else {
          alert(
            "No events were moved. You don't have permission to modify the selected events.",
          );
        }
      }
    } catch (err) {
      removeProgressToast("move-to-date-overlay");
      logger.error("Error moving events to date:", err);
      alert(`Error moving events: ${err.message}`);
    }
  }

  //------------------------------------------------- EDIT BOUNDARIES POPUP ---------------------------------------------------
  function showEditBoundariesDialog() {
    if (editBoundariesDialogOpen) return;
    if (!checkIfCalendarView()) return;

    editBoundariesDialogOpen = true;

    const overlay = document.createElement("div");
    editBoundariesDialogOverlay = overlay;

    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    text-align: center;
    border: 1px solid #e0e0e0;
    min-width: 320px;
  `;

    const title = document.createElement("div");
    title.textContent = `Edit Times for ${selected.length} Event${
      selected.length > 1 ? "s" : ""
    }`;
    title.style.cssText = `margin-bottom: 20px; font-size: 16px; font-weight: 600; color: #333;`;

    const description = document.createElement("div");
    description.textContent = "Adjust the start and/or end times by an offset";
    description.style.cssText = `margin-bottom: 16px; font-size: 13px; color: #666;`;

    // Start time section
    const startSection = document.createElement("div");
    startSection.style.cssText = `
    margin-bottom: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
  `;

    const startLabel = document.createElement("div");
    startLabel.textContent = "Adjust Start Time";
    startLabel.style.cssText = `margin-bottom: 8px; font-size: 13px; font-weight: 500; color: #444;`;

    const startInputContainer = document.createElement("div");
    startInputContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
  `;

    const startQuantityInput = document.createElement("input");
    startQuantityInput.type = "number";
    startQuantityInput.placeholder = "0";
    startQuantityInput.value = "0";
    startQuantityInput.style.cssText = `
    width: 80px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
  `;

    const startUnitSelect = document.createElement("select");
    startUnitSelect.style.cssText = `
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    color: black;
  `;
    startUnitSelect.innerHTML = `
    <option value="minutes">Minutes</option>
    <option value="hours">Hours</option>
  `;

    startInputContainer.appendChild(startQuantityInput);
    startInputContainer.appendChild(startUnitSelect);
    startSection.appendChild(startLabel);
    startSection.appendChild(startInputContainer);

    // End time section
    const endSection = document.createElement("div");
    endSection.style.cssText = `
    margin-bottom: 20px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
  `;

    const endLabel = document.createElement("div");
    endLabel.textContent = "Adjust End Time";
    endLabel.style.cssText = `margin-bottom: 8px; font-size: 13px; font-weight: 500; color: #444;`;

    const endInputContainer = document.createElement("div");
    endInputContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
  `;

    const endQuantityInput = document.createElement("input");
    endQuantityInput.type = "number";
    endQuantityInput.placeholder = "0";
    endQuantityInput.value = "0";
    endQuantityInput.style.cssText = `
    width: 80px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
  `;

    const endUnitSelect = document.createElement("select");
    endUnitSelect.style.cssText = `
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    color: black;
  `;
    endUnitSelect.innerHTML = `
    <option value="minutes">Minutes</option>
    <option value="hours">Hours</option>
  `;

    endInputContainer.appendChild(endQuantityInput);
    endInputContainer.appendChild(endUnitSelect);
    endSection.appendChild(endLabel);
    endSection.appendChild(endInputContainer);

    // Help text
    const helpText = document.createElement("div");
    helpText.textContent =
      "Use negative values to shift earlier, positive to shift later";
    helpText.style.cssText = `margin-bottom: 16px; font-size: 11px; color: #888; font-style: italic;`;

    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = `display: flex; gap: 10px; justify-content: center;`;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Apply Changes";
    submitBtn.style.cssText = `
    padding: 10px 20px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
    padding: 10px 20px;
    background: #f1f1f1;
    color: #333;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;

    const handleClose = () => {
      if (editBoundariesDialogOverlay) {
        document.body.removeChild(editBoundariesDialogOverlay);
        editBoundariesDialogOverlay = null;
      }
      editBoundariesDialogOpen = false;
    };

    const handleSubmit = () => {
      const startQuantity = parseInt(startQuantityInput.value) || 0;
      const startUnit = startUnitSelect.value;
      const endQuantity = parseInt(endQuantityInput.value) || 0;
      const endUnit = endUnitSelect.value;

      // Only proceed if at least one offset is non-zero
      if (startQuantity !== 0 || endQuantity !== 0) {
        editEventBoundaries(
          selected,
          startQuantity,
          startUnit,
          endQuantity,
          endUnit,
        );
      }
      handleClose();
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleClose);

    // Handle keyboard events
    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
      if (e.key === "Escape") handleClose();
    };

    startQuantityInput.addEventListener("keydown", handleKeydown);
    endQuantityInput.addEventListener("keydown", handleKeydown);

    buttonsDiv.appendChild(submitBtn);
    buttonsDiv.appendChild(cancelBtn);

    dialog.appendChild(title);
    dialog.appendChild(description);
    dialog.appendChild(startSection);
    dialog.appendChild(endSection);
    dialog.appendChild(helpText);
    dialog.appendChild(buttonsDiv);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    startQuantityInput.focus();
    startQuantityInput.select();
  }

  async function editEventBoundaries(
    eventInfos,
    startQuantity,
    startUnit,
    endQuantity,
    endUnit,
  ) {
    const startMinutes = convertToMinutes(startQuantity, startUnit);
    const endMinutes = convertToMinutes(endQuantity, endUnit);

    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;
    if (startMinutes === 0 && endMinutes === 0) return;

    const token = await getAuthToken("edit events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "edit-boundaries-overlay",
      "rgba(66, 133, 244, 0.95)",
      "Fetching event details...",
      true,
    );

    // Fetch event details with concurrency control to avoid rate limiting
    const fetched = await runWithConcurrency(
      eventInfos,
      (info) =>
        fetchEventById(token, info.eventId, info.calendarId, info.calendarName),
      DEFAULT_CONCURRENCY,
      (processed, total) => {
        updateText(`Fetching event details... ${processed}/${total}`);
      },
    );

    // Check for cancellation after fetch phase
    if (isCancelled()) {
      showCancelled();
      setTimeout(() => removeProgressToast("edit-boundaries-overlay"), 2500);
      return;
    }

    // Edit single event with retry
    const editSingle = async (event, attemptNumber = 1) => {
      const maxAttempts = 15;
      const calendarId = encodeURIComponent(event.calendarId || "primary");

      // Validate start/end
      const startTime = new Date(
        event.start?.dateTime || event.start?.date || NaN,
      );
      const endTime = new Date(event.end?.dateTime || event.end?.date || NaN);
      if (isNaN(startTime) || isNaN(endTime)) {
        logger.error(
          `Invalid time for event ${event.summary}:`,
          event.start,
          event.end,
        );
        return { ok: false, skipped: false, event, reason: "invalid_time" };
      }

      // Apply offsets
      if (startMinutes !== 0) {
        startTime.setMinutes(startTime.getMinutes() + startMinutes);
      }
      if (endMinutes !== 0) {
        endTime.setMinutes(endTime.getMinutes() + endMinutes);
      }

      const payload = {
        start: {
          dateTime: event.start?.dateTime ? startTime.toISOString() : undefined,
          date:
            event.start?.date && !event.start?.dateTime
              ? startTime.toISOString().split("T")[0]
              : undefined,
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime ? endTime.toISOString() : undefined,
          date:
            event.end?.date && !event.end?.dateTime
              ? endTime.toISOString().split("T")[0]
              : undefined,
          timeZone: event.end?.timeZone,
        },
      };

      let delay = 300 * Math.pow(1.5, attemptNumber - 1);

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (res.status === 404 || res.status === 410)
          return { ok: true, event, skipped: false };
        if (res.ok) return { ok: true, event, skipped: false };

        const responseText = await res.text();

        if (res.status === 403) {
          try {
            const errorData = JSON.parse(responseText);
            const isRateLimit = errorData?.error?.errors?.some(
              (e) =>
                e.reason === "rateLimitExceeded" ||
                e.reason === "userRateLimitExceeded",
            );

            if (isRateLimit) {
              logger.warn(
                `Rate limit hit for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
              );
              if (attemptNumber < maxAttempts) {
                await sleep(delay * 2);
                return editSingle(event, attemptNumber + 1);
              } else {
                return {
                  ok: false,
                  skipped: false,
                  event,
                  status: res.status,
                  reason: "rate_limit_exceeded",
                  response: responseText,
                };
              }
            } else {
              logger.log(
                `Skipping event (403 - no permission): ${event.summary}`,
              );
              return {
                ok: true,
                skipped: true,
                event,
                reason: "no_permission",
              };
            }
          } catch (parseErr) {
            logger.log(`Skipping event (403 - parse error): ${event.summary}`);
            return { ok: true, skipped: true, event, reason: "no_permission" };
          }
        }

        if (isTransientStatus(res.status) && attemptNumber < maxAttempts) {
          logger.warn(
            `Transient error ${res.status} for ${event.summary}, retrying...`,
          );
          await sleep(delay);
          return editSingle(event, attemptNumber + 1);
        }

        return {
          ok: false,
          skipped: false,
          event,
          status: res.status,
          response: responseText,
        };
      } catch (err) {
        if (attemptNumber < maxAttempts) {
          logger.warn(`Network error for ${event.summary}, retrying...`);
          await sleep(delay);
          return editSingle(event, attemptNumber + 1);
        }
        return { ok: false, skipped: false, event, error: err.message };
      }
    };

    // Process using concurrency pool (no stalling on slow requests)
    const validEvents = fetched.filter((e) => !e.gone && !e.idOnly);

    let lastUpdateTime = 0;
    const onProgress = (processed, total) => {
      const now = Date.now();
      if (now - lastUpdateTime > 150) {
        updateText(`Editing Events... ${processed}/${total}`);
        lastUpdateTime = now;
      }
    };

    const results = await runWithConcurrency(
      validEvents,
      editSingle,
      DEFAULT_CONCURRENCY,
      onProgress,
    );

    const successes = results.filter((r) => r.ok && !r.skipped);
    const failures = results.filter((r) => !r.ok);
    const skipped = results.filter((r) => r.ok && r.skipped);

    // Handle cancellation
    if (isCancelled()) {
      showCancelled();
      if (successes.length > 0) {
        const eventsForUndo = successes.map((s) => s.event);
        eventsBeforeMostRecentChange.push(...eventsForUndo);
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: eventsBeforeMostRecentChange,
            action: "editBoundaries",
            startDelta: startMinutes,
            endDelta: endMinutes,
          },
        });
      }
      setTimeout(() => {
        removeProgressToast("edit-boundaries-overlay");
        if (successes.length > 0) {
          window.location.reload();
        }
      }, 2500);
      return;
    }

    // Remove overlay
    removeProgressToast("edit-boundaries-overlay");

    if (failures.length > 0) {
      const failureList = failures
        .map((f) => `- ${f.event.summary}`)
        .join("\n");
      alert(
        `Failed to edit ${failures.length} event(s):\n${failureList}\n\n` +
          `These events could not be modified. Please try again later.`,
      );
      logger.error("Edit failures:", failures);
    } else {
      if (successes.length > 0) {
        const eventsForUndo = successes.map((s) => s.event);
        eventsBeforeMostRecentChange.push(...eventsForUndo);

        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: eventsBeforeMostRecentChange,
            action: "editBoundaries",
            startDelta: startMinutes,
            endDelta: endMinutes,
          },
        });

        setTimeout(() => {
          window.location.reload();
        }, 50);
      } else {
        alert(
          "No events were modified. You don't have permission to modify the selected events.",
        );
      }
    }
  }

  //------------------------------------------------- COLOR EVENT POPUP ---------------------------------------------------
  // Google Calendar event color IDs (1-11)
  const EVENT_COLORS = [
    { id: "1", name: "Lavender", color: "#7986cb" },
    { id: "2", name: "Sage", color: "#33b679" },
    { id: "3", name: "Grape", color: "#8e24aa" },
    { id: "4", name: "Flamingo", color: "#e67c73" },
    { id: "5", name: "Banana", color: "#f6bf26" },
    { id: "6", name: "Tangerine", color: "#f4511e" },
    { id: "7", name: "Peacock", color: "#039be5" },
    { id: "8", name: "Graphite", color: "#616161" },
    { id: "9", name: "Blueberry", color: "#3f51b5" },
    { id: "10", name: "Basil", color: "#0b8043" },
    { id: "11", name: "Tomato", color: "#d50000" },
    { id: "", name: "Calendar Default", color: "#4285f4" },
  ];

  function showColorEventsDialog() {
    if (colorDialogOpen) return;
    if (!checkIfCalendarView()) return;

    colorDialogOpen = true;

    const overlay = document.createElement("div");
    colorDialogOverlay = overlay;

    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    border: 1px solid #e0e0e0;
    max-width: 320px;
  `;

    const label = document.createElement("div");
    label.textContent = `Change color for ${selected.length} event${
      selected.length > 1 ? "s" : ""
    }:`;
    label.style.cssText = `margin-bottom: 15px; font-size: 14px; color: #333;`;

    const colorGrid = document.createElement("div");
    colorGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 15px;
  `;

    let selectedColorId = null;

    EVENT_COLORS.forEach((colorOption) => {
      const colorBtn = document.createElement("button");
      colorBtn.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid transparent;
      border-radius: 8px;
      background: ${colorOption.color};
      cursor: pointer;
      transition: transform 0.1s, border-color 0.1s;
      position: relative;
    `;
      colorBtn.title = colorOption.name;

      colorBtn.addEventListener("mouseenter", () => {
        colorBtn.style.transform = "scale(1.1)";
      });
      colorBtn.addEventListener("mouseleave", () => {
        colorBtn.style.transform = "scale(1)";
      });

      colorBtn.addEventListener("click", () => {
        // Remove selection from all buttons
        colorGrid.querySelectorAll("button").forEach((btn) => {
          btn.style.borderColor = "transparent";
          btn.innerHTML = "";
        });
        // Select this button
        colorBtn.style.borderColor = "#333";
        colorBtn.innerHTML = `<span style="color: white; font-size: 18px; text-shadow: 0 0 3px rgba(0,0,0,0.5);">?</span>`;
        selectedColorId = colorOption.id;
      });

      colorGrid.appendChild(colorBtn);
    });

    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = `display: flex; gap: 10px; justify-content: center;`;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Apply Color";
    submitBtn.style.cssText = `
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #f1f1f1;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const handleClose = () => {
      if (colorDialogOverlay) {
        document.body.removeChild(colorDialogOverlay);
        colorDialogOverlay = null;
      }
      colorDialogOpen = false;
    };

    const handleSubmit = () => {
      if (selectedColorId !== null) {
        changeEventColors(selected, selectedColorId);
      }
      handleClose();
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleClose);

    // Handle Escape key to close
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    buttonsDiv.appendChild(submitBtn);
    buttonsDiv.appendChild(cancelBtn);
    dialog.appendChild(label);
    dialog.appendChild(colorGrid);
    dialog.appendChild(buttonsDiv);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  //------------------------------------------------- RENAME EVENTS POPUP ---------------------------------------------------
  function showRenameEventsDialog() {
    if (renameDialogOpen) return;
    renameDialogOpen = true;

    // Create overlay
    renameDialogOverlay = document.createElement("div");
    renameDialogOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

    // Create dialog
    const dialog = document.createElement("div");
    dialog.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    min-width: 350px;
    max-width: 500px;
  `;

    const label = document.createElement("h3");
    label.textContent = `Rename ${selected.length} Event(s)`;
    label.style.cssText = `margin: 0 0 16px 0; font-size: 18px; color: #333;`;

    // Text input for new name
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = `margin-bottom: 16px;`;

    const inputLabel = document.createElement("label");
    inputLabel.textContent = "New Name:";
    inputLabel.style.cssText = `display: block; margin-bottom: 8px; font-size: 14px; color: #555;`;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Enter new event name...";
    nameInput.style.cssText = `
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-sizing: border-box;
    outline: none;
  `;
    nameInput.addEventListener("focus", () => {
      nameInput.style.borderColor = "#4285f4";
    });
    nameInput.addEventListener("blur", () => {
      nameInput.style.borderColor = "#ddd";
    });

    inputContainer.appendChild(inputLabel);
    inputContainer.appendChild(nameInput);

    // Buttons
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = `display: flex; gap: 10px; justify-content: center;`;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Rename Events";
    submitBtn.style.cssText = `
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #f1f1f1;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const handleClose = () => {
      if (renameDialogOverlay) {
        document.body.removeChild(renameDialogOverlay);
        renameDialogOverlay = null;
      }
      renameDialogOpen = false;
    };

    const handleSubmit = () => {
      const newName = nameInput.value.trim();
      if (newName) {
        renameEvents(selected, newName);
      } else {
        alert("Please enter a name for the events.");
        return;
      }
      handleClose();
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleClose);

    // Handle Enter key to submit
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    });

    // Handle Escape key to close
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    buttonsDiv.appendChild(submitBtn);
    buttonsDiv.appendChild(cancelBtn);
    dialog.appendChild(label);
    dialog.appendChild(inputContainer);
    dialog.appendChild(buttonsDiv);

    renameDialogOverlay.appendChild(dialog);
    document.body.appendChild(renameDialogOverlay);

    // Focus the input
    setTimeout(() => nameInput.focus(), 50);
  }

  // -----------------------------------------------------RENAME EVENTS------------------------------------------------
  async function renameEvents(eventInfos, newName) {
    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("rename events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "rename-events-overlay",
      "rgba(66, 133, 244, 0.95)",
      "Fetching event details...",
      true,
    );

    // Store previous event state for undo
    let previousStates = [];

    // Fetch event details up-front (with undo state collection)
    const fetchEventWithUndo = async (info) => {
      const data = await fetchEventById(
        token,
        info.eventId,
        info.calendarId,
        info.calendarName,
      );
      if (!data.gone && !data.fetchStatus) {
        previousStates.push({
          id: data.id,
          calendarId: data.calendarId,
          oldSummary: data.summary,
        });
      }
      return data;
    };

    // Fetch with concurrency control to avoid rate limiting
    const fetched = await runWithConcurrency(
      eventInfos,
      fetchEventWithUndo,
      DEFAULT_CONCURRENCY,
      (processed, total) => {
        updateText(`Fetching event details... ${processed}/${total}`);
      },
    );

    // Check for cancellation after fetch phase
    if (isCancelled()) {
      showCancelled();
      setTimeout(() => removeProgressToast("rename-events-overlay"), 2500);
      return;
    }

    // Rename single event with aggressive retry (up to 15 attempts)
    const renameSingle = async (event, attemptNumber = 1) => {
      const maxAttempts = 15;
      const calendarId = encodeURIComponent(event.calendarId || "primary");

      const payload = {
        summary: newName,
      };

      // Optimized: reduced initial delay from 500ms to 300ms for faster retries
      let delay = 300 * Math.pow(1.5, attemptNumber - 1);

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        // Success cases
        if (res.status === 404 || res.status === 410)
          return { ok: true, event, skipped: false };
        if (res.ok) return { ok: true, event, skipped: false };

        // Get response body for all non-success cases
        const responseText = await res.text();

        // Check if 403 is a rate limit (should retry) or permission issue (should skip)
        if (res.status === 403) {
          try {
            const errorData = JSON.parse(responseText);
            const isRateLimit = errorData?.error?.errors?.some(
              (e) =>
                e.reason === "rateLimitExceeded" ||
                e.reason === "userRateLimitExceeded",
            );

            if (isRateLimit) {
              logger.warn(
                `Rate limit hit for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
              );
              if (attemptNumber < maxAttempts) {
                await sleep(delay * 2);
                return renameSingle(event, attemptNumber + 1);
              } else {
                logger.error(
                  `Max retries reached (rate limit) for event ${event.summary}`,
                );
                return {
                  ok: false,
                  skipped: false,
                  event,
                  status: res.status,
                  reason: "rate_limit_exceeded",
                  response: responseText,
                };
              }
            } else {
              logger.log(
                `Skipping event (403 - no permission): ${event.summary}`,
              );
              return { ok: true, skipped: true };
            }
          } catch (e) {
            logger.log(
              `Skipping event (403 - unparseable response): ${event.summary}`,
            );
            return { ok: true, skipped: true };
          }
        }

        // Transient errors - retry
        if (isTransientStatus(res.status)) {
          logger.warn(
            `Transient error (${res.status}) for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
          );
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return renameSingle(event, attemptNumber + 1);
          } else {
            logger.error(
              `Max retries reached for event ${event.summary}, status: ${res.status}`,
            );
            return {
              ok: false,
              skipped: false,
              event,
              status: res.status,
              reason: "max_retries",
              response: responseText,
            };
          }
        } else {
          logger.error(
            `Permanent error (${res.status}) for event ${event.summary}:`,
            responseText,
          );
          return {
            ok: false,
            skipped: false,
            event,
            status: res.status,
            reason: "permanent",
            response: responseText,
          };
        }
      } catch (err) {
        logger.warn(
          `Network error for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}:`,
          err,
        );
        if (attemptNumber < maxAttempts) {
          await sleep(delay);
          return renameSingle(event, attemptNumber + 1);
        }
        return { ok: false, event, reason: "network_max_retries", error: err };
      }
    };

    // Process all valid events using concurrency pool (no stalling on slow requests)
    const validEvents = fetched.filter((ev) => !ev.gone && !ev.fetchStatus);

    let lastUpdateTime = 0;
    const onProgress = (processed, total) => {
      const now = Date.now();
      if (now - lastUpdateTime > 150) {
        updateText(`Renaming Events... ${processed}/${total}`);
        lastUpdateTime = now;
      }
    };

    const results = await runWithConcurrency(
      validEvents,
      renameSingle,
      DEFAULT_CONCURRENCY,
      onProgress,
    );

    // Only count actual failures (not skipped/permission-denied)
    const failures = results.filter((r) => !r.ok);
    const successes = results.filter((r) => r.ok && !r.skipped);
    const skipped = results.filter((r) => r.ok && r.skipped);

    // Handle cancellation
    if (isCancelled()) {
      showCancelled();
      if (successes.length > 0) {
        // Filter previousStates to only include successfully renamed events
        const successIds = new Set(successes.map((s) => s.event.id));
        const undoStates = previousStates.filter((ps) => successIds.has(ps.id));
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: undoStates,
            action: "rename",
          },
        });
      }
      setTimeout(() => {
        removeProgressToast("rename-events-overlay");
        if (successes.length > 0) {
          window.location.reload();
        }
      }, 2500);
      return;
    }

    // Remove overlay
    removeProgressToast("rename-events-overlay");

    // Handle results
    if (failures.length > 0) {
      const failureList = failures
        .map((f) => `- ${f.event.summary}`)
        .join("\n");
      alert(
        `Failed to rename ${failures.length} event(s) after multiple retries:\n${failureList}\n\n` +
          `These events could not be updated. Please try again later.`,
      );
      logger.error("Rename failures:", failures);
    } else {
      if (successes.length > 0) {
        // Consume 1 action for the bulk rename operation

        // Save undo state with both old and new summary (include calendarId)
        const successIds = new Set(successes.map((s) => s.event.id));
        const undoEvents = previousStates
          .filter((prev) => successIds.has(prev.id))
          .map((prev) => ({
            id: prev.id,
            calendarId: prev.calendarId,
            oldSummary: prev.oldSummary,
            newSummary: newName,
          }));
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: undoEvents,
            action: "rename",
          },
        });

        // Guarantee reload happens after all operations complete
        setTimeout(() => {
          window.location.reload();
        }, 50);
      } else {
        alert(
          "No events were renamed. You don't have permission to modify the selected events.",
        );
      }
    }
  }

  // -----------------------------------------------------SWAP EVENTS FEATURE------------------------------------------------
  function enterSwapMode() {
    if (selected.length === 0) return;

    swapMode = true;
    swapFirstSelection = [...selected];

    // Mark first selection events with special swap styling (keep visible)
    const gcEvents = getAllCalendarEvents();
    gcEvents.forEach((event) => {
      if (event.classList.contains("gc-bulk-selected")) {
        // Change to swap-first styling - CSS handles the visual styling
        event.classList.remove("gc-bulk-selected");
        event.classList.add("gc-swap-first-selection");
        if (isEventNeedingTextColor(event)) {
          event.classList.add("gc-needs-text-color");
        }
      }
    });

    // Clear selected array so user can build second selection
    selected = [];
    let counterElem = document.querySelector(".gc-selected-counter");
    if (counterElem) {
      const countSpan = counterElem.querySelector(".gc-counter-count");
      if (countSpan) {
        countSpan.textContent = "0";
      }
    }

    // Show swap mode overlay
    swapOverlay = document.createElement("div");
    swapOverlay.id = "gc-swap-overlay";
    swapOverlay.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    animation: gcSwapSlideIn 0.3s ease-out;
  `;

    // Add animation
    const style = document.createElement("style");
    style.textContent = `
    @keyframes gcSwapSlideIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes gcSwapPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;
    swapOverlay.appendChild(style);

    const title = document.createElement("div");
    title.style.cssText = `font-size: 16px; font-weight: 600;`;
    title.textContent = `🔄 Swap Mode Active`;

    const subtitle = document.createElement("div");
    subtitle.style.cssText = `font-size: 13px; opacity: 0.9;`;
    subtitle.textContent = `First selection: ${
      swapFirstSelection.length
    } event${swapFirstSelection.length > 1 ? "s" : ""}`;

    // Specific Swap checkbox with tooltip
    const checkboxContainer = document.createElement("div");
    checkboxContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    position: relative;
  `;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "gc-specific-swap-checkbox";
    checkbox.checked = specificSwapMode;
    checkbox.style.cssText = `
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: white;
  `;
    checkbox.addEventListener("change", (e) => {
      specificSwapMode = e.target.checked;
      updateSwapInstructions();
    });

    const checkboxLabel = document.createElement("label");
    checkboxLabel.htmlFor = "gc-specific-swap-checkbox";
    checkboxLabel.style.cssText = `
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  `;
    checkboxLabel.textContent = "Specific Swap";

    // Info icon with tooltip
    const infoIcon = document.createElement("span");
    infoIcon.textContent = "ℹ️";
    infoIcon.style.cssText = `
    font-size: 12px;
    cursor: help;
    position: relative;
  `;

    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10001;
    margin-bottom: 8px;
  `;
    tooltip.textContent =
      "Pairs events by time and swaps their exact time slots. Requires equal event counts.";

    infoIcon.appendChild(tooltip);
    infoIcon.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
    });
    infoIcon.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });

    checkboxLabel.appendChild(infoIcon);
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxLabel);

    const instructions = document.createElement("div");
    instructions.id = "gc-swap-instructions";
    instructions.style.cssText = `font-size: 12px; opacity: 0.8; text-align: center;`;

    // Function to update instructions based on mode
    const updateSwapInstructions = () => {
      const instructionsEl = document.getElementById("gc-swap-instructions");
      if (instructionsEl) {
        if (specificSwapMode) {
          instructionsEl.innerHTML = `Select the <strong>same number</strong> of events to swap with.<br>Events will be paired by time and swap exact time slots.`;
        } else {
          instructionsEl.innerHTML = `Select events from <strong>one day</strong> to swap with.<br>Events will swap days while keeping their times.`;
        }
      }
    };

    // Set initial instructions
    if (specificSwapMode) {
      instructions.innerHTML = `Select the <strong>same number</strong> of events to swap with.<br>Events will be paired by time and swap exact time slots.`;
    } else {
      instructions.innerHTML = `Select events from <strong>one day</strong> to swap with.<br>Events will swap days while keeping their times.`;
    }

    // Button container for Swap and Cancel buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    margin-top: 8px;
  `;

    const swapBtn = document.createElement("button");
    swapBtn.textContent = "Swap";
    swapBtn.style.cssText = `
    padding: 6px 16px;
    background: rgba(255,255,255,0.9);
    color: #667eea;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.2s;
  `;
    swapBtn.addEventListener("mouseenter", () => {
      swapBtn.style.background = "white";
    });
    swapBtn.addEventListener("mouseleave", () => {
      swapBtn.style.background = "rgba(255,255,255,0.9)";
    });
    swapBtn.addEventListener("click", executeSwap);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel (Esc)";
    cancelBtn.style.cssText = `
    padding: 6px 16px;
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
  `;
    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.background = "rgba(255,255,255,0.3)";
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.background = "rgba(255,255,255,0.2)";
    });
    cancelBtn.addEventListener("click", exitSwapMode);

    buttonContainer.appendChild(swapBtn);
    buttonContainer.appendChild(cancelBtn);

    swapOverlay.appendChild(title);
    swapOverlay.appendChild(subtitle);
    swapOverlay.appendChild(checkboxContainer);
    swapOverlay.appendChild(instructions);
    swapOverlay.appendChild(buttonContainer);
    document.body.appendChild(swapOverlay);

    // Listen for Escape to cancel
    const handleSwapEscape = (e) => {
      if (e.key === "Escape") {
        exitSwapMode();
        document.removeEventListener("keydown", handleSwapEscape);
      }
    };
    document.addEventListener("keydown", handleSwapEscape);
    window.swapEscapeHandler = handleSwapEscape;
  }

  function exitSwapMode() {
    // Remove swap-first styling from events - CSS handles the rest
    const firstSelectionEvents = document.querySelectorAll(
      ".gc-swap-first-selection",
    );
    firstSelectionEvents.forEach((event) => {
      event.classList.remove("gc-swap-first-selection", "gc-needs-text-color");
    });

    swapMode = false;
    swapFirstSelection = [];

    if (swapOverlay) {
      swapOverlay.remove();
      swapOverlay = null;
    }

    if (window.swapEscapeHandler) {
      document.removeEventListener("keydown", window.swapEscapeHandler);
      window.swapEscapeHandler = null;
    }
  }

  async function executeSwap() {
    if (!swapMode || swapFirstSelection.length === 0) return;
    if (selected.length === 0) {
      alert("Please select the events you want to swap with.");
      return;
    }

    // Specific Swap mode requires equal event counts
    if (specificSwapMode && selected.length !== swapFirstSelection.length) {
      alert(
        `Selection mismatch: First group has ${swapFirstSelection.length} event(s), but second group has ${selected.length} event(s).\n\nSpecific Swap requires the same number of events in both groups.`,
      );
      return;
    }

    // Check for overlapping selections (compare by eventId)
    const firstIds = swapFirstSelection.map((info) => info.eventId);
    const secondIds = selected.map((info) => info.eventId);
    const overlap = firstIds.filter((id) => secondIds.includes(id));
    if (overlap.length > 0) {
      alert(
        "Some events are in both selections. Please select different events for the second group.",
      );
      return;
    }

    // Save selections before exitSwapMode clears them
    const firstSelection = [...swapFirstSelection];
    const secondSelection = [...selected];

    // Combine for fetching
    const allEventInfos = [...firstSelection, ...secondSelection];

    // Exit swap mode UI
    exitSwapMode();

    // Get auth token
    const token = await getAuthToken("swap events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "swap-events-overlay",
      "rgba(102, 126, 234, 0.95)",
      "Fetching event details...",
      true,
    );

    try {
      // Fetch all events from both groups with concurrency control
      const allEvents = await runWithConcurrency(
        allEventInfos,
        (info) =>
          fetchEventById(
            token,
            info.eventId,
            info.calendarId,
            info.calendarName,
          ),
        DEFAULT_CONCURRENCY,
        (processed, total) => {
          updateText(`Fetching event details... ${processed}/${total}`);
        },
      );

      // Check for cancellation after fetch phase
      if (isCancelled()) {
        showCancelled();
        setTimeout(() => removeProgressToast("swap-events-overlay"), 2500);
        return;
      }

      // Split back into two groups
      const firstGroupEvents = allEvents.slice(0, firstSelection.length);
      const secondGroupEvents = allEvents.slice(firstSelection.length);

      // Filter out failed fetches
      const validFirst = firstGroupEvents.filter(
        (e) => !e.gone && !e.fetchStatus,
      );
      const validSecond = secondGroupEvents.filter(
        (e) => !e.gone && !e.fetchStatus,
      );

      // Helper to get date string (YYYY-MM-DD) from event start
      const getEventDate = (event) => {
        if (event.start?.date) return event.start.date;
        if (event.start?.dateTime) return event.start.dateTime.split("T")[0];
        return null;
      };

      // Store original states for undo
      const undoData = {
        events: [],
        action: "swap",
      };

      // Prepare swap operations
      const swapOperations = [];

      if (specificSwapMode) {
        // SPECIFIC SWAP MODE: Swap exact time slots between paired events
        if (validFirst.length !== validSecond.length) {
          throw new Error(
            "Could not fetch all events. Some events may have been deleted.",
          );
        }

        // Sort both groups by start time to pair them up
        const sortByStart = (a, b) => {
          const aStart = new Date(a.start?.dateTime || a.start?.date);
          const bStart = new Date(b.start?.dateTime || b.start?.date);
          return aStart - bStart;
        };

        validFirst.sort(sortByStart);
        validSecond.sort(sortByStart);

        for (let i = 0; i < validFirst.length; i++) {
          const eventA = validFirst[i];
          const eventB = validSecond[i];

          // Store for undo
          undoData.events.push({
            id: eventA.id,
            originalStart: eventA.start,
            originalEnd: eventA.end,
            newStart: eventB.start,
            newEnd: eventB.end,
          });
          undoData.events.push({
            id: eventB.id,
            originalStart: eventB.start,
            originalEnd: eventB.end,
            newStart: eventA.start,
            newEnd: eventA.end,
          });

          // Swap: eventA gets eventB's times, eventB gets eventA's times
          swapOperations.push({
            eventId: eventA.id,
            newStart: eventB.start,
            newEnd: eventB.end,
          });
          swapOperations.push({
            eventId: eventB.id,
            newStart: eventA.start,
            newEnd: eventA.end,
          });
        }
      } else {
        // QUICK DAY SWAP MODE: Swap days while preserving times and durations

        // Validate both selections are on a single day each
        const firstDates = [...new Set(validFirst.map(getEventDate))];
        const secondDates = [...new Set(validSecond.map(getEventDate))];

        if (firstDates.length !== 1) {
          throw new Error(
            `Quick Day Swap requires all events in the first selection to be on the same day.\n\nYour first selection spans ${
              firstDates.length
            } days: ${firstDates.join(
              ", ",
            )}\n\nTip: Use Specific Swap mode instead to swap events 1-to-1 in selection order, regardless of which days they're on.`,
          );
        }

        if (secondDates.length !== 1) {
          throw new Error(
            `Quick Day Swap requires all events in the second selection to be on the same day.\n\nYour second selection spans ${
              secondDates.length
            } days: ${secondDates.join(
              ", ",
            )}\n\nTip: Use Specific Swap mode instead to swap events 1-to-1 in selection order, regardless of which days they're on.`,
          );
        }

        const firstDate = firstDates[0];
        const secondDate = secondDates[0];

        if (firstDate === secondDate) {
          throw new Error(
            "Both selections are on the same day. There's nothing to swap.",
          );
        }

        // Helper to shift an event's date while preserving time
        const shiftEventDate = (event, fromDate, toDate) => {
          const isAllDay = !!event.start?.date;

          if (isAllDay) {
            // All-day event: just swap the date(s)
            const startDate = event.start.date;
            const endDate = event.end.date;

            // Calculate the duration in days
            const startDiff =
              (new Date(startDate) - new Date(fromDate)) /
              (1000 * 60 * 60 * 24);
            const endDiff =
              (new Date(endDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24);

            const newStartDate = new Date(toDate);
            newStartDate.setDate(newStartDate.getDate() + startDiff);

            const newEndDate = new Date(toDate);
            newEndDate.setDate(newEndDate.getDate() + endDiff);

            return {
              newStart: { date: newStartDate.toISOString().split("T")[0] },
              newEnd: { date: newEndDate.toISOString().split("T")[0] },
            };
          } else {
            // Timed event: preserve time, swap date
            const startDateTime = new Date(event.start.dateTime);
            const endDateTime = new Date(event.end.dateTime);

            // Get the time parts
            const startTime = event.start.dateTime.split("T")[1];
            const endTime = event.end.dateTime.split("T")[1];

            // Calculate if event spans multiple days (duration)
            const durationMs = endDateTime - startDateTime;

            // Create new start with target date and original time
            const newStartDateTime = new Date(`${toDate}T${startTime}`);
            const newEndDateTime = new Date(
              newStartDateTime.getTime() + durationMs,
            );

            return {
              newStart: {
                dateTime: newStartDateTime.toISOString(),
                timeZone:
                  event.start.timeZone ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              newEnd: {
                dateTime: newEndDateTime.toISOString(),
                timeZone:
                  event.end.timeZone ||
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            };
          }
        };

        // Process first selection -> move to second selection's day
        for (const event of validFirst) {
          const { newStart, newEnd } = shiftEventDate(
            event,
            firstDate,
            secondDate,
          );

          undoData.events.push({
            id: event.id,
            calendarId: event.calendarId,
            originalStart: event.start,
            originalEnd: event.end,
            newStart,
            newEnd,
          });

          swapOperations.push({
            eventId: event.id,
            calendarId: event.calendarId,
            newStart,
            newEnd,
          });
        }

        // Process second selection -> move to first selection's day
        for (const event of validSecond) {
          const { newStart, newEnd } = shiftEventDate(
            event,
            secondDate,
            firstDate,
          );

          undoData.events.push({
            id: event.id,
            calendarId: event.calendarId,
            originalStart: event.start,
            originalEnd: event.end,
            newStart,
            newEnd,
          });

          swapOperations.push({
            eventId: event.id,
            calendarId: event.calendarId,
            newStart,
            newEnd,
          });
        }
      }

      // Execute swaps
      updateText(`Swapping ${swapOperations.length} events...`);

      const executeSwapSingle = async (op, attemptNumber = 1) => {
        const maxAttempts = 10;
        const delay = 300 * Math.pow(1.5, attemptNumber - 1);
        const calendarId = encodeURIComponent(op.calendarId || "primary");

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${op.eventId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                start: op.newStart,
                end: op.newEnd,
              }),
            },
          );

          if (res.ok) return { ok: true, op };

          if (isTransientStatus(res.status)) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return executeSwapSingle(op, attemptNumber + 1);
            }
          }

          return { ok: false, op, status: res.status };
        } catch (err) {
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return executeSwapSingle(op, attemptNumber + 1);
          }
          return { ok: false, op, error: err };
        }
      };

      // Process using concurrency pool (no stalling on slow requests)
      let lastUpdateTime = 0;
      const onProgress = (processed, total) => {
        const now = Date.now();
        if (now - lastUpdateTime > 150) {
          updateText(`Swapping... ${processed}/${total}`);
          lastUpdateTime = now;
        }
      };

      const results = await runWithConcurrency(
        swapOperations,
        executeSwapSingle,
        DEFAULT_CONCURRENCY,
        onProgress,
      );

      const failures = results.filter((r) => !r.ok);
      const successes = results.filter((r) => r.ok);

      // Handle cancellation
      if (isCancelled()) {
        showCancelled();
        if (successes.length > 0) {
          // Filter undoData to only include successfully swapped events
          const successIds = new Set(successes.map((s) => s.op.eventId));
          undoData.events = undoData.events.filter((e) => successIds.has(e.id));
          await chrome.runtime.sendMessage({
            type: "UPDATE_EVENTS_TO_UNDO",
            eventsToUndo: undoData,
          });
        }
        setTimeout(() => {
          removeProgressToast("swap-events-overlay");
          if (successes.length > 0) {
            window.location.reload();
          }
        }, 2500);
        return;
      }

      // Remove overlay
      removeProgressToast("swap-events-overlay");

      if (failures.length > 0) {
        alert(
          `Failed to swap ${failures.length} event(s). Some events may not have been swapped correctly.`,
        );
      } else {
        // Success - save undo data

        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: undoData,
        });

        // Guarantee reload
        setTimeout(() => {
          window.location.reload();
        }, 50);
      }
    } catch (err) {
      removeProgressToast("swap-events-overlay");
      alert(`Swap failed: ${err.message}`);
      logger.error("Swap error:", err);
    }
  }

  // -----------------------------------------------------COPY EVENTS------------------------------------------------
  function copyEvents() {
    if (selected.length === 0) return;

    copiedEvents = [...selected];

    // Show brief feedback
    const toast = document.createElement("div");
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(52, 168, 83, 0.95);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: gcCopyToastIn 0.3s ease-out;
  `;

    const style = document.createElement("style");
    style.textContent = `
    @keyframes gcCopyToastIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes gcCopyToastOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(20px); }
    }
  `;
    toast.appendChild(style);

    toast.innerHTML += `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
    <span>${copiedEvents.length} event${
      copiedEvents.length > 1 ? "s" : ""
    } copied</span>
  `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "gcCopyToastOut 0.3s ease-out forwards";
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  // -----------------------------------------------------PASTE EVENTS DIALOG------------------------------------------------
  function showPasteEventsDialog() {
    if (pasteDialogOpen) return;
    if (!checkIfCalendarView()) return;
    if (copiedEvents.length === 0) return;

    pasteDialogOpen = true;

    const overlay = document.createElement("div");
    pasteDialogOverlay = overlay;

    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    border: 1px solid #e0e0e0;
    min-width: 320px;
  `;

    const label = document.createElement("div");
    label.textContent = `Paste ${copiedEvents.length} event${
      copiedEvents.length > 1 ? "s" : ""
    }`;
    label.style.cssText = `margin-bottom: 15px; font-size: 16px; color: #333; font-weight: 500;`;

    // Mode toggle
    const modeContainer = document.createElement("div");
    modeContainer.style.cssText = `
    display: flex;
    gap: 0;
    justify-content: center;
    margin-bottom: 15px;
  `;

    const offsetModeBtn = document.createElement("button");
    offsetModeBtn.textContent = "By Offset";
    offsetModeBtn.style.cssText = `
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: 1px solid #4285f4;
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    font-size: 13px;
  `;

    const dateModeBtn = document.createElement("button");
    dateModeBtn.textContent = "To Specific Date";
    dateModeBtn.style.cssText = `
    padding: 8px 16px;
    background: #f1f1f1;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    font-size: 13px;
  `;

    modeContainer.appendChild(offsetModeBtn);
    modeContainer.appendChild(dateModeBtn);

    // Offset mode container
    const offsetContainer = document.createElement("div");
    offsetContainer.id = "paste-offset-container";
    offsetContainer.style.cssText = `margin-bottom: 10px;`;

    const inputContainer = document.createElement("div");
    inputContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;
  `;

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.placeholder = "Enter offset";
    quantityInput.value = "0";
    quantityInput.id = "paste-quantity-input";
    quantityInput.style.cssText = `
    width: 120px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
  `;

    const unitSelect = document.createElement("select");
    unitSelect.id = "paste-unit-select";
    unitSelect.style.cssText = `
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    color: black;
  `;

    const minutesOption = document.createElement("option");
    minutesOption.value = "minutes";
    minutesOption.textContent = "Minutes";

    const hoursOption = document.createElement("option");
    hoursOption.value = "hours";
    hoursOption.textContent = "Hours";

    const daysOption = document.createElement("option");
    daysOption.value = "days";
    daysOption.textContent = "Days";

    const weeksOption = document.createElement("option");
    weeksOption.value = "weeks";
    weeksOption.textContent = "Weeks";

    unitSelect.appendChild(minutesOption);
    unitSelect.appendChild(hoursOption);
    unitSelect.appendChild(daysOption);
    unitSelect.appendChild(weeksOption);
    unitSelect.value = "days";

    inputContainer.appendChild(quantityInput);
    inputContainer.appendChild(unitSelect);

    const helpText = document.createElement("div");
    helpText.style.cssText = `font-size: 11px; color: #666;`;
    helpText.textContent =
      "Use negative values to paste earlier, positive for later";

    offsetContainer.appendChild(inputContainer);
    offsetContainer.appendChild(helpText);

    // Date mode container (hidden initially)
    const dateContainer = document.createElement("div");
    dateContainer.id = "paste-date-container";
    dateContainer.style.cssText = `margin-bottom: 10px; display: none;`;

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.id = "paste-date-input";
    // Default to today
    const today = new Date();
    dateInput.value = today.toISOString().split("T")[0];
    dateInput.style.cssText = `
    width: 200px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
    margin-bottom: 10px;
  `;

    const dateHelpText = document.createElement("div");
    dateHelpText.style.cssText = `font-size: 11px; color: #666;`;
    dateHelpText.textContent =
      "Events will be moved to start on this date (keeping their times)";

    dateContainer.appendChild(dateInput);
    dateContainer.appendChild(dateHelpText);

    // Calendar destination option
    const calendarContainer = document.createElement("div");
    calendarContainer.style.cssText = `
    margin-bottom: 15px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  `;

    const calendarLabel = document.createElement("div");
    calendarLabel.textContent = "Paste to:";
    calendarLabel.style.cssText = `font-size: 13px; color: #333; margin-bottom: 8px; font-weight: 500;`;

    const calendarOptionsDiv = document.createElement("div");
    calendarOptionsDiv.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;

    // Check if any copied events are from non-primary calendars
    const hasNonPrimaryEvents = copiedEvents.some(
      (e) => e.calendarId && e.calendarId !== "primary",
    );

    let pasteToOriginalCalendar = false;

    // Primary calendar option
    const primaryOption = document.createElement("label");
    primaryOption.style.cssText = `display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;`;
    const primaryRadio = document.createElement("input");
    primaryRadio.type = "radio";
    primaryRadio.name = "paste-calendar";
    primaryRadio.value = "primary";
    primaryRadio.checked = true;
    primaryRadio.style.cssText = `margin: 0; cursor: pointer;`;
    primaryOption.appendChild(primaryRadio);
    primaryOption.appendChild(document.createTextNode("My primary calendar"));

    // Original calendars option
    const originalOption = document.createElement("label");
    originalOption.style.cssText = `display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; ${
      hasNonPrimaryEvents ? "" : "opacity: 0.5;"
    }`;
    const originalRadio = document.createElement("input");
    originalRadio.type = "radio";
    originalRadio.name = "paste-calendar";
    originalRadio.value = "original";
    originalRadio.disabled = !hasNonPrimaryEvents;
    originalRadio.style.cssText = `margin: 0; cursor: ${
      hasNonPrimaryEvents ? "pointer" : "not-allowed"
    };`;
    originalOption.appendChild(originalRadio);
    originalOption.appendChild(
      document.createTextNode("Each event's original calendar"),
    );

    primaryRadio.addEventListener("change", () => {
      pasteToOriginalCalendar = false;
    });
    originalRadio.addEventListener("change", () => {
      pasteToOriginalCalendar = true;
    });

    calendarOptionsDiv.appendChild(primaryOption);
    calendarOptionsDiv.appendChild(originalOption);
    calendarContainer.appendChild(calendarLabel);
    calendarContainer.appendChild(calendarOptionsDiv);

    // Mode toggle logic
    let useSpecificDate = false;

    offsetModeBtn.addEventListener("click", () => {
      useSpecificDate = false;
      offsetModeBtn.style.background = "#4285f4";
      offsetModeBtn.style.color = "white";
      offsetModeBtn.style.borderColor = "#4285f4";
      dateModeBtn.style.background = "#f1f1f1";
      dateModeBtn.style.color = "#333";
      dateModeBtn.style.borderColor = "#ccc";
      offsetContainer.style.display = "block";
      dateContainer.style.display = "none";
      quantityInput.focus();
    });

    dateModeBtn.addEventListener("click", () => {
      useSpecificDate = true;
      dateModeBtn.style.background = "#4285f4";
      dateModeBtn.style.color = "white";
      dateModeBtn.style.borderColor = "#4285f4";
      offsetModeBtn.style.background = "#f1f1f1";
      offsetModeBtn.style.color = "#333";
      offsetModeBtn.style.borderColor = "#ccc";
      offsetContainer.style.display = "none";
      dateContainer.style.display = "block";
      dateInput.focus();
    });

    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = `margin-top: 15px; display: flex; gap: 10px; justify-content: center;`;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Paste Events";
    submitBtn.style.cssText = `
    padding: 8px 16px;
    background: #34a853;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #f1f1f1;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

    const handleClose = () => {
      if (pasteDialogOverlay) {
        document.body.removeChild(pasteDialogOverlay);
        pasteDialogOverlay = null;
      }
      pasteDialogOpen = false;
    };

    const handleSubmit = () => {
      if (useSpecificDate) {
        const targetDate = dateInput.value;
        if (targetDate) {
          pasteEventsToDate(copiedEvents, targetDate, pasteToOriginalCalendar);
        }
      } else {
        const quantity = parseInt(quantityInput.value);
        const unit = unitSelect.value;
        if (!isNaN(quantity)) {
          pasteEvents(copiedEvents, quantity, unit, pasteToOriginalCalendar);
        }
      }
      handleClose();
    };

    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleClose);

    const handleKeydown = (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
      if (e.key === "Escape") handleClose();
    };

    quantityInput.addEventListener("keydown", handleKeydown);
    dateInput.addEventListener("keydown", handleKeydown);

    buttonsDiv.appendChild(submitBtn);
    buttonsDiv.appendChild(cancelBtn);
    dialog.appendChild(label);
    dialog.appendChild(modeContainer);
    dialog.appendChild(offsetContainer);
    dialog.appendChild(dateContainer);
    dialog.appendChild(calendarContainer);
    dialog.appendChild(buttonsDiv);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    quantityInput.focus();
    quantityInput.select();
  }

  // -----------------------------------------------------PASTE EVENTS------------------------------------------------
  function convertToMinutesForPaste(quantity, unit) {
    switch (unit) {
      case "minutes":
        return quantity;
      case "hours":
        return quantity * 60;
      case "days":
        return quantity * 60 * 24;
      case "weeks":
        return quantity * 60 * 24 * 7;
      default:
        return 0;
    }
  }

  async function pasteEvents(
    eventInfos,
    quantity,
    unit,
    pasteToOriginalCalendar = false,
  ) {
    const offsetMinutes = convertToMinutesForPaste(quantity, unit);

    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("paste events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "paste-events-overlay",
      "rgba(52, 168, 83, 0.95)",
      "Fetching event details...",
      true,
    );

    try {
      // Fetch all event details with concurrency control (from their original calendars)
      const events = await runWithConcurrency(
        eventInfos,
        (info) =>
          fetchEventById(
            token,
            info.eventId,
            info.calendarId,
            info.calendarName,
          ),
        DEFAULT_CONCURRENCY,
        (processed, total) => {
          updateText(`Fetching event details... ${processed}/${total}`);
        },
      );

      // Check for cancellation after fetch phase
      if (isCancelled()) {
        showCancelled();
        setTimeout(() => removeProgressToast("paste-events-overlay"), 2500);
        return;
      }

      const validEvents = events.filter((e) => !e.gone && !e.fetchStatus);

      if (validEvents.length === 0) {
        throw new Error(
          "Could not fetch copied events. They may have been deleted.",
        );
      }

      updateText(`Creating ${validEvents.length} events...`);

      // Create new events with offset - returns original event on failure for retry
      const createEvent = async (originalEvent, attemptNumber = 1) => {
        const maxAttempts = 12;
        // More aggressive backoff: starts at 500ms, grows to ~17s by attempt 12
        const delay = 500 * Math.pow(1.5, attemptNumber - 1);

        // Determine target calendar: original or primary
        const targetCalendarId =
          pasteToOriginalCalendar && originalEvent.calendarId
            ? originalEvent.calendarId
            : "primary";
        const encodedCalendarId = encodeURIComponent(targetCalendarId);

        // Calculate new times
        let newStart, newEnd;

        if (originalEvent.start.dateTime) {
          // Timed event
          const startDate = new Date(originalEvent.start.dateTime);
          const endDate = new Date(originalEvent.end.dateTime);
          startDate.setMinutes(startDate.getMinutes() + offsetMinutes);
          endDate.setMinutes(endDate.getMinutes() + offsetMinutes);
          newStart = {
            dateTime: startDate.toISOString(),
            timeZone: originalEvent.start.timeZone,
          };
          newEnd = {
            dateTime: endDate.toISOString(),
            timeZone: originalEvent.end.timeZone,
          };
        } else {
          // All-day event
          const startDate = new Date(originalEvent.start.date);
          const endDate = new Date(originalEvent.end.date);
          startDate.setMinutes(startDate.getMinutes() + offsetMinutes);
          endDate.setMinutes(endDate.getMinutes() + offsetMinutes);
          newStart = { date: startDate.toISOString().split("T")[0] };
          newEnd = { date: endDate.toISOString().split("T")[0] };
        }

        // Create new event (copy relevant fields)
        const newEvent = {
          summary: originalEvent.summary,
          description: originalEvent.description,
          location: originalEvent.location,
          colorId: originalEvent.colorId,
          start: newStart,
          end: newEnd,
          reminders: originalEvent.reminders,
          recurrence: undefined, // Don't copy recurrence
        };

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newEvent),
            },
          );

          if (res.ok) {
            const created = await res.json();
            // Include calendarId in the event object for undo support
            created.calendarId = targetCalendarId;
            return { ok: true, event: created };
          }

          if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return createEvent(originalEvent, attemptNumber + 1);
            }
          }

          // Return original event for retry tracking
          return { ok: false, status: res.status, originalEvent };
        } catch (err) {
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return createEvent(originalEvent, attemptNumber + 1);
          }
          return { ok: false, error: err, originalEvent };
        }
      };

      // Retry loop - keeps trying until all events succeed or max retries reached
      let eventsToProcess = validEvents;
      const allCreatedEvents = []; // Full event objects from API response
      let retryRound = 0;
      const maxRetryRounds = MAX_RETRY_ROUNDS; // Maximum number of retry rounds

      while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
        let lastUpdateTime = 0;
        const onProgress = (processed, total) => {
          const now = Date.now();
          if (now - lastUpdateTime > 150) {
            updateText(
              `Creating... ${allCreatedEvents.length + processed}/${
                validEvents.length
              }`,
            );
            lastUpdateTime = now;
          }
        };

        // Reduce concurrency on retries to be gentler on rate limits
        const concurrency =
          retryRound > 0
            ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
            : DEFAULT_CONCURRENCY;

        const results = await runWithConcurrency(
          eventsToProcess,
          createEvent,
          concurrency,
          onProgress,
        );

        // Collect successes and failures
        const successes = results.filter((r) => r.ok);
        const failures = results.filter((r) => !r.ok);

        successes.forEach((r) => {
          if (r.event) allCreatedEvents.push(r.event);
        });

        // If all succeeded, we're done
        if (failures.length === 0) {
          eventsToProcess = [];
          break;
        }

        // Extract the original events that failed for retry
        const failedOriginalEvents = failures
          .map((f) => f.originalEvent)
          .filter((e) => e !== undefined);

        // If no retryable events or max retries reached, stop
        if (failedOriginalEvents.length === 0 || retryRound >= maxRetryRounds) {
          if (failedOriginalEvents.length > 0) {
            logger.warn(
              `Giving up on ${failedOriginalEvents.length} events after ${retryRound} retry rounds`,
            );
          }
          eventsToProcess = [];
          break;
        }

        // Automatic retry - wait and try again
        retryRound++;
        eventsToProcess = failedOriginalEvents;

        // Progressive delay: 2s, 3s, 4s, 5s... up to 10s
        const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
        await sleep(retryDelay);
      }

      // Handle cancellation
      if (isCancelled()) {
        showCancelled();
        if (allCreatedEvents.length > 0) {
          await chrome.runtime.sendMessage({
            type: "UPDATE_EVENTS_TO_UNDO",
            eventsToUndo: {
              events: allCreatedEvents,
              action: "paste",
            },
          });
        }
        setTimeout(() => {
          removeProgressToast("paste-events-overlay");
          if (allCreatedEvents.length > 0) {
            window.location.reload();
          }
        }, 2500);
        return;
      }

      removeProgressToast("paste-events-overlay");

      // Consume action only if we created at least one event
      if (allCreatedEvents.length > 0) {
        // Save undo data for the new events (includes calendarId for each)
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: allCreatedEvents,
            action: "paste",
          },
        });
      }

      // Reload to show new events
      setTimeout(() => {
        window.location.reload();
      }, 50);
    } catch (err) {
      removeProgressToast("paste-events-overlay");
      alert(`Paste failed: ${err.message}`);
      logger.error("Paste error:", err);
    }
  }

  // -----------------------------------------------------PASTE EVENTS TO SPECIFIC DATE------------------------------------------------
  async function pasteEventsToDate(
    eventInfos,
    targetDateStr,
    pasteToOriginalCalendar = false,
  ) {
    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("paste events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "paste-to-date-overlay",
      "rgba(52, 168, 83, 0.95)",
      "Fetching event details...",
      true,
    );

    try {
      // Fetch all event details with concurrency control (from their original calendars)
      const events = await runWithConcurrency(
        eventInfos,
        (info) =>
          fetchEventById(
            token,
            info.eventId,
            info.calendarId,
            info.calendarName,
          ),
        DEFAULT_CONCURRENCY,
        (processed, total) => {
          updateText(`Fetching event details... ${processed}/${total}`);
        },
      );

      // Check for cancellation after fetch phase
      if (isCancelled()) {
        showCancelled();
        setTimeout(() => removeProgressToast("paste-to-date-overlay"), 2500);
        return;
      }

      const validEvents = events.filter((e) => !e.gone && !e.fetchStatus);

      if (validEvents.length === 0) {
        throw new Error(
          "Could not fetch copied events. They may have been deleted.",
        );
      }

      // Find the earliest event to use as reference
      let earliestEvent = validEvents[0];
      let earliestDate = null;

      validEvents.forEach((ev) => {
        const evDate = new Date(ev.start.dateTime || ev.start.date);
        if (!earliestDate || evDate < earliestDate) {
          earliestDate = evDate;
          earliestEvent = ev;
        }
      });

      // Calculate the offset from earliest event to target date
      const targetDate = new Date(targetDateStr + "T00:00:00");
      const earliestEventDate = new Date(
        earliestEvent.start.dateTime || earliestEvent.start.date,
      );

      // Keep the time of day, just change the date
      const offsetMs =
        targetDate.getTime() -
        new Date(earliestEventDate.toDateString()).getTime();

      updateText(`Creating ${validEvents.length} events...`);

      // Create new events with calculated offset - returns original event on failure for retry
      const createEvent = async (originalEvent, attemptNumber = 1) => {
        const maxAttempts = 12;
        // More aggressive backoff: starts at 500ms, grows to ~17s by attempt 12
        const delay = 500 * Math.pow(1.5, attemptNumber - 1);

        // Determine target calendar: original or primary
        const targetCalendarId =
          pasteToOriginalCalendar && originalEvent.calendarId
            ? originalEvent.calendarId
            : "primary";
        const encodedCalendarId = encodeURIComponent(targetCalendarId);

        // Check for cancellation before processing
        if (isCancelled()) {
          return { ok: false, cancelled: true, originalEvent };
        }

        // Calculate new times
        let newStart, newEnd;

        if (originalEvent.start.dateTime) {
          // Timed event
          const startDate = new Date(originalEvent.start.dateTime);
          const endDate = new Date(originalEvent.end.dateTime);
          startDate.setTime(startDate.getTime() + offsetMs);
          endDate.setTime(endDate.getTime() + offsetMs);
          newStart = {
            dateTime: startDate.toISOString(),
            timeZone: originalEvent.start.timeZone,
          };
          newEnd = {
            dateTime: endDate.toISOString(),
            timeZone: originalEvent.end.timeZone,
          };
        } else {
          // All-day event
          const startDate = new Date(originalEvent.start.date);
          const endDate = new Date(originalEvent.end.date);
          startDate.setTime(startDate.getTime() + offsetMs);
          endDate.setTime(endDate.getTime() + offsetMs);
          newStart = { date: startDate.toISOString().split("T")[0] };
          newEnd = { date: endDate.toISOString().split("T")[0] };
        }

        // Create new event (copy relevant fields)
        const newEvent = {
          summary: originalEvent.summary,
          description: originalEvent.description,
          location: originalEvent.location,
          colorId: originalEvent.colorId,
          start: newStart,
          end: newEnd,
          reminders: originalEvent.reminders,
          recurrence: undefined, // Don't copy recurrence
        };

        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newEvent),
            },
          );

          if (res.ok) {
            const created = await res.json();
            // Include calendarId in the event object for undo support
            created.calendarId = targetCalendarId;
            return { ok: true, event: created };
          }

          if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return createEvent(originalEvent, attemptNumber + 1);
            }
          }

          // Return original event for retry tracking
          return { ok: false, status: res.status, originalEvent };
        } catch (err) {
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return createEvent(originalEvent, attemptNumber + 1);
          }
          return { ok: false, error: err, originalEvent };
        }
      };

      // Retry loop - keeps trying until all events succeed or max retries reached
      let eventsToProcess = validEvents;
      const allCreatedEvents = []; // Full event objects from API response
      let retryRound = 0;
      const maxRetryRounds = MAX_RETRY_ROUNDS; // Maximum number of retry rounds

      while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
        let lastUpdateTime = 0;
        const onProgress = (processed, total) => {
          const now = Date.now();
          if (now - lastUpdateTime > 150) {
            updateText(
              `Creating... ${allCreatedEvents.length + processed}/${
                validEvents.length
              }`,
            );
            lastUpdateTime = now;
          }
        };

        // Reduce concurrency on retries to be gentler on rate limits
        const concurrency =
          retryRound > 0
            ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
            : DEFAULT_CONCURRENCY;

        const results = await runWithConcurrency(
          eventsToProcess,
          createEvent,
          concurrency,
          onProgress,
        );

        // Collect successes and failures
        const successes = results.filter((r) => r.ok);
        const failures = results.filter((r) => !r.ok);

        successes.forEach((r) => {
          if (r.event) allCreatedEvents.push(r.event);
        });

        // If all succeeded, we're done
        if (failures.length === 0) {
          eventsToProcess = [];
          break;
        }

        // Extract the original events that failed for retry
        const failedOriginalEvents = failures
          .map((f) => f.originalEvent)
          .filter((e) => e !== undefined);

        // If no retryable events or max retries reached, stop
        if (failedOriginalEvents.length === 0 || retryRound >= maxRetryRounds) {
          if (failedOriginalEvents.length > 0) {
            logger.warn(
              `Giving up on ${failedOriginalEvents.length} events after ${retryRound} retry rounds`,
            );
          }
          eventsToProcess = [];
          break;
        }

        // Automatic retry - wait and try again
        retryRound++;
        eventsToProcess = failedOriginalEvents;

        // Progressive delay: 2s, 3s, 4s, 5s... up to 10s
        const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
        await sleep(retryDelay);
      }

      // Handle cancellation
      if (isCancelled()) {
        showCancelled();
        if (allCreatedEvents.length > 0) {
          await chrome.runtime.sendMessage({
            type: "UPDATE_EVENTS_TO_UNDO",
            eventsToUndo: {
              events: allCreatedEvents,
              action: "paste",
            },
          });
        }
        setTimeout(() => {
          removeProgressToast("paste-to-date-overlay");
          if (allCreatedEvents.length > 0) {
            window.location.reload();
          }
        }, 2500);
        return;
      }

      removeProgressToast("paste-to-date-overlay");

      // Consume action only if we created at least one event
      if (allCreatedEvents.length > 0) {
        // Save undo data for the new events
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: allCreatedEvents,
            action: "paste",
          },
        });
      }

      // Reload to show new events
      setTimeout(() => {
        window.location.reload();
      }, 50);
    } catch (err) {
      removeProgressToast("paste-to-date-overlay");
      alert(`Paste failed: ${err.message}`);
      logger.error("Paste error:", err);
    }
  }

  // -----------------------------------------------------CHANGE EVENT COLORS------------------------------------------------
  async function changeEventColors(eventInfos, colorId) {
    if (!checkIfCalendarView()) return;
    if (eventInfos.length === 0) return;

    const token = await getAuthToken("change event colors");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "color-events-overlay",
      "rgba(66, 133, 244, 0.95)",
      "Fetching event details...",
      true,
    );

    // Store previous event state for undo
    let previousStates = [];
    let newStates = [];

    // Fetch event details up-front (with undo state collection)
    const fetchEventWithUndo = async (info) => {
      const data = await fetchEventById(
        token,
        info.eventId,
        info.calendarId,
        info.calendarName,
      );
      if (!data.gone && !data.fetchStatus) {
        previousStates.push({
          id: data.id,
          calendarId: data.calendarId,
          colorId: data.colorId,
        });
      }
      return data;
    };

    // Fetch with concurrency control to avoid rate limiting
    const fetched = await runWithConcurrency(
      eventInfos,
      fetchEventWithUndo,
      DEFAULT_CONCURRENCY,
      (processed, total) => {
        updateText(`Fetching event details... ${processed}/${total}`);
      },
    );

    // Check for cancellation after fetch phase
    if (isCancelled()) {
      showCancelled();
      setTimeout(() => removeProgressToast("color-events-overlay"), 2500);
      return;
    }

    // Change color for single event with retry logic
    const colorSingle = async (event, attemptNumber = 1) => {
      const maxAttempts = MAX_SINGLE_ATTEMPTS;
      const calendarId = encodeURIComponent(event.calendarId || "primary");

      const payload = {
        colorId: colorId || null, // null or empty string removes custom color (uses calendar default)
      };

      const delay = 1000 + attemptNumber * 500;

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        // Success cases
        if (res.status === 404 || res.status === 410)
          return { ok: true, event, skipped: false };
        if (res.ok) return { ok: true, event, skipped: false };

        // Get response body for all non-success cases
        const responseText = await res.text();

        // Check if 403 is a rate limit (should retry) or permission issue (should skip)
        if (res.status === 403) {
          try {
            const errorData = JSON.parse(responseText);
            const isRateLimit = errorData?.error?.errors?.some(
              (e) =>
                e.reason === "rateLimitExceeded" ||
                e.reason === "userRateLimitExceeded",
            );

            if (isRateLimit) {
              logger.warn(
                `Rate limit hit for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
              );
              if (attemptNumber < maxAttempts) {
                await sleep(delay * 2);
                return colorSingle(event, attemptNumber + 1);
              } else {
                logger.error(
                  `Max retries reached (rate limit) for event ${event.summary}`,
                );
                return {
                  ok: false,
                  skipped: false,
                  event,
                  status: res.status,
                  reason: "rate_limit_exceeded",
                  response: responseText,
                };
              }
            } else {
              logger.log(
                `Skipping event (403 - no permission): ${event.summary}`,
              );
              return { ok: true, skipped: true };
            }
          } catch (e) {
            logger.log(
              `Skipping event (403 - unparseable response): ${event.summary}`,
            );
            return { ok: true, skipped: true };
          }
        }

        // Transient errors - retry
        if (isTransientStatus(res.status)) {
          logger.warn(
            `Transient error (${res.status}) for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}`,
          );
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return colorSingle(event, attemptNumber + 1);
          } else {
            logger.error(
              `Max retries reached for event ${event.summary}, status: ${res.status}`,
            );
            return {
              ok: false,
              skipped: false,
              event,
              status: res.status,
              reason: "max_retries",
              response: responseText,
            };
          }
        } else {
          logger.error(
            `Permanent error (${res.status}) for event ${event.summary}:`,
            responseText,
          );
          return {
            ok: false,
            skipped: false,
            event,
            status: res.status,
            reason: "permanent",
            response: responseText,
          };
        }
      } catch (err) {
        logger.warn(
          `Network error for event ${event.summary}, attempt ${attemptNumber}/${maxAttempts}:`,
          err,
        );
        if (attemptNumber < maxAttempts) {
          await sleep(delay);
          return colorSingle(event, attemptNumber + 1);
        } else {
          logger.error(
            `Max retries reached for event ${event.summary} (network error):`,
            err,
          );
          return {
            ok: false,
            skipped: false,
            event,
            error: err,
            reason: "max_retries",
          };
        }
      }
    };

    // Process all valid events using retry loop with reduced concurrency
    const validEvents = fetched.filter((ev) => !ev.gone && !ev.fetchStatus);

    // Retry loop - keeps trying until all events succeed or max retries reached
    let eventsToProcess = validEvents;
    const allSuccesses = [];
    const allSkipped = [];
    let retryRound = 0;
    const maxRetryRounds = MAX_RETRY_ROUNDS;

    while (
      eventsToProcess.length > 0 &&
      retryRound <= maxRetryRounds &&
      !isCancelled()
    ) {
      let lastUpdateTime = 0;
      const onProgress = (processed, total) => {
        const now = Date.now();
        if (now - lastUpdateTime > 150) {
          updateText(
            `Changing Colors... ${allSuccesses.length + processed}/${
              validEvents.length
            }`,
          );
          lastUpdateTime = now;
        }
      };

      // Reduce concurrency on retries to be gentler on rate limits
      const concurrency =
        retryRound > 0
          ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
          : DEFAULT_CONCURRENCY;

      const results = await runWithConcurrency(
        eventsToProcess,
        colorSingle,
        concurrency,
        onProgress,
      );

      // Collect successes and failures
      const successes = results.filter((r) => r.ok && !r.skipped);
      const skipped = results.filter((r) => r.ok && r.skipped);
      const failures = results.filter((r) => !r.ok);

      successes.forEach((r) => allSuccesses.push(r.event));
      skipped.forEach((r) => allSkipped.push(r.event));

      // If all succeeded or only skipped, we're done
      if (failures.length === 0) {
        eventsToProcess = [];
        break;
      }

      // Extract failed events for retry (exclude permanent failures)
      const failedEvents = failures
        .filter((f) => f.reason !== "permanent")
        .map((f) => f.event)
        .filter((e) => e !== undefined);

      // If no retryable events or max retries reached, stop
      if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
        if (failedEvents.length > 0) {
          logger.warn(
            `Giving up on ${failedEvents.length} color changes after ${retryRound} retry rounds`,
          );
        }
        eventsToProcess = [];
        break;
      }

      // Automatic retry - wait and try again
      retryRound++;
      eventsToProcess = failedEvents;

      // Progressive delay: 2s, 3s, 4s, 5s... up to 10s
      const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
      await sleep(retryDelay);
    }

    // Handle cancellation
    if (isCancelled()) {
      showCancelled();
      if (allSuccesses.length > 0) {
        const successIds = new Set(allSuccesses.map((s) => s.id));
        const undoEvents = previousStates
          .filter((prev) => successIds.has(prev.id))
          .map((prev) => ({
            id: prev.id,
            calendarId: prev.calendarId,
            oldColorId: prev.colorId,
            newColorId: colorId,
          }));
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: undoEvents,
            action: "color",
          },
        });
      }
      setTimeout(() => {
        removeProgressToast("color-events-overlay");
        if (allSuccesses.length > 0) {
          window.location.reload();
        }
      }, 2500);
      return;
    }

    // Remove overlay
    removeProgressToast("color-events-overlay");

    // Calculate failures
    const colorFailedCount =
      validEvents.length - allSuccesses.length - allSkipped.length;

    // Handle results
    if (allSuccesses.length > 0) {
      // Consume 1 action for the bulk color operation

      // Save undo state with both old and new colorId (include calendarId for multi-calendar support)
      const successIds = new Set(allSuccesses.map((s) => s.id));
      const undoEvents = previousStates
        .filter((prev) => successIds.has(prev.id))
        .map((prev) => ({
          id: prev.id,
          calendarId: prev.calendarId,
          oldColorId: prev.colorId,
          newColorId: colorId,
        }));
      await chrome.runtime.sendMessage({
        type: "UPDATE_EVENTS_TO_UNDO",
        eventsToUndo: {
          events: undoEvents,
          action: "color",
        },
      });

      // Warn user if some events couldn't be updated
      if (colorFailedCount > 0 || allSkipped.length > 0) {
        let message = `Changed color for ${allSuccesses.length} event(s) successfully.`;
        if (allSkipped.length > 0) {
          message += `\n${allSkipped.length} event(s) skipped (no permission).`;
        }
        if (colorFailedCount > 0) {
          message += `\n${colorFailedCount} event(s) failed due to API errors.`;
        }
        alert(message);
      }

      // Guarantee reload happens after all operations complete
      setTimeout(() => {
        window.location.reload();
      }, 50);
    } else if (allSkipped.length > 0) {
      // All events were skipped (none owned)
      alert(
        "No events were updated. You don't have permission to modify the selected events.",
      );
    } else {
      alert("Failed to change colors. Please try again later.");
    }
  }

  //---------------------------------- CREATE EVENTS ----------------------------------
  async function createEvents(events) {
    if (!checkIfCalendarView()) return;
    if (!events || events.length === 0) return;

    const token = await getAuthToken("create events");
    if (!token) return;

    // Reset cancellation flag
    resetCancellation();

    // Create progress toast (cancellable)
    const { updateText, showCancelled } = createProgressToast(
      "create-events-overlay",
      "rgba(52, 168, 83, 0.95)",
      "Creating Events...",
      true,
    );

    // Create single event with retries
    const createSingle = async (event, attemptNumber = 1) => {
      const maxAttempts = MAX_SINGLE_ATTEMPTS;
      const delay = 1000 + attemptNumber * 500;

      // Validate start/end
      const startTime = new Date(
        event.start?.dateTime || event.start?.date || NaN,
      );
      const endTime = new Date(event.end?.dateTime || event.end?.date || NaN);
      if (isNaN(startTime) || isNaN(endTime)) {
        logger.error("Invalid time for event:", event);
        return { ok: false, originalEvent: event, reason: "invalid_time" };
      }

      const payload = {
        summary: event.summary || "Untitled Event",
        description: event.description || "",
        start: {
          dateTime: event.start?.dateTime ? startTime.toISOString() : undefined,
          date:
            event.start?.date && !event.start?.dateTime
              ? startTime.toISOString().split("T")[0]
              : undefined,
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime ? endTime.toISOString() : undefined,
          date:
            event.end?.date && !event.end?.dateTime
              ? endTime.toISOString().split("T")[0]
              : undefined,
          timeZone: event.end?.timeZone,
        },
        // Restore all optional properties for true undo
        ...(event.colorId && { colorId: event.colorId }),
        ...(event.location && { location: event.location }),
        ...(event.recurrence && { recurrence: event.recurrence }),
        ...(event.reminders && { reminders: event.reminders }),
        ...(event.visibility && { visibility: event.visibility }),
        ...(event.transparency && { transparency: event.transparency }),
        ...(event.attendees && { attendees: event.attendees }),
        ...(event.guestsCanModify !== undefined && {
          guestsCanModify: event.guestsCanModify,
        }),
        ...(event.guestsCanInviteOthers !== undefined && {
          guestsCanInviteOthers: event.guestsCanInviteOthers,
        }),
        ...(event.guestsCanSeeOtherGuests !== undefined && {
          guestsCanSeeOtherGuests: event.guestsCanSeeOtherGuests,
        }),
        ...(event.source && { source: event.source }),
        ...(event.attachments && { attachments: event.attachments }),
        ...(event.conferenceData && { conferenceData: event.conferenceData }),
        ...(event.extendedProperties && {
          extendedProperties: event.extendedProperties,
        }),
      };

      try {
        const calendarId = encodeURIComponent(event.calendarId || "primary");
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (res.ok) {
          const createdEvent = await res.json();
          // Include calendarId and calendarName from original event since API response doesn't include them
          createdEvent.calendarId = event.calendarId || "primary";
          if (event.calendarName)
            createdEvent.calendarName = event.calendarName;
          return { ok: true, event: createdEvent, originalEvent: event };
        }

        const responseText = await res.text();

        // Check if 403 is a rate limit (should retry) or permission issue (should skip)
        if (res.status === 403) {
          try {
            const errorData = JSON.parse(responseText);
            const isRateLimit = errorData?.error?.errors?.some(
              (e) =>
                e.reason === "rateLimitExceeded" ||
                e.reason === "userRateLimitExceeded",
            );

            if (isRateLimit) {
              // Rate limit - retry with longer delay
              if (attemptNumber < maxAttempts) {
                await sleep(delay * 2);
                return createSingle(event, attemptNumber + 1);
              }
              return { ok: false, originalEvent: event, status: res.status };
            }
          } catch (e) {
            // Can't parse response
          }
          // True permission denial - skip
          return {
            ok: false,
            originalEvent: event,
            skipped: true,
            status: res.status,
          };
        }

        if (res.status === 401) {
          // Auth error - skip
          return {
            ok: false,
            originalEvent: event,
            skipped: true,
            status: res.status,
          };
        }

        if (isTransientStatus(res.status)) {
          if (attemptNumber < maxAttempts) {
            await sleep(delay);
            return createSingle(event, attemptNumber + 1);
          }
          // Return original event for batch retry
          return { ok: false, originalEvent: event, status: res.status };
        }

        // Permanent error - still track for logging
        return {
          ok: false,
          originalEvent: event,
          reason: "permanent",
          status: res.status,
        };
      } catch (err) {
        if (attemptNumber < maxAttempts) {
          await sleep(delay);
          return createSingle(event, attemptNumber + 1);
        }
        return { ok: false, originalEvent: event, error: err };
      }
    };

    // Retry loop - keeps trying until all events succeed or max retries reached
    let eventsToProcess = events;
    const allCreatedEvents = [];
    let retryRound = 0;
    const maxRetryRounds = MAX_RETRY_ROUNDS;

    while (
      eventsToProcess.length > 0 &&
      retryRound <= maxRetryRounds &&
      !isCancelled()
    ) {
      let lastUpdateTime = 0;
      const onProgress = (processed, total) => {
        const now = Date.now();
        if (now - lastUpdateTime > 150) {
          updateText(
            `Creating Events... ${allCreatedEvents.length + processed}/${
              events.length
            }`,
          );
          lastUpdateTime = now;
        }
      };

      // Reduce concurrency on retries to be gentler on rate limits
      const concurrency =
        retryRound > 0
          ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
          : DEFAULT_CONCURRENCY;

      const results = await runWithConcurrency(
        eventsToProcess,
        createSingle,
        concurrency,
        onProgress,
      );

      // Collect successes and failures (include skipped in failures for logging)
      const successes = results.filter((r) => r.ok);
      const skipped = results.filter((r) => !r.ok && r.skipped);
      const failures = results.filter((r) => !r.ok && !r.skipped);

      successes.forEach((r) => {
        if (r.event) allCreatedEvents.push(r.event);
      });

      // If no failures (excluding skipped), we're done
      if (failures.length === 0) {
        eventsToProcess = [];
        break;
      }

      // Extract the original events that failed for retry
      const failedOriginalEvents = failures
        .map((f) => f.originalEvent)
        .filter((e) => e !== undefined);

      // If no retryable events or max retries reached, stop
      if (failedOriginalEvents.length === 0 || retryRound >= maxRetryRounds) {
        eventsToProcess = [];
        break;
      }

      // Automatic retry - wait and try again
      retryRound++;
      eventsToProcess = failedOriginalEvents;

      // Progressive delay: 2s, 3s, 4s, 5s... up to 10s
      const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
      await sleep(retryDelay);
    }

    // Handle cancellation
    if (isCancelled()) {
      showCancelled();
      if (allCreatedEvents.length > 0) {
        eventsBeforeMostRecentChange.push(...allCreatedEvents);
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: eventsBeforeMostRecentChange,
            action: "create",
            delta: undefined,
          },
        });
      }
      setTimeout(() => {
        removeProgressToast("create-events-overlay");
        if (allCreatedEvents.length > 0) {
          window.location.reload();
        }
      }, 2500);
      return;
    }

    // Remove overlay
    removeProgressToast("create-events-overlay");

    if (allCreatedEvents.length > 0) {
      // Consume 1 action for the bulk create operation

      // Collect all events for undo (optimized: single message instead of per-event)
      eventsBeforeMostRecentChange.push(...allCreatedEvents);

      // Send single message to background to update local storage with eventsToUndo
      await chrome.runtime.sendMessage({
        type: "UPDATE_EVENTS_TO_UNDO",
        eventsToUndo: {
          events: eventsBeforeMostRecentChange,
          action: "create",
          delta: undefined,
        },
      });

      // Guarantee reload happens after all operations complete
      setTimeout(() => {
        window.location.reload();
      }, 50);
    } else {
      alert(
        "No events were created. You may not have permission to create the selected events.",
      );
    }
  }

  //---------------------------------- UNDO LAST ACTION ----------------------------------
  function UndoLastAction() {
    // Prevent multiple simultaneous undo operations
    if (undoInProgress) return;

    //whether last action was move or delete is stored in each event of eventsToUndo
    const eventsToUndo = window.eventsToUndo;
    logger.log(eventsToUndo);

    if (!eventsToUndo || !eventsToUndo.action) {
      return;
    }

    // Set the flag for all undo operations (page reloads after, so no need to reset)
    undoInProgress = true;

    if (eventsToUndo.action === "move") {
      //we can just calculate time delta and call our moveEventsFunction
      //we need to undo, so the time delta should be opposite of sign
      timeDelta = eventsToUndo.delta * -1;
      // Convert stored events to eventInfo format for moveEvents
      const eventInfos = eventsToUndo.events.map((event) => ({
        eventId: event.id,
        calendarId: event.calendarId || "primary",
        calendarName: event.calendarName,
      }));
      moveEvents(eventInfos, timeDelta, "minutes");
    } else if (eventsToUndo.action === "delete") {
      //was a delete, so we have to POST new events with the old values
      createEvents(eventsToUndo.events);
    } else if (eventsToUndo.action === "create") {
      //delete events to undo
      // Convert stored events to eventInfo format for deleteEvents
      const eventInfos = eventsToUndo?.events.map((e) => ({
        eventId: e.id,
        calendarId: e.calendarId || "primary",
        calendarName: e.calendarName,
      }));
      deleteEvents(eventInfos);
    } else if (eventsToUndo.action === "color") {
      // color change, so we have to swap colorId between old and new for each event
      (async () => {
        // Create progress toast
        const { updateText } = createProgressToast(
          "color-undo-overlay",
          "rgba(66, 133, 244, 0.95)",
          "Changing Colors...",
        );

        // For each event, swap colorId between old and new
        const swapColorIds = eventsToUndo.events.map((e) => ({
          id: e.id,
          calendarId: e.calendarId || "primary",
          colorId: e.oldColorId,
          oldColorId: e.newColorId,
          newColorId: e.oldColorId,
        }));

        // get fresh token
        const token = await getAuthToken("undo color change");
        if (!token) {
          removeProgressToast("color-undo-overlay");
          undoInProgress = false;
          return;
        }

        // PATCH function with retry logic
        const patchEvent = async (eventData, attemptNumber = 1) => {
          const maxAttempts = MAX_SINGLE_ATTEMPTS;
          const delay = 1000 + attemptNumber * 500;
          const calendarId = encodeURIComponent(
            eventData.calendarId || "primary",
          );
          try {
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventData.id}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ colorId: eventData.colorId || null }),
              },
            );

            if (res.ok) {
              return { ok: true, eventData };
            }

            // Event no longer exists - skip (don't retry)
            if (res.status === 404 || res.status === 410) {
              return { ok: true, eventData, skipped: true };
            }

            if (isTransientStatus(res.status)) {
              if (attemptNumber < maxAttempts) {
                await sleep(delay);
                return patchEvent(eventData, attemptNumber + 1);
              }
            }
            return {
              ok: false,
              status: res.status,
              eventData,
              reason: "permanent",
            };
          } catch (err) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return patchEvent(eventData, attemptNumber + 1);
            }
            return { ok: false, error: err, eventData };
          }
        };

        // Retry loop
        let eventsToProcess = swapColorIds;
        let retryRound = 0;
        const maxRetryRounds = MAX_RETRY_ROUNDS;

        while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
          const concurrency =
            retryRound > 0
              ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
              : DEFAULT_CONCURRENCY;

          const results = await runWithConcurrency(
            eventsToProcess,
            patchEvent,
            concurrency,
            (processed, total) => {
              updateText(
                `Changing Colors... ${
                  swapColorIds.length - eventsToProcess.length + processed
                }/${swapColorIds.length}`,
              );
            },
          );

          // Collect successes (including skipped/gone events) and failures
          const successes = results.filter((r) => r.ok);
          const failures = results.filter((r) => !r.ok);

          if (failures.length === 0) {
            eventsToProcess = [];
            break;
          }

          // Only retry transient failures, not permanent ones
          const failedEvents = failures
            .filter((f) => f.reason !== "permanent")
            .map((f) => f.eventData)
            .filter((e) => e !== undefined);

          if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
            eventsToProcess = [];
            break;
          }

          retryRound++;
          eventsToProcess = failedEvents;
          const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
          await sleep(retryDelay);
        }

        // Update undo payload for next toggle
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: swapColorIds,
            action: "color",
          },
        });

        removeProgressToast("color-undo-overlay");

        undoInProgress = false;

        setTimeout(() => {
          window.location.reload();
        }, 50);
      })();
    } else if (eventsToUndo.action === "rename") {
      // rename change, so we swap summary between old and new for each event
      (async () => {
        // Create progress toast
        const { updateText } = createProgressToast(
          "rename-undo-overlay",
          "rgba(66, 133, 244, 0.95)",
          "Restoring Names...",
        );

        // For each event, swap summary between old and new
        const swapSummaries = eventsToUndo.events.map((e) => ({
          id: e.id,
          calendarId: e.calendarId || "primary",
          summary: e.oldSummary,
          oldSummary: e.newSummary,
          newSummary: e.oldSummary,
        }));

        // get fresh token
        const token = await getAuthToken("undo rename");
        if (!token) {
          removeProgressToast("rename-undo-overlay");
          undoInProgress = false;
          return;
        }

        // PATCH function with retry logic
        const patchEvent = async (eventData, attemptNumber = 1) => {
          const maxAttempts = MAX_SINGLE_ATTEMPTS;
          const delay = 1000 + attemptNumber * 500;
          const calendarId = encodeURIComponent(
            eventData.calendarId || "primary",
          );
          try {
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventData.id}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ summary: eventData.summary }),
              },
            );

            if (res.ok) {
              return { ok: true, eventData };
            }

            // Event no longer exists - skip (don't retry)
            if (res.status === 404 || res.status === 410) {
              return { ok: true, eventData, skipped: true };
            }

            if (isTransientStatus(res.status)) {
              if (attemptNumber < maxAttempts) {
                await sleep(delay);
                return patchEvent(eventData, attemptNumber + 1);
              }
            }
            return {
              ok: false,
              status: res.status,
              eventData,
              reason: "permanent",
            };
          } catch (err) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return patchEvent(eventData, attemptNumber + 1);
            }
            return { ok: false, error: err, eventData };
          }
        };

        // Retry loop
        let eventsToProcess = swapSummaries;
        let retryRound = 0;
        const maxRetryRounds = MAX_RETRY_ROUNDS;

        while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
          const concurrency =
            retryRound > 0
              ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
              : DEFAULT_CONCURRENCY;

          const results = await runWithConcurrency(
            eventsToProcess,
            patchEvent,
            concurrency,
            (processed, total) => {
              updateText(
                `Restoring Names... ${
                  swapSummaries.length - eventsToProcess.length + processed
                }/${swapSummaries.length}`,
              );
            },
          );

          // Collect successes (including skipped/gone events) and failures
          const successes = results.filter((r) => r.ok);
          const failures = results.filter((r) => !r.ok);

          if (failures.length === 0) {
            eventsToProcess = [];
            break;
          }

          // Only retry transient failures, not permanent ones
          const failedEvents = failures
            .filter((f) => f.reason !== "permanent")
            .map((f) => f.eventData)
            .filter((e) => e !== undefined);

          if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
            eventsToProcess = [];
            break;
          }

          retryRound++;
          eventsToProcess = failedEvents;
          const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
          await sleep(retryDelay);
        }

        // Update undo payload for next toggle
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: swapSummaries,
            action: "rename",
          },
        });

        removeProgressToast("rename-undo-overlay");

        setTimeout(() => {
          window.location.reload();
        }, 50);
      })();
    } else if (eventsToUndo.action === "swap") {
      // Swap undo - restore original times for all swapped events
      (async () => {
        // Create progress toast
        const { updateText } = createProgressToast(
          "swap-undo-overlay",
          "rgba(156, 39, 176, 0.95)",
          "Restoring Event Times...",
        );

        // Get token
        const token = await getAuthToken("undo swap");
        if (!token) {
          removeProgressToast("swap-undo-overlay");
          undoInProgress = false;
          return;
        }

        // Prepare swap data for undo toggle
        const swapTimes = eventsToUndo.events.map((e) => ({
          id: e.id,
          calendarId: e.calendarId || "primary",
          originalStart: e.newStart,
          originalEnd: e.newEnd,
          newStart: e.originalStart,
          newEnd: e.originalEnd,
        }));

        // PATCH function with retry logic
        const patchEvent = async (eventData, attemptNumber = 1) => {
          const maxAttempts = MAX_SINGLE_ATTEMPTS;
          const delay = 1000 + attemptNumber * 500;
          const calendarId = encodeURIComponent(
            eventData.calendarId || "primary",
          );
          try {
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventData.id}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  start: eventData.originalStart,
                  end: eventData.originalEnd,
                }),
              },
            );

            if (res.ok) {
              return { ok: true, eventData };
            }

            // Event no longer exists - skip (don't retry)
            if (res.status === 404 || res.status === 410) {
              return { ok: true, eventData, skipped: true };
            }

            if (isTransientStatus(res.status)) {
              if (attemptNumber < maxAttempts) {
                await sleep(delay);
                return patchEvent(eventData, attemptNumber + 1);
              }
            }
            return {
              ok: false,
              status: res.status,
              eventData,
              reason: "permanent",
            };
          } catch (err) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return patchEvent(eventData, attemptNumber + 1);
            }
            return { ok: false, error: err, eventData };
          }
        };

        // Retry loop
        let eventsToProcess = eventsToUndo.events;
        let retryRound = 0;
        const maxRetryRounds = MAX_RETRY_ROUNDS;

        while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
          const concurrency =
            retryRound > 0
              ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
              : DEFAULT_CONCURRENCY;

          const results = await runWithConcurrency(
            eventsToProcess,
            patchEvent,
            concurrency,
            (processed, total) => {
              updateText(
                `Restoring Event Times... ${
                  eventsToUndo.events.length -
                  eventsToProcess.length +
                  processed
                }/${eventsToUndo.events.length}`,
              );
            },
          );

          // Collect successes (including skipped/gone events) and failures
          const successes = results.filter((r) => r.ok);
          const failures = results.filter((r) => !r.ok);

          if (failures.length === 0) {
            eventsToProcess = [];
            break;
          }

          // Only retry transient failures, not permanent ones
          const failedEvents = failures
            .filter((f) => f.reason !== "permanent")
            .map((f) => f.eventData)
            .filter((e) => e !== undefined);

          if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
            eventsToProcess = [];
            break;
          }

          retryRound++;
          eventsToProcess = failedEvents;
          const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
          await sleep(retryDelay);
        }

        // Update undo payload for next toggle
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: swapTimes,
            action: "swap",
          },
        });

        removeProgressToast("swap-undo-overlay");

        setTimeout(() => {
          window.location.reload();
        }, 50);
      })();
    } else if (eventsToUndo.action === "editBoundaries") {
      // Edit boundaries undo - restore original start/end times
      (async () => {
        // Create progress toast
        const { updateText } = createProgressToast(
          "edit-boundaries-undo-overlay",
          "rgba(66, 133, 244, 0.95)",
          "Restoring Event Times...",
        );

        // Get token
        const token = await getAuthToken("undo time edits");
        if (!token) {
          removeProgressToast("edit-boundaries-undo-overlay");
          undoInProgress = false;
          return;
        }

        // Get the deltas to reverse
        const startDelta = eventsToUndo.startDelta || 0;
        const endDelta = eventsToUndo.endDelta || 0;

        // Process function with retry logic (fetch + patch)
        const processEvent = async (event, attemptNumber = 1) => {
          const maxAttempts = MAX_SINGLE_ATTEMPTS;
          const delay = 1000 + attemptNumber * 500;
          const calendarId = encodeURIComponent(event.calendarId || "primary");
          try {
            // Fetch current event state
            const fetchRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );

            // Event no longer exists - skip (don't retry)
            if (fetchRes.status === 404 || fetchRes.status === 410) {
              return { ok: true, event, skipped: true };
            }

            if (!fetchRes.ok) {
              if (isTransientStatus(fetchRes.status)) {
                if (attemptNumber < maxAttempts) {
                  await sleep(delay);
                  return processEvent(event, attemptNumber + 1);
                }
              }
              return {
                ok: false,
                status: fetchRes.status,
                event,
                reason: "permanent",
              };
            }

            const currentEvent = await fetchRes.json();

            // Calculate reversed times
            const startTime = new Date(
              currentEvent.start?.dateTime || currentEvent.start?.date,
            );
            const endTime = new Date(
              currentEvent.end?.dateTime || currentEvent.end?.date,
            );

            // Reverse the deltas
            if (startDelta !== 0) {
              startTime.setMinutes(startTime.getMinutes() - startDelta);
            }
            if (endDelta !== 0) {
              endTime.setMinutes(endTime.getMinutes() - endDelta);
            }

            const payload = {
              start: {
                dateTime: currentEvent.start?.dateTime
                  ? startTime.toISOString()
                  : undefined,
                date:
                  currentEvent.start?.date && !currentEvent.start?.dateTime
                    ? startTime.toISOString().split("T")[0]
                    : undefined,
                timeZone: currentEvent.start?.timeZone,
              },
              end: {
                dateTime: currentEvent.end?.dateTime
                  ? endTime.toISOString()
                  : undefined,
                date:
                  currentEvent.end?.date && !currentEvent.end?.dateTime
                    ? endTime.toISOString().split("T")[0]
                    : undefined,
                timeZone: currentEvent.end?.timeZone,
              },
            };

            const patchRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              },
            );

            if (patchRes.ok) {
              return { ok: true, event };
            }

            // Event no longer exists - skip (don't retry)
            if (patchRes.status === 404 || patchRes.status === 410) {
              return { ok: true, event, skipped: true };
            }

            if (isTransientStatus(patchRes.status)) {
              if (attemptNumber < maxAttempts) {
                await sleep(delay);
                return processEvent(event, attemptNumber + 1);
              }
            }
            return {
              ok: false,
              status: patchRes.status,
              event,
              reason: "permanent",
            };
          } catch (err) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return processEvent(event, attemptNumber + 1);
            }
            return { ok: false, error: err, event };
          }
        };

        // Retry loop
        let eventsToProcess = eventsToUndo.events;
        const successfulEvents = [];
        let retryRound = 0;
        const maxRetryRounds = MAX_RETRY_ROUNDS;

        while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
          const concurrency =
            retryRound > 0
              ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
              : DEFAULT_CONCURRENCY;

          const results = await runWithConcurrency(
            eventsToProcess,
            processEvent,
            concurrency,
            (processed, total) => {
              updateText(
                `Restoring Event Times... ${
                  successfulEvents.length + processed
                }/${eventsToUndo.events.length}`,
              );
            },
          );

          const successes = results.filter((r) => r.ok);
          const failures = results.filter((r) => !r.ok);

          successes.forEach((r) => successfulEvents.push(r.event));

          if (failures.length === 0) {
            eventsToProcess = [];
            break;
          }

          // Only retry non-permanent failures (404/410 are permanent and already handled)
          const failedEvents = failures
            .filter((f) => f.reason !== "permanent")
            .map((f) => f.event)
            .filter((e) => e !== undefined);

          if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
            eventsToProcess = [];
            break;
          }

          retryRound++;
          eventsToProcess = failedEvents;
          const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
          await sleep(retryDelay);
        }

        // Update undo payload for next toggle (reverse the deltas)
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: successfulEvents,
            action: "editBoundaries",
            startDelta: -startDelta,
            endDelta: -endDelta,
          },
        });

        removeProgressToast("edit-boundaries-undo-overlay");

        setTimeout(() => {
          window.location.reload();
        }, 50);
      })();
    } else if (eventsToUndo.action === "paste") {
      // Paste undo - delete the pasted events
      (async () => {
        const pastedEvents = eventsToUndo.events; // Array of {id, calendarId} objects
        if (!pastedEvents || pastedEvents.length === 0) {
          return;
        }

        // Create progress toast
        const { updateText } = createProgressToast(
          "paste-undo-overlay",
          "rgba(52, 168, 83, 0.95)",
          "Deleting pasted events...",
        );

        // Get token
        const token = await getAuthToken("undo paste");
        if (!token) {
          removeProgressToast("paste-undo-overlay");
          undoInProgress = false;
          return;
        }

        // Delete function with retry logic - accepts {id, calendarId} object
        const deleteEvent = async (eventInfo, attemptNumber = 1) => {
          const maxAttempts = MAX_SINGLE_ATTEMPTS;
          const delay = 1000 + attemptNumber * 500;
          const { id, calendarId } = eventInfo;
          const encodedCalendarId = encodeURIComponent(calendarId || "primary");
          try {
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${id}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (res.ok || res.status === 410) {
              // 410 Gone means already deleted
              return { ok: true, eventInfo };
            }

            if (isTransientStatus(res.status)) {
              if (attemptNumber < maxAttempts) {
                await sleep(delay);
                return deleteEvent(eventInfo, attemptNumber + 1);
              }
            }
            return { ok: false, status: res.status, eventInfo };
          } catch (err) {
            if (attemptNumber < maxAttempts) {
              await sleep(delay);
              return deleteEvent(eventInfo, attemptNumber + 1);
            }
            return { ok: false, error: err, eventInfo };
          }
        };

        // Retry loop
        let eventsToProcess = pastedEvents;
        let retryRound = 0;
        const maxRetryRounds = MAX_RETRY_ROUNDS;

        while (eventsToProcess.length > 0 && retryRound <= maxRetryRounds) {
          const concurrency =
            retryRound > 0
              ? Math.max(3, DEFAULT_CONCURRENCY - retryRound * 2)
              : DEFAULT_CONCURRENCY;

          const results = await runWithConcurrency(
            eventsToProcess,
            deleteEvent,
            concurrency,
            (processed, total) => {
              updateText(
                `Deleting pasted events... ${
                  pastedEvents.length - eventsToProcess.length + processed
                }/${pastedEvents.length}`,
              );
            },
          );

          const failures = results.filter((r) => !r.ok);

          if (failures.length === 0) {
            eventsToProcess = [];
            break;
          }

          const failedEvents = failures
            .map((f) => f.eventInfo)
            .filter((e) => e !== undefined);

          if (failedEvents.length === 0 || retryRound >= maxRetryRounds) {
            eventsToProcess = [];
            break;
          }

          retryRound++;
          eventsToProcess = failedEvents;
          const retryDelay = Math.min(2000 + (retryRound - 1) * 1000, 10000);
          await sleep(retryDelay);
        }

        // Save events for re-paste (toggle behavior like other undos)
        await chrome.runtime.sendMessage({
          type: "UPDATE_EVENTS_TO_UNDO",
          eventsToUndo: {
            events: pastedEvents, // Full event objects for recreation
            action: "create", // Next undo will recreate them
          },
        });

        removeProgressToast("paste-undo-overlay");

        setTimeout(() => {
          window.location.reload();
        }, 50);
      })();
    }
  }
  //---------------------------------- INITIALIZATION ----------------------------------
  function initializeExtension() {
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    // Use capture phase to intercept context menu before other handlers
    document.addEventListener("contextmenu", handleContextMenu, true);
    // Use capture phase to block clicks in Select Mode
    document.addEventListener("click", handleClick, true);

    const elemBeforeCounter = document.querySelector(".qOsM1d.wBon4c");

    const currentTheme = detectTheme();
    const isDark = currentTheme === "#1B1B1B";

    if (elemBeforeCounter) {
      let counterElem = document.querySelector(".gc-selected-counter");
      const highlightColor = window.highlightColor || "#4285f4";
      const textColor = getContrastTextColor(highlightColor);

      if (!counterElem) {
        counterElem = document.createElement("div");
        counterElem.classList.add("gc-selected-counter");

        counterElem.style.cssText = `
        margin: 12px auto;
        padding: 10px 14px;
        background: ${highlightColor};
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        color: ${textColor};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 2px 8px ${highlightColor}4D;
        transition: all 0.2s ease;
      `;

        // Create text
        const text = document.createElement("span");
        text.textContent = "Selected: ";

        // Create count
        const count = document.createElement("span");
        count.className = "gc-counter-count";
        count.style.cssText = `
        background: ${getContrastBadgeBackground(textColor)};
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
      `;
        count.textContent = "0";

        counterElem.appendChild(text);
        counterElem.appendChild(count);

        elemBeforeCounter.insertAdjacentElement("afterend", counterElem);
      } else {
        // Update background to match highlight color
        counterElem.style.background = highlightColor;
        counterElem.style.boxShadow = `0 2px 8px ${highlightColor}4D`;
        counterElem.style.color = textColor;
        const countSpan = counterElem.querySelector(".gc-counter-count");
        if (countSpan) {
          countSpan.style.background = getContrastBadgeBackground(textColor);
        }
      }

      // Create or update undo info box
      createOrUpdateUndoInfoBox(counterElem, isDark);

      // Create or update action menu button
      const undoBox = document.querySelector(".gc-undo-info-box");
      if (undoBox) {
        createOrUpdateActionMenuButton(undoBox, isDark);
      }

      // Create or update select mode button
      const actionBtn = document.querySelector(".gc-action-menu-btn");
      if (actionBtn) {
        createOrUpdateSelectModeButton(actionBtn, isDark);
      }
    }
  }

  initializeExtension();

  //-------------------------RESETS FOR WHEN TAB LOSES FOCUS ---------------------------------
  window.addEventListener("blur", () => {
    resetSelectionState();
  });

  // When user returns to the tab

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      resetSelectionState();
    }
  });

  function resetSelectionState() {
    isSelecting = false;
    isKeyboardSelecting = false;

    altPressed = false;
    ctrlPressed = false;
    shiftPressed = false;
    pressedKeys.clear();

    startX = null;
    startY = null;

    // Exit select mode when tab loses focus
    if (selectMode) exitSelectMode();

    // remove selection box if it exists
    if (selectionBox && selectionBox.parentNode) {
      selectionBox.parentNode.removeChild(selectionBox);
    }
    selectionBox = null;
  }

  //--------RESTORE SELECTIONS BETWEEN RE-RENDERS (LIKE CHANGING CALENDAR WEEKS)-----------
  function restoreSelectedEvents() {
    if (selected.length === 0) return;

    // First, remove any stale gc-bulk-selected classes that might be on nested/wrong elements
    document.querySelectorAll(".gc-bulk-selected").forEach((el) => {
      el.classList.remove("gc-bulk-selected", "gc-needs-text-color");
    });

    const gcEvents = getAllCalendarEvents();

    gcEvents.forEach((event) => {
      const eventId = extractEventId(event);
      if (!eventId) return;

      // Check if this eventId is in the selected array (which contains eventInfo objects)
      const isSelected = selected.some((s) => s.eventId === eventId);
      if (isSelected) {
        // Just add the CSS classes - styling is handled by the stylesheet
        event.classList.add("gc-bulk-selected");
        if (isEventNeedingTextColor(event)) {
          event.classList.add("gc-needs-text-color");
        }
      }
    });

    const counterElem = document.querySelector(".gc-selected-counter");
    if (counterElem) {
      const countSpan = counterElem.querySelector(".gc-counter-count");
      if (countSpan) {
        countSpan.textContent = selected.length;
      }
    }
  }

  //---------------------------------- DOM OBSERVER (RE-INIT) --------------------------
  let rerenderTimeout;

  const observer = new MutationObserver(() => {
    clearTimeout(rerenderTimeout);

    // Use a very short debounce to minimize flash when GCal re-renders elements
    rerenderTimeout = setTimeout(() => {
      initializeExtension(); // rebuild counter if needed
      restoreSelectedEvents(); // reapply bulk-selected classes
    }, 10);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
