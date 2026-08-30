let BASE_URL;
// let calendarType = "GOOGLE";

//prod text to google cal && text to outlook cal
if (
  chrome.runtime.id === "bhgecckohnfhidakkkfanjmoedlaoine" ||
  chrome.runtime.id === "lhoblddbaaknfmmbdnddmlnhlandcain"
) {
  BASE_URL = "https://www.text-to-cal.com";
  //dev text to google cal && text to outlook cal
} else if (
  chrome.runtime.id === "hoihoedmbehfgdkljfacnbgmjmdkpdmk" ||
  chrome.runtime.id === "kleenndpfgbmkcniliofkoapokcdhefp" ||
  chrome.runtime.id === "bikjccchcolngbolhnencpkfgimokeld" ||
  chrome.runtime.id === "olbpejdncplnhdlbkpmcegfmeocimpod" ||
  chrome.runtime.id === "dpfnaapcbeeanjbcklpafojcdbmdljmh"
) {
  BASE_URL = "http://localhost:3001";
  //dev text to outlook cal
} else {
  BASE_URL = "http://localhost:3001";
}

// Create context menu for text selection
chrome.runtime.onInstalled.addListener(function (details) {
  let title = chrome.i18n.getMessage("createCalendarEvent");
  if (BASE_URL === "http://localhost:3001") {
    title += " (dev)";
  }
  chrome.contextMenus.create({
    id: "createCalendarEvent",
    title: title,
    contexts: ["selection"],
  });

  // Open a specific page if the extension is installed
  if (details.reason === "install") {
    let POST_SIGNUP_REDIRECT_URL = BASE_URL + `/login?intro=true`;
    chrome.tabs.create({ url: POST_SIGNUP_REDIRECT_URL });
  }
});

function showSpinner() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "showSpinner" });
  });
}

function hideSpinner() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "hideSpinner" });
  });
}

let calendarType = "GOOGLE"; // Default to Google Calendar
if (
  chrome.runtime.id !== "bhgecckohnfhidakkkfanjmoedlaoine" &&
  chrome.runtime.id !== "hoihoedmbehfgdkljfacnbgmjmdkpdmk" &&
  chrome.runtime.id !== "bikjccchcolngbolhnencpkfgimokeld" &&
  chrome.runtime.id !== "dpfnaapcbeeanjbcklpafojcdbmdljmh"
) {
  calendarType = "OUTLOOK"; // Change to Outlook Calendar for specific extension IDs
}

const optionsUrl = `${BASE_URL}/overview?popup=true&calendarType=${calendarType}`;

// Store review page for THIS extension (shared file — must branch on runtime id,
// never fork per-folder copies; build-extension.js overwrites the Outlook copy).
const REVIEW_URL =
  calendarType === "OUTLOOK"
    ? "https://chromewebstore.google.com/detail/lhoblddbaaknfmmbdnddmlnhlandcain/reviews"
    : "https://chromewebstore.google.com/detail/bhgecckohnfhidakkkfanjmoedlaoine/reviews";

function showReviewPrompt(tabId, reviewPrompt) {
  if (!reviewPrompt?.show) return;
  chrome.tabs.sendMessage(
    tabId,
    {
      action: "showReviewPrompt",
      reviewUrl: reviewPrompt.reviewUrl || REVIEW_URL,
      strings: {
        title: chrome.i18n.getMessage("reviewPromptTitle"),
        rate: chrome.i18n.getMessage("reviewPromptRate"),
        dismiss: chrome.i18n.getMessage("reviewPromptDismiss"),
      },
    },
    function () {
      // Content script may not be injected on this page — ignore.
      void chrome.runtime.lastError;
    }
  );
}

async function getCalendarEventURL(selectedText, userTimeZone, userDate) {
  // Send data to your server
  const response = await fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: selectedText,
      userTimeZone: userTimeZone,
      userDate: userDate,
      calendarType: calendarType,
    }),
  });

  if (response.redirected) {
    console.log("Redirect:", response.url);
    return { url: response.url };
  }

  const data = await response.json();
  console.log("success - data", data);
  return data;
}

function formatdDateToYYYYMMDDTHHMMSS() {
  let date = new Date();
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-11 in JavaScript
  const DD = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const Min = String(date.getMinutes()).padStart(2, "0");
  const SS = String(date.getSeconds()).padStart(2, "0");

  return `${YYYY}${MM}${DD}T${HH}${Min}${SS}`;
}

// Listener for context menu item click
chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId === "createCalendarEvent") {
    showSpinner();
    const selectedText = info.selectionText;
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userDate = formatdDateToYYYYMMDDTHHMMSS();
    // Open a popup window with the selected text
    try {
      const result = await getCalendarEventURL(
        selectedText,
        userTimeZone,
        userDate
      );
      console.log("result after cb", result);
      if (result?.url) {
        hideSpinner();
        if (Array.isArray(result.url)) {
          result.url.forEach((url) => chrome.tabs.create({ url: url }));
        } else {
          chrome.tabs.create({ url: result.url });
        }
        showReviewPrompt(tab.id, result.reviewPrompt);
      }
    } catch (error) {
      hideSpinner();
      const errorPageUrl = `${BASE_URL}/error`;
      chrome.tabs.create({ url: errorPageUrl });
    }
  }
});

// Move this outside of any event listeners
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: optionsUrl });
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "openOptionsPage",
    title: chrome.i18n.getMessage("options"),
    contexts: ["action"], // Changed from "browser_action" to "action" for modern extensions
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "openOptionsPage") {
    chrome.tabs.create({ url: optionsUrl });
  }
});
