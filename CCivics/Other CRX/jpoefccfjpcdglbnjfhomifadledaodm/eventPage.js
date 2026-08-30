// Define context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "SendToCalendar",
        title: "Save to Google Calendar",
        contexts: ["selection"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((clickData) => {
    if (clickData.menuItemId === "SendToCalendar" && clickData.selectionText) {
        let selectedText = clickData.selectionText.trim();
        let gCalURL;

        // Try parsing the date
        let parsedDate = parseNaturalLanguageDate(selectedText);
        if (parsedDate) {
            let isoDate = parsedDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
            gCalURL = `http://www.google.com/calendar/render?action=TEMPLATE&dates=${isoDate}/${isoDate}`;
        } else {
            // Fallback to default event creation
            gCalURL = `http://www.google.com/calendar/render?action=TEMPLATE&text=Event for ${encodeURIComponent(selectedText)}`;
        }

        // Open the Google Calendar URL in a new tab
        chrome.tabs.create({ url: gCalURL });
    }
});

// Function to parse natural language dates
function parseNaturalLanguageDate(input) {
    let today = new Date();

    // Handle "tomorrow", "yesterday", "day after tomorrow", etc.
    if (/^tomorrow$/i.test(input)) {
        return today.addDays(1);
    } else if (/^yesterday$/i.test(input)) {
        return today.addDays(-1);
    } else if (/^day\s?after\s?tomorrow$/i.test(input)) {
        return today.addDays(2);
    } else if (/^next\s(\w+)$/i.test(input)) {
        // Match day names (e.g., "next Monday")
        let match = input.match(/^next\s(\w+)$/i);
        if (match) {
            let dayName = match[1].toLowerCase();
            let daysToAdd = getDaysUntilNext(dayName);
            if (daysToAdd !== null) {
                return today.addDays(daysToAdd);
            }
        }
    } else if (/^(\d+)\s(days|weeks|months|years)\s?(from\snow)?$/i.test(input)) {
        // Match "3 days from now", "2 weeks from now", etc.
        let match = input.match(/^(\d+)\s(days|weeks|months|years)/i);
        if (match) {
            let value = parseInt(match[1], 10);
            let unit = match[2].toLowerCase();
            switch (unit) {
                case "days":
                    return today.addDays(value);
                case "weeks":
                    return today.addDays(value * 7);
                case "months":
                    return today.addMonths(value);
                case "years":
                    return today.addYears(value);
                default:
                    return null;
            }
        }
    }

    // Fallback to standard Date.parse for other formats
    let parsedDate = Date.parse(input);
    return isNaN(parsedDate) ? null : new Date(parsedDate);
}

// Utility to calculate days until the next specified day (e.g., "next Monday")
function getDaysUntilNext(dayName) {
    const daysOfWeek = [
        "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
    ];
    let dayIndex = daysOfWeek.indexOf(dayName);
    if (dayIndex === -1) return null;

    let today = new Date();
    let todayIndex = today.getDay();
    let daysUntil = (dayIndex - todayIndex + 7) % 7;
    return daysUntil === 0 ? 7 : daysUntil; // Ensure "next" moves to the next week
}

// Add utility functions to Date
Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

Date.prototype.addMonths = function (months) {
    let date = new Date(this.valueOf());
    date.setMonth(date.getMonth() + months);
    return date;
};

Date.prototype.addYears = function (years) {
    let date = new Date(this.valueOf());
    date.setFullYear(date.getFullYear() + years);
    return date;
};
