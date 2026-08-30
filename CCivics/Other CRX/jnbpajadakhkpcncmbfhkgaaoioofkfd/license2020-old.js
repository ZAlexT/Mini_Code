/* 	license2020.js - This is needed because of Chrome Web Store payments deprecation
	mentioned at: https://developer.chrome.com/webstore/cws-payments-deprecation
	So now I have to process license using another service such as Paddle. But to keep
	track of when a user installed the extension I need to have my own createdTime
	variable and therefore I'll have to create a database on my server. I also need
	to use my server to periodically check that their subscription status is ACTIVE.
	
	This file should be included in manifest.json in two places: 
	"background": { "scripts" : So background can check license status every few days
	"content": { "scripts" : So content can listen for payment event from paddle
	This file should also be included in popup.html or an options page that has this settings_form:
	<form name="settings_form">
		<p>Order ID: <input type="text" name="order_id"> 
		<button type="button" name="check_order">Check</button> <br> 
		Status: <input type="text" name="status" class="status" readonly>
	</form>
	<script src="license2020.js"></script> 
	
	Also need in manifest.json: "permissions": [ "identity", "identity.email" ]	
*/
var product_id = "a2c"; // Add to Calendar Version 0.9.7
var products_array = [649627]; // Add to Calendar product_ids
var update_title_function = "update_title"; // Version 1.4.2 - Name of function to update extension title and pro features
// update_title_function should look at sync.license.license for "FULL", "FREE_TRIAL" or "FREE_TRIAL_EXPIRED"
var product_name = chrome.i18n.getMessage("appName") || product_id; // Version 1.4.2
var product_description = chrome.i18n.getMessage("shortName") || product_id; // Version 1.4.2
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property

if (!sync) 
	var sync = {};

function init2020(bit) {
	bit = bit || false;
	chrome.storage.sync.get('license', function(obj)
	{
		sync.license = obj.license || {};
		if (bit == false) {
			create_license();
			if (check2020()) 
				getLicense2020();
		}
		else
			getLicense2020(bit);
	});
}



function create_license() {
	/* Jeff if a user never signs in to Chrome then we need to have free trial expired somehow??
		Make sync.license.createdTime if it doesn't exist
	*/
	if (test_mode) console.log(sync);
	var licenseStatusText = "FREE TRIAL"; 
	var TRIAL_PERIOD_DAYS = 30; 
	if (!sync.license.hasOwnProperty('createdTime') || typeof sync.license.createdTime === 'undefined') { // Version 1.4.1 - Added || typeof sra.createdTime == 'undefined' because Chrome might return no accessLevel and no createdTime
		var createdTime = parseInt(new Date().getTime()); // UNIX timestamp in seconds
		sync.license.createdTime = createdTime;		
	}
	
	if (typeof sync.license.license === "undefined" || sync.license.license.match(/free|none/i)) {
		var daysAgoLicenseIssued = Date.now() - parseInt(sync.license.createdTime, 10);
		daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
		if (daysAgoLicenseIssued <= TRIAL_PERIOD_DAYS) {
			var daysLeft = Math.round(TRIAL_PERIOD_DAYS - daysAgoLicenseIssued); // Version 1.0
			licenseStatusText = "FREE TRIAL ("+daysLeft+" days left)";
		} else {
			console.log("Free trial, trial period expired.");
			licenseStatusText = "FREE TRIAL EXPIRED";
		}
		sync.license.license = licenseStatusText;
		// chrome.storage.sync.set({'license' : sync.license}); // Version 1.3.8 - shouldn't call this because it may not get saved until after the call to getLicense2020()
	}
	
}


