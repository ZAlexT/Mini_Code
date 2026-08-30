var running_script = "popup";
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var tab_id = false;
var tab = false;
var url = false; 
var title = false;
var license = "Free";
var current_event = 0;
var a2c = {events : []}; // Version 1.0.0 - From {} to {events : []} to be able to use a2c.concat below
//var options_obj = { highlight_event_info : 0 }; // in storage.js
var event_count_span = document.getElementById("event_count");


// Get current url
chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
	tab = tabs[0];
	url = tab.url;
	title = tab.title;
  	tab_id = tab.id;
	
	console.log(new Date().toISOString()+": Show spinner");
	if (document.getElementById("spinner")) // Version 1.0.0b - Show spinner
		document.getElementById("spinner").style.visibility = "visible";
  	
  	// When we start the pop-up we want to tell it to tell a2c.js to find_all_events()
  	console.log(new Date().toISOString()+": Send Toggle");
	send_to_content({"toggle":"toggle"});
  	
	
	if (tab.url.match(/^chrome|\/webstore/i))
		document.getElementById('error').innerHTML = "NOTE: Chrome extensions are not allowed and will not work on special <b>chrome://</b> pages or Chrome Webstore such as the current page.";
    
    //uri = url;
	//get_from_storage();
});


// Close popup if mouse leaves it
/*document.addEventListener("mouseleave", function(event){
	if (test_mode) console.log(event);
	window.close();
});*/


function send_to_content(obj)
{
	//console.log(tab_id);
	//console.log(JSON.stringify(obj));
	chrome.tabs.sendMessage(tab_id, obj, function(response) {
    	 
    	if (chrome.runtime.lastError) 
    	{
            console.log('ERROR: ' + chrome.runtime.lastError.message);
        /* Above gets "ERROR: Could not establish connection. Receiving end does not exist"
			if you run it on chrome://extensions/ page or if the extension is just installed
			and the page has not been refreshed */
			//if (chrome.runtime.lastError.match(/Receiving end does not exist/i))
				//document.getElementById('error').innerHTML = "NOTE: You must refresh the web page before this extension will work on it!";
			
			/*  Inject content.js in active tab.
					Need "permissions": ["activeTab"] in manifest.json for this to work
			*/
			
			if (chrome.runtime.lastError.message.match(/Receiving end does not exist/i))
			chrome.scripting.executeScript( // Version 1.5.0 - Manifest V3 // Version 1.0.0 - a2c Manifest v3
			{
			  target: {tabId: tab_id, allFrames: true}, // Version 1.0.0 - allFrames was false. True only worked if we added "host_permissions": [ "<all_urls>" ] to manifest.json. Example: https://github.com/GoogleChrome/chrome-extensions-samples/issues/715
			  files: ['storage.js', 'a2c.js'],
			}, function() {
				if (chrome.runtime.lastError) {
					console.log(chrome.runtime.lastError.message); // Version 1.4.5 - Changed from error to log
					if (chrome.runtime.lastError.message.match(/The extensions gallery cannot be scripted/i)) // Version 1.4.1
						document.getElementById('error').innerHTML = chrome.i18n.getMessage("webstoreError")
						|| "NOTE: Extensions are not allowed to run at the Chrome Web Store or Edge Add-Ons gallery."; // Version 1.0.0 - a2c
					if (chrome.runtime.lastError.message.match(/Cannot access(.*?)chrome/i)) // Version 1.4.1
						document.getElementById('error').innerHTML = chrome.i18n.getMessage("chromeError")
						|| "NOTE: Extensions are not allowed and will not work on special <b>chrome://</b> pages."; // Version 1.0.0 a2c
				
					if (document.getElementById("spinner")) // Version 1.0.0b - Hide spinner
						document.getElementById("spinner").style.visibility = "hidden";
				}
				else
				{
					setTimeout(function(){ 
						send_to_content(obj); // Then call send_to_content(obj) again after content.js injected
					}, 250);
				}
			});
			 /*chrome.tabs.executeScript(tab_id, {file: "storage.js"}, function() {
			 	chrome.tabs.executeScript(tab_id, {file: "a2c.js"}, function() {
    				if (chrome.runtime.lastError) {
        				console.error(chrome.runtime.lastError.message);
    				}
    				else
    				{
    					setTimeout(function(){ 
							send_to_content(obj); // Then call send_to_content(obj) again after content.js injected
						}, 200);
    				}
    			});
			});	*/
			return;
		}
		
		console.log(new Date().toISOString()+": Response");
		console.log(response);
		
		if (response.hasOwnProperty("events")) 
		{		
			a2c = JSON.parse(response["events"]);
			console.log(a2c);
			fix_timezone(); // Version 0.9.10 // Version 1.0.0 - Removed (a2c)
			show_events(a2c);
		}
		/*if (response.hasOwnProperty("farewell")) // Version 1.0.0b - Hide spinner
		{
			// Removed because it hides the spinner too quickly before event information is filled. It is below now.
			if (response["farewell"] == "goodbye")
				if (document.getElementById("spinner")) // Version 1.0.0b - Hide spinner
					document.getElementById("spinner").style.visibility = "hidden";
		}*/
		if (response.hasOwnProperty("color")) 
		{
			if (response["color"] == "reset")
				document.getElementById('fontcolor').value = "#FFEEDD";
			else	
				document.getElementById('fontcolor').value = response["color"];
		}
		if (response.hasOwnProperty("background-color")) 
		{
			if (response["background-color"] == "reset")
				document.getElementById('bgcolor').value = "#FFEEDD";
			else	
				document.getElementById('bgcolor').value = response["background-color"];
		}
  	});
  	//tab_id = false;
}


