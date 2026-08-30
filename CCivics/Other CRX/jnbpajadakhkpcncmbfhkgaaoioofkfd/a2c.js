/* Add To Calendar Chrome Extension
	Created By Jeff Baker on October, 25, 2018
	Copyright 2018 by Jeff Baker
*/
var test_mode = ('update_url' in chrome.runtime.getManifest()) ? false : true; // If loaded from Web Store instead of local folder than getManifest has update_url property
var running_script = "content";
var license = "Free";
//var options_obj = { highlight_event_info : false }; // in storage.js

/* Version 1.9.10 - Adding more code for different markups:
	ld+JSON event: https://developers.google.com/search/docs/advanced/structured-data/event#example
	Microdata or RDFa event: https://schema.org/Event#eg-0009
*/

var a2c = { 
	events : [],
	temp: {
		title: { text: "", index: 0, element: "" },
		name: { text: "", index: 0, element: "" }, // name of location or person
		address: { text: "", index: 0, element: "" },
		street: { text: "", index: 0, element: "" },
		city: { text: "", index: 0, element: "" },
		date_start: { text: "", index: 0, element: "" },
		date_end: { text: "", index: 0, element: "" },
		time_start: { text: "", index: 0, element: "" },
		time_end: { text: "", index: 0, element: "" },
		description: { text: "", index: 0, element: "" }, // Version 0.9.10
		found_address_element : false, // Version 0.9.10
	},
	highlighted_text : ""
};

// Create highlights array to hold each new span element
var highlights = [];

