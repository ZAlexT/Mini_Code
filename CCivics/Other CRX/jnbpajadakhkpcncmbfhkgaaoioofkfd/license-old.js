/* Jeff Note: chrome.identity only works in background scripts.
    	Also need "permissions": ["identity"] in manifest.json 
  
  This is also crazy.  You also need the to put key: in manifest.json
  which you can get from Developer dashboard and "More Info" on the right
  of your app or, going to the folder of your packaged app when you install
  it from the web store and look at manifest.json. 
  See: https://developer.chrome.com/apps/app_identity 
  https://developer.chrome.com/webstore/one_time_payments#update-manifest
    	
*/
/* Jeff Note: chrome.identity only works in background scripts.
    	Also need "permissions": ["identity"] in manifest.json 
*/
var CWS_LICENSE_API_URL = 'https://www.googleapis.com/chromewebstore/v1.1/userlicenses/';
var TRIAL_PERIOD_DAYS = 30; // Version 1.0 - Was 180 
var statusDiv;

function init() {
  statusDiv = document.getElementById('sr_msg');
  getLicense();
}

/*****************************************************************************
* Call to license server to request the license
*****************************************************************************/

function getLicense() {
  xhrWithAuth('GET', CWS_LICENSE_API_URL + chrome.runtime.id, true, onLicenseFetched);
}

function onLicenseFetched(error, status, response) {
  console.log(error, status, response);
  //statusDiv.text("Parsing license...");
  response = JSON.parse(response);
  //$("#license_info").text(JSON.stringify(response, null, 2));
  if (status === 200) {
    parseLicense(response);
  } else {
    /*$("#dateCreated").text("N/A");
    $("#licenseState").addClass("alert-danger");
    $("#licenseStatus").text("Error");
    statusDiv.html("Error reading license server.");*/
  }
}

/*****************************************************************************
* Parse the license and determine if the user should get a free trial
*  - if license.accessLevel == "FULL", they've paid for the app
*  - if license.accessLevel == "FREE_TRIAL" they haven't paid
*    - If they've used the app for less than TRIAL_PERIOD_DAYS days, free trial
*    - Otherwise, the free trial has expired 
*****************************************************************************/

function parseLicense(license) {
  var licenseStatus;
  var licenseStatusText = "Free Trial"; // Version 1.0.0 // Version 1.0.3 - From: "FREE_TRIAL" to "FREE TRIAL" because Google does not translate with underscore between words
  console.log(license);
  if (license.result && license.accessLevel == "FULL") {
    console.log("Fully paid & properly licensed.");
    licenseStatusText = "Full";
    licenseStatus = "alert-success";
  } else if (license.result && license.accessLevel == "FREE_TRIAL") {
    var daysAgoLicenseIssued = Date.now() - parseInt(license.createdTime, 10);
    daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
    if (daysAgoLicenseIssued <= TRIAL_PERIOD_DAYS) {
      console.log("Free trial, still within trial period");
      var daysLeft = Math.round(TRIAL_PERIOD_DAYS - daysAgoLicenseIssued); // Version 1.0
      licenseStatusText = "Free Trial ("+daysLeft+" days left)"; // Version 1.0 // Version 1.0.3 - From: "FREE_TRIAL" to "FREE TRIAL"
      licenseStatus = "alert-info";
    } else {
      console.log("Free trial, trial period expired.");
      licenseStatusText = "Free Trial Expired"; // Version 1.0.3 - From: "FREE_TRIAL_EXPIRED" to "FREE TRIAL EXPIRED"
      licenseStatus = "alert-warning";
    }
  } else {
    console.log("No license ever issued.");
    licenseStatusText = "Free Trial"; // Version 1.0.3 - From: "NONE" to "FREE TRIAL"
    licenseStatus = "alert-danger";
  }
  /*$("#dateCreated").text(moment(parseInt(license.createdTime, 10)).format("llll"));
  $("#licenseState").addClass(licenseStatus);
  $("#licenseStatus").text(licenseStatusText);
  statusDiv.html("&nbsp;");*/
  var save_obj = { "license" : licenseStatusText }; // Version 1.0 - Was license.accessLevel
  //save_to_storage(obj); 
  // New to hemar: save directly to storage because save_to_storage(obj) adds uri key to object
  chrome.storage.local.set(save_obj, function() 
	{
		if (test_mode) console.log("Saved to storage: "+JSON.stringify(save_obj));
	  	
		if(chrome.runtime.lastError)
	    {
	        console.log(chrome.runtime.lastError.message);
	        return;
	    } 
	});
}

/*****************************************************************************
* Helper method for making authenticated requests
*****************************************************************************/

// Helper Util for making authenticated XHRs
function xhrWithAuth(method, url, interactive, callback) {
  var retry = true;
  getToken();

  function getToken() {
    //statusDiv.text("Getting auth token...");
    console.log("Calling chrome.identity.getAuthToken", interactive);
    /* Jeff Note: chrome.identity only works in background scripts.
    	Also need "permissions": ["identity"] in manifest.json */
    chrome.identity.getAuthToken({ interactive: interactive }, function(token) {
      if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError);
        return;
      }
      console.log("chrome.identity.getAuthToken returned a token", token);
      access_token = token;
      requestStart();
    });
  }

  function requestStart() {
    //statusDiv.text("Starting authenticated XHR...");
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.onload = requestComplete;
    xhr.send();
  }

  function requestComplete() {
    //statusDiv.text("Authenticated XHR completed.");
    if (this.status == 401 && retry) {
      retry = false;
      chrome.identity.removeCachedAuthToken({ token: access_token },
                                            getToken);
    } else {
      callback(null, this.status, this.response);
    }
  }
}


init();