/* Version 1.0.0 - Added addListener to allow cross domain iFrames to send event data.
Listen to message from background script */
chrome.runtime.onMessage.addListener(
	function(obj, sender, sendResponse) {
		console.log(new Date().toISOString()+": Message from frameId: "+sender.frameId);
		console.log(sender);
		if (obj.hasOwnProperty("events")) 
		{
			if (sender.frameId == 0) // Version 1.0.0 - Hide spinner only if FrameId is the main window
			if (document.getElementById("spinner")) // Version 1.0.0b - Hide spinner
				document.getElementById("spinner").style.visibility = "hidden";
			var temp = JSON.parse(obj["events"]);
			console.log(temp);
			a2c.events = a2c.events.concat(temp.events); // Add events array to end of a2c array
			fix_timezone(); // Version 0.9.10
			show_events(a2c);
		}
		sendResponse({farewell: "From background: I got the object."});
});

// get app version
/* Both of the methods below work however they may be unstable or break.
	The runtime.getManifest().version seems to be the latest way.
	Not really needed since Chrome updates extensions automatically!
	So I wont display the version???
*/
//document.getElementById('app_version').innerHTML = chrome.app.getDetails().version;
//document.getElementById('app_version').innerHTML = chrome.runtime.getManifest().version;

function fix_timezone() { // Version 0.9.10 - Separate timezone offset from time if included // Version 1.0.0 - Removed (a2c)
	for (var i = 0; i < a2c.events.length; i++) {
		var parts = a2c.events[i].time_start.match(/([\d:]+(?: am| pm)?)?([+-].+|Z)?/i); // 19:00:00-04:00 to [19:00:00, -4:00]
		if (parts) {
			if (parts[1]) 
				a2c.events[i].time_start = parts[1];
			if (parts[2]) {
				a2c.events[i].timezone = parts[2];
				a2c.events[i].timezone_type = "from_event";
			}
			/*else {
				a2c.events[i].timezone = user_timezone().offset; 
				a2c.events[i].timezone_type = "browser";
			}*/
		}
		var parts = a2c.events[i].time_end.match(/([\d:]+(?: am| pm)?)?([+-].+|Z)?/i); // 19:00:00-04:00 to [19:00:00, -4:00]
		if (parts)
			if (parts[1]) a2c.events[i].time_end = parts[1];
	}
}