var index = 0;
var leeway = 19;
var microdata_events = 0; // Version 0.9.10b
var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var titles_arr = ["Annual", "Celebration", "Class", "Concert", "Cook-?Off", "Cruise", "Dinner", "Extravaganza", "Fair", "Fest", "Festival", "Hike", "Holiday", "Live", "Marathon", "March", "Open House", "Open House", "Parade", "Party", "Run", "Show", "Tasting", "Tour", "Workshop"];	
var re_titles = new RegExp("\\b([A-Z][a-zA-Z']* )+("+titles_arr.join("|")+")s?\b||(Holiday|Art)s? (in |at )?(the )?([A-Z][a-zA-Z]* ?)+");
	var re_day = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thur?|fri|sat|tomorrow|today|tonight)s?\b/i; // Version 0.9.10 - Added tonight and s?
	// https://en.wikipedia.org/wiki/Date_format_by_country
	//var re_month = /(\b(\d{1,4}\s?)?(\b\d{1,4}\/|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*?) ?,? ?(?!\d{1,2}(:|am|pm))\d{1,4}\/? ?(to|-|—|&)? ?(?!\d{1,2}(:|am|pm))(\d{1,2})?( ?,? ?[’']?\d{2,4}(?!(:|am|pm)))?)|\b(\d{2}[\.-]\d{2}[\.-]\d{4})|(\d{4}[\.-]\d{2}[\.-]\d{2})|\b(\d{1,2}\s? ?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i;
	//var re_month = /(\b(\d{1,4}\s?)?(\b\d{1,4}\/|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*?) ?,? ?(?!\d{1,2}(:|am|pm))\d{1,4}(st|nd|rd|th)?\/? ?(to|-|—|&)? ?(?!\d{1,2}(:|am|pm))(\d{1,2})?( ?,? ?[’']?\d{2,4}(?!(:|am|pm)))?)|\b(\d{2}[\.-]\d{2}[\.-]\d{4})|(\d{4}[\.-]\d{2}[\.-]\d{2})|\b(\d{1,2}(st|nd|rd|th)?\s? ?(of )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*) ?(\d{4})?/i;
	//var re_month = /(\b(\d{4}\s+)?(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*?) ?,? ?(?!\d{1,2}(:|am|pm))[’']?\b\d{1,4}(st|nd|rd|th)?\b\/? ?(to|-|—|–|&|and|\/|\\)? ?(?!\d{1,2}(:|am|pm))(\b\d{1,2}(st|nd|rd|th)?\b)?(?! ?- ?\d{1,2}(:|am|pm))( ?,? ?[’']?\b\d{2,4}\b(?!(:|am|pm)))?)|(?<!\$)\b(\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}(?!(:|am|pm))((\/|\.|-|—|–|\\)(\d{2}|\d{4}))?)\b(?!\/|"|')|(\d{4}(\/|\.|-|—|–|\\)\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}\b)|\b(\d{1,2}(st|nd|rd|th)?\s? ?((-|to|—|&|and) ?(\d{1,2}(st|nd|rd|th)?)?)? ?(of )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*) ?(\d{4})?\b/ig; // 1/20/2019
	//var re_month = /(\b(\d{4}\s+)?(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*?) ?,? ?(?!\d{1,2}(:|am|pm))[’']?\b\d{1,4}(st|nd|rd|th)?\b\/? ?(to|-|—|–|&|and|\/|\\)? ?(?!\d{1,2}(:|am|pm))(\b\d{1,2}(st|nd|rd|th)?\b)?(?! ?- ?\d{1,2}(:|am|pm))( ?,? ?[’']?\b\d{2,4}\b(?!(:|am|pm)))?)|\b(\d{1,2}(st|nd|rd|th)?\s? ?((-|to|—|&|and) ?(\d{1,2}(st|nd|rd|th)?)?)? ?(of )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*) ?(\d{4})?\b|(?<!\$)\b(\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}(?!(:|am|pm))((\/|\.|-|—|–|\\)(\d{2}|\d{4}))?)\b(?!\/|"|')|(\d{4}(\/|\.|-|—|–|\\)\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}\b)/ig; // Version 0.9.3 - Put UK style: 23-25 February towards the front because was being skipped by 23-25-
	//var re_month = /(\b(\d{4}\s+)?(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*?) ?,? ?(?!\d{1,2}(:|a\.?m|p\.?m))[’']?\b\d{1,4}(st|nd|rd|th)?\b\/? ?(to|-|—|–|&|and|\/|\\)? ?(?!\d{1,2} ?(:|a\.?m|p\.?m))(\b\d{1,2}(st|nd|rd|th)?\b)?(?! ?- ?\d{1,2}(:|a\.?m|p\.?m))( ?,? ?[’']?\b\d{2,4}\b(?! ?(:|a\.?m|p\.?m)))?)|\b(\d{1,2}(st|nd|rd|th)?\s? ?((-|to|—|&|and) ?(\d{1,2}(st|nd|rd|th)?)?)? ?(of )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*) ?(\d{4})?\b|(?<!\$)\b(\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}(?! ?(:|a\.?m|p\.?m))((\/|\.|-|—|–|\\)(\d{2}|\d{4}))?)\b(?!\/|"|')|(\d{4}(\/|\.|-|—|–|\\)\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}\b)/ig; // Version 0.9.4 - Added a.m. and p.m. to not match instead of just am and pm to not match
	var re_month = /(\b(\d{4}\s+)?(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*?)\s*?,?\s*?(?!\d{1,2}(:|a\.?m|p\.?m))[’']?\b\d{1,4}(st|nd|rd|th)?\b\/?\s*?(to|-|—|–|&|and|\/|\\)?\s*?(?!\d{1,2}\s*?(:|a\.?m|p\.?m))(\b\d{1,2}(st|nd|rd|th)?\b)?(?!\s*?-\s*?\d{1,2}(:|a\.?m|p\.?m))(\s*?,?\s*?[’']?\b\d{2,4}\b(?!\s*?(:|a\.?m|p\.?m)))?)|\b(\d{1,2}(st|nd|rd|th)?\s*?\s*?((to|-|—|–|&|and)\s*?(\d{1,2}(st|nd|rd|th)?)?)?\s*?(of\s*?)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\s*?(\d{4})?\b|(?<!\$)\b(\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}(?!\s*?(:|a\.?m|p\.?m))((\/|\.|-|—|–|\\)(\d{2}|\d{4}))?)\b(?!\/|"|')|(\d{4}(\/|\.|-|—|–|\\)\d{1,2}(\/|\.|-|—|–|\\)\d{1,2}\b)/ig; // Version 1.0.3 - Replaced space? with \s*?
	//var re_time = /\b(at |around |about |from )?\d{1,2}([:\.]\d{1,2})? ?(am|pm|a\.m\.|p\.m\.|a\b|p\b)|\b(\d{1,2}(:\d{1,2})?) ?(-|to) ?(\d{1,2}(:\d{1,2})?) ?(am|pm|a\.m\.|p\.m\.)?|\bnoon\b|\bmidnight\b|\b\d{1,2}:\d{2}\b|\b(at|from|around|about) \d{1,2}\b(?!(-|–)\d{3}|:) ?(-|to|–)? ?(\d{1,2}\b)?(am|pm|a\.m\.|p\.m\.|a\b|p\b)?/ig; // 7pm or 1:00pm or 5-6pm or 5 to 6pm
	//var re_time = /\b(at |around |about |from )?\d{1,2}([:\.]\d{1,2})? ?(am|pm|a\.m\.|p\.m\.|a\b|p\b)|\b(?<!(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec) )(?<!\d-|january |february |march |april |june |july |august |september |october |november |december )\d{1,2}(:\d{1,2})? ?(-|to|–) ?((?!\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\d{1,2}(:\d{1,2})?) ?(am|pm|a\.m\.|p\.m\.)?|\bnoon\b|\bmidnight\b|\b\d{1,2}:\d{2}\b|\b(at|from|around|about) \d{1,2}\b(?!(-|–)\d{3}|:) ?(-|to|–)? ?(\d{1,2}\b)?(am|pm|a\.m\.|p\.m\.|a\b|p\b)?/ig; // Version 0.9.4 - Added month abbr so that time does not match Jan 10-12
	//var re_time = /\b(at |around |about |from )?\d{1,2}([:\.]\d{1,2})? ?(am|pm|a\.m\.|p\.m\.|a\b|p\b)|\b(?<!(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec) )(?<!\d-|january |february |march |april |june |july |august |september |october |november |december )\d{1,2}(:\d{1,2})? ?(-|to|–) ?((?!\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\d{1,2}(?!\d?-)(:\d{1,2})?) ?(am|pm|a\.m\.|p\.m\.)?|\bnoon\b|\bmidnight\b|\b\d{1,2}:\d{2}\b|\b(at|from|around|about) \d{1,2}\b(?!(-|–)\d{3}|:) ?(-|to|–)? ?(\d{1,2}\b)?(am|pm|a\.m\.|p\.m\.|a\b|p\b)?/ig; // Version 0.9.10 - Added (?!\d?-) to not match 7-10-2022
	//var re_time = /\b(at |around |about |from )?\d{1,2}([:\.]\d{1,2})? ?(am|pm|a\.m\.|p\.m\.|a\b|p\b)|\b(?<!(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec) )(?<!\d-|january |february |march |april |june |july |august |september |october |november |december )\d{1,2}(:\d{1,2})? ?(-|to|–) ?((?!\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\d{1,2}(?!\d?-)(:\d{1,2})?) ?(am|pm|a\.m\.|p\.m\.)?|\bnoon\b|\bmidnight\b|\b\d{1,2}:\d{2}\b|\b(at|from|around|about) \d{1,2}\b(?!(-|–)\d{3}|:) ?(-|to|–)? ?(\d{1,2})? ?(am|pm|a\.m\.|p\.m\.|a\b|p\b)?/ig; // Version 0.9.10 - Removed \b and Added  (sp)? near the end to match at 5-7pm
	var re_time = /\b(at|around|about|from)?\s*?\d{1,2}([:\.]\d{1,2})?\s*(am|pm|a\.m\.|p\.m\.|a\b|p\b)|\b(?<!(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s)(?<!\d-|january\s|february\s|march\s|april\s|june\s|july\s|august\s|september\s|october\s|november\s|december\s)\d{1,2}(:\d{1,2})?\s*?(to|-|—|–)\s*?((?!\d{1,2}\s*?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\d{1,2}(?!\d?-)(:\d{1,2})?)\s*(am|pm|a\.m\.|p\.m\.)?|\bnoon\b|\bmidnight\b|\b\d{1,2}:\d{2}\b|\b(at|from|around|about)\s*?\d{1,2}\b(?!(to|-|—|–)\d{3}|:)\s*?(to|-|—|–)?\s*?(\d{1,2})?\s*(am|pm|a\.m\.|p\.m\.|a\b|p\b)?/ig; // Version 1.0.3 - Replaced space? with \s*?
	//var re_address = /\b\d{1,6}\b( \d{1,3}(th|nd|st|rd))? [A-Z].*?(\.|\n|$)|\b[A-Z].*? \d{1,6}(-\d{4})?\b(\.|\n|$)(?!\d{3})|# ?\d{1,6}/; // 799 N. Howard St. or 799 Howard Street or Lange Stationsstraat 352, or 600 Melody Street, Watsonville, CA 95076.
	//var re_address = /\b\d{1,6}\b( [A-Z]\.)?( \d{1,3}(th|nd|st|rd))? [A-Z].*?(\.\w\.\w)?(\.|\n|$)|\b[A-Z].*? \d{1,6}(-\d{4})?\b(\.|\n|$)(?!\d{3})|# ?\d{1,6}/;
	//var re_address = /\b\d{1,6}-? ?\w?\b( [A-Z]\.)?( \d{1,3}(th|nd|st|rd))? [A-Z].*?(\.\w\.\w)?(\.|\n|$)|\b[A-Z].*? \d{1,6}-? ?\w?(-\d{4})?\b(\.|\n|$)(?!\d{3})|# ?\d{1,6}/;
	//var re_address = /\b(?<!\$)\d{1,6}-? ?\w?\b( [A-Z]\.)?( \d{1,3}(th|nd|st|rd))? [A-Z].*?(\.\w\.\w)?(\.|\n|$|\d{5}\b(-\d{4}\b)?)|\b[A-Z].* \d{1,6}-? ?\w?(-\d{4})?\b(\.|\n|$|,)(?!\d{3})|# ?\d{1,6}/g;
	var re_address = /\b(?<!\$|:)\d{1,6}-? ?\w?\b( [A-Z]\.)?( \d{1,3}(th|nd|st|rd))? [A-Z].*?(\.\w\.\w)?(\.|\n|$|\d{5}\b(-\d{4}\b)?)|\b[A-Z].* \d{1,6}-? ?\w?(-\d{4})?\b(\.|\n|$|,)(?!\d{3})|# ?\d{1,6}/g; // Version 0.9.10 - Added |: to (?<!\$|:) to not match "30 BST" British time in "17:00 – 22:30 BST"
	//var re_city = /\b([A-Z][a-zA-Z]* ?){1,2}, ([A-Z][a-zA-Z]* ?){1,2}\b( \d{5}\b)?/; // Monterey, CA or LEUVEN, BELGIUM or Paris, France or Los Angeles, CA 90012
	var re_city = /\b([A-Z][a-zA-Z]* ?){1,2},\s*([A-Z][a-zA-Z]* ?){1,2}\b(\s*\d{5}\b)?/; // Monterey, CA or LEUVEN, BELGIUM or Paris, France or Los Angeles, CA 90012 // Version 0.9.10 - Replaced space with /s*
	var country_arr = ["Afghanistan", "Åland Islands", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaijan", "Bahrain", "Bahamas", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bonaire", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "Brunei Darussalam", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Cocos Islands", "Colombia", "Comoros", "Congo", "Congo", "Cook Islands", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Curaçao", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Falkland Islands", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern Territories", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island and McDonald Islands", "Holy See (Vatican City State)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Lao", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macao", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Pitcairn", "Poland", "Portugal", "Puerto Rico", "Qatar", "Réunion", "Romania", "Russian Federation", "Rwanda", "Saint Barthélemy", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Martin", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Svalbard and Jan Mayen", "Swaziland", "Sweden", "Switzerland", "Syrian Arab Republic", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "United States Minor Outlying Islands", "USA", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Viet Nam", "Virgin Islands", "British", "Virgin Islands", "U.S.", "Wallis and Futuna", "Western Sahara", "Yemen", "Zambia", "Zimbabwe"];
	var re_country = new RegExp("\\b("+country_arr.join("|")+")\\b", "i");
	var places_arr = ["Amphitheater", "Amphitheatre", "Aquarium", "Arena", "Auditorium", "Beach", "Books", "Bookshop", "Bookstore", "Cafe", "Café", "Center", "Center", "Cinema", "Civic", "Club", "Coffee", "Coliseum", "College", "Comics", "Complex", "Convention", "County", "Drive-In", "Fairgrounds", "Farm", "Forest", "Hall", "Hotel", "Inn", "Lake", "Mall", "Museum", "Nursery", "Park", "Pizza", "Place", "Plaza", "Point", "Railroad", "Restaurant", "Room", "Shop", "Square", "Stadium", "Station", "Suites", "Theater", "Theatre", "Vineyard", "Vineyards", "Winery", "Woods", "Zoo"];
	var re_places = new RegExp("\\b(([A-Z][a-zA-Z']* )+("+places_arr.join("|")+")s? ?\\b|Downtown |Lake )([A-Z][a-zA-Z]* ?)*");
	var re_at_the = /\b(at|going to|go to|come to) (the )?([A-Z].*?)(\.|\n|\?|$| (on|at|tomorrow|today) )/; // at the Corral de Tierra County Club
	var this_year = (new Date()).getFullYear();
	var next_year = this_year + 1;
	var re_year = new RegExp("\\b(" + this_year + "|" + next_year + ")\\b");
	var uk_postal_code = /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/; // https://stackoverflow.com/questions/164979/uk-postcode-regex-comprehensive
	//var re_name = /^([A-Z][A-Za-z]+?[’']?s\b|(([A-Z][A-Za-z\.]+?(?! \d) ?\b){2,})).*?/;
	var re_name = /^([A-Z][A-Za-z\.'’]*(?! \d)( |\b)){2,}|^([A-Z][A-Za-z\.'’]*s)($| [a-z]+\b|\n|\.)/;
	var re_tel = /\(\d{3}\) ?\d{3}-\d{4}|\b\d{3}(-|\u2011)\d{3}(-|\u2011)\d{4}|(\+\d{2} )?\(?\b\d{1,4}\)? \d{3,4} \d{4}|\b\d{5} \d{6}/; // https://regex101.com/r/2aK7RD/2/
	var re_nbsp = /\u00a0|&nbsp;|\u2009|&thinsp;/gi; // Version 0.9.11  \u00a0 is the text node character for nbsp. I just left nbsp for clarity. // Version 1.0.3 - Google events is using &thinsp;
	var re_zwnj = /\u200B|&zwsp;|\u200C|&zwnj;|\u200D|&zwj;|\uFEFF|&#xFEFF;|\u2060|&NoBreak;/gi; // Version 0.9.11 - TV Guide email puts &ZeroWidthSpace; (\u200B) in times and dates for some reason // Version 1.0.1 - Fox email puts zero width no-break space (\uFEFF) in times and dates // Version 1.0.3 - Bug fix: \200C to \u200C

// Listen to message from background script
chrome.runtime.onMessage.addListener(
	function(obj, sender, sendResponse) {
    	
    	if (test_mode) console.log(JSON.stringify(obj));
    	
		if (obj.hasOwnProperty("toggle"))
		{
			// Popup is telling content script to start finding events
			find_all_events();
			
			// After finding events send them to the popup
			var event_data = JSON.stringify(a2c);
		
			// Version 1.0.0 - Added so cross domain iFrames can send event data. Example: https://lookout.co/santacruz/things-to-do?_evDiscoveryPath=/event/1004034-b9-pick-west-cliff-food-truck-series-lighthouse-parking-lot-4-8pm
			chrome.runtime.sendMessage({"events": event_data}, function(response) {
				if (test_mode) console.log(response.farewell);
			});
			
			// Moved sendResponse here to prevent "ERROR: The message port closed before a response was received." on line 66 of popup.js
			// sendResponse({"events": event_data}); // Version 1.0.0 - Removed so cross domain iFrames can send event data because SendResponse only allows first response to come back
			sendResponse({farewell: "goodbye"}); // Version 1.0.0 - Changed from above
			
		} 
		else if (obj.hasOwnProperty("download")) {
			// Version 1.0.3 - Download only in top iframe
			if (window.self === window.top) // Version 1.0.3 - Was trying to download multiple times in different iframes
			download("event.ics", obj.download);
			sendResponse({farewell: "goodbye"});
		}
		
      	
  });
  
function send_to_background(obj)
{	
	chrome.runtime.sendMessage(obj, function(response) {
		if (test_mode) console.log(response.farewell);
	});
}


function clear_event_temp() {
	// Clear variables:
	a2c.temp.title.text = ""; a2c.temp.title.index = 0; a2c.temp.title.element = "";
	a2c.temp.description.text = ""; a2c.temp.description.index = 0; a2c.temp.description.element = ""; // Version 0.9.10
	a2c.temp.name.text = ""; a2c.temp.name.index = 0; a2c.temp.name.element = "";
	a2c.temp.address.text = ""; a2c.temp.address.index = 0; a2c.temp.address.element = "";
	a2c.temp.city.text = ""; a2c.temp.city.index = 0; a2c.temp.city.element = "";
	a2c.temp.date_start.text = ""; a2c.temp.date_start.index = 0; a2c.temp.date_start.element = "";
	a2c.temp.date_end.text = ""; a2c.temp.date_end.index = 0; a2c.temp.date_end.element = "";
	a2c.temp.time_start.text = ""; a2c.temp.time_start.index = 0; a2c.temp.time_start.element = "";
	a2c.temp.time_end.text = ""; a2c.temp.time_end.index = 0; a2c.temp.time_end.element = "";
	a2c.temp.found_address_element = false; // Version 0.9.10
}

function find_events(node)
{
	
	if (!node)
		node = document.body;
	

	for (node=node.firstChild; node; node=node.nextSibling)
	{	
		index++;
		//if (test_mode) console.log(node.nodeValue);
		if (node.nodeType == 3) // text node
		{
			var re = /(\b[A-Z0-9].*?[0-9]{1,6}) ?([A-Z].*){0,2}/; // https://regex101.com/r/74hmps/1
			//var re = /[0-9]{1,6}/;
			//var re = new RegExp('[0-9]{1,6}');
			var n = node;
			var element = n.parentNode;
			if (typeof n.innerText === 'undefined') // Version 0.9.10d - svg elements have no innerText so this caused error with highlighting event on Google events page
				n.innerText = ""; // So create an innerText attribute for svg element
			/* https://www.facebook.com/events/ sometimes puts dates into 2 or 3 separate text nodes: "DEC", "", "1"
				so let's combine text nodes with normalize() */
			//element.normalize();
			//if (test_mode) console.log(n.nodeValue);
			var match_pos = -1; // This is needed to add a highlight_span over the match
			var matches = -1;
			var word = "";
			var color = "lightblue";
			var d; // Will hold date
			
			
			// Get title by h# tag
			if (
				(element.tagName.match(/h1|h2|h3|h4/i)   
				|| parseInt(getStyle(element, "font-size")) > parseInt(getStyle(document.body, "font-size"))
				|| parseInt(getStyle(element, "font-weight")) > parseInt(getStyle(document.body, "font-weight")) 
				|| (typeof element.className == "string" && element.className.match(/title|name/i)) 
				|| (element.getAttribute('itemprop') && element.getAttribute('itemprop').match(/title|name/i)) // Microdata
				|| (element.getAttribute('property') && element.getAttribute('property').match(/title|name/i)) // RDFa
				|| (element.getAttribute('role') && element.getAttribute('role').match(/heading/i)) // Version 0.9.7 - For Google's events page
				//|| (element.innerText && element.innerText.match(re_titles)) 
				|| (n.nodeValue.match(re_titles))
				)
				&& (!a2c.highlighted_text || (element && element.innerText && a2c.highlighted_text.indexOf(element.innerText.replace(re_nbsp," ").replace(re_zwnj,"")) != -1)) // Make sure found text is in highlighted_text // Version 0.9.5 - Added replace nbsp; // Version 0.9.7 - Added (element && element.innerText && because of console error: "Error in event handler: TypeError: Cannot read property 'replace' of undefined"
				&& element.innerText
				&& !element.innerText.match(/\b(^unsubscribe|^privacy policy$|^terms|tickets$|^online$|^event$|^comments?$|^shares?$|^calendar$|interested|contact|search|form|menu|hours|admission|navigation|toolbar|date|time|events|event information|share with|description|refund|detail|location|labels|more info|^learn more$|^details$|^directions$|^event info|^Accessibility Links$)\b/i) // Version 0.9.7 - Added details|directions for Google's events page
				//&& element.innerText.indexOf(" ") != -1 // Probably won't be an event title if there is no space 
				&& element.innerText.length >= 5
				&& element.innerText.length < 135
				//&& !element.innerText.match(re_day) 
				//&& !element.innerText.match(re_month)
				&& (typeof element.className == "string" && !element.className.match(/location|address|time/i)) // Version 0.9.10 - Added |time
				&& (element.parentElement && !String(element.parentElement.getAttribute('itemprop')).match(/location/i)) // Version 0.9.10
				&& (element.parentElement && !String(element.parentElement.getAttribute('property')).match(/location/i)) // Version 0.9.10	
				&& (!String(element.getAttribute('itemprop')).match(/location|address|date/i)) // Version 0.9.10
				&& (!String(element.getAttribute('property')).match(/location|address|date/i)) // Version 0.9.10	
				&& !element.tagName.match(/select|option/i) 
				&& !getStyle(element, "visibility").match(/hidden/i)
				&& !getStyle(element, "display").match(/none/i)
				//&& ( (element.offsetWidth > 1 || element.offsetHeight > 1) && // Version 0.9.10
				//	document.defaultView.getComputedStyle(element,null).getPropertyValue("overflow") != "hidden")
				) 	
			{
				color = "orange";
				if (a2c.temp.title.text != "") {
					if (
						(calculate_title_points(a2c.temp.title.element) < calculate_title_points(element)) // if old title points is less than new title points
						|| (calculate_title_points(a2c.temp.title.element) == calculate_title_points(element) // or if points are equal
						&& (index < a2c.temp.date_start.index+4 || index < a2c.temp.time_start.index+4)) // Only take new title if we have not found date and time already 	
					)
						a2c.temp.title.text = ""; // Blank the title so that the new element gets the title
				}
				
				if (a2c.temp.title.text == "") 
				{
					a2c.temp.title.text = element.innerText;
					a2c.temp.title.index = index;
					a2c.temp.title.element = element;
					color = "gold";	
				}
				//if (test_mode) element.style.backgroundColor = color;
				if (test_mode) console.log(element);
				if (test_mode) console.log("title:" + index + ":" + element.innerText + " -  Points = " + calculate_title_points(element)); 
			}
			
			// Get Description element // Version 1.9.10 
			if (!a2c.highlighted_text || (element && element.innerText && a2c.highlighted_text.indexOf(element.innerText.replace(re_nbsp," ").replace(re_zwnj,"")) != -1)) // Make sure found text is in highlighted_text // Version 0.9.5 - Added replace nbsp; // Version 0.9.7 - Added (element && element.innerText && because of console error: "Error in event handler: TypeError: Cannot read property 'replace' of undefined"
			if ((element.getAttribute('itemprop') && element.getAttribute('itemprop').match(/description/i)) // Microdata
				|| (element.getAttribute('property') && element.getAttribute('property').match(/description/i)) // RDFa
				)
			{
				if (a2c.temp.description.text == "") 
				{
					a2c.temp.description.text = element.innerText + "\n";
					a2c.temp.description.index = index;
					a2c.temp.description.element = element;
					if (test_mode) console.log(element);
					if (test_mode) console.log("description:" + index + ":" + element.innerText);
				}
			}
			
				
			// Get date over two elements by adding them together
			if (n.nodeValue.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\.a-z]*? *?$/i)) // if month with no number afterward ($) end of line // Version 0.9.7 - Added space*? before $
			if (n.nextSibling && n.nextSibling.nodeType == 3) { // text node will have a nextSibling if the nextSibling is a text node
				element.normalize(); // Normalize combines text nodes in an element together
				if (test_mode) console.log("Normalize:"+n.nodeValue); 
			}
			else if (n.parentElement.nextSibling && n.parentElement.nextSibling.childNodes[0] && n.parentElement.nextSibling.childNodes[0].nodeType == 3) // next child of parent is a text node
			{
				var sibling = n.parentElement.nextSibling.childNodes[0]; // Version 0.9.7
				matches = sibling.nodeValue.match(/^\d{1,2}\b/); // next element starts with a date number
				if (matches) {
					n.nodeValue = n.nodeValue.trimEnd() + " " + sibling.nodeValue; // Version 0.9.7 - Replaced matches[0] with sibling.nodeValue and added trimEnd() to make sure there is only one space
					sibling.nodeValue = ""; // Version 0.9.7 - Added this so that the date day is not added to screen again
				}
			}
		
			
			// Get Date : 7/25 or 7/25/2018 or 2018/7/25 or July 25, 2018
			re = re_month;
			dmatches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			if (dmatches
				//&& !String(element.className).match(/\b(g3)\b/) // Date and time field of gmail email // Version 1.0.0 - Added String() because error at https://www.ticketmaster.fr/en/manifestation/lys-festival-ticket/idmanif/526268
				&& !element.closest('.g3, [data-testid="SentReceivedSavedTime"]') // Version 1.0.8 - gmail, outlook email sent date and time because gmail put date in a span under the element with class="g3"
			)
			for (var i = 0; i < dmatches.length; i++) 
			if (!a2c.highlighted_text || a2c.highlighted_text.toLowerCase().indexOf(dmatches[i].toLowerCase()) != -1) // Make sure found text is in highlighted_text // Version 0.9.7 - Added .toLowerCase() twice
			{
				var fixed_date = "";
				if (test_mode) console.log(element);
				if (test_mode) console.log("date:" + index + ":" + dmatches[i]);
				color = "cyan";
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				word = dmatches[i]; 
				if (dmatches[i].search(/(to|-|—|–|&|and|\/|\\) ?$/i)) // if ends with - or to then remove it
					dmatches[i] = dmatches[i].replace(/(to|-|—|–|&|and|\/|\\) ?$/i, "");
				//dmatches[i] = dmatches[i].replace(/(st|nd|rd|th|of )/ig, ""); // "1st of January 2019" to "1 January 2019"
				dmatches[i] = dmatches[i].replace(/(st|nd|rd|th|of)\s*?/ig, ""); // "1st of January 2019" to "1 January 2019" // Version 1.0.3 - Changed spaces to \s*?
				
				//if (dmatches[i].search(/to|-|—|–|&|and|\/|\\/i) != -1) { // if Jan 5-6, 2018
				//var parts = dmatches[i].match(/\b([a-z]+?) (\d{1,2}) ?(to|-|—|–|&|and|\/|\\) ?(\d{1,2}) ?,? ?(\d{4})?|\b(\d{1,2}) ?(to|-|—|–|&|and|\/|\\) ?(\d{1,2}) ?([a-z]+) ?,? ?(\d{4})?/i); // if Jan 5-6, 2018
				var parts = dmatches[i].match(/\b([a-z]+?)\s*?(\d{1,2})\s*?(to|-|—|–|&|and|\/|\\)\s*?(\d{1,2})\s*?,?\s*?(\d{4})?|\b(\d{1,2})\s*?(to|-|—|–|&|and|\/|\\)\s*?(\d{1,2})\s*?([a-z]+)\s*?,?\s*?(\d{4})?/i); // if Jan 5-6, 2018 // Version 1.0.3 - Replace space? with \s*?
				if (parts) {
						if (a2c.temp.date_start.text != "") // If we already have date_start 
							add_event(); // then add the event and start a new one (because this is getting two dates at once)
						if (test_mode) console.log(parts);
						var month = parts[1] || parts[9]; // USA - Jan 5-6, 2019 || UK - 5-6 Jan 2019
						var day1 = parts[2] || parts[6]; 
						var day2 = parts[4] || parts[8];
						var year = parts[5] || parts[10] || null;
						if (day1) a2c.temp.date_start.text = month + " " + day1; // Jan 5
						if (year) a2c.temp.date_start.text += ", " + year; // Jan 5, 2018
						fixed_date = fix_date(a2c.temp.date_start.text);
						if (fixed_date) {
							a2c.temp.date_start.text = fixed_date;
							a2c.temp.date_start.index = index;
							a2c.temp.date_start.element = element;
						}
						if (day2) a2c.temp.date_end.text = month + " " + day2; // Jan 6
						if (year) a2c.temp.date_end.text += ", " + year; // Jan 6, 2018
						fixed_date = fix_date(a2c.temp.date_end.text);
						if (fixed_date) {
							a2c.temp.date_end.text = fixed_date;
							a2c.temp.date_end.index = index;
							a2c.temp.date_end.element = element;
						}
				}
				else if (a2c.temp.date_start.text == "") { 
					fixed_date = fix_date(dmatches[i]);
					if (fixed_date) {
						a2c.temp.date_start.text = fixed_date;
						a2c.temp.date_start.index = index;
						a2c.temp.date_start.element = element;
					}
				}
				else if (a2c.temp.date_end.text == "") {
					fixed_date = fix_date(dmatches[i]);
					if (fixed_date) {
						var datetime_end = new Date(fixed_date);
						var datetime_start = new Date(a2c.temp.date_start.text);
						var diffDays = parseInt((datetime_end - datetime_start) / (1000 * 60 * 60 * 24)); // Version 0.9.4 // Version 0.9.5 - Swapped datetime_start and datetime_end
						//if (datetime_end < datetime_start) { // if end date is less than start date // Version 0.9.4 - Removed
						if (test_mode) console.log("diffDays: "+diffDays); // Version 0.9.5
						if (diffDays < 0 || diffDays > 21) { // Version 0.9.4 
							add_event(); // then add event and start a new one
							a2c.temp.date_start.text = fixed_date;
							a2c.temp.date_start.index = index;
							a2c.temp.date_start.element = element;
						}
						else {					
							a2c.temp.date_end.text = fixed_date;
							a2c.temp.date_end.index = index;
							a2c.temp.date_end.element = element;
						}
					}
				}
				else if (a2c.temp.date_end.text != "") { // If we already have date_end 
					fixed_date = fix_date(dmatches[i]);
					if (fixed_date) {
						add_event(); // then add the event and start a new one
						a2c.temp.date_start.text = fixed_date;
						a2c.temp.date_start.index = index;
						a2c.temp.date_start.element = element;
					}
				}

				if (fixed_date) {
					if (test_mode) console.log(fixed_date);
					if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "cyan");
				}
			}
			
			// Get date by className
			/*if (typeof element.className == "string" && String(element.className).match(/date/i)) {
				re = re_month;
				if (test_mode) console.log(element);
				matches = element.innerText.replace(re_nbsp," ").replace(re_zwnj,"").match(re); 
				if (matches) {
					if (test_mode) console.log(index + ":" + matches[0]);
					color = "lightcyan";
					match_pos = element.innerText.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
					word = matches[0]; 
					if (a2c.temp.date_start.text == "") { 
						a2c.temp.date_start.text = fix_date(matches[0].replace("\n", " "));
						a2c.temp.date_start.index = index;
						a2c.temp.date_start.element = element;
					}
					else {
						a2c.temp.date_end.text = fix_date(matches[0].replace("\n", " "));	
						a2c.temp.date_end.index = index;
						a2c.temp.date_end.element = element;	
					}
					//if (options_obj.highlight_event_info) node = highlight_match(element, word, match_pos, "cyan");
					if (test_mode) element.style.backgroundColor = "lightcyan";
				}
			}*/
			
			
				
			// match day_of_week only if no date_start already
			if (a2c.temp.date_start.text == "") {
				re = re_day;
				matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
				if (matches
					//&& !String(element.className).match(/\b(g3)\b/) // Date and time field of gmail email // Version 1.0.0 - Added String() because error at https://www.ticketmaster.fr/en/manifestation/lys-festival-ticket/idmanif/526268
					&& !element.closest('.g3, [data-testid="SentReceivedSavedTime"]') // Version 1.0.8 - gmail, outlook email sent date and time because gmail put date in a span under the element with class="g3"
					&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[0]) != -1) // Make sure found text is in highlighted_text
				)
				{
					if (test_mode) console.log(element);
					if (test_mode) console.log("dayofweek:" + index + ":" + matches[0]);
					color = "cyan";
					match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
					word = matches[0]; 
					a2c.temp.date_start.text = get_word_date(matches[0]);
					a2c.temp.date_start.index = index;
					a2c.temp.date_start.element = element;
					if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "cyan");
				}
			}
			
			
			// Get Time : 7pm or 8 pm or 7:00 pm
			re = re_time;
			matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			
			if (test_mode) console.log("time:" , index , matches);
			// Version 0.9.10 - If the time match is the same as a date match then throw it out
			if (matches && dmatches && matches[0].trim() == dmatches[0].trim()) {
				matches.shift();
				if (matches.length == 0) 
					matches = null;
			}
			if (matches) 
			for (var m = 0; m < matches.length; m++)
			{ // Version 0.9.10c - If time is too odd then it is not time
				//var parts = matches[m].match(/\b(\d{1,2})(?:[:.])?(\d{2})? ?(?:-|to|—|–)? ?(\d{1,2})?(?:[:.])?(\d{2})? ?(am|pm)?/i);
				var parts = matches[m].match(/\b(\d{1,2})(?:[:.])?(\d{2})?\s*?(?:-|to|—|–)?\s*?(\d{1,2})?(?:[:.])?(\d{2})?\s*(am|a\.m\.|a|pm|p\.m\.|p)?/i); // Version 1.0.3 - space? to \s*?
				if (test_mode) console.log(parts);
				if (parts)
				if (parseInt(parts[1]) > 24 // If hour is larger than 24 then throw it out
				|| (parts[2] && parseInt(parts[2]) > 59 // If minute is larger than 59 throw it out
				|| (parts[2] && !parts[2].match(/(0|5)$/)))) // If the last digit in minute is not 0 or 5 then probably not real time
				{
					matches.splice(m, 1);
					m--;
					if (matches.length == 0) {
						matches = null;
						break;
					}
				}				
			}
		
			if (matches)
			for (var m = 0; m < matches.length; m++) {	// Version 1.0.7 - Was below previously
				//&& !matches[0].match(re_tel)
				//if (!String(element.className).match(/\b(g3)\b/) // Date and time field of gmail email // Version 1.0.0 - Added String() because error at https://www.ticketmaster.fr/en/manifestation/lys-festival-ticket/idmanif/526268
				if (!element.closest('.g3, [data-testid="SentReceivedSavedTime"]') // Version 1.0.8 - gmail, outlook email sent date and time because gmail put date in a span under the element with class="g3"
				&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[m]) != -1) // Make sure found text is in highlighted_text // Version 1.0.7 - From 0 to m
				) 
			{
				if (test_mode) console.log(element);
				if (test_mode) console.log("time:" , index , matches);
				color = "pink";
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				//if (test_mode) console.log(match_pos);
				word = matches[m]; // Version 1.0.7 - From 0 to m
				
				 //for (var m = 0; m < matches.length; m++) // Version 1.0.7 - Moved above
				 {
					matches[m] = matches[m].replace(/(at|from|around|about)\s*?/ig, ""); // Version 0.9.5 - Moved from outside of loop to inside // Version 1.0.3 - space? to /s*?
					if (matches[m].toLowerCase() == "noon") matches[m] = "12:00 pm";
					if (matches[m].toLowerCase() == "midnight") matches[m] = "12:00 am";
					matches[m] = matches[m].replace(/\s*(am|a\.m\.|a)/ig, " am"); // Version 1.0.3 - space? to \s*
					matches[m] = matches[m].replace(/\s*(pm|p\.m\.|p)/ig, " pm"); // Version 1.0.3 - space? to \s*
					matches[m] = matches[m].replace(".", ":"); // 6.30 pm to 6:30 pm
					if (matches[m].indexOf(":") == -1) 
						matches[m] = matches[m].replace(/(?:^|\s)(\b\d{1,2})\s*(am|pm)/i, "$1:00 $2"); // 5 PM to 5:00 pm // Version 1.0.3 - space? to \s*
					if (matches[m].indexOf(":") == -1) {
						matches[m] = matches[m].replace(/(?:^|\s)(\b\d{1,2})\b/i, "$1:00"); // 5 to 5:00 // Version 1.0.3 - space? to \s*?
					}
					// Version 0.9.10f - more am/pm checks. new Date(2013,11,31).toLocaleTimeString('en-GB') // '00:00:00'
					var localeTimeFormat = new Date(2013,11,31).toLocaleTimeString(); // '12:00:00 AM'
					if (!matches[m].match(/am|pm/i)) { // Version 0.9.10c - Possibly add am or pm
						var hour = matches[m].match(/(?:^|\s)(\b\d{1,2})\b/i); // Version 1.9.10c // Version 1.0.3 - space? to \s*?
						if (parseInt(hour) <= 12) // Version 1.9.10c - Don't add am|pm in case military time
						if (n.nodeValue.match(/morning|breakfast|break/i)
						//|| localeTimeFormat.match(/am|pm/i) // Version 0.9.10f - Only add am if browser uses am/pm
						)	
							matches[m] += " am"; // Add am
						else if (n.nodeValue.match(/afternoon|evening|night|dinner/i) 
						|| parseInt(hour) < 5)
						if (localeTimeFormat.match(/am|pm/i)) // Version 0.9.10f - Only add pm if browser uses am/pm
							matches[m] += " pm"; // Add pm
					}
					
				}
				if (matches[m].search(/-|to|—|–/) != -1) { // if 5-6pm or 5 to 6pm // Version 0.9.7 - Added a new thin dash – that is on google's events page // Version 1.0.7 - From matches[0] to matches[m]
					var parts = matches[m].match(/\b(\d{1,2}(:\d{1,2})?)\s*?(-|to|—|–)\s*?(\d{1,2}(:\d{1,2})?)\s*(am|pm)?/i); // Version 0.9.7 - Added a new thin dash – that is on google's events page // Version 1.0.3 - space? to \s*? // // Version 1.0.7 - From matches[0] to matches[m]
					if (parts) {
						if (test_mode) console.log(parts);
						if (typeof parts[6] === "undefined") parts[6] = ""; // Version 0.9.10 - from "pm" to "" in case of military time or British time : ex: 10:15 – 17:00 BST
						if (typeof parts[2] === "undefined") parts[2] = ":00"; else parts[2] = ""; // Version 0.9.10 - Bug: From else parts[2] == "" to else parts[2] = ""
						a2c.temp.time_start.text = parts[1] + parts[2] + " " + parts[6]; // 5:00 pm
						if (test_mode) console.log("Start time: "+a2c.temp.time_start.text);
						a2c.temp.time_start.index = index;
						a2c.temp.time_start.element = element;
						if (typeof parts[5] === "undefined") parts[5] = ":00"; else parts[5] = "";
						a2c.temp.time_end.text = parts[4] + parts[5] + " " + parts[6]; // 6:00 pm
						if (test_mode) console.log("End time: "+a2c.temp.time_end.text);
						a2c.temp.time_end.index = index;
						a2c.temp.time_end.element = element;
					}
				}
				if (a2c.temp.time_start.text == "") { 
					if (test_mode) console.log(matches[m]); // Version 0.9.10 // Version 1.0.7 - From matches[1] to matches[m]
					a2c.temp.time_start.text = matches[m]; // Version 1.0.7 - From matches[0] to matches[m]
					a2c.temp.time_start.index = index;
					a2c.temp.time_start.element = element;
					/*if (matches.length > 1) {
						if (test_mode) console.log(matches[1]);
						a2c.temp.time_end.text = matches[1];
						a2c.temp.time_end.index = index;
						a2c.temp.time_end.element = element;	
					}*/
					// Commented out above because not needed because of for loop we are in for loop with m
				}
				else if (a2c.temp.time_end.text == "") {
					if (test_mode) console.log(matches[m]); // Version 0.9.10 // Version 1.0.7 - From matches[0] to matches[m]
					a2c.temp.time_end.text = matches[m]; // Version 1.0.7 - From matches[0] to matches[m]
					a2c.temp.time_end.index = index;
					a2c.temp.time_end.element = element;		
				}
				if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "pink");
			}
			}
			
			// Find name of location or person
			/* We will go thru looking for patterns like: 
				Wendy's Restaurant
				Wendy’s
				Wendys
				Best Buy
				Golden China
				Dr. Doolittle
				John Smith
				Mr. John Smith
			If it happens to be within 2 indexes of an address element then we will add it to the beginning of address.text
			*/
			re = re_name;
			matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			if (matches
				&& !matches[0].match(re_address) 
				&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[0]) != -1) // Make sure found text is in highlighted_text
			) 
			if (a2c.temp.name.text.toLowerCase().indexOf(matches[0].toLowerCase()) == -1) { // Version 1.9.10 - If the matched name is not already in a3c.temp.name then add it
				//if (test_mode) console.log(index + ":" + matches);
				color = "lightblue";
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				//if (test_mode) console.log(match_pos);
				word = matches[0];
				a2c.temp.name.text = matches[0];
				a2c.temp.name.index = index;
				a2c.temp.name.element = element;
				a2c.temp.name.n = n;
				a2c.temp.name.match_pos = match_pos;
				if (test_mode) console.log(element);
				if (test_mode) console.log("name:" + index + ":" + a2c.temp.name.text);
			}
			
			
			// Find an address element
			/*if ((element.tagName.match(/ADDRESS|location/i) 
				|| String(element.className).match(/address|location/i))
				&& !String(element.getAttribute('itemprop')).match(/address|location/i) // Microdata // Version 1.9.10 - Removed |location
				&& !String(element.getAttribute('property')).match(/address|location/i)) // Version 1.9.10 - RDFa // Also removed |location
				) 
			{
				a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
				var converted_address = element.innerText.replace(/\n|\r/g, " - ");
				if (a2c.temp.address.text.toLowerCase().indexOf(converted_address.toLowerCase()) == -1) { // If the matched street address is not already in a3c.temp.address then add it
					if (converted_address.length < 200) {
						a2c.temp.address.text += converted_address + " - ";
						a2c.temp.address.index = index;
						a2c.temp.address.element = element;
						if (options_obj.highlight_event_info) element.style.backgroundColor = "lightblue";
						if (test_mode) console.log(element);
						if (test_mode) console.log("address_element:" + index + ":" + a2c.temp.address.text);
					}
				}
				
			}
			
			
			// Version 0.9.10 - Microdata and RDFa have event location "name" under location element
			// Get location element
			if ((element.getAttribute('itemprop') && element.getAttribute('itemprop').match(/^(location)$/i)) // Microdata
				|| (element.getAttribute('property') && element.getAttribute('property').match(/^(location)$/i)) // Version 1.9.10 - RDFa
				) 
			{
				a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
				var els = element.children;
				var keys = ['itemprop', 'property']; // Version 0.9.10 - Search for Microdata as well as RDFa. Before we were only doing "itemprop"
				for (var i = 0; i < els.length; i++) 
				for (var j = 0; j < keys.length; j++)
				{
					// Find special address itemprops
					if (els[i].getAttribute(keys[j])) {
						var text = els[i].href || els[i].getAttribute("content") || els[i].innerText || ""; // Version 0.9.10
						if (text)
						if (els[i].getAttribute(keys[j]) == "name" && a2c.temp.address.text.toLowerCase().indexOf(text.toLowerCase()) == -1)
							a2c.temp.address.text += text + " - "; // Version 0.9.10 - Get Name of location
						else if (els[i].getAttribute(keys[j]) == "url" && a2c.temp.description.text.toLowerCase().indexOf(text.toLowerCase()) == -1)
							a2c.temp.description.text += text + "\n"; // Version 0.9.10 - Get url of location
						else if (els[i].getAttribute(keys[j]) == "address" && element.hasAttribute('content'))
						{	
							var text = els[i].getAttribute("content") || "";
							if (a2c.temp.address.text.toLowerCase().indexOf(text.toLowerCase()) == -1)
								a2c.temp.address.text += text + " - "; // Version 0.9.10 - Get Name of location
					}
				}
			}*/
					
			
			
			
			// Get address by place names: Center, Hall, Plaza, Square, Museum, Winery, Vineyard
			re = re_places;
			matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			if (matches) if (test_mode) console.log (matches);
			if (matches 
						//&& !matches[0].match(re_day) 
						&& !matches[0].match(re_month) 
						//&& !n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re_address) 
						&& !matches[0].match(re_tel)
						&& !matches[0].match(/\d{1,2} ?(am|pm)\b/i)
						&& !matches[0].match(/\b(in|since|from|after)\b \d{4}\b/i) 
						&& !matches[0].match(/\b(merch shop)\b/i) // Version 0.9.7 - Added for https://dothebay.com/events/2021/4/27/gilbert-o-039-sullivan-quot-just-gilbert-quot-tickets
						&& !matches[0].match(re_year) 
						&& !element.tagName.match(/option/i)
						&& !element.closest("noscript") // Version 1.0.8 - gmail noscript tag with "Help Center" link
						//&& element.innerText.indexOf("$") == -1
						&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[0]) != -1) // Make sure found text is in highlighted_text
			) 
			{
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				if (a2c.temp.address.text.toLowerCase().indexOf(matches[0].toLowerCase()) == -1) { // If the matched street address is not already in a3c.temp.address then add it
					a2c.temp.address.text += matches[0] + " - ";
					a2c.temp.address.index = index;
					a2c.temp.address.element = element;
					word = matches[0];
					if (options_obj.highlight_event_info) node =  highlight_match(n, word, match_pos, "lightgreen");
					if (test_mode) {
						if (test_mode) console.log(element);
						if (matches) console.log("place:" + index + ":" + matches[0]);
						if (matches) console.log(element.innerText);
					}
				}
			}
			
			// Get address by: at the Corral de Tierra Country Club.
			re = re_at_the;
			matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			if (matches && test_mode) console.log (matches);
			if (matches 
						&& !matches[3].match(re_day) 
						&& !matches[3].match(re_month) 
						&& !matches[3].match(re_tel)
						&& !matches[3].match(/\d{1,2} ?(am|pm)\b/i)
						&& !matches[3].match(/\b(in|since|from|after)\b \d{4}\b/i) 
						&& !matches[3].match(re_year) 
						&& !element.tagName.match(/option/i)
						//&& element.innerText.indexOf("$") == -1
						&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[0]) != -1) // Make sure found text is in highlighted_text
			) 
			{
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				if (a2c.temp.address.text.toLowerCase().indexOf(matches[3].toLowerCase()) == -1) { // If the matched street address is not already in a3c.temp.address then add it
					a2c.temp.address.text += matches[3] + " - ";
					a2c.temp.address.index = index;
					a2c.temp.address.element = element;
					word = matches[0];
					if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "lightgreen");
					if (test_mode) {
						if (test_mode) console.log(element);
						if (matches) console.log("at_the:" + index + ":" + matches[0]);
						if (matches) console.log(element.innerText);
					}
				}
			}
			
			
			// Get street address or street address, city, st, zip
			re = re_address;
			matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			if (matches) // Version 0.9.5
			for (var m = 0; m < matches.length; m++) // Version 0.9.5
			{
			if (matches && !matches[m].match(re_day) 
						&& !matches[m].match(re_month) 
						&& !matches[m].match(re_tel)
						&& !matches[m].match(/\d{1,2} ?(am|pm)\b/i)
						&& !matches[m].match(/\b(in|since|from|after)\b \d{4}\b/i)
						&& !matches[m].match(/\b(comments?|shares?)\b/i)
						&& !matches[m].match(/\b\d{1,4} (years)\b/i)  
						&& !matches[m].match(re_year) 
						&& !matches[m].match(re_time) 
						&& matches[m].length <= 150
						&& !element.tagName.match(/option/i)
						//&& element.innerText.indexOf("$") == -1
						&& matches[m].charAt(0) != "$"
						&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[m]) != -1) // Make sure found text is in highlighted_text
			) {
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				if (a2c.temp.address.text.replace(/,/g,"").toLowerCase().indexOf(matches[m].replace(/,/g,"").toLowerCase()) == -1) { // If the matched street address is not already in a3c.temp.address then add it // Version 0.9.10d - Removing commas in case they have Monterey, CA, 95076 and then Monterey, CA 95076
					//matches[m] = matches[m].replace(/^[A-Z]+:/i, ""); // Remove if starts with "Address:" or "Location:"
					a2c.temp.address.text += matches[m].replace(/\n|\r/g, " - ") + " - ";
					a2c.temp.address.index = index;
					a2c.temp.address.element = element;
					word = matches[m];
					if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "lightgreen");
					if (test_mode) {
						if (test_mode) console.log(element);
						if (matches) console.log("address:" + index + ":" + matches[m]);
						if (matches) console.log(element.innerText);
					}
					// See if there is a location name near the found address
					if (a2c.temp.name.text != "" && (a2c.temp.name.index > index - 4
						|| a2c.temp.name.element.hasAttribute["name"])) // Version 0.9.10 - Added || a2c.temp.name.element.hasAttribute["name"])  
					{
						if (a2c.temp.address.text.toLowerCase().indexOf(a2c.temp.name.text.toLowerCase()) == -1) { // If name is not in address already
							a2c.temp.address.text = a2c.temp.name.text + " - " + a2c.temp.address.text;
							//if (options_obj.highlight_event_info) a2c.temp.name.element.style.backgroundColor = "lightblue";
							if (options_obj.highlight_event_info) 
								node = highlight_match(a2c.temp.name.n, a2c.temp.name.text, a2c.temp.name.match_pos, "lightblue");
						}	
					}
				}
			}
			} // Version 0.9.5 - end for
			
			if (!element.tagName.match(/option/i)) {
				// Get City, ST or City, Country
				re = re_city; // Monterey, CA or LEUVEN, BELGIUM or Paris, France or Los Angeles, CA 90012
				matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re);
				if (matches && !matches[0].match(re_day) && !matches[0].match(re_month) && !matches[0].match(/\d{1,2} ?(am|pm)\b/i)
					&& !matches[0].match(/\b(calendar)\b/i) 
					&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[0]) != -1) // Make sure found text is in highlighted_text
				)
				{
					match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
					if (a2c.temp.city.text.toLowerCase().replace(/,/g,"").indexOf(matches[0].replace(/,/g,"").toLowerCase()) == -1 && a2c.temp.address.text.replace(/,/g,"").toLowerCase().indexOf(matches[0].replace(/,/g,"").toLowerCase()) == -1) { // If the matched City, ST is not already in a2c.temp.address.text then add it // Version 0.9.5 - Forgot toLowerCase() on matches[0] // Version 0.9.10d - Added .replace(/,/g,"") to remove commas
						a2c.temp.city.text += matches[0] + " - ";
						a2c.temp.city.index = index;
						a2c.temp.city.element = element;
						word = matches[0];
						if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "green");
						if (test_mode) console.log(element);
						if (test_mode) console.log("city:" + index + ":" + a2c.temp.city.text);
					}
				}
			}
			
			
			// Get country name
			re = re_country;
			matches = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").match(re); // \u00a0 is the text node character for nbsp. I just left nbsp for clarity
			if (matches && test_mode) console.log (matches); // Version 1.0.3 - Added && test_mode
			if (matches 
						&& (!a2c.highlighted_text || a2c.highlighted_text.indexOf(matches[0]) != -1) // Make sure found text is in highlighted_text
			) 
			{
				//console.log(index+":country"+":"+matches[0])
				match_pos = n.nodeValue.replace(re_nbsp," ").replace(re_zwnj,"").search(re);
				if (a2c.temp.address.text.toLowerCase().indexOf(matches[0].toLowerCase()) == -1) // If the matched street address is not already in a3c.temp.address then add it
				if (a2c.temp.address.index > index - 4) // Only if another address match was found within 2 indexes
				{ 
					a2c.temp.address.text += matches[0] + " - ";
					a2c.temp.address.index = index;
					a2c.temp.address.element = element;
					word = matches[0];
					if (options_obj.highlight_event_info) node = highlight_match(n, word, match_pos, "lightgreen");
					if (test_mode) {
						if (test_mode) console.log(element);
						if (matches) console.log("country:" + index + ":" + matches[0]);
						if (matches) console.log(element.innerText);
					}
				}
			}
			

			
			// If address, date_start and time_start are not empty then create event
			if (!element.closest("[class*='address' i], [class*='location' i], [itemprop='location'], [itemprop='address]")) // Version 0.9.10 - Finish going through address element children first so the address isn't added to next event
			if ( (a2c.temp.address.text && index > a2c.temp.address.index + 2
				&& a2c.temp.date_start.text && index > a2c.temp.date_start.index + 2
				&& a2c.temp.date_end.text && index > a2c.temp.date_end.index + 2
				&& a2c.temp.time_start.text && index > a2c.temp.time_start.index + 2
				&& a2c.temp.time_end.text && index > a2c.temp.time_end.index + 2
				&& a2c.temp.title.text && index > a2c.temp.title.index + 2)
				||
				( (a2c.temp.address.text != "" && index > a2c.temp.address.index+leeway-2) || (a2c.temp.city.text != "" && index > a2c.temp.city.index+leeway) )
				&& a2c.temp.date_start.text != "" && index > a2c.temp.date_start.index+leeway/2 
				&& index > a2c.temp.title.index+leeway/2
				&& (a2c.temp.date_end.index == 0 || index > a2c.temp.date_end.index+leeway/3)
				//&& a2c.temp.time_start.text != "" && index > a2c.temp.time_start.index+leeway
				) 
			{
				add_event();
				
			}

		}
		else // if not text node then it must be another element
		{
			if (node.nodeType == 1 && node.nodeName == "IMG"
				&& !String(node.className).match("T-I-J3") // Version 0.9.5a - Don't process ALT tag in Gmail email header buttons
				) 
			{ 
				//var text = node.getAttribute('aria-label') || node.alt || node.title; // Version 0.9.5 - If img has alt or title
				var text = node.alt || node.title; // Version 0.9.5 - If img has alt or title // Version 0.9.5a - Removed node.getAttribute('aria-label') ||
				if (text) {
					/*var add_elem = document.createElement("h2"); // Version 0.9.7 - Removed adding h2 element
					add_elem.innerText = text;
					node.parentNode.insertBefore( add_elem, node.nextSibling ); // Add element after node (img etc)
					*/
					if (a2c.temp.title.text == "") // version 0.9.7 - Instead just process the img element
					{
						a2c.temp.title.text = text;
						a2c.temp.title.index = index;
						a2c.temp.title.element = node;
						color = "gold";	
					}
					//if (test_mode) element.style.backgroundColor = color;
					if (test_mode) console.log(node);
					if (test_mode) console.log("title:" + index + ":" + text + " -  Points = " + calculate_title_points(node)); 
				
				}
			}
			// nodeType 1 = element
			
			//else 
			{
			if (node.nodeType == 1 && !getStyle(node, "visibility").match(/hidden/i)) // Dont search in hidden elements
			if (node.nodeType == 1 && !getStyle(node, "display").match(/none/i)) // Dont search in display:none elements
			if (!String(node.className).match(/\b(timestampContent)\b/)) // Facebook time and date of a post
			if (!String(node.id).match(/event_related_events|events_dashboard_find_events|pagelet_bluebar|entity_sidebar/)) // Facebook sidebars and top bar
			if (!String(node.className).match(/\b(nH w-asV aiw)\b/)) // Version 0.9.5 - Gmail header
			if (!String(node.className).match(/\b(aeN)\b/)) // Gmail left sidebar 
			if (node.nodeType == 1 && getStyle(node,"opacity") != 0)
			if (!String(node.getAttribute('itemtype')).match(/event/i) // Microdata // Version 0.9.10 - Don't search event block. We do that below
				&& !String(node.getAttribute('typeof')).match(/event/i)) // RDFa // Version 0.9.10 - Don't search event block. We do that below
			//if (isVisible(node))
				find_events(node);
			}
			
			
			if (node.nodeType == 1 && ( (node.hasAttribute("itemprop") // Version 0.9.7 
			&& node.getAttribute("itemprop") == "startDate") || (node.hasAttribute("property")
			&& node.getAttribute("property") == "startDate") )) 
			{
				var attribute = node.getAttribute("content") || node.getAttribute("datetime") || "";
				if (attribute && attribute.match(/\d{4}.\d{2}.\d{2}/)) { // only get if they have properly formatted datetime 2021-06-09
					var datetime = attribute.split("T");	
					if (datetime[0]) {
						a2c.temp.date_start.text = datetime[0] || "";
						a2c.temp.date_start.index = index;
						a2c.temp.date_start.element = node; // Version 0.9.10 - From element to node
					}
					if (datetime[1]) {
						a2c.temp.time_start.text = datetime[1] || "";
						a2c.temp.time_start.index = index;
						a2c.temp.time_start.element = node;
					}
					if (test_mode) {
						console.log(node);
						console.log("startDate:" + index + ":" + a2c.temp.date_start.text);
						console.log("startTime:" + index + ":" + a2c.temp.time_start.text);
					}
				}
			}
			if (node.nodeType == 1 && ( (node.hasAttribute("itemprop") // Version 0.9.7 
			&& node.getAttribute("itemprop") == "endDate") || (node.hasAttribute("property")
			&& node.getAttribute("property") == "endDate") )) 
			{
				var attribute = node.getAttribute("content") || node.getAttribute("datetime") || "";
				if (attribute && attribute.match(/\d{4}.\d{2}.\d{2}/)) { // only get if they have properly formatted datetime 2021-06-09
					var datetime = attribute.split("T");	
					if (datetime[0]) {
						a2c.temp.date_end.text = datetime[0] || "";
						a2c.temp.date_end.index = index;
						a2c.temp.date_end.element = node; // Version 0.9.10 - From element to node
					}
					if (datetime[1]) {
						a2c.temp.time_end.text = datetime[1] || "";
						a2c.temp.time_end.index = index;
						a2c.temp.time_end.element = node;
					}
					if (test_mode) {
						console.log(node);
						console.log("endDate:" + index + ":" + a2c.temp.date_end.text);
						console.log("endTime:" + index + ":" + a2c.temp.time_end.text);
					}
				}
			}
			
			// Version 0.9.10b - Count microdata or RDFa event objects
			if (node.nodeType == 1)
			if (String(node.getAttribute('itemtype')).match(/event/i) // Microdata
				|| String(node.getAttribute('typeof')).match(/event/i)) // RDFa
			{
				// Add previous event if enough data
				if (a2c.temp.date_start.text)
					add_event();
				
				if (test_mode) console.log(node, "Microdata event block start");
				var obj = microdata2ldjson(node); // Turn Microdata into ld+json object
				if (test_mode) console.log(obj);
				process_ld_object(obj); // Process ld+json object and add to events
				clear_event_temp(); // Clear all event temp variables
				//find_events(node.nextElementSibling); // Jump to next element after this block
				//node = node.nextSibling; // Jump to the last child of this block
				
				microdata_events++; // Starting new Microdata or RDFa event block
				// If we have some event data already found
				/*if (a2c.temp.date_start.text 
				&& a2c.temp.title.text && a2c.temp.address.text ) 
					add_event(); // then save the current found data in a new event since we starting new event block
				*/
			}
			
			// Version 0.9.10b - Process microdata or RDFa
			/*if (node.nodeType == 1)
			if ((node.hasAttribute('itemprop')) // Microdata
				|| (node.hasAttribute('property')) // Version 1.9.10 - RDFa
				) 
			{
				var found = false;
				var itemprop = node.getAttribute("itemprop") || node.getAttribute("property");
				var text = node.href || node.getAttribute('content') || node.innerText || ""; // Version 0.9.10
				if (itemprop.match(/^(name|url|address)$/)) {
					var closest = node.parentElement.closest("[itemprop],[property]");
					if (closest) { // closest parent with itemprop or property attribute
						var p_itemprop = closest.getAttribute("itemprop") || closest.getAttribute("property");
						if (p_itemprop == "location") {
							found = p_itemprop+"."+itemprop;
							if (itemprop == "name") {
								a2c.temp.name.text = text;	
								a2c.temp.name.index = index;
								a2c.temp.name.element = node;
							}
							else if (itemprop == "url" 
							&& a2c.temp.description.text.toLowerCase().indexOf(text.toLowerCase()) == -1) {
								a2c.temp.description.text += text + "\n";	
								a2c.temp.description.index = index;
								a2c.temp.description.element = node;
							}
							else if (itemprop == "address" && node.hasAttribute("content")) {
								if (a2c.temp.address.text.toLowerCase().indexOf(text.toLowerCase()) == -1) {
									a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
									a2c.temp.address.text += text + " - ";	
									a2c.temp.address.index = index;
									a2c.temp.address.element = node;
								}
							}
							else if (itemprop == "address") { // Version 0.9.10e
								var obj = microdata2ldjson(node);
								text = ""; // Blank out the innerText we are getting above
								if (test_mode) console.log("address object:", obj);
								if (obj.streetAddress) 
									text += obj.streetAddress + ", ";
								if (obj.addressLocality) 
									text += obj.addressLocality + ", ";
								if (obj.addressRegion) 
									text += obj.addressRegion + ", ";
								if (obj.postalCode) 
									text += obj.postalCode + ", ";
								if (obj.addressCountry) 
									text += obj.addressCountry;
								a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
								a2c.temp.address.text += text + " - ";	
								a2c.temp.address.index = index;
								a2c.temp.address.element = node;
							}
						}
					}
				}
				else if (itemprop.match(/^(streetAddress|addressLocality|addressRegion|postalCode|addressCountry)$/i))
				{
					var closest = node.parentElement.closest("[itemprop],[property]");
					if (closest) { // closest parent with itemprop or property attribute
						var p_itemprop = closest.getAttribute("itemprop") || closest.getAttribute("property");
						if (p_itemprop == "address") 
						if (a2c.temp.address.text.toLowerCase().indexOf(text.toLowerCase()) == -1) 
						{
							a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
							found = p_itemprop+"."+itemprop;
							a2c.temp.address.text += text + ", ";	
							a2c.temp.address.index = index;
							a2c.temp.address.element = node;
						}
					}
				}
				if (found && test_mode) {
						console.log(node, ":" + index + ":" + found + ":" + text);
				}
			}*/
			
			// Find an address element
			if (node.nodeType == 1)
			if ((node.tagName.match(/ADDRESS|location/i) 
				|| String(node.className).match(/address|location/i))
				&& !String(node.getAttribute('itemprop')).match(/address|location/i) // Microdata // Version 1.9.10 - Removed |location
				&& !String(node.getAttribute('property')).match(/address|location/i) // Version 1.9.10 - RDFa // Also removed |location
				) 
			{
				a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
				var converted_address = node.innerText.replace(/\n|\r/g, " - ");
				if (a2c.temp.address.text.toLowerCase().indexOf(converted_address.toLowerCase()) == -1) { // If the matched street address is not already in a3c.temp.address then add it
					if (converted_address.length < 200) {
						a2c.temp.address.text += converted_address + " - ";
						a2c.temp.address.index = index;
						a2c.temp.address.element = node;
						if (options_obj.highlight_event_info) node.style.backgroundColor = "lightblue";
						if (test_mode) console.log(node);
						if (test_mode) console.log("address_element:" + index + ":" + a2c.temp.address.text);
					}
				}
				
			}
			
			// Version 0.9.10 - Microdata and RDFa have event location "name" under location element
			// Get location element
			/*if (node.nodeType == 1)
			if ((node.getAttribute('itemprop') && node.getAttribute('itemprop').match(/^(location)$/i)) // Microdata
				|| (node.getAttribute('property') && node.getAttribute('property').match(/^(location)$/i)) // Version 1.9.10 - RDFa
				) 
			{
				a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
				var els = node.children;
				var keys = ['itemprop', 'property']; // Version 0.9.10 - Search for Microdata as well as RDFa. Before we were only doing "itemprop"
				for (var i = 0; i < els.length; i++) 
				for (var j = 0; j < keys.length; j++)
				{
					// Find special address itemprops
					if (els[i].getAttribute(keys[j])) {
						var text = els[i].href || els[i].getAttribute("content") || els[i].innerText || ""; // Version 0.9.10
						if (els[i].getAttribute(keys[j]) == "name" && a2c.temp.name.text.toLowerCase().indexOf(text.toLowerCase()) == -1)
						{	
							a2c.temp.name.text = text; // Version 0.9.10 - Get Name of location. Not +=
							if (test_mode) console.log(node);
							if (test_mode) console.log(els[i].getAttribute(keys[j]) + ":" + index + ":" + a2c.temp.name.text);
						}
						else if (els[i].getAttribute(keys[j]) == "url" && a2c.temp.description.text.toLowerCase().indexOf(text.toLowerCase()) == -1)
						{	
							a2c.temp.description.text += text + "\n"; // Version 0.9.10 - Get url of location
							if (test_mode) console.log(node);
							if (test_mode) console.log(els[i].getAttribute(keys[j]) + ":" + index + ":" + a2c.temp.address.text);
						}
						if (els[i].getAttribute(keys[j]) == "address" && node.hasAttribute('content'))
						{	
							var text = els[i].getAttribute("content") || "";
							if (a2c.temp.address.text.toLowerCase().indexOf(text.toLowerCase()) == -1) {
								a2c.temp.address.text += text + " - "; // Version 0.9.10 - Get Name of location
								if (test_mode) console.log(node);
								if (test_mode) console.log(els[i].getAttribute(keys[j]) + ":" + index + ":" + a2c.temp.address.text);
							}
						}
					}
				}
			}
		
			
			// Find Microdata or RDFa address or location element
			if (node.nodeType == 1)
			if ((node.getAttribute('itemprop') && node.getAttribute('itemprop').match(/^(address)$/i)) // Microdata // Version 1.9.10 From address|location to ^(address|location)$
				|| (node.getAttribute('property') && node.getAttribute('property').match(/^(address)$/i)) // Version 1.9.10 - RDFa
			) 
			{
				a2c.temp.found_address_element = true; // Version 0.9.10 - So add_event doesn't grab an address element
				var els = node.children;
				var keys = ['itemprop', 'property']; // Version 0.9.10 - Search for Microdata as well as RDFa. Before we were only doing "itemprop"
				for (var i = 0; i < els.length; i++) 
				for (var j = 0; j < keys.length; j++)
				{
					// Find special address itemprops
					var text = els[i].href || els[i].getAttribute("content") || els[i].innerText || ""; // Version 0.9.10
				
					// Version 0.9.10 - Or just use this shortcut
					if (String(els[i].getAttribute(keys[j])).match(/^(streetAddress|addressLocality|addressRegion|postalCode|addressCountry)$/i) 
					&& a2c.temp.address.text.toLowerCase().indexOf(text.toLowerCase()) == -1) 
					{
						a2c.temp.address.text += text + " - ";
						if (test_mode) console.log(node);
						if (test_mode) console.log(els[i].getAttribute(keys[j]) + ":" + index + ":" + a2c.temp.address.text);
					}
				}
			}*/
			
			if (node.nodeName == "IFRAME") { // Version 0.9.7 - Get event text in iframe
				try {
					if (!a2c.highlighted_text) {// Get highlighted text in iframe if we don't have it in main window
						if (node.contentDocument && node.contentDocument.getSelection())
							a2c.highlighted_text = node.contentDocument.getSelection().toString().replace(re_nbsp," ").replace(re_zwnj,"") || "";
						if (test_mode) console.log("highlighted: "+a2c.highlighted_text);
					}  // Getting highlighted text in iframe causes errors and loops. Not sure why : https://www.thecalifornian.com/things-to-do/events/?_ev_id=9932327t_durand_jones_%26_the_indications
					find_events(node.contentWindow.document.body);
				} catch (error) {
					console.log(error);
				}
			}
			if (node.nodeName == "SCRIPT" && 
			node.type == 'application/ld+json') { // Version 0.9.7 - Get event data in script tags ld+json that might be in an iframe or body instead of head
				try { // Version 1.0.5 - Added try and catch
					var obj = JSON.parse(node.innerText); // Error in event handler: SyntaxError: Bad control character in string literal in JSON at position 771. when https://animecons.com/events/info/22827/connecticon-2024 left an unescaped line feed in a description
				}
				catch (error) { console.log(error); }
				if (typeof obj !== 'undefined')
					process_ld_object(obj);
				
			}
			
			
		}
	}

} // end function find_events(node)


