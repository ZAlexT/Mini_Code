const statusDiv = document.getElementById("status");
const accountInfoDiv = document.getElementById("accountInfo");
const signinBtn = document.getElementById("signin");
const signoutBtn = document.getElementById("signout");

window.lastToken = null;

// ------------------ DEFAULT KEYBINDS ------------------
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

// ------------------ KEYBIND HELPERS ------------------
function formatKeybindDisplay(keybind) {
  const parts = [];
  if (keybind.modifier) {
    const modName =
      keybind.modifier.charAt(0).toUpperCase() + keybind.modifier.slice(1);
    parts.push(modName);
  }
  if (keybind.key) {
    let keyName;
    if (keybind.key === "rightclick") {
      keyName = "Right Click";
    } else if (keybind.key.length === 1) {
      keyName = keybind.key.toUpperCase();
    } else {
      keyName = keybind.key.charAt(0).toUpperCase() + keybind.key.slice(1);
    }
    parts.push(keyName);
  }
  return parts.join(" + ");
}

function parseKeyEvent(e) {
  const modifiers = [];
  if (e.ctrlKey) modifiers.push("ctrl");
  if (e.altKey) modifiers.push("alt");
  if (e.shiftKey) modifiers.push("shift");
  if (e.metaKey) modifiers.push("meta");

  let key = e.key.toLowerCase();

  // Skip if only modifier keys pressed
  if (["control", "alt", "shift", "meta"].includes(key)) {
    return null;
  }

  // Normalize key names
  if (key === " ") key = "space";

  return {
    modifier: modifiers.join("+") || null,
    key: key,
  };
}

function updateKeybindInputs(keybinds) {
  document.getElementById("keybind-select").value = formatKeybindDisplay(
    keybinds.select,
  );
  document.getElementById("keybind-deselect").value = formatKeybindDisplay(
    keybinds.deselect,
  );
  document.getElementById("keybind-move").value = formatKeybindDisplay(
    keybinds.move,
  );
  document.getElementById("keybind-delete").value = formatKeybindDisplay(
    keybinds.delete,
  );
  document.getElementById("keybind-undo").value = formatKeybindDisplay(
    keybinds.undo,
  );
  document.getElementById("keybind-color").value = formatKeybindDisplay(
    keybinds.color,
  );
  document.getElementById("keybind-rename").value = formatKeybindDisplay(
    keybinds.rename,
  );
  document.getElementById("keybind-swap").value = formatKeybindDisplay(
    keybinds.swap,
  );
  document.getElementById("keybind-copy").value = formatKeybindDisplay(
    keybinds.copy,
  );
  document.getElementById("keybind-paste").value = formatKeybindDisplay(
    keybinds.paste,
  );
  document.getElementById("keybind-edit").value = formatKeybindDisplay(
    keybinds.edit,
  );
  document.getElementById("keybind-contextmenu").value = formatKeybindDisplay(
    keybinds.contextmenu,
  );
}

async function saveKeybinds(keybinds) {
  await chrome.runtime.sendMessage({
    type: "SET_KEYBINDS",
    keybinds: keybinds,
  });
}

// ------------------ KEYBIND INPUT HANDLERS ------------------
document.querySelectorAll(".keybind-input").forEach((input) => {
  input.addEventListener("focus", function () {
    const action = this.dataset.action;
    // Context menu keybind only allows modifier changes
    if (action === "contextmenu") {
      this.classList.add("recording");
      this.value = "Press modifier + Right Click...";
    } else {
      this.classList.add("recording");
      this.value = "Press keys...";
    }
  });

  input.addEventListener("blur", async function () {
    this.classList.remove("recording");
    // Restore current value if nothing was pressed
    const { keybinds } = await chrome.storage.local.get("keybinds");
    const currentKeybinds = { ...DEFAULT_KEYBINDS, ...keybinds };
    const action = this.dataset.action;
    this.value = formatKeybindDisplay(currentKeybinds[action]);
  });

  input.addEventListener("keydown", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    const action = this.dataset.action;

    // For contextmenu, only capture the modifier key
    if (action === "contextmenu") {
      const modifiers = [];
      if (e.ctrlKey) modifiers.push("ctrl");
      if (e.altKey) modifiers.push("alt");
      if (e.shiftKey) modifiers.push("shift");
      if (e.metaKey) modifiers.push("meta");

      if (modifiers.length === 0) return; // Need at least one modifier

      const parsed = {
        modifier: modifiers.join("+"),
        key: "rightclick",
      };

      // Load current keybinds
      const { keybinds } = await chrome.storage.local.get("keybinds");
      const currentKeybinds = { ...DEFAULT_KEYBINDS, ...keybinds };

      // Update the keybind
      currentKeybinds[action] = parsed;

      // Save and update display
      await saveKeybinds(currentKeybinds);
      this.value = formatKeybindDisplay(parsed);
      this.blur();
      return;
    }

    const parsed = parseKeyEvent(e);
    if (!parsed) return; // Only modifier pressed

    // Load current keybinds
    const { keybinds } = await chrome.storage.local.get("keybinds");
    const currentKeybinds = { ...DEFAULT_KEYBINDS, ...keybinds };

    // Update the keybind
    currentKeybinds[action] = parsed;

    // Save and update display
    await saveKeybinds(currentKeybinds);
    this.value = formatKeybindDisplay(parsed);
    this.blur();
  });
});