function show_events(a2c) {
	for (var i = 0; i < a2c.events.length; i++) 
		if (i == current_event) break;
		
	if (a2c.events[i]) {
		// datetime.toISOString() = "1970-01-01T08:00:00.000Z" but Date does not like .000Z and GMT timezone		
		a2c.events[i].datetime_start = new Date(a2c.events[i].date_start+" "+a2c.events[i].time_start);
		if (!a2c.events[i].date_end)  // if date_end is not specified
			a2c.events[i].date_end = a2c.events[i].date_start;
		if (!a2c.events[i].time_end)  // if time_end is not specified
			a2c.events[i].time_end = a2c.events[i].time_start;	
		a2c.events[i].datetime_end = new Date(a2c.events[i].date_end+" "+a2c.events[i].time_end);
	
		document["event_form"]["title"].value = a2c.events[i].title;
		document["event_form"]["date_start"].value = a2c.events[i].date_start;
		document["event_form"]["time_start"].value = pad(a2c.events[i].datetime_start.getHours())+":"+pad(a2c.events[i].datetime_start.getMinutes()); 
		document["event_form"]["date_end"].value = a2c.events[i].date_end;
		document["event_form"]["time_end"].value = pad(a2c.events[i].datetime_end.getHours())+":"+pad(a2c.events[i].datetime_end.getMinutes());
		document["event_form"]["address"].value = a2c.events[i].address;
		document["event_form"]["description"].value = a2c.events[i].description + "\nMore Info: "+url; // Version 0.9.10 - Added a2c.events[i].description + // Version 1.0.0 - Added \n
		document["event_form"]["timezone_offset"].value = a2c.events[i].timezone || ""; // Version 0.9.10
		document["event_form"]["timezone_type"].value = a2c.events[i].timezone_type || ""; // Version 0.9.10
		event_count_span.innerHTML = (i+1) + " of " + (a2c.events.length);
	}
	
}

 function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }


function font_color()
{
	var color = document.getElementById('fontcolor').value;
	send_to_content({ "color" : color });
}

function bg_color()
{
	var color = document.getElementById('bgcolor').value;
	send_to_content({ "bgcolor" : color });
}

function reset_colors()
{
	document.getElementById('fontcolor').value = "#FFEEDD";
	document.getElementById('bgcolor').value = "#FFEEDD";
	send_to_content({ "color" : "reset" });
}


function setup_forms()
{
	var all_forms = document.forms;
	for (var i = 0; i < all_forms.length; i++)
	{
	    if (all_forms[i].name == "options_form") 
	    	all_forms[i].onsubmit = function() { return false; };
	    
		for (var j = 0; j < all_forms[i].length; j++)
	    {
			if (all_forms[i][j].type.match(/^(checkbox|submit|button)$/i))
			{			 
				all_forms[i][j].addEventListener('click', function() {formclick();}, false);
				if (options_obj.hasOwnProperty(all_forms[i][j].name))
				{
					all_forms[i][j].checked = options_obj[all_forms[i][j].name];
					
					if(all_forms[i][j].name.match(/option_word_wrap/))
						toggle_word_wrap(options_obj[all_forms[i][j].name]);
					
					if(all_forms[i][j].name.match(/detect_event_timezones/))
					if (all_forms[i][j].checked)
						document["event_form"]["timezone_offset"].type = 'text';
					else 
						document["event_form"]["timezone_offset"].type = 'hidden';
				}
			}
			else if (all_forms[i][j].type.match(/^(text)$/i) || all_forms[i][j].tagName.match(/^(INPUT)$/i))
			{
				all_forms[i][j].addEventListener('input', function() {formclick();}, false);
				if (options_obj.hasOwnProperty(all_forms[i][j].name) && options_obj[all_forms[i][j].name] != false)
				{
					all_forms[i][j].value = options_obj[all_forms[i][j].name];	
				}
			}
			else if (all_forms[i][j].type.match(/^(select)/i)) // could be select-one or select-multiple
			{
				all_forms[i][j].addEventListener('change', function() {formclick();}, false);
				if (options_obj.hasOwnProperty(all_forms[i][j].name) && options_obj[all_forms[i][j].name] != false)
				{
					//all_forms[i][j].selectedIndex = options_obj[all_forms[i][j].name];
					all_forms[i][j].value = options_obj[all_forms[i][j].name]; // Version 0.9.9
				}
			}
			
		}
	}	
}