function add_event() {
	if (a2c.temp.title.text == "")
		a2c.temp.title.text = document.title; // If title is empty then fill it with document.title
	if (a2c.temp.title.element) {
		if (options_obj.highlight_event_info) a2c.temp.title.element.style.backgroundColor = "gold";
		if (test_mode) console.log("Confirmed title:" + index + ":" + a2c.temp.title.text + " -  Points = " + calculate_title_points(a2c.temp.title.element)); 	// Version 0.9.10 - Added + " -  Points = " + calculate_title_points(a2c.temp.title.element)
		if (test_mode) console.log(a2c.temp.title.element);
	}
	
	// if gmail email then start title with name of person or business sending email
	var gmail_email = document.getElementsByClassName("gD")[0];
	if (typeof gmail_email !== "undefined")
		a2c.temp.title.text = gmail_email.innerText + " - " + a2c.temp.title.text;
	
	// If address is empty then get the first element with itemprop="address"
	/* Version 1.9.10 - This is why all the events on a2c-test.htm have the first events address
		in them. It is because of !a2c.temp.address.text.match(re_address) which means since
		there is no address pattern for these event's addresses (123 wall st.) they are grabbing
		the first address element on the page! Good for some things. Bad for others! We need to
		keep track of if we had an address element nearby this event.
	*/
	if (a2c.temp.address.text == "" || !a2c.temp.address.text.match(re_address) )
	if (!a2c.temp.found_address_element) // Version 0.9.10
	{
		var address_el = document.querySelector('[itemprop=address]');
		if (address_el) {
			a2c.temp.address.text += address_el.innerText.replace(/\n|\r/g, " - ");
			if (options_obj.highlight_event_info) address_el.style.backgroundColor = "lightblue";	
		}
		else { // If address is still empty then get first element with tagName address
			var address_el = document.querySelector('address');
			if (address_el) {
					a2c.temp.address.text += address_el.innerText.replace(/\n|\r/g, " - ");;
				if (options_obj.highlight_event_info) address_el.style.backgroundColor = "lightblue";	
			}
		}
	}
	
	// See if there is a location name near the found address // Version 0.9.10 - Added here from above at re_address
	if (a2c.temp.name.text != "" && a2c.temp.name.index < a2c.temp.address.index - 4) {
		if (a2c.temp.address.text.toLowerCase().indexOf(a2c.temp.name.text.toLowerCase()) == -1) { // If name is not in address already
			a2c.temp.address.text = a2c.temp.name.text + " - " + a2c.temp.address.text;
			//if (options_obj.highlight_event_info) a2c.temp.name.element.style.backgroundColor = "lightblue";
			//if (options_obj.highlight_event_info) 
			//	node = highlight_match(a2c.temp.name.n, a2c.temp.name.text, a2c.temp.name.match_pos, "lightblue");
		}	
	}
	
	
	
	if (a2c.temp.city.text != "" && a2c.temp.address.text.toLowerCase().indexOf(a2c.temp.city.text.toLowerCase()) == -1) // If city, st is not in address already then add it
		a2c.temp.address.text += a2c.temp.city.text;
		
	if (a2c.highlighted_text && a2c.temp.description.text == "") // Version 1.0.0 - Add highlighted_text to description
		a2c.temp.description.text = a2c.highlighted_text;
	
	var event_obj = { 	title : a2c.temp.title.text, 
						address : a2c.temp.address.text,
						date_start : a2c.temp.date_start.text,
						date_end : a2c.temp.date_end.text,
						time_start : a2c.temp.time_start.text,
						time_end : a2c.temp.time_end.text,
						description : a2c.temp.description.text, // Version 0.9.10
						//datetime_start : new Date( a2c.temp.date_start.text+" "+a2c.temp.time_start.text),
						//datetime_end: new Date( a2c.temp.date_end.text+" "+a2c.temp.time_end.text)
	};
	
	if (test_mode) console.log(event_obj);
	a2c.events.push(event_obj);
	
	
	clear_event_temp(); // Clear variables:
	
}


