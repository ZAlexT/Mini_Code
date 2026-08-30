let saveTimeout = null;

// --------------------------- HELPERS ---------------------------
async function getAuthEmail() {
  const { auth } = await chrome.storage.local.get("auth");
  return auth?.email || null;
}

// --------------------------- MESSAGE LISTENER ---------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ------------------ AUTH HANDLER ------------------
  if (request.type === "GET_AUTH_TOKEN") {
    const interactive = request.interactive || false;
    const prompt = request.prompt || null;

    const getTokenAsync = (options) =>
      new Promise((resolve, reject) => {
        chrome.identity.getAuthToken(options, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(token);
        });
      });

    const removeCachedTokenAsync = (token) =>
      new Promise((resolve) =>
        chrome.identity.removeCachedAuthToken({ token }, () => {
          void chrome.runtime.lastError;
          resolve();
        }),
      );

    const fetchUserEmail = async (token) => {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch user email");
      const data = await res.json();
      return data.email || null;
    };

    (async () => {
      try {
        let token;

        if (interactive && prompt === "select_account") {
          const oldToken = await getTokenAsync({ interactive: true });
          if (!oldToken)
            throw new Error("No token retrieved during account selection");

          await removeCachedTokenAsync(oldToken);

          token = await getTokenAsync({ interactive: true });
          if (!token) throw new Error("No fresh token retrieved");
        } else {
          token = await getTokenAsync({ interactive });
          if (!token) throw new Error("No token returned");
        }

        const email = await fetchUserEmail(token);

        await chrome.storage.local.set({
          auth: { token, email, authenticatedAt: Date.now() },
        });

        sendResponse({ authenticated: true, token, email });
      } catch (err) {
        sendResponse({ authenticated: false, error: err.message });
      }
    })();

    return true;
  }

  // ------------------ LOGOUT HANDLER ------------------
  if (request.type === "LOGOUT") {
    (async () => {
      try {
        chrome.identity.clearAllCachedAuthTokens(() => {
          void chrome.runtime.lastError;
        });

        if (request.token) {
          try {
            fetch(
              `https://accounts.google.com/o/oauth2/revoke?token=${request.token}`,
              { method: "POST", mode: "no-cors" },
            );
          } catch {}
        }

        await chrome.storage.local.set({ auth: null });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  }

  // ------------------ HIGHLIGHT COLOR ------------------
  if (request.type === "SET_HIGHLIGHT_COLOR") {
    const color = request.color;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      chrome.storage.local.set({ highlightColor: color }, () => {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs
              .sendMessage(tab.id, {
                type: "HIGHLIGHT_COLOR_UPDATED",
                color: color,
              })
              .catch(() => {});
          });
        });
      });
    }, 150);
    sendResponse({ status: "ok" });
    return true;
  }

  // ------------------ UPDATE EVENTS TO UNDO ------------------
  if (request.type === "UPDATE_EVENTS_TO_UNDO") {
    chrome.storage.local.set({ eventsToUndo: request.eventsToUndo }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "EVENTS_TO_UNDO_UPDATED",
              events: request.eventsToUndo,
            })
            .catch(() => {});
        });
      });
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // ------------------ SET MODIFIER KEY ------------------
  if (request.type === "SET_MODIFIER_KEY") {
    chrome.storage.local.set({ modifierKey: request.modifierKey }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "MODIFIER_KEY_UPDATED",
              modifierKey: request.modifierKey,
            })
            .catch(() => {});
        });
      });
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // ------------------ SET KEYBINDS ------------------
  if (request.type === "SET_KEYBINDS") {
    chrome.storage.local.set({ keybinds: request.keybinds }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "KEYBINDS_UPDATED",
              keybinds: request.keybinds,
            })
            .catch(() => {});
        });
      });
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // ------------------ SET HIDE ALL-DAY TASKS ------------------
  if (request.type === "SET_HIDE_ALL_DAY_TASKS") {
    chrome.storage.local.set({ hideAllDayTasks: request.hidden }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "HIDE_ALL_DAY_TASKS_UPDATED",
              hidden: request.hidden,
            })
            .catch(() => {});
        });
      });
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // ------------------ SET HOUR RANGE ------------------
  if (request.type === "SET_HOUR_RANGE") {
    const hourRange = {
      enabled: request.enabled,
      startHour: request.startHour,
      endHour: request.endHour,
      strictMode: request.strictMode || false,
      superStrictMode: request.superStrictMode || false,
      hidePreviousHours: request.hidePreviousHours || false,
      onlyAffectToday: request.onlyAffectToday || false,
    };
    chrome.storage.local.set({ hourRange }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "HOUR_RANGE_UPDATED",
              ...hourRange,
            })
            .catch(() => {});
        });
      });
      sendResponse({ status: "ok" });
    });
    return true;
  }
});

// --------------------------- ON INSTALL/UPDATE ---------------------------
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.query(
      {
        url: [
          "https://calendar.google.com/*",
          "https://www.google.com/calendar/*",
        ],
      },
      (tabs) => {
        if (chrome.runtime.lastError) return;

        tabs.forEach((tab) => {
          chrome.scripting
            .executeScript({
              target: { tabId: tab.id },
              files: ["content.js"],
            })
            .catch(() => {});
        });
      },
    );
  }
});