function formclick()
{
	var el = event.target; // Target element of click
	if (test_mode) console.log(el);
	
	if (el.name.match(/^prev$/i)) {
		current_event--;
		if (current_event < 0) current_event = a2c.events.length - 1;
		show_events(a2c);	
	}
	else if (el.name.match(/^next$/i)) {
		current_event++;
		if (current_event == a2c.events.length) current_event = 0;
		show_events(a2c);
	}
	else if (el.name.match(/detect_event_timezones/)) { // Version 0.9.10d
		if (el.checked)
			document["event_form"]["timezone_offset"].type = 'text';
		else 
			document["event_form"]["timezone_offset"].type = 'hidden';
	}
	else if (el.name.match("add2google")) {
		var timezone_name = ""; // Version 0.9.10 - If user wants us to try detect timezone name
		/*if (options_obj.detect_event_timezones) { // Version 0.9.10 - If user wants us to try detect timezone name
			var offset = document["event_form"]["timezone_offset"].value;
			var timezone_type = document["event_form"]["timezone_type"].value;
			if (offset && timezone_type && timezone_type != "browser") // If event included offset then guess the timezone name (timezones.js)
				timezone_name = guess_timezone_name(offset, document["event_form"]["address"].value);
			else if (offset) {
				timezone_name = user_timezone().name; // Else get it from the user's browser
			}	
				
		}*/
		var datetime_start = new Date (document["event_form"]["date_start"].value + " " 
			+ document["event_form"]["time_start"].value
			+ document["event_form"]["timezone_offset"].value); // Version 0.9.10e
		var datetime_end = new Date (document["event_form"]["date_end"].value 
		+ " " + document["event_form"]["time_end"].value
			+ document["event_form"]["timezone_offset"].value); // Version 0.9.10e
		if (datetime_start.getTime() == datetime_end.getTime() && datetime_start.getHours() == 0 && datetime_start.getMinutes() == 0) {// All day event
			datetime_end.setDate(datetime_end.getDate() + 1); // Google needs an extra day added to end date for all day events
			var google_date =  String(datetime_start.getFullYear()) + String(pad(datetime_start.getMonth()+1)) + pad(datetime_start.getDate()) +
				"/" + datetime_end.getFullYear() + pad(datetime_end.getMonth()+1) + pad(datetime_end.getDate());
		}
		else {// Event with times
			// Version 0.9.10 - If timezone offset is included then we need to put standard time without UTC conversion (Z at end of datetime)
			/*if (timezone_name) {
			 var google_date = String(datetime_start.getFullYear()) + String(pad(datetime_start.getMonth()+1)) + pad(datetime_start.getDate()) + "T" +
					pad(datetime_start.getHours()) + pad(datetime_start.getMinutes()) + pad(datetime_start.getSeconds()) +
				"/" + datetime_end.getFullYear() + pad(datetime_end.getMonth()+1) + pad(datetime_end.getDate()) + "T" +
					pad(datetime_end.getHours()) + pad(datetime_end.getMinutes()) + pad(datetime_end.getSeconds()); 
			}
			else */ // Version 0.9.10 - If timezone offset not included then convert datetime to UTC (ISO kind of)
				var google_date = datetime_start.toISOString().replace(/[-:]|\.000/g, "") 
					+ "/" + datetime_end.toISOString().replace(/[-:]|\.000/g, ""); // 2018-12-13T19:35:00.000Z to 20181213T193500Z
		}
		//var google_url = "http://www.google.com/calendar/event?action=TEMPLATE" + // old way
		var google_url = "https://calendar.google.com/calendar/r/eventedit?" + // new way
			"&text=" + encodeURIComponent(document["event_form"]["title"].value) + 
			"&dates=" + google_date +
			"&location=" + encodeURIComponent(document["event_form"]["address"].value) +
			"&details=" + encodeURIComponent(document["event_form"]["description"].value) +
			"&ctz=" + encodeURIComponent(timezone_name); // Version 0.9.10 - Add ctz=timezone_name
		window.open(google_url, "_blank");
	}
	else if (el.name.match("ics")) {
		var datetime_start = new Date (document["event_form"]["date_start"].value + " " 
			+ document["event_form"]["time_start"].value
			+ document["event_form"]["timezone_offset"].value); // Version 0.9.10e
		var datetime_end = new Date (document["event_form"]["date_end"].value 
		+ " " + document["event_form"]["time_end"].value
			+ document["event_form"]["timezone_offset"].value); // Version 0.9.10e
		if (datetime_start.getTime() == datetime_end.getTime() && datetime_start.getHours() == 0 && datetime_start.getMinutes() == 0) {// All day event
			datetime_end.setDate(datetime_end.getDate() + 1); // ICS needs an extra day added to end date for all day events
			var ics_start_date =  datetime_start.toISOString().replace(/[-:]|\.000/g, "");
			var ics_end_date = datetime_end.toISOString().replace(/[-:]|\.000/g, ""); // 2018-12-13T19:35:00.000Z to 20181213T000000Z
		}
		else {// Event with times
			var ics_start_date = datetime_start.toISOString().replace(/[-:]|\.000/g, "") 
			var ics_end_date = datetime_end.toISOString().replace(/[-:]|\.000/g, ""); // 2018-12-13T19:35:00.000Z to 20181213T193500Z
		}
		var ics_file_text = "BEGIN:VCALENDAR\r\n" + "VERSION:1.0\r\n" + "BEGIN:VEVENT\r\n" +
			"URL:" + url + "\r\n" +
			"DTSTART:" + ics_start_date + "\r\n" +
			"DTEND:" + ics_end_date + "\r\n" +
			"SUMMARY:" + document["event_form"]["title"].value + "\r\n" +
			"DESCRIPTION:" + document["event_form"]["description"].value + "\r\n" +
			"LOCATION:" + document["event_form"]["address"].value + "\r\n" +
			"END:VEVENT\r\n" + "END:VCALENDAR";
		send_to_content({ "download" : ics_file_text });
		//download("event.ics", ics_file_text); // SaveAs shows up half off the screen and disappears when move mouse but is still trying to download
		/* var blob = new Blob([ics_file_text], {type: "text/plain;charset=utf-8"});
		var file = URL.createObjectURL(blob);
		chrome.downloads.download({
				url: "data:text/plain," + encodeURIComponent(ics_file_text), // The object URL can be used as download URL
			filename: "event.ics", saveAs: true, conflictAction: "prompt" },
			function (downloadId) {
				if (test_mode) console.log(downloadId);
		 
		}); */
		// chrome.downloads.download also shows up half off screen when in the popup	
	}
	
	if (options_obj.hasOwnProperty(el.name)) // If the form elements name is also a key in settings object
	{
		if (el.type.match(/^(checkbox)$/i))
			options_obj[el.name] = el.checked; // Change sra object
		else if (el.type.match(/^(text)$/i) || el.tagName.match(/^(INPUT)$/i))
			options_obj[el.name] = el.value; // Change sra object
		else if (el.type.match(/^(select)/i)) // could be select-one or select-multiple
			//options_obj[el.name] = el.selectedIndex; // Change sra object
			options_obj[el.name] = el.value; // Version 0.9.9 - Get value of drop down box instead of selectedIndex
		var obj = {};
		obj[el.name] = options_obj[el.name];
		if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
		save_to_storage(obj);
		
		if(el.name.match(/option_word_wrap/))
			toggle_word_wrap(options_obj[el.name]);
	}

}