function highlight_match(n, word, match_pos, color) {
	if (!String(n.parentElement.className).match(/^highlight_span/i)) // Only highlight if we have not already highlighted it // Version 1.0.0 - Added String() because error at https://www.ticketmaster.fr/en/manifestation/lys-festival-ticket/idmanif/526268
	{ 
	
		var before = n.nodeValue.substr(0, match_pos); // split into a part before the match
		var middle = n.nodeValue.substr(match_pos, word.length); // the matched word to preserve case
		//var after = n.splitText(match_pos+word.length);		
		var after = document.createTextNode(n.nodeValue.substr(match_pos+word.length)); // and the part after the match	
		var highlight_span = document.createElement("span"); // create a span in the middle
	
		highlight_span.style.color = "black";
		highlight_span.style.backgroundColor = color;	
	    
		highlight_span.appendChild(document.createTextNode(middle)); // insert word as textNode in new span
		n.nodeValue = before; // Turn node data into before
		n.parentNode.insertBefore(after, n.nextSibling); // insert after
	    n.parentNode.insertBefore(highlight_span, n.nextSibling); // insert new span
	   	highlights.push(highlight_span); // add new span to highlights array
	   	highlight_span.id = "highlight_span"+highlights.length;
		n=n.nextSibling; // Advance to next node or we get stuck in a loop because we created a span (child)
		//node=node.nextSibling;
		if (test_mode) console.log(n);
	}
	return(n);
}