function ajax(url, data, callback) { // Cross browser ajax request
	// To use with JSON object: ajax(url, JSON.stringify(obj), callback);
	try {
		var x = new(this.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
		x.open(data ? 'POST' : 'GET', url, true); // If data is empty then GET is used. Ex:(url = https://example.com?hi=1)
		x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		x.onreadystatechange = function () {
			if (x.status == 200) {
				if (x.readyState > 3)
				{
					if (callback) callback(x.responseText, x);
				}
			}
			else
				console.log("There is a problem communicating with the server. Status: "+x.status)
		};
		x.send(data);
	} catch (e) {
		window.console && console.log(e);
	}
};


function reviver(key, value)
{
	/* This JSON reviver function just changes a string of numbers "656" into a number 656 */
	/* It also works with negative values */
	if (typeof value === 'string') {
		var re = /^[\d,]*$/; // New 3/21/2020 - Remove commas if it is just numbers (digits) and commas
		if (value.match(re))  
			value = value.replace(",", ""); // Remove all commas from number
		if (value == "") value = value // Version 1.4.0 - It was converting "" to 0. Also added else below
		else if (!isNaN(value)) // if ! is Not a Number (NaN)
		{
			// Ok, it is a number so process it
			value = Number(value);
		}	
	}
	return value;
} // end function reviver(key, value)


function ajax_callback(data, x) {
	if (test_mode) console.log(data);
	try {
		var obj = JSON.parse(data, reviver);
		if (test_mode) console.log(obj);
	}
	catch (error) {
		console.log("Ajax response is not JSON. Error: "+error);
		console.log(data);
		return;
	}
	if (obj.hasOwnProperty('status') && obj.status != "") {
		sync.license.status = obj['status'];
		if (document.settings_form && document.settings_form.status) 
			document.settings_form.status.value = sync.license.status;
	}
	if (obj.hasOwnProperty('order_id') && obj.order_id != "") {
		sync.license.order_id = obj['order_id'];
		if (document.settings_form && document.settings_form.order_id) 
			document.settings_form.order_id.value = sync.license.order_id;	
	}
	if (obj.hasOwnProperty('createdTime') && obj.createdTime) {
		if (parseInt(obj.createdTime) > sync.license.createdTime) {
			obj.createdTime = sync.license.createdTime;
		}
		else sync.license.createdTime = obj.createdTime; // Version 1.3.8 - Because returned created time is smaller (older)
	}
	if (obj.hasOwnProperty('error') && obj.error) {
		if (document.getElementById('error')) // Version 1.4.0
			document.getElementById('error').innerHTML = "Error: "+sync.license.error;	
	}
	//else if (document.getElementById('error')) // Version 1.4.2 - license.php does not return error
	//	document.getElementById('error').innerHTML = "";
		
	console.log(obj); // { "status": "ACTIVE", "createdTime": "1606324738689", "license": "FREE TRIAL", "kind": "paypal", "order_id": "I-234234234"}
	if (sync.license.kind && sync.license["kind"].match(/chromewebstore/i) && sync.license.license == "FULL") {
		obj.license = sync.license.license;
		obj.kind = sync.license.kind; // Version 1.3.8 !!! JEFF HERE IS THE BUG IN 1.3.7: obj.license = sync.license.kind SHOULD BE obj.kind = sync.license.kind
	}
	if (obj.hasOwnProperty('license')) {
		sync.license.license = obj.license;
	}
	if (obj.hasOwnProperty('kind') && obj.kind) { // Version 1.3.8
		sync.license.kind = obj.kind;
	}
	chrome.storage.sync.set({'license' : sync.license}, function() { // Version 1.3.8 - Added , function() instead of setTimeout below
		console.log(JSON.stringify(sync)); // Version 1.3.8
		if (typeof window[update_title_function] === "function") // Version 1.4.2b
			window[update_title_function](); // Call the functions to update the extension title and full license features
		else { // Version 1.4.2b - Tell popup or sr.html to run update_title
			// Send to popup if open (Also sends to background so don't need chrome.tabs.query below)
			chrome.runtime.sendMessage({"update_title": sync.license}, function(response) { 
				if (chrome.runtime.lastError) console.log("To popup: "+chrome.runtime.lastError.message);
				else if (test_mode) console.log(response.farewell);
			});
			// Send to sr.html is open
			/* chrome.tabs.query({url: "chrome-extension://"+chrome.runtime.id+"/*"}, function(tabs) {
				if (test_mode && tabs.length == 0) 
					console.log("No chrome-extension://"+chrome.runtime.id+"/ tabs open");
				for (var i=0; i<tabs.length; ++i)
					chrome.tabs.sendMessage(tabs[i].id, {"update_title": sync.license}, function(response) {
					console.log(response);
			  });
			}); */
		}
	});
	
}



function getLicense2020(bit) {
	bit = bit || false; // Version 1.4.2g
	chrome.identity.getProfileUserInfo(function(userInfo) { // chrome.identity can't be run in content scripts // Version 1.4.3 3/15/2021 - Removed null, before function( because of error in Chromium
		console.log(userInfo); // {email: "name@gmail.com", id: "123456789012345678901"}
		// email and id are empty if the user is not signed in or identity.email permission is not set in manifest
		userInfo.order_id = sync.license.order_id || "";
		if (document.settings_form && document.settings_form.order_id && !bit) // Version 1.4.2g - Added && !bit
			userInfo.order_id = document.settings_form.order_id.value;
		userInfo.google_id = userInfo.id || "";
		if (sync.license.kind) userInfo.kind = sync.license.kind; // chromewebstore or paypal_sub
		if (sync.license.license) userInfo.license = sync.license.license;
		if (sync.license.createdTime) userInfo.createdTime = sync.license.createdTime;
		if (sync.license.error) userInfo.error = sync.license.error; // Version 1.3.9
		userInfo.product_id = product_id; // Version 1.4.2 - Changed from "sra" to product_id
		userInfo.product_name = product_name || ""; // Version 1.4.2
		userInfo.product_description = product_description || ""; // Version 1.4.2
		if (userInfo.email != "" || userInfo.id != "" || userInfo.order_id != "") {
			ajax("https://www.seabreezecomputers.com/speech/license/license.php", JSON.stringify(userInfo), ajax_callback);
		}
		/*if (userInfo.order_id != "") {
			ajax"https://www.seabreezecomputers.com/speech/subscription/paddle.php", JSON.stringify(userInfo), ajax_callback);
		}*/
		else { // If person never signed in to Chrome
			chrome.storage.sync.set({'license' : sync.license}); // Version 1.3.8 - Save what was made in create_license()
			var status = chrome.i18n.getMessage("signin") || "Sign in to browser or enter Order ID"; // Version 1.4.1
			document.settings_form.status.value = status; // Version 1.4.1
		}
	});

}

// Version 1.3.4
function check2020() {
	var cd2 = new Date().getTime();
	var ch = true;
	var days = 5; 
	
	if (typeof sync.license.cd2 === "undefined") {
		sync.license.cd2 = cd2;
		days = 0;
	}
	else if (typeof sync.license.license === "undefined" || sync.license.license.match(/free|none/i)) {
		days = 3;
	}
	
	var date1 = new Date();
	var date2 = new Date(parseInt(sync.license.cd2));
	var diffTime = Math.abs(date2 - date1);
	var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	console.log(diffDays);
	if (diffDays >= days) { 
		ch = true;
		sync.license.cd2 = cd2;
		// chrome.storage.sync.set({'license' : sync.license}); // Version 1.3.8 - shouldn't call this because it may not get saved until after the call to getLicense2020()
	}
	else 
		ch = false;
	
	return ch;
}



chrome.storage.sync.get('license', function(obj) { // Version 1.4.0
	if (!sync) window['sync'] = {};
	sync.license = obj.license || {};
	if (!sync.license.license) sync.license.license = "FREE"; // Version 1.4.3 - 3/29/2021
	
	//if (sync.license.license && sync.license.license.match(/full/i)) // Version 1.3.7f // Version 1.4.3 - 3/29/2021 - Removed because should call update_title even if not FULL license
		//if (typeof update_title === 'function') update_title(); // Version 1.4.2b - Replaced with below
		if (typeof window[update_title_function] === "function")
			window[update_title_function](); // Call the functions to update the extension title and full license features
	if (sync.license.order_id && document.settings_form && document.settings_form.order_id)  // Version 1.3.7g
			document.settings_form.order_id.value = sync.license.order_id;	
	if (sync.license.status && document.settings_form && document.settings_form.status)  // Version 1.3.7g
			document.settings_form.status.value = sync.license.status;	
	if (sync.license.error && document.getElementById('error')) // Version 1.4.0
			document.getElementById('error').innerHTML = "Note: "+sync.license.error +
			" <a href = 'https://www.seabreezecomputers.com/fontsize#faq' target='_blank'>"+
			"See Help</a>";
			
	//if (running_script == "background")
	if (location.pathname == "/_generated_background_page.html") {
		if (typeof getLicense !== 'function' // Version 1.4.2b - If license.js is installed then it will run check2020()
		|| !chrome.runtime.getManifest().oauth2) // Version 1.4.2i - In case I accidentally leave license.js in sr.html for 365 edition		
			init2020(); 
		else
			init(); // Version 1.4.0 - Run init() from license.js
	}
	
	if (document.settings_form && document.settings_form.check_order) {
		settings_form.check_order.addEventListener('click', function(event) { // Version 1.4.3 - Added event so can use event.preventDefault() below
			if (document.settings_form.status)
				document.settings_form.status.value = "Checking...";
			chrome.storage.sync.get('license', function(obj)
			{
				sync.license = obj.license || {};
				if (typeof getLicense !== 'function'	// Version 1.4.2b
				|| !chrome.runtime.getManifest().oauth2) // Version 1.4.2i
					getLicense2020(); 
				else
					getLicense(); // Version 1.4.2b - license.js will call getLicense2020()
			});
			event.preventDefault(); // Version 1.4.3 - 3/15/2021 - Prevent button from submitting form and reloading popup
		}, false);
	}
});


chrome.runtime.onMessage.addListener( function(obj, sender, sendResponse) { // Version 1.4.2b
	if (test_mode) console.log(JSON.stringify(obj));			
	if (obj.hasOwnProperty("getLicense")) 
		if (location.pathname == "/_generated_background_page.html") // Only let background script run this not sr.js
			init2020(obj["getLicense"]); // obj["getLicense"] has order_id in it
	if (obj.hasOwnProperty("update_title")) // Version 1.4.2b
		if (typeof window[update_title_function] === "function")
			window[update_title_function](); // Call the functions to update the extension title and full license features
	sendResponse({farewell: "From license2020: I got the object."});
});


// Version 1.3.7f - Listen for paddle event in content script
window.addEventListener("paddle", function(e) { 
	if (test_mode) console.log(e.detail); 
	if (test_mode) console.log(window.location.hostname);
	if (!window.location.hostname.match(/seabreezecomputers.com/i)) return; // Don't listen if not from website
	//var products_array = [643310]; // A+ FontSize Changer product_ids // 3/9/2021 Now at top of this file
	if (e.detail.hasOwnProperty("order")) {
		if (test_mode) console.log(JSON.stringify(e.detail));
		var product_id = e.detail.order.product_id || e.detail.lockers[0].product_id || ""; // Version 1.3.7g
		if (products_array.indexOf(product_id) > -1) { // Version 1.3.7g - Changed e.detail.order["product_id"] to product_id
			//var obj = {};
			// obj["order_id"] = e.detail.order.subscription_id || e.detail.order.order_id;
			sync.license["order_id"] = e.detail.order.order_id; // It appears the order_id should always be used with paddle
			sync.license["license"] = "FULL";
			sync.license["kind"] = "paddle";
			sync.license["is_subscription"] = e.detail.order.is_subscription;	
			sync.license["status"] = e.detail.state;
			chrome.storage.sync.set({'license' : sync.license}, function() { // Version 1.3.8 - Added , function() instead of setTimeout below
				// send_to_background({"command": "init2020", "option": 1}); // Version 1.4.2b - Replaced with below
				chrome.runtime.sendMessage({"getLicense": sync.license.order_id}, function(response) { // Version 1.4.3 - Bug fix: Changed obj.order_id to sync.order_id - Version 1.4.3a - From sync.order_id to sync.license.order_id
					if (test_mode) console.log(response.farewell);
				});
			});
			// Now we have to send a message to background (sr) script to run setup_forms(); and update_title();  ??
			//send_to_background({"command": "setup_forms", "option": ""});
			//send_to_background({"command": "update_title", "option": ""});
			//mergeObject(sync, obj); // Version 1.4.1 - Previously the below "command" would run too fast before save_to_storage finished
			//setTimeout(function() { send_to_background({"command": "init2020", "option": 1}); }, 2000); // Version 1.3.8 - Removed
		}
	}
});


chrome.storage.onChanged.addListener(function(changes, namespace) { // Version 1.4.3 - Put license changes in content.js sync
	// The namespace is "sync", "local" or "managed"
	if (test_mode) console.log("Changes to "+namespace+" storage: "+JSON.stringify(changes));
	for (key in changes) {
		var storageChange = changes[key];
 	 	/*console.log('Storage key "%s" in namespace "%s" changed. ' +
	              'Old value was "%s", new value is "%s".',
	              key,
	              namespace,
	              storageChange.oldValue,
	              storageChange.newValue); */
	              
	    //options_obj[key] = changes[key].newValue;
		if (namespace == "sync" && key == "license")
			sync.license = changes[key].newValue;
	    
	    //if (test_mode) console.log("sra object: "+JSON.stringify(sra));
		// When deleted: Storage key "toggle" in namespace "local" changed. Old value was "Object", new value is "undefined".
		// When created: Storage key "toggle" in namespace "local" changed. Old value was "undefined", new value is "Object".
		/* NOTE: A new cookie only has newValue and no oldValue property
			NOTE: A deleted cookie only has an oldValue and no newValue property */
	}
	//if (typeof processObject === "function") processObject(changes);
});	