function download(filename, text) {
  
	var file = new Blob([text], {type: "text/plain"});
	if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
		var a = document.createElement("a");
		a.style.position = "absolute";
		a.style.left = "-2000px";
		a.href = URL.createObjectURL(file);
		a.download = filename;
		document.body.appendChild(a);
		a.click();
	}
}




function get_products()
{
	google.payments.inapp.getSkuDetails({
		'parameters': {'env': 'prod'},
		'success': onSkuDetails,
		'failure': onSkuDetailsFail
	});
}

function onSkuDetails(response)
{
	if (test_mode) 
	{
		console.log("getSkuDetails:");
		console.log(response);
	}
	var products = response.response.details.inAppProducts;
  	var count = products.length;
  	for (var i = 0; i < count; i++) {
    	var sku = products[i].sku;
    	var price = products[i].prices[0].valueMicros / 1000000;
    	
		if (products[i].state == "ACTIVE")
		{
			if (document.getElementById(sku))
	    		document.getElementById(sku).innerHTML = "BUY FOR "+price;
				
			document.getElementById(sku).addEventListener("click", function() { 
				var el = event.target; // Target element of click
				var sku = el.id;
				google.payments.inapp.buy({
				  	'parameters': {'env': 'prod'},
				  	'sku': sku,
				  	'success': onPurchase,
					'failure': onPurchaseFail
				}); 
			}, false);
		}	
  	}
}

function onSkuDetailsFail(response)
{
		console.log("getSkuDetails failed.");
		console.log(response);	
}


function get_purchases()
{
	google.payments.inapp.getPurchases({
  		'parameters': {'env': 'prod'},
  		'success': onLicenseUpdate,
  		'failure': onLicenseUpdateFail
	});
}