function unhighlight()
{
	if (highlights.length > 0)
	for (var i = highlights.length-1; i >= 0; i--) // Need to unhighlight backwards since highlights are in highlights
	{
		
		var the_text_node = highlights[i].firstChild; // firstChild is the textnode in the highlighted span
	
		var parent_node = highlights[i].parentNode; // the parent element of the highlighted span
		
		// First replace each span with its text node nodeValue
		if (highlights[i].parentNode)
		{
			highlights[i].parentNode.replaceChild(the_text_node, highlights[i]);
			//if (i == find_pointer) selectElementContents(the_text_node); // ver 5.1 - 10/17/2014 - select current find
			parent_node.normalize(); // The normalize() method removes empty Text nodes, and joins adjacent Text nodes in an element
			//normalize(parent_node);	// Ver 5.2 - 3/10/2015 - normalize() is incorrect in IE. It will combine text nodes but may leave empty text nodes. So added normalize(node) function below		
		}
	}
	// Now reset highlights array
	highlights = [];
	//find_pointer = -1; // ver 5.1 - 10/17/2014
} // end function unhighlight()


function normalize(node) {
//http://stackoverflow.com/questions/22337498/why-does-ie11-handle-node-normalize-incorrectly-for-the-minus-symbol
  if (!node) { return; }
  if (node.nodeType == 3) {
    while (node.nextSibling && node.nextSibling.nodeType == 3) {
      node.nodeValue += node.nextSibling.nodeValue;
      node.parentNode.removeChild(node.nextSibling);
    }
  } else {
    normalize(node.firstChild);
  }
  normalize(node.nextSibling);
}