// ------------------ RESET KEYBINDS ------------------
document
  .getElementById("reset-keybinds")
  .addEventListener("click", async () => {
    await saveKeybinds(DEFAULT_KEYBINDS);
    updateKeybindInputs(DEFAULT_KEYBINDS);
  });

// ------------------ HIGHLIGHT COLOR PICKER ------------------
const colorPicker = document.getElementById("colorPicker");
const colorInput = document.getElementById("colorInput");

// Load saved color on popup open
chrome.storage.local.get("highlightColor", ({ highlightColor }) => {
  const color = highlightColor || "#4285f4";
  colorPicker.value = color;
  colorInput.value = color;
});

// Handle color picker change
colorPicker.addEventListener("input", (e) => {
  const color = e.target.value;
  colorInput.value = color;
  chrome.runtime.sendMessage({ type: "SET_HIGHLIGHT_COLOR", color });
});

// Handle text input change
colorInput.addEventListener("input", (e) => {
  let color = e.target.value.trim();
  // Add # if missing
  if (color && !color.startsWith("#")) {
    color = "#" + color;
  }
  // Validate hex color format
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    colorPicker.value = color;
    chrome.runtime.sendMessage({ type: "SET_HIGHLIGHT_COLOR", color });
  }
});

// Also save on blur (in case user types partial value)
colorInput.addEventListener("blur", (e) => {
  let color = e.target.value.trim();
  if (color && !color.startsWith("#")) {
    color = "#" + color;
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    colorPicker.value = color;
    colorInput.value = color;
    chrome.runtime.sendMessage({ type: "SET_HIGHLIGHT_COLOR", color });
  } else {
    // Reset to current saved value if invalid
    chrome.storage.local.get("highlightColor", ({ highlightColor }) => {
      const savedColor = highlightColor || "#4285f4";
      colorPicker.value = savedColor;
      colorInput.value = savedColor;
    });
  }
});

// ------------------ HIDE ALL-DAY TASKS ------------------
const hideAllDayTasksCheckbox = document.getElementById("hideAllDayTasks");

// Load saved preference on popup open
chrome.storage.local.get("hideAllDayTasks", ({ hideAllDayTasks }) => {
  hideAllDayTasksCheckbox.checked = hideAllDayTasks || false;
});

// Handle checkbox change
hideAllDayTasksCheckbox.addEventListener("change", (e) => {
  const hidden = e.target.checked;
  chrome.runtime.sendMessage({ type: "SET_HIDE_ALL_DAY_TASKS", hidden });
});

// ------------------ SIGN IN ------------------
signinBtn.addEventListener("click", async () => {
  statusDiv.textContent = "Signing in...";
  statusDiv.className = "status";
  signinBtn.disabled = true;

  try {
    // Request OAuth token (forces account chooser if needed)
    const response = await chrome.runtime.sendMessage({
      type: "GET_AUTH_TOKEN",
      interactive: true,
    });

    if (!response?.authenticated) {
      throw new Error(response?.error || "Authentication failed");
    }

    // Update UI immediately
    accountInfoDiv.textContent = response.email || "";

    // Update main UI
    statusDiv.textContent = "Sign in successful!";
    statusDiv.className = "status signed-in";
    signoutBtn.disabled = false;

    // Store token for logout
    window.lastToken = response.token;
  } catch (err) {
    console.error("Sign-in error:", err);

    statusDiv.textContent =
      err.message?.includes("canceled") || err.message?.includes("cancelled")
        ? "Sign in canceled"
        : "Sign in failed";
    statusDiv.className = "status signed-out";
    signinBtn.disabled = false;
    signoutBtn.disabled = true;
    accountInfoDiv.textContent = "";
  }
});