function onLicenseUpdate(response)
{
	if (test_mode) 
	{
		console.log("getPurchases:");
		console.log(response);	
	}
	
	var licenses = response.response.details;
	var count = licenses.length;
	for (var i = 0; i < count; i++) {
		var license = licenses[i];
		var sku = license.sku;
		var state = license.state;
		
		if (options_obj.hasOwnProperty(sku)) // If the sku name is also a key in settings object
		{
			if (state == "ACTIVE")
			{
				// Remove buy button
				if (document.getElementById(sku))
		    		document.getElementById(sku).style.display = "none";
		    	// Change options settings to allow purchased feature
				options_obj[sku] = true;
				// Create object to save to storage
				var obj = {};
				obj[sku] = options_obj[sku];
				if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
				save_to_storage(obj);  
				// Call function if exists
		    	var function_name = sku+"_function";
		    	if (typeof window[function_name] === "function") window[function_name](); // i.e. option_clipboard_viewer_function  	
			}
			else // if state is PAYMENT_DECLINED, EXPIRED, CANCELLED, REJECTED, PENDING, CANCELLED_BY_DEVELOPER, DISABLED.
			{
				// Display buy button
				if (document.getElementById(sku))
		    		document.getElementById(sku).style.display = "block";
				// Change options settings to NOT allow purchased feature
				options_obj[sku] = false;
				// Create object to save to storage
				var obj = {};
				obj[sku] = options_obj[sku];
				if (test_mode) console.log("Settings object: "+JSON.stringify(obj));
				save_to_storage(obj);    	
			}
		}
	}
	
}

function onLicenseUpdateFail(response)
{
	console.log("getPurchases failed.");
	console.log(response);		
}


function onPurchase(response)
{
	//if (test_mode) 
	{
		console.log("onPurchase:");
		console.log(response);	
	}
	// The purchase went through so check for purchased products again
	setTimeout(function()
	{
		get_purchases();
	} , 3000);
	
}

function onPurchaseFail(response)
{
	console.log("onPurchase failed.");
	console.log(response);	
	// Even though the purchase did NOT go through check for purchased products again anyway
	/* Jeff: I'm getting "PURCHASE_CANCELED" even if it goes through. But calling
		get_purchases() does not show the purchase yet. Maybe I need a setTimeout before I call
		it?
	*/
	setTimeout(function()
	{
		get_purchases();
	} , 3000);	
}




// Add onclick to toggle switch because popup.html can't have any javascript in it
/*document.getElementById('up').addEventListener("click", function() { send_to_content({ "button" : "up" }) }, false);
document.getElementById('down').addEventListener("click", function() { send_to_content({ "button" : "down" }) }, false);
document.getElementById('default').addEventListener("click", function() { send_to_content({ "button" : "default" }) }, false);
document.getElementById('fontcolor').addEventListener("input", function() { font_color(); }, false);
document.getElementById('bgcolor').addEventListener("input", function() { bg_color(); }, false);
document.getElementById('reset_colors').addEventListener("click", function() { reset_colors();  }, false); */

//document.getElementById('append_separater').addEventListener("input", function() { formclick();  }, false);

//loadXMLDoc("user_data=1"); // popup.js can communicate fine with an https site without error





function update_title(new_title)
{
	// New to hemar get license directly from chrome.local.get because get_from_storage adds uri to key
	chrome.storage.sync.get("license", function(obj) // Version 0.9.7 - Changed from local to sync
	{
	    if (test_mode) console.log(JSON.stringify(obj));
	    
	    license = (typeof obj["license"] === "undefined") ? "Free" : obj["license"].license; // Version 0.9.7 - Added .license to end 
		var manifest = chrome.runtime.getManifest(); // Get all the info from the manifest file in an object
		if (test_mode) console.log(license);
		
		// Add below if we add more languages
		/* var license_parts = license.split(" ("); // Version 1.1.8 - v 1.1.3 accidentally removed "FREE TRIAL (x days left)";
		license = chrome.i18n.getMessage(license_parts[0].replace(/ /g,"_")); // Version 1.1.3 - Free, FREE_TRIAL, FREE_TRIAL_EXPIRED, FULL in diff languages
		if (license_parts.length > 1) license = license + " (" + license_parts[1];
		if (test_mode) console.log(license);
		*/
		
		//console.log(manifest.version);
		new_title = (typeof new_title === 'undefined') ? manifest.name : new_title;
		document.title = new_title + " " + license; // Change the title of the document
		var titles = document.getElementsByClassName("title"); 	// Update each element with class of title
		for (var i = 0; i < titles.length; i++)
		{
			if (i == 0)
				titles[i].innerHTML = manifest.name + " " + license; // Only show the license for the top most title
			else 
				titles[i].innerHTML = manifest.name;	
		}
		
		if (license.match(/full/i)) // If they upgraded to full
		{
			// Don't display upgrade to full version message
			var elems = document.getElementsByClassName('free_trial_msg');
			for (var e = 0; e < elems.length; e++) 
				elems[e].style.display = "none";	
		}

	    	 	   
	});	

}