function calculate_title_points(element) {
/* This function examines a newly found title element
	and sees if it is a more relevant title then the previous element
*/	
	
	var points = 0;
	if (element.tagName.match(/h1|img/i)) points++; // Version 0.9.7 - Give h1 or img tag 1 extra point
	if (element.getAttribute('itemprop') && element.getAttribute('itemprop').match(/title|name/i)) points++; // Version 0.9.7
	if (element.getAttribute('role') && element.getAttribute('role').match(/heading/i)) points += 2; // Version 0.9.7
	if (element.tagName.match(/h1|h2|h3/i)) points += 2;
	if (element.tagName.match(/^a$/i)) points++;
	if (element.parentNode && element.parentNode.tagName.match(/h1|h2|h3|^a$/i)) points++;
	if (String(element.className).match(/title|name|hP/i)) points++; // hP is Gmail subject element
	if (element.parentNode && element.parentNode.className.match(/title|name/i)) points++;
	//points += parseInt(getStyle(element, "font-size"));
	//points += parseInt(getStyle(element, "font-weight"));
	if (parseInt(getStyle(element, "font-size")) > parseInt(getStyle(document.body, "font-size"))) points++;
	if (parseInt(getStyle(element, "font-weight")) > parseInt(getStyle(document.body, "font-weight"))) points++;
	if (color_diff(element) >= 120) points++; // Version 0.9.5 - Changed from 100 to 150
	if (element.innerText.match(/\b([A-Z][a-zA-z]* ?){2,}\b/)) points++; // If there are two or more capital words next to each other: "Winter Festival" // Version 0.9.7 - Remove i in regex because that negates the capital letter search
	if (element.innerText && element.innerText.match(re_titles)) points++; // If Festival, Fair, Show, Cruise etc. is in the text
	//if (element.innerText.length > 20) points++;
	//points += element.innerText.length;
	if (document.title.toLowerCase().indexOf(element.innerText.toLowerCase()) != -1) points++; // If innerText is in document.title
	return points;
}


