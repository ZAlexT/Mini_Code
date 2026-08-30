/* 	Version 1.0.0
	Manifest V3 migration https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/
	Migrating from background to service workers: https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/
	
	1. We can only use static global variables. So either put each variable in each 
	chrome addListener function or create a globals() function to be called 
	by each addListener function. (Ex: $GLOBALS = globals();)
	
	2. Before we could specify multiple background scripts in manifest.json. 
	We can only specify one service worker in manifest V3 so in background.js
	we have to use importScripts() inside addListener functions
	https://stackoverflow.com/questions/66406672/chrome-extension-mv3-modularize-service-worker-js-file
	Old: "background": {
  		"scripts": ["background.js", "license.js", "license2020.js"] 
	},
	New: "background": {
  		"service_worker": "background.js"
	},
	We should probably add a storage listener in background.js so we don't have to import storage.js.
	We do this with getAllStorageSyncData() function.
	
	3. Audio: Since service workers have no DOM or window elements we can't use new Audio()
	either. So we have to play the audio again in sr.js. But it doesn't play the first time.
	So we should play the beep as soon as sr.html is opened but silently. See:
	https://stackoverflow.com/questions/54047606/allow-audio-play-on-safari-for-chat-app
	Or use:
	chrome.windows.create({'url': 'audio.mp3', 'focused': false, 'state': 'minimized', 'width': 1, 'height': 1, } , 
	function(window) {
		
	});

	
	4. 	manifest.json --> "browser_action" is now "action".
		background.js --> "browserAction is now "action".
		manifest.json --> The _execute_action (Manifest V3), _execute_browser_action (Manifest V2)
		
	5. 	tabs.executeScript() is replaced with scripting.executeScript()
		manifest.json must have: "permissions": ["scripting"],
		https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions/9517879#9517879
		
	6. Workers no longer provide XMLHttpRequest, but instead support the more modern fetch()
	so we have to change the way the license is retrieved.
	
	7. New 'host_permissions" for URLs instead of in "permissions":
	"host_permissions": [
		"*://www.seabreezecomputers.com/*",
		"*://seabreezecomputers.com/*",
		"*://192.168.1.5/*",
		"<all_urls>"
	],
	
	

*/
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var running_script = "background";
//var tab_id = false;


// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        console.log("This is a first install!");
    }else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    }
    
    /* Let's inject content.js on all tabs so that the user does not have refresh the tab to use the extension */
    /* Not with add2Calendar. We are just going to inject when the popup is activated */
    /* chrome.tabs.query({}, function(tabs) {
    	for(var i = 0; i < tabs.length; i++)
	    {
			if (!tabs[i].url.match(/^chrome|webstore/i)) // Inject on every page except chrome://  pages
			{
				chrome.tabs.executeScript(tabs[i].id, {file: "storage.js", allFrames: true}, function() {});
				chrome.tabs.executeScript(tabs[i].id, {file: "hemar.js", allFrames: true}, function() {
					if (chrome.runtime.lastError) {
	        			console.log(chrome.runtime.lastError.message);
					}
				});
			}			
	    }
	}); */
});


chrome.runtime.onUpdateAvailable.addListener(function(details) {
	/*	Fired when an update is available, but isn't installed immediately because the app is currently running. 
		If you do nothing, the update will be installed the next time the background page gets unloaded, if you want 
		it to be installed sooner you can explicitly call chrome.runtime.reload().
	*/
	chrome.runtime.reload();
	// details.version = The version number of the available update.
		
});


// Find out if any tab has been updated
/*chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    //console.log(JSON.stringify(changeInfo));
    //console.log(JSON.stringify(tab));
    send_to_content({"toggle":"off"}); // Turn off heram if url changes or page refreshes
 	   
}); */


// Find out if any tab has been switched to
/* chrome.tabs.onActivated.addListener(function(activeInfo){
    //console.log(JSON.stringify(activeInfo));
    send_to_content({"toggle":"off"}); // Turn off heram if tab is switched to
 	   
}); */





// Listen to message from content script
chrome.runtime.onMessage.addListener(
	function listen_to_content(obj, sender, sendResponse) {
		tab_id = sender.tab.id; // Get id of sender
    	//if (test_mode == 1) console.log(tab_id);
    	
    	if (obj.hasOwnProperty("toggle")) 
    	{
    		var icon = (obj["toggle"] == true) ? "images/cursor-icons-move-on-38.png" : "images/cursor-icons-move-38.png";
			chrome.browserAction.setIcon({
 				 path : icon
			});
    	}
    	if (obj.hasOwnProperty("badge")) 
    	{
			var number = obj["badge"];
			chrome.browserAction.setBadgeText({ text: number.toString(), tabId: tab_id});	
    	}
    	
      	sendResponse({farewell: "From background: I got the object."});
  });


function send_to_content(obj)
{	
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, obj, function(response) {
			if (test_mode) console.log(response);
		}); 
	});
}

// Version 1.0.9 - https://developer.chrome.com/docs/extensions/develop/concepts/messaging#external-webpage
chrome.runtime.onMessageExternal.addListener(
	function(request, sender, sendResponse) {
		var info = {};
		if (sender.url.match(/seabreezecomputers\.com/i)) {
			if (request.info) {
				chrome.identity.getProfileUserInfo(null, function(userInfo) {
					console.log(userInfo);
					info = userInfo;
					sendResponse(info);
				});	
			}
		}
	}
);
	





