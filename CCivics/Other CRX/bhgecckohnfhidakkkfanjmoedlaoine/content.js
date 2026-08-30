// Function to create and show the loading spinner
function showLoadingSpinner() {
  // Create the spinner element
  const spinner = document.createElement("div");
  spinner.id = "myTextToCalExtensionLoadingSpinner";
  spinner.innerHTML = '<div class="text-to-cal-spinner"></div>';
  // Append the spinner to the body
  document.body.appendChild(spinner);
  // Position the spinner near the user's selection
  positionSpinnerNearSelection(spinner);
}

// Function to position the spinner near the text selection
function positionSpinnerNearSelection(spinner) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  spinner.style.position = "absolute";
  spinner.style.left = `${rect.left + window.scrollX}px`;
  spinner.style.top = `${
    rect.top + window.scrollY - spinner.offsetHeight - 5
  }px`;
}

// Function to hide and remove the loading spinner
function hideLoadingSpinner() {
  const spinner = document.getElementById("myTextToCalExtensionLoadingSpinner");
  if (spinner) {
    spinner.remove();
  }
}

// Dismissible review-ask toast, shown once by the background script after the
// user's Nth successful event creation (see maybeShowReviewPrompt).
function showReviewPrompt(reviewUrl, strings) {
  if (document.getElementById("myTextToCalExtensionReviewPrompt")) return;
  const toast = document.createElement("div");
  toast.id = "myTextToCalExtensionReviewPrompt";

  const title = document.createElement("div");
  title.className = "text-to-cal-review-title";
  title.textContent = strings.title;

  const rateBtn = document.createElement("button");
  rateBtn.className = "text-to-cal-review-rate";
  rateBtn.textContent = "★ " + strings.rate;
  rateBtn.addEventListener("click", function () {
    window.open(reviewUrl, "_blank", "noopener");
    toast.remove();
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "text-to-cal-review-dismiss";
  dismissBtn.textContent = strings.dismiss;
  dismissBtn.addEventListener("click", function () {
    toast.remove();
  });

  toast.appendChild(title);
  toast.appendChild(rateBtn);
  toast.appendChild(dismissBtn);
  document.body.appendChild(toast);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "showSpinner") {
    showLoadingSpinner();
  } else if (request.action === "hideSpinner") {
    hideLoadingSpinner();
  } else if (request.action === "showReviewPrompt") {
    showReviewPrompt(request.reviewUrl, request.strings);
  }
});