function color_diff(element) {
	// Difference in points between element text color and body text color: rgb(rrr, ggg, bbb)
	var ec = getStyle(element, "color").split(/[(,)]/);
	var bc = getStyle(document.body, "color").split(/[(,)]/);
	
	var diff = Math.abs(ec[1] - bc[1]) + Math.abs(ec[2] - bc[2]) + Math.abs(ec[3] - bc[3]);
	return (diff);
}


/* It is not possible to get certain styles set in css such as display using 
the normal javascript.  So we have to use this function taken from:
http://www.quirksmode.org/dom/getstyles.html */
function getStyle(el,styleProp)
{
	// if el is a string of the id or the actual object of the element
	var x = (document.getElementById(el)) ? document.getElementById(el) : el;
	if (x.currentStyle) // IE
		var y = x.currentStyle[styleProp];
	else if (window.getComputedStyle)  // FF
		var y = document.defaultView.getComputedStyle(x,null).getPropertyValue(styleProp);
	return y;
}


function isVisible(el)
{
	/* if parent element is display='none' the child still has its own display and visibility with
		getComputedStyle. So can't use that for display. Instead use the offsetWidth and offsetHeight trick
		which returns false if even the parent element is display='none'.
		But that only works for display='none' not for visibility='hidden'.
		The other problem with offsetWidth trick is if the parent has height of 0 or width of 0
		and overflow of none then the child still has its width.  So do we have to traverse the parents?
	*/
	var visible = true;
  	
  	for (var elem = el; elem; elem = elem.parentElement)
  	{
		if ( (elem.offsetWidth <= 0 || elem.offsetHeight <= 0) &&
			document.defaultView.getComputedStyle(elem,null).getPropertyValue("overflow") == "hidden")
  		{
  			visible = false;
  			break;
  		}
  		else if (document.defaultView.getComputedStyle(elem,null).getPropertyValue("display") == "none")
  		{
  			visible = false;
  			break;
  		}
  	}
	
	//visible = el.offsetWidth > 0 || el.offsetHeight > 0; // Old way; Doesn't work if parent's height is 0
	/* However visibilty is inherited so we can use getComputed style for that. */
	//console.log(document.defaultView.getComputedStyle(el,null).getPropertyValue("display"));
	if (document.defaultView.getComputedStyle(el,null).getPropertyValue("visibility") == 'hidden')
		visible = false;
		
	// is element positioned offscreen to the left or top? (-2000 etc)
	var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;
	var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
	if (Math.round(el.getBoundingClientRect().left + scrollLeft) < -1 ||
		Math.round(el.getBoundingClientRect().top + scrollTop) < -1)
		visible = false;

	return(visible);		
}


