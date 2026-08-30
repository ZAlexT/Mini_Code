var uri = window.location.href; // www.seabreezecomputers.com/speech
var still_saving = false; // Needed for save_to_storage otherwise if called twice in a row we get the previous object before it is saved with local.set
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var storage_ready = false;
var options_obj = { 
	highlight_event_info : false,
	date_format: "Auto Detect",
	detect_event_timezones: false,
};

function get_from_storage(top_key)
{
	chrome.storage.local.get(top_key, function(obj)
	{
	 	//if (typeof obj[top_key] == "undefined") return; // key does not exist so return
	 	// or we could do
	 	//if (obj.hasOwnProperty(top_key) == false) return; // key does not exist so return
	 
	    if (test_mode) console.log(JSON.stringify(obj));
	    
	    /*if (obj[uri].hasOwnProperty("font_times"))
	    	change_fontsize(parseFloat(obj[uri]["font_times"])); // turn into number
	    if (obj[uri].hasOwnProperty("color"))
	    	change_fontcolor("color", obj[uri]["color"]);
	    if (obj[uri].hasOwnProperty("background-color"))
	    	change_fontcolor("background-color", obj[uri]["background-color"]);
	    if (obj[uri].hasOwnProperty("font-family"))
	    	change_fontfamily(obj[uri]["font-family"]); 
	    */	
	    // Merge with settings object
		mergeObject(options_obj, obj); 
		storage_ready = true; 
	    	 	   
	});
} // end function get_from_storage()


function save_to_storage(obj)
{		
	// Save to chrome.storage
	chrome.storage.local.set(obj, function() 
	{
	  	still_saving = false;
		if (test_mode) console.log("Saved to storage: "+JSON.stringify(obj));
	  	
		if(chrome.runtime.lastError)
	    {
	        console.log(chrome.runtime.lastError.message);
	        return;
	    } 
	});
} // end function save_to_storage(option_obj)


/* mergeObject(old_object, new_object) */
function mergeObject (o, ob) 
{
    for (var z in ob) 
	{ 
	  	if (ob.hasOwnProperty(z)) 
		{ 
			if (o[z] && typeof o[z] == 'object' && typeof ob[z] == 'object') 
				o[z] = mergeObject(o[z], ob[z]); 
			else 
				o[z] = ob[z]; 
		} 
	}	
    return o;
} // end function mergeObject (o, ob) 


chrome.storage.onChanged.addListener(function(changes, namespace) {
	// The namespace is "sync", "local" or "managed"
	if (test_mode) console.log("Changes to storage: "+JSON.stringify(changes));
	for (key in changes) {
		var storageChange = changes[key];
 	 	/*console.log('Storage key "%s" in namespace "%s" changed. ' +
	              'Old value was "%s", new value is "%s".',
	              key,
	              namespace,
	              storageChange.oldValue,
	              storageChange.newValue); */
	    options_obj[key] = changes[key].newValue;
	    //if (test_mode) console.log("sra object: "+JSON.stringify(sra));
		// When deleted: Storage key "toggle" in namespace "local" changed. Old value was "Object", new value is "undefined".
		// When created: Storage key "toggle" in namespace "local" changed. Old value was "undefined", new value is "Object".
		/* NOTE: A new cookie only has newValue and no oldValue property
			NOTE: A deleted cookie only has an oldValue and no newValue propery */
	}
	if (typeof processObject === "function") processObject(changes);
});	


//window.onload = get_from_storage;	
if (window.self === window.top) // Only load in top window not iframes - Version 1.2.5
{
	//get_from_storage();
	
}

get_from_storage(null);