// ------------------ SIGN OUT ------------------
signoutBtn.addEventListener("click", async () => {
  statusDiv.textContent = "Signing out...";
  signoutBtn.disabled = true;

  try {
    chrome.runtime.sendMessage(
      { type: "LOGOUT", token: window.lastToken },
      async (response) => {
        if (response?.success) {
          // Update UI
          statusDiv.textContent = "Signed out";
          statusDiv.className = "status signed-out";
          accountInfoDiv.textContent = "";
          signinBtn.disabled = false;
          signoutBtn.disabled = true;

          // Clear token
          window.lastToken = null;
        } else {
          statusDiv.textContent = "Logout failed";
          signinBtn.disabled = false;
          signoutBtn.disabled = true;
          console.error(response?.error);
        }
      },
    );
  } catch (err) {
    console.error("Signout error:", err);
    statusDiv.textContent = "Logout failed";
    signinBtn.disabled = false;
    signoutBtn.disabled = true;
  }
});

// ------------------ HOUR RANGE SETTINGS ------------------
const enableHourRangeCheckbox = document.getElementById("enableHourRange");
const hourInputsWrapper = document.getElementById("hourInputsWrapper");
const startHourSlider = document.getElementById("startHourSlider");
const endHourSlider = document.getElementById("endHourSlider");
const startHourDisplay = document.getElementById("startHourDisplay");
const endHourDisplay = document.getElementById("endHourDisplay");
const sliderRange = document.getElementById("sliderRange");
const hourRangeWarning = document.getElementById("hourRangeWarning");
const hourRangeStrictModeCheckbox = document.getElementById(
  "hourRangeStrictMode",
);
const superStrictModeCheckbox = document.getElementById("superStrictMode");
const hidePreviousHoursCheckbox = document.getElementById("hidePreviousHours");
const onlyAffectTodayCheckbox = document.getElementById("onlyAffectToday");

// Format slider value (0-96) to display string like "6 AM" or "12:30 PM"
// Each slider unit = 15 minutes, so value 0 = 12:00 AM, value 4 = 1:00 AM, etc.
function formatTime(sliderValue) {
  sliderValue = parseInt(sliderValue);
  const totalMinutes = sliderValue * 15;
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Handle 24-hour wrap
  if (hours >= 24) hours = 0;

  const period = hours < 12 ? "AM" : "PM";
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;

  if (minutes === 0) {
    return displayHour + " " + period;
  } else {
    return (
      displayHour + ":" + minutes.toString().padStart(2, "0") + " " + period
    );
  }
}

// Convert slider value (0-96) to fractional hours (0-24)
function sliderToHours(sliderValue) {
  return (parseInt(sliderValue) * 15) / 60;
}

// Convert fractional hours (0-24) to slider value (0-96)
function hoursToSlider(hours) {
  return Math.round((hours * 60) / 15);
}

// Update the visual range highlight between the two sliders
function updateSliderRange() {
  const min = 0;
  const max = 96;
  const startVal = parseInt(startHourSlider.value);
  const endVal = parseInt(endHourSlider.value);
  const startPercent = ((startVal - min) / (max - min)) * 100;
  const endPercent = ((endVal - min) / (max - min)) * 100;
  sliderRange.style.left = startPercent + "%";
  sliderRange.style.width = endPercent - startPercent + "%";
}

// Update display labels and range highlight
function updateHourRangeDisplay() {
  startHourDisplay.textContent = formatTime(startHourSlider.value);
  endHourDisplay.textContent = formatTime(endHourSlider.value);
  updateSliderRange();
}

// Get current hour range settings
function getHourRangeSettings() {
  const enabled = enableHourRangeCheckbox.checked;
  return {
    enabled: enabled,
    startHour: sliderToHours(startHourSlider.value),
    endHour: sliderToHours(endHourSlider.value),
    // Strict Mode and Super Strict Mode require "Only Show These Hours" to be enabled
    // They are meaningless without hour range boundaries
    strictMode: enabled && hourRangeStrictModeCheckbox.checked,
    superStrictMode: enabled && superStrictModeCheckbox.checked,
    // Hide Previous Hours can work standalone (clips events before current time)
    hidePreviousHours: hidePreviousHoursCheckbox.checked,
    // Only Affect Today limits all hour range features to today's column
    onlyAffectToday: onlyAffectTodayCheckbox.checked,
  };
}