// Version 1.0.0 - a2c - Taken from IDM popup.js
chrome.commands.getAll(function(commands) { 
	if (test_mode) console.log(commands);
	var shortcuts_div = document.getElementById('shortcuts');
	//var shortcut_url = (navigator.userAgent.indexOf("Edg")) ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts"; // Version 1.4.1
	var shortcut_url = "chrome://extensions/shortcuts"; // Version 1.4.1b - Edge redirects to edge://
	var string = "";
	for (var i = 0; i < commands.length; i++) {
		//if (commands[i].name.match(/^toggle/i))
		// // Version 1.7.0c - Chrome Bug: You have to remove extension and reinstall it or commands array is blank for Manifest V3 - switching from _execute_browser_action to _execute_action
			string += commands[i].description + " : " + commands[i].shortcut + "<br />"; 
	}
	string += chrome.i18n.getMessage("change_hotkey") || "Change shortcut key: "
	string +=' <a href="#" id="shortcuts_url">'+shortcut_url+'</a>'; // Version 1.4.1
	shortcuts_div.innerHTML += string;
	document.getElementById('shortcuts_url').onclick = event => {
		chrome.tabs.create({url: shortcut_url}); // Version 1.4.1
		//chrome.tabs.create({url: 'chrome://extensions/configureCommands'}); // Version 1.4.1
		event.preventDefault();
	};
});

// Version 1.0.2 - Allow paste in date and time input fields
document.querySelector('body').addEventListener('paste', (e) => {
	if (document.activeElement.nodeName !== "INPUT") {
		return;
	}
	if (!document.activeElement.type.match(/date|time/i))
		return;

	var value = e.clipboardData.getData('text');

	if (document.activeElement.type == "time")
		value = fix_time(value);
	else if (document.activeElement.type == "date")
		value = fix_date(value);

	document.activeElement.value = value;
  
});


// Version 1.0.2 - fix_time(string)
function fix_time(string) {
	
	string = string.replace(/(at|from|around|about) ?/ig, ""); // Version 0.9.5 - Moved from outside of loop to inside
	if (string.toLowerCase() == "noon") string = "12:00 pm";
	if (string.toLowerCase() == "midnight") string = "12:00 am";
	string = string.replace(/ ?(am|a\.m\.|a)/ig, " am");
	string = string.replace(/ ?(pm|p\.m\.|p)/ig, " pm");
	string = string.replace(".", ":"); // 6.30 pm to 6:30 pm
	if (string.indexOf(":") == -1) 
		string = string.replace(/(?:^| )(\b\d{1,2}) ?(am|pm)/i, "$1:00 $2"); // 5 PM to 5:00 pm
	if (string.indexOf(":") == -1) {
		string = string.replace(/(?:^| )(\b\d{1,2})\b/i, "$1:00"); // 5 to 5:00 
	}
	
	// Now convert to input type="time" value "HH:mm" format (military or 24 hr format
	var datetime = new Date("12/01/2013 "+string);
	string = pad(datetime.getHours())+":"+pad(datetime.getMinutes());
	
	return string;
	
}