function get_word_date(word) {

	var today = new Date();
	var tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	var other_day = new Date();
	var day_of_week = -1;
	
	var display_date = today.getFullYear() + "-" + pad(today.getMonth()+1) + "-" + pad(today.getDate()); // 2019-08-16
	
	if (word.match(/tomorrow|tommorow|tommorrow|tomarrow/i))
		display_date = tomorrow.getFullYear() + "-" + pad(tomorrow.getMonth()+1) + "-" + pad(tomorrow.getDate()); // 2019-08-16
		
	if (word.match(/\b(this |on )?(Sunday|Sun)/i)) day_of_week = 0;
	if (word.match(/\b(this |on )?(Monday|Mon)/i)) day_of_week = 1;
	if (word.match(/\b(this |on )?(Tuesday|Tue)/i)) day_of_week = 2;
	if (word.match(/\b(this |on )?(Wednesday|Wed)/i)) day_of_week = 3;
	if (word.match(/\b(this |on )?(Thursday|Thu)/i)) day_of_week = 4;
	if (word.match(/\b(this |on )?(Friday|Fri)/i)) day_of_week = 5;
	if (word.match(/\b(this |on )?(Saturday|Sat)/i)) day_of_week = 6;
	
	if (day_of_week >= 0)	
		while (other_day.getDay() != day_of_week)
		{ 
			/* Should add days to other_day until reach Sunday */ 
			other_day.setDate(other_day.getDate() + 1);
			display_date = other_day.getFullYear() + "-" + pad(other_day.getMonth()+1) + "-" + pad(other_day.getDate()); // 2019-08-16
		}
		
		
	return (display_date);
}


 function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }


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
			{
				if (parts.length >= 3 && parts[2].length < 4) // Version 1.0.6 - if year is included and only 2 digits
					parts[2] = "20" + parts[2]; // then add 20 to the front to make it 2024 etc...
				date_text = parts.reverse().join("/"); // 15/11 to 11/15 or 15/11/2019 to 2019/11/15
			}
			else if ((parts[0].charAt(0) == '0' || parts[1].charAt(0) == '0') // if either month or day has a leading zero then it is probably dd/mm 
				&& parseInt(parts[1]) <= 12 // Version 0.9.3 - Added && for if 11/nn is smaller than 12 // Version 0.9.9 - From parseInt(parts[1] <= 12)) to parseInt(parts[1]) <= 12)
				&& !localeDateFormat.match(/^(y|m)/) // Version 0.9.9 - Added && !localeDateFormat.match(/^(y|m)/) to not reverse American or Japanese dates in case some Americans add leading zeros
			)
			{
				if (parts.length >= 3 && parts[2].length < 4) // Version 1.0.6 - if year is included and only 2 digits
					parts[2] = "20" + parts[2]; // then add 20 to the front to make it 2024 etc...
				date_text = parts.reverse().join("/"); // 07/05 to 05/07 or 07/05/2019 to 2019/05/07
			}
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


function find_all_events(node) {

	if (!node)
		node = document.body;
	
	clear_event_temp(); // Clear temp variables
	a2c.events = []; // Clear events
	unhighlight(); // Unhighlight any event info previously highlighted
	index = 0;
	microdata_events = 0; // Version 0.9.10b
	a2c.highlighted_text = window.getSelection().toString().replace(re_nbsp," ").replace(re_zwnj,"");  // Version 0.9.5 - Added replace nbsp; 
	//if (window.getSelection().rangeCount) { // if highlighted text
	if (a2c.highlighted_text) { // if highlighted text
		node = window.getSelection().getRangeAt(0).commonAncestorContainer; // text or html element that is highlighted
        node = node.nodeType == 1 ? node : node.parentNode; // Make sure it is an html element      
		if (test_mode) console.log("User has highlighted text!", a2c.highlighted_text);
	}
	else  find_ld_events(); // Version 0.9.7 - Look for ld+json events only if no user selection highlighted
	
	find_events(node);
	// end loop. If we have any data we should add it to a new event even if it isn't finished in case there is only 1 event
	if (a2c.temp.address.text != "" || a2c.temp.date_start.text != "" || a2c.temp.time_start.text != "") {

		if (a2c.events.length >= 1) {
			if (a2c.temp.date_start.text == "") // if start date is empty then get it from the last event
				a2c.temp.date_start.text = a2c.events[a2c.events.length - 1].date_start;
			if (a2c.temp.date_end.text == "") // if start date is empty then get it from the last event
				a2c.temp.date_end.text = a2c.events[a2c.events.length - 1].date_end;
			if (a2c.temp.time_start.text == "") // if start time is empty then get it from the last event
				a2c.temp.time_start.text = a2c.events[a2c.events.length - 1].time_start;
			if (a2c.temp.time_end.text == "") // if start time is empty then get it from the last event
				a2c.temp.time_end.text = a2c.events[a2c.events.length - 1].time_end;
			if (a2c.temp.address.text == "") // if address is empty then get it from the last event
				a2c.temp.address.text = a2c.events[a2c.events.length - 1].address;	
		}
		else if (a2c.temp.date_start.text == "") { // if start date is still empty then get todays date
			// a2c.temp.date_start.text = new Date().toISOString().split("T")[0]; // todays date as 2018-12-10. wrong timezone (GMT)
			var today = new Date(); // Today's date
			a2c.temp.date_start.text = today.getFullYear() + "-" + pad(today.getMonth()+1) + "-" + pad(today.getDate()); // 2019-08-16
		}
		if (a2c.highlighted_text && a2c.temp.description.text == "") // Version 1.0.0 - Add highlighted_text to description
			a2c.temp.description.text = a2c.highlighted_text;
		
		add_event();
	}
	if (test_mode) console.log(a2c);
}


function download(filename, text) {
  	var blob = new Blob([text], {type: "text/plain"});
	var file = URL.createObjectURL(blob);
	//window.open(file);
	/*	chrome.downloads.download({
			url: file, // The object URL can be used as download URL
		filename: "event.ics" },
		function (downloadId) {
			if (test_mode) console.log(downloadId);
		 
	 
	}); */
	

			
  var element = document.createElement('a');
  //element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('href', file);
  element.setAttribute('download', filename);
  element.setAttribute('target', "_blank");

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element); 
}


// Version 0.9.10f - HTML entities in ld+JSON are showing up as &#8217; so we need to convert the
function convertHTMLEntities(string) {
	
	// copy string to a textarea's innerHTML and then get the textarea's value
	var textarea = document.createElement("textarea");
	textarea.innerHTML = string;
	return (textarea.value);
	
}

/* Version 0.9.7 - Event information can be in ld+json (ld = linked data)
so we need to get all ld+json scripts and iterate for event data */
function find_ld_events() { // Version 0.9.7
	var ld = document.querySelectorAll('script[type="application/ld+json"]');
	for (var i = 0; i < ld.length; i++) {
		try {
			var obj = JSON.parse(ld[i].innerText);
		}
		catch (error) { console.log(error); }
		if (typeof obj !== 'undefined')
			process_ld_object(obj);
	}
}

// See https://developers.google.com/search/docs/advanced/structured-data/event#example for ld+json event example

function process_ld_object(obj) { // Version 0.9.7
	for(var key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (typeof obj[key] === 'object') 
				process_ld_object(obj[key])
			else if (key == "@type" && obj[key].match(/event/i)) {
				var title = "", address = "", date_start = "", date_end = "", time_start = "", time_end = "";
				var description = ""; // Version 0.9.10
				title = obj["name"] || document.title;
				if (obj["location"] && obj["location"]["address"]) {
					if (obj.location.name) 
						address += obj.location.name + ", ";
					if (typeof obj.location.address === 'string')
						address += obj.location.address + ", ";
					if (obj.location.address.streetAddress) 
						address += obj.location.address.streetAddress + ", ";
					if (obj.location.address.addressLocality) 
						address += obj.location.address.addressLocality + ", ";
					if (obj.location.address.addressRegion) 
						address += obj.location.address.addressRegion + ", ";
					if (obj.location.address.postalCode) 
						address += obj.location.address.postalCode + ", ";
					if (obj.location.address.addressCountry) 
						address += obj.location.address.addressCountry;
				}
				//if (obj.location && obj.location.url) // Version 0.9.10
				//	description += obj.location.url+"\n";
				if (obj.description) // Version 0.9.10
					description += obj.description+"\n";
				if (obj.url) // Version 0.9.10
					description += obj.url+"\n";
				if (obj.startDate) { // startDate: "2021-11-16T21:00:00" or "2021-08-06T00:00:00-05:00"
					var datetime = obj.startDate;
					if (obj.startDate.match(/T/)) // They are using standard datetime obj
						datetime = obj.startDate.split("T");
					else {// They are not using standard date time object
						//if (obj.startDate.match(/\d+\/\d+\/\d+/)) // Does it match: 10/8/2021 6:00:00 PM
							datetime = obj.startDate.split(/ (.+)/); // Split at first space
						//if (!datetime[0].match(/^\d{4}/)) // If 4 digit year is not first then fix date
						if (!datetime[0].match(/^\d{4}.\d{2}.\d{2}/)) // If 4 digit year is not first then fix date // Version 1.0.0 - https://www.livenation.co.uk/event/allevents error in popup: The specified value "2022-9-06" does not conform to the required format, "yyyy-MM-dd". popup.js:185
							datetime[0] = fix_date(datetime[0]);
					}
					date_start = datetime[0] || "";
					time_start = datetime[1] || "";
				}
				if (obj.endDate) { // endDate: "2021-11-16T21:00:00" or "2021-08-06T00:00:00-05:00"
					var datetime = obj.endDate;
					if (obj.endDate.match(/T/)) // They are using standard datetime obj
						datetime = obj.endDate.split("T");
					else {// They are not using standard date time object
						//if (obj.endDate.match(/\d+\/\d+\/\d+/)) // Does it match: 10/8/2021 6:00:00 PM
							datetime = obj.endDate.split(/ (.+)/); // Split at first space
						//if (!datetime[0].match(/^\d{4}/)) // If 4 digit year is not first then fix date
						if (!datetime[0].match(/^\d{4}.\d{2}.\d{2}/)) // If 4 digit year is not first then fix date // Version 1.0.0 - https://www.livenation.co.uk/event/allevents (ld+json) error in popup: The specified value "2022-9-06" does not conform to the required format, "yyyy-MM-dd". popup.js:185
							datetime[0] = fix_date(datetime[0]);
					}
					date_end = datetime[0] || "";
					time_end = datetime[1] || "";
				}
				var event_obj = { 	
					title : convertHTMLEntities(title), 
					address : convertHTMLEntities(address),
					date_start : date_start,
					date_end : date_end,
					time_start : time_start,
					time_end : time_end,
					description : convertHTMLEntities(description), // Version 0.9.10
					//datetime_start : new Date( a2c.temp.date_start.text+" "+a2c.temp.time_start.text),
					//datetime_end: new Date( a2c.temp.date_end.text+" "+a2c.temp.time_end.text)
				};
				
				if (test_mode) console.log(event_obj);
				a2c.events.push(event_obj);
			}
		}
	}
}


function find_microdata_events() {
	var microdata = document.querySelectorAll("[itemtype*='event' i], [typeof*='event' i]");
	for (var i = 0; i < microdata.length; i++) {
		var obj = microdata2ldjson(microdata[i]);
		console.log(obj);
		//if (typeof obj !== 'undefined')
		//	process_ld_object(obj);
	}
}


function microdata2ldjson(el) {
	// Version 0.9.10 - This function turns a Microdata or RDFa block of nested HTML elements
	//	into ld+json.
	
	var obj = {};
	var obj2 = {};
	var key = "";
	var text = "";
	var type = "";
	
	if (el.hasAttribute("itemtype") // Microdata
	 || el.hasAttribute("typeof"))	// RDFa
	{
		type = el.getAttribute("itemtype") || el.getAttribute("typeof");
		type = type.replace(/https:\/\/schema.org\//i, "");
		//obj['@context'] = "https://schema.org";
	}
	if (el.hasAttribute("itemprop") 	// Microdata
	 || el.hasAttribute("property"))	// RDFa
	{
		key = el.getAttribute("itemprop") || el.getAttribute("property");
		text = el.href || el.getAttribute("content") || el.innerText || ""; 
	}
	
	
	if (el.children.length)
	for (var i = 0; i < el.children.length; i++) {
		var child_obj = microdata2ldjson(el.children[i]);
		if (child_obj) { // Add child_obj keys to current obj	
			for (var k in child_obj) {
				if (key && type) { // If the current element has a itemprop key and itemtype key
					if (!obj[key]) // If it doesn't exist already
						obj[key] = {}; // then make it an object
					obj2 = obj[key]; // Changes in obj2 will effect obj[key]
					//obj2["@type"] = type;
				} else
					obj2 = obj; // Changes in obj2 will effect obj
				
				if (obj2[k]) // if current obj already has that key
					if (Array.isArray(obj2[k])) // if array already
						obj2[k].push(child_obj[k]); // then push the child obj
					else // create new array
						obj2[k] = [ obj2[k], child_obj[k] ]; // push both objects
				else // if current obj doesn't have the child key
					obj2[k] = child_obj[k]; // Then add it to current obj
				
				if (type) 
					obj2["@type"] = type;
				
			}
		}
	}
	if (text && !obj[key]) 
		obj[key] = text; // then that key becomes a string value;
		
	// If obj is not empty then return it.
	if (Object.keys(obj).length !== 0)
		return (obj);
	else
		return false;
}

//find_all_events();