// Validate hour range and show warning if invalid
function validateHourRange() {
  const settings = getHourRangeSettings();
  const isInvalid = settings.endHour < settings.startHour;
  hourRangeWarning.classList.toggle("visible", isInvalid);
  return !isInvalid;
}

// Send hour range update to background/content
function sendHourRangeUpdate() {
  validateHourRange();
  const settings = getHourRangeSettings();
  chrome.runtime.sendMessage({ type: "SET_HOUR_RANGE", ...settings });
}

// Load saved preference on popup open
chrome.storage.local.get("hourRange", ({ hourRange }) => {
  if (hourRange) {
    enableHourRangeCheckbox.checked = hourRange.enabled || false;
    // Convert fractional hours back to slider values (0-96)
    startHourSlider.value = hoursToSlider(hourRange.startHour ?? 6);
    endHourSlider.value = hoursToSlider(hourRange.endHour ?? 17);
    hourRangeStrictModeCheckbox.checked = hourRange.strictMode || false;
    superStrictModeCheckbox.checked = hourRange.superStrictMode || false;
    hidePreviousHoursCheckbox.checked = hourRange.hidePreviousHours || false;
    onlyAffectTodayCheckbox.checked = hourRange.onlyAffectToday || false;
    hourInputsWrapper.classList.toggle("disabled", !hourRange.enabled);
    updateHourRangeDisplay();
    validateHourRange();
  } else {
    // Initialize display for defaults
    updateHourRangeDisplay();
  }
});

// Handle checkbox change
enableHourRangeCheckbox.addEventListener("change", () => {
  hourInputsWrapper.classList.toggle(
    "disabled",
    !enableHourRangeCheckbox.checked,
  );
  sendHourRangeUpdate();
});

// Ensure start doesn't exceed end when dragging
startHourSlider.addEventListener("input", () => {
  if (parseInt(startHourSlider.value) > parseInt(endHourSlider.value)) {
    startHourSlider.value = endHourSlider.value;
  }
  updateHourRangeDisplay();
  sendHourRangeUpdate();
});

// Ensure end doesn't go below start when dragging
endHourSlider.addEventListener("input", () => {
  if (parseInt(endHourSlider.value) < parseInt(startHourSlider.value)) {
    endHourSlider.value = startHourSlider.value;
  }
  updateHourRangeDisplay();
  sendHourRangeUpdate();
});

hourRangeStrictModeCheckbox.addEventListener("change", sendHourRangeUpdate);
superStrictModeCheckbox.addEventListener("change", sendHourRangeUpdate);
hidePreviousHoursCheckbox.addEventListener("change", sendHourRangeUpdate);
onlyAffectTodayCheckbox.addEventListener("change", sendHourRangeUpdate);

// Advanced section toggle
const advancedToggle = document.getElementById("advancedToggle");
const advancedContent = document.getElementById("advancedContent");

advancedToggle.addEventListener("click", () => {
  advancedToggle.classList.toggle("expanded");
  advancedContent.classList.toggle("visible");
  // Save expanded state
  chrome.storage.local.set({
    advancedExpanded: advancedContent.classList.contains("visible"),
  });
});

// Load advanced section state
chrome.storage.local.get("advancedExpanded", ({ advancedExpanded }) => {
  if (advancedExpanded) {
    advancedToggle.classList.add("expanded");
    advancedContent.classList.add("visible");
  }
});

// ------------------ POPUP LOAD ------------------
(async () => {
  // Load keybinds preference
  const { keybinds } = await chrome.storage.local.get("keybinds");
  const currentKeybinds = { ...DEFAULT_KEYBINDS, ...keybinds };
  updateKeybindInputs(currentKeybinds);

  // Check auth silently
  const response = await chrome.runtime.sendMessage({
    type: "GET_AUTH_TOKEN",
    interactive: false,
  });

  if (response?.authenticated) {
    accountInfoDiv.textContent = response.email || "";
    window.lastToken = response.token;

    statusDiv.textContent = "Signed in";
    statusDiv.className = "status signed-in";
    signinBtn.disabled = true;
    signoutBtn.disabled = false;
  } else {
    statusDiv.textContent = "Not signed in";
    statusDiv.className = "status signed-out";
    signinBtn.disabled = false;
    signoutBtn.disabled = true;
  }
})();