// Version 1.0.2 - fix_date() added from a2c.js
function fix_date(date_text) {
	/* This function will make dates display in ISO 8601 format (2018-11-29) See: https://en.wikipedia.org/wiki/Date_format_by_country
		It will also correct a date that does not have a year included
		by adding this year or next year to the date if the date is in the past by 30 days.
		It will also correct Europe style date 15/01/2018 to Javascript Date object style 01/15/2018
	*/
	var _MS_PER_DAY = 1000 * 60 * 60 * 24;
	var today = new Date(); // Today's date
	var this_year = (new Date()).getFullYear();
	var next_year = this_year + 1;
	var wrong_year = (new Date("Jan 1")).getFullYear(); // Chrome seems to always put year 2001 if no year is specified
	// Version 0.9.9 - Adding localeDateFormat variable from https://stackoverflow.com/questions/16860257/how-to-detect-date-format-defined-by-browser
	// To test add "en-GB" at toLocaleDateString("en-GB") . It will become 'dd/mm/yyyy'
	var localeDateFormat = new Date(2013,11,31).toLocaleDateString().replace("31","dd").replace("12","mm").replace("2013","yyyy")
	if (options_obj.date_format != "Auto Detect")  // Version 0.9.9
		localeDateFormat = options_obj.date_format;
	
	// First we need to convert European style date dd/mm/yyyy to Javascript Date object style mm/dd/yyyy or yyyy/mm/dd
	// if (date_text.match(/\b\d{2}(to|-|—|–|&|and|\/|\\|,)\d{2}\b/)) { // if at least match dd/mm 
	if (date_text.match(/\b\d{1,2}(\.|-|—|–|&|\/|\\|,)\d{1,2}\b/)) { // Verison 0.9.9 - Removed to|and and added . and change {2} to {1,2}
		//var parts = date_text.split(/(to|-|—|–|&|and|\/|\\|,)/); // split by . - / , or space // Version 0.9.9 - Removed. This was putting the delimiter in the parts array automatically because of having () capture group. So none of this date reversal was ever working!
		var parts = date_text.split(/\.|-|—|–|&|\/|\\|,/); // split by . - / , // Version 0.9.9
		if (parts[0].length < 3) { // Version 1.9.10 - Otherwise yyyy/mm/dd dates are reversed to dd/mm/yyyy
			if ((parseInt(parts[0]) > 12 || localeDateFormat.charAt(0) == "d") // if first part of date is larger than December // Version 0.9.9 - Or localeDateFormat == 'dd/mm/yyyy'
				&& parseInt(parts[1]) <= 12  // Version 0.9.9 - Added && for if 11/nn is smaller than 12
			) 
				date_text = parts.reverse().join("/"); // 15/11 to 11/15 or 15/11/2019 to 2019/11/15
			else if ((parts[0].charAt(0) == '0' || parts[1].charAt(0) == '0') // if either month or day has a leading zero then it is probably dd/mm 
				&& parseInt(parts[1]) <= 12 // Version 0.9.3 - Added && for if 11/nn is smaller than 12 // Version 0.9.9 - From parseInt(parts[1] <= 12)) to parseInt(parts[1]) <= 12)
				&& !localeDateFormat.match(/^(y|m)/) // Version 0.9.9 - Added && !localeDateFormat.match(/^(y|m)/) to not reverse American or Japanese dates in case some Americans add leading zeros
			)
				date_text = parts.reverse().join("/"); // 07/05 to 05/07 or 07/05/2019 to 2019/05/07
		}
		else // Verison 1.9.10 - if date is yyyy-mm-dd
			date_text = parts.join("/"); // Convert - to / because new Date("yyyy-mm-dd") is one day early
	}
	if (test_mode) console.log(date_text);
	var date = new Date(date_text);
	var date_year = (new Date(date_text)).getFullYear(); // Chrome will also put 2001 if they did not include a year with the date
	
	if (wrong_year == date_year) { // if both years are 2001
		//var date = (new Date(date_text + ", " + this_year)); // Add this_year to the date_text
		date.setFullYear(this_year); // Add this_year to the date_text
		if (date < today) {
			var today_utc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
			var date_utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
			var diffDays = Math.floor((today_utc - date_utc) / _MS_PER_DAY);
			if (diffDays > 30) // They are probably not putting something in their calendar for this year
				//date = (new Date(date_text + ", " + next_year)); // So add next_year to the date_text
				date.setFullYear(next_year); // So add next_year to the date_text
		} 	
	}
	//else // the year must have been included in the date text
	//	var date = (new Date(date_text)); // So just create a date object from the date text
	
	if (isNaN(date)) // Invalid date
		return (false);
	
	// Now make the dates display uniformly
	//var display_date = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear(); // 5/5/2019
	var display_date = date.getFullYear() + "-" + pad(date.getMonth()+1) + "-" + pad(date.getDate()); // 2019-08-16
	//var display_date = date.toISOString().split("T")[0]; // 2019-08-16T07:00:00.000Z to 2019-08-16
	return (display_date);
}

function start_all() {
	// if we haven't got chrome.storage yet then call this function later
	if (!storage_ready)
	{
		setTimeout(function()
		{
			start_all();
		} , 200);
		return;
	} 
	
	setup_forms();
	//get_products();
	//get_purchases();
	update_title();
		
}

window.onload = start_all;



