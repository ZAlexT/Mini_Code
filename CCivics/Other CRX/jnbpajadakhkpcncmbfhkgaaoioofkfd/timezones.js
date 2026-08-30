/* JavaScript object with timezone offsets and names 
	
//Below is how I got the object from https://calendar.google.com/calendar/u/0/r/eventedit?&text=Chris+Brown+%26+Lil+Baby&dates=20220722T230000Z/20220723T010000Z&location=Madison+Square+Garden,+4+Penn+Plaza,+New+York,+NY,+10001,+US&details=More+Info:+https://www.msg.com/calendar/madison-square-garden-july-2022-chris-brown-lil-baby

		
var timezones = [];
var listbox = document.querySelector("[role='listbox'][aria-label='Event start time zone']");
var options = listbox.querySelectorAll("[role='option']");
for (var i = 1; i < options.length; i++) { // Start at 1 because 0 is suggested timezone
	var name = options[i].getAttribute('data-value');
	var place = options[i].innerText.match(/([+-]\d{2}:\d{2})\) (?:.*? - )?(.*?) ?(?:Time|Standard Time)?$/)[2];
	var offset = options[i].innerText.match(/[+-]\d{2}:\d{2}/)[0]; // from '(GMT-11:00) Niue Time' to '-11:00'
	var offset_minutes = parseInt(offset) * -60; // From '-11:00' to 660
	var obj = {
		name: name,
		place: place,
		offset_minutes: offset_minutes,
		offset: offset
	}
	timezones.push(obj);
}


*/

// To get all timezoneNames and TimeZone
function getTimeZones(date) {
	date = date || new Date(); // Or today's date
	var timezones = Intl.supportedValuesOf('timeZone');	
	var name_and_offset = [];
	var re = /^(?:.*?)(?:\s(?:AM|PM|))\s(?:GMT)?(.*?)$/i;
	
	for (var i = 0; i < timezones.length; i++) {
		var longOffset = date.toLocaleString('en-US', { timeZone: timezones[i], timeZoneName : 'longOffset'});
		var long = date.toLocaleString('en-US', { timeZone: timezones[i],timeZoneName : 'long',});
		var short = date.toLocaleString('en-US', { timeZone: timezones[i],timeZoneName : 'short',});
		var longGeneric = date.toLocaleString('en-US', { timeZone: timezones[i],timeZoneName : 'longGeneric',});
		var obj = {
			name: timezones[i],
			longOffset: longOffset.match(re)[1],
			long: long.match(re)[1],
			short: short.match(re)[1],
			longGeneric: longGeneric.match(re)[1],
		}
		
		name_and_offset.push(obj);
	}	
	return(name_and_offset);
	// So in the future I could change the timezones to the correct timezones for the current date
	// (Ex: America/Los Angeles -07:00 in summer and -08:00 in winter) because of DST
	// So see if timezone name matches from this function and then change the offset
}
	
	
function pad(n) { 
  if (n < 10 & n >=0){
	return ("0" + n);
  }
  // NOTE: -9 not -11
  if(n < 0 & n >= -9){
	return ("-0" + Math.abs(n));
  }
  return n; 
}
	

// Get timezone_name and offset from browser using JavaScript (Needs pad() function above)
function user_timezone() {	

	var timezone_name = Intl.DateTimeFormat().resolvedOptions().timeZone; // user's timezone name: 'America/Los_Angeles'
	var offset_minutes = new Date().getTimezoneOffset(); // 420
	var offset = String(offset_minutes / -60); // From 420 to "-7"
	var parts = parseInt(offset).toFixed(2).split('.');
	var offset = pad(parts[0]) + ':' + parts[1];
	/* Another way to get timeZoneOffset
		d.toLocaleString('en-US', { timeZoneName : 'longOffset',});
		Result: '7/22/2022, 4:00:00 PM GMT-07:00' or '12/1/2022, 12:00:00 AM GMT-08:00'
	*/
	var obj = { 
		name: timezone_name,
		offset_minutes: offset_minutes,
		offset: offset
	}
	return obj;
}

function guess_timezone_name(offset, address) { 	// offset = String such as "-07:00", address = String (ex: "New York, NY")
	var found = false;
	var address = address || false;
	var most_matches = 0;
	loop1:
	for (var i = 0; i < timezones.length; i++) {
		if (timezones[i].offset == offset) { // We found a matching offset
			if (!found) // Since this is the first find we will take it but search for a better match
				found = timezones[i].name;
			if (address) {
				var parts = timezones[i].name.split("/"); //  "America/Kentucky/Louisville"
				var parts2 = timezones[i].place.split("/"); 
				parts.push.apply(parts, parts2); // Add place name to array just in case
				var match_count = 0;
				for (var p = 0; p < parts.length; p++) {
					var re = new RegExp('\\b'+parts[p]+'\\b', 'i');
					if (address.match(re)) { // We found a city or country match as well!
						match_count++;
						if (match_count > most_matches) {
							most_matches = match_count;
							found = timezones[i].name;
						}
					}
				}
			}
		}
		else if (found) { // We already found an offset and the timezone is no longer matching
			break loop1; // Break since we exhausted all matching timezones
		}
	}
	return (found);
}


var timezones = [
    {
        "name": "Pacific/Niue",
        "place": "Niue",
        "offset_minutes": 660,
        "offset": "-11:00"
    },
    {
        "name": "Pacific/Pago_Pago",
        "place": "Samoa",
        "offset_minutes": 660,
        "offset": "-11:00"
    },
    {
        "name": "Pacific/Rarotonga",
        "place": "Cook Islands",
        "offset_minutes": 600,
        "offset": "-10:00"
    },
    {
        "name": "Pacific/Honolulu",
        "place": "Hawaii/Aleutian",
        "offset_minutes": 600,
        "offset": "-10:00"
    },
    {
        "name": "Pacific/Tahiti",
        "place": "Tahiti",
        "offset_minutes": 600,
        "offset": "-10:00"
    },
    {
        "name": "Pacific/Marquesas",
        "place": "Marquesas",
        "offset_minutes": 540,
        "offset": "-09:30"
    },
    {
        "name": "Pacific/Gambier",
        "place": "Gambier",
        "offset_minutes": 540,
        "offset": "-09:00"
    },
    {
        "name": "America/Adak",
        "place": "Hawaii/Aleutian",
        "offset_minutes": 540,
        "offset": "-09:00"
    },
    {
        "name": "America/Anchorage",
        "place": "Anchorage",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "America/Juneau",
        "place": "Juneau",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "America/Metlakatla",
        "place": "Metlakatla",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "America/Nome",
        "place": "Nome",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "America/Sitka",
        "place": "Sitka",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "America/Yakutat",
        "place": "Yakutat",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "Pacific/Pitcairn",
        "place": "Pitcairn",
        "offset_minutes": 480,
        "offset": "-08:00"
    },
    {
        "name": "America/Hermosillo",
        "place": "Mexican Pacific",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Dawson_Creek",
        "place": "Dawson Creek",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Fort_Nelson",
        "place": "Fort Nelson",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Phoenix",
        "place": "Phoenix",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Los_Angeles",
        "place": "Los Angeles",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Tijuana",
        "place": "Tijuana",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Vancouver",
        "place": "Vancouver",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Dawson",
        "place": "Dawson",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Whitehorse",
        "place": "Whitehorse",
        "offset_minutes": 420,
        "offset": "-07:00"
    },
    {
        "name": "America/Belize",
        "place": "Belize",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Costa_Rica",
        "place": "Costa Rica",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/El_Salvador",
        "place": "El Salvador",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Guatemala",
        "place": "Guatemala",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Managua",
        "place": "Managua",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Regina",
        "place": "Regina",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Swift_Current",
        "place": "Swift Current",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Tegucigalpa",
        "place": "Tegucigalpa",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "Pacific/Easter",
        "place": "Easter Island",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "Pacific/Galapagos",
        "place": "Galapagos",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Chihuahua",
        "place": "Chihuahua",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Mazatlan",
        "place": "Mazatlan",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Boise",
        "place": "Boise",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Cambridge_Bay",
        "place": "Cambridge Bay",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Denver",
        "place": "Denver",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Edmonton",
        "place": "Edmonton",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Inuvik",
        "place": "Inuvik",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Ojinaga",
        "place": "Ojinaga",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Yellowknife",
        "place": "Yellowknife",
        "offset_minutes": 360,
        "offset": "-06:00"
    },
    {
        "name": "America/Eirunepe",
        "place": "Eirunepe",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Rio_Branco",
        "place": "Rio Branco",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Bahia_Banderas",
        "place": "Bahia Banderas",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/North_Dakota/Beulah",
        "place": "Beulah, North Dakota",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/North_Dakota/Center",
        "place": "Center, North Dakota",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Chicago",
        "place": "Chicago",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Indiana/Knox",
        "place": "Knox, Indiana",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Matamoros",
        "place": "Matamoros",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Menominee",
        "place": "Menominee",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Merida",
        "place": "Merida",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Mexico_City",
        "place": "Mexico City",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Monterrey",
        "place": "Monterrey",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/North_Dakota/New_Salem",
        "place": "New Salem, North Dakota",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Rainy_River",
        "place": "Rainy River",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Rankin_Inlet",
        "place": "Rankin Inlet",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Resolute",
        "place": "Resolute",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Indiana/Tell_City",
        "place": "Tell City, Indiana",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Winnipeg",
        "place": "Winnipeg",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Bogota",
        "place": "Colombia",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Cancun",
        "place": "Cancun",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Jamaica",
        "place": "Jamaica",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Panama",
        "place": "Panama",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Guayaquil",
        "place": "Ecuador",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Lima",
        "place": "Peru",
        "offset_minutes": 300,
        "offset": "-05:00"
    },
    {
        "name": "America/Boa_Vista",
        "place": "Boa Vista",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Campo_Grande",
        "place": "Campo Grande",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Cuiaba",
        "place": "Cuiaba",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Manaus",
        "place": "Manaus",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Porto_Velho",
        "place": "Porto Velho",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Barbados",
        "place": "Barbados",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Martinique",
        "place": "Martinique",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Puerto_Rico",
        "place": "Puerto Rico",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Santo_Domingo",
        "place": "Santo Domingo",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/La_Paz",
        "place": "Bolivia",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Santiago",
        "place": "Chile",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Havana",
        "place": "Cuba",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Detroit",
        "place": "Detroit",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Grand_Turk",
        "place": "Grand Turk",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Indiana/Indianapolis",
        "place": "Indianapolis",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Iqaluit",
        "place": "Iqaluit",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Kentucky/Louisville",
        "place": "Louisville",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Indiana/Marengo",
        "place": "Marengo, Indiana",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Kentucky/Monticello",
        "place": "Monticello, Kentucky",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/New_York",
        "place": "New York",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Nipigon",
        "place": "Nipigon",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Pangnirtung",
        "place": "Pangnirtung",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Indiana/Petersburg",
        "place": "Petersburg, Indiana",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Port-au-Prince",
        "place": "Port-au-Prince",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Thunder_Bay",
        "place": "Thunder Bay",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Toronto",
        "place": "Toronto",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Indiana/Vevay",
        "place": "Vevay, Indiana",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Indiana/Vincennes",
        "place": "Vincennes, Indiana",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Indiana/Winamac",
        "place": "Winamac, Indiana",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Guyana",
        "place": "Guyana",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Asuncion",
        "place": "Paraguay",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Caracas",
        "place": "Venezuela",
        "offset_minutes": 240,
        "offset": "-04:00"
    },
    {
        "name": "America/Argentina/Buenos_Aires",
        "place": "Buenos Aires",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Catamarca",
        "place": "Catamarca",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Cordoba",
        "place": "Cordoba",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Jujuy",
        "place": "Jujuy",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/La_Rioja",
        "place": "La Rioja",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Mendoza",
        "place": "Mendoza",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Rio_Gallegos",
        "place": "Rio Gallegos",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Salta",
        "place": "Salta",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/San_Juan",
        "place": "San Juan",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/San_Luis",
        "place": "San Luis",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Tucuman",
        "place": "Tucuman",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Argentina/Ushuaia",
        "place": "Ushuaia",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "Atlantic/Bermuda",
        "place": "Bermuda",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Glace_Bay",
        "place": "Glace Bay",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Goose_Bay",
        "place": "Goose Bay",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Halifax",
        "place": "Halifax",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Moncton",
        "place": "Moncton",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Thule",
        "place": "Thule",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Araguaina",
        "place": "Araguaina",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Bahia",
        "place": "Bahia",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Belem",
        "place": "Belem",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Fortaleza",
        "place": "Fortaleza",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Maceio",
        "place": "Maceio",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Recife",
        "place": "Recife",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Santarem",
        "place": "Santarem",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Sao_Paulo",
        "place": "Sao Paulo",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "Atlantic/Stanley",
        "place": "Falkland Islands",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Cayenne",
        "place": "French Guiana",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "Antarctica/Palmer",
        "place": "Palmer",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Punta_Arenas",
        "place": "Punta Arenas",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "Antarctica/Rothera",
        "place": "Rothera",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Paramaribo",
        "place": "Suriname",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/Montevideo",
        "place": "Uruguay",
        "offset_minutes": 180,
        "offset": "-03:00"
    },
    {
        "name": "America/St_Johns",
        "place": "Newfoundland",
        "offset_minutes": 120,
        "offset": "-02:30"
    },
    {
        "name": "America/Noronha",
        "place": "Fernando de Noronha",
        "offset_minutes": 120,
        "offset": "-02:00"
    },
    {
        "name": "Atlantic/South_Georgia",
        "place": "South Georgia",
        "offset_minutes": 120,
        "offset": "-02:00"
    },
    {
        "name": "America/Miquelon",
        "place": "St. Pierre & Miquelon",
        "offset_minutes": 120,
        "offset": "-02:00"
    },
    {
        "name": "America/Nuuk",
        "place": "West Greenland",
        "offset_minutes": 120,
        "offset": "-02:00"
    },
    {
        "name": "Atlantic/Cape_Verde",
        "place": "Cape Verde",
        "offset_minutes": 60,
        "offset": "-01:00"
    },
	{
        "name": "Etc/GMT",
        "place": "Greenwich Mean",
        "offset_minutes": 0,
        "offset": "-00:00"
    },
	{
        "name": "Etc/GMT",
        "place": "Greenwich Mean",
        "offset_minutes": 0,
        "offset": "Z"
    },
	{
        "name": "Etc/GMT",
        "place": "Greenwich Mean",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Atlantic/Azores",
        "place": "Azores",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "UTC",
        "place": "Coordinated Universal",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "America/Scoresbysund",
        "place": "East Greenland",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Africa/Abidjan",
        "place": "Abidjan",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Africa/Bissau",
        "place": "Bissau",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "America/Danmarkshavn",
        "place": "Danmarkshavn",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Africa/Monrovia",
        "place": "Monrovia",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Atlantic/Reykjavik",
        "place": "Reykjavik",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Africa/Sao_Tome",
        "place": "São Tomé",
        "offset_minutes": 0,
        "offset": "+00:00"
    },
    {
        "name": "Africa/Algiers",
        "place": "Algiers",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Africa/Tunis",
        "place": "Tunis",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Europe/Dublin",
        "place": "Ireland",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Africa/Casablanca",
        "place": "Morocco",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Europe/London",
        "place": "United Kingdom",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Africa/Lagos",
        "place": "Lagos",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Africa/Ndjamena",
        "place": "Ndjamena",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Atlantic/Canary",
        "place": "Canary",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Atlantic/Faroe",
        "place": "Faroe",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Europe/Lisbon",
        "place": "Lisbon",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Atlantic/Madeira",
        "place": "Madeira",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Africa/El_Aaiun",
        "place": "Western Sahara",
        "offset_minutes": -60,
        "offset": "+01:00"
    },
    {
        "name": "Africa/Juba",
        "place": "Juba",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Khartoum",
        "place": "Khartoum",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Maputo",
        "place": "Maputo",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Windhoek",
        "place": "Windhoek",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Amsterdam",
        "place": "Amsterdam",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Andorra",
        "place": "Andorra",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Belgrade",
        "place": "Belgrade",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Berlin",
        "place": "Berlin",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Brussels",
        "place": "Brussels",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Budapest",
        "place": "Budapest",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Ceuta",
        "place": "Ceuta",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Copenhagen",
        "place": "Copenhagen",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Gibraltar",
        "place": "Gibraltar",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Luxembourg",
        "place": "Luxembourg",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Madrid",
        "place": "Madrid",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Malta",
        "place": "Malta",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Monaco",
        "place": "Monaco",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Oslo",
        "place": "Oslo",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Paris",
        "place": "Paris",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Prague",
        "place": "Prague",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Rome",
        "place": "Rome",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Stockholm",
        "place": "Stockholm",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Tirane",
        "place": "Tirane",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Vienna",
        "place": "Vienna",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Warsaw",
        "place": "Warsaw",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Zurich",
        "place": "Zurich",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Cairo",
        "place": "Cairo",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Europe/Kaliningrad",
        "place": "Kaliningrad",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Tripoli",
        "place": "Tripoli",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Africa/Johannesburg",
        "place": "South Africa",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Antarctica/Troll",
        "place": "Troll",
        "offset_minutes": -120,
        "offset": "+02:00"
    },
    {
        "name": "Asia/Baghdad",
        "place": "Baghdad",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Qatar",
        "place": "Qatar",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Riyadh",
        "place": "Riyadh",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Africa/Nairobi",
        "place": "East Africa",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Amman",
        "place": "Amman",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Athens",
        "place": "Athens",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Beirut",
        "place": "Beirut",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Bucharest",
        "place": "Bucharest",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Chisinau",
        "place": "Chisinau",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Damascus",
        "place": "Damascus",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Gaza",
        "place": "Gaza",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Hebron",
        "place": "Hebron",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Helsinki",
        "place": "Helsinki",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Kiev",
        "place": "Kyiv",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Nicosia",
        "place": "Nicosia",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Riga",
        "place": "Riga",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Sofia",
        "place": "Sofia",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Tallinn",
        "place": "Tallinn",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Uzhgorod",
        "place": "Uzhhorod",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Vilnius",
        "place": "Vilnius",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Zaporozhye",
        "place": "Zaporozhye",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Famagusta",
        "place": "Famagusta",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Jerusalem",
        "place": "Israel",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Kirov",
        "place": "Kirov",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Minsk",
        "place": "Minsk",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Moscow",
        "place": "Moscow",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Simferopol",
        "place": "Simferopol",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Istanbul",
        "place": "Turkey",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Europe/Volgograd",
        "place": "Volgograd",
        "offset_minutes": -180,
        "offset": "+03:00"
    },
    {
        "name": "Asia/Yerevan",
        "place": "Armenia",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Europe/Astrakhan",
        "place": "Astrakhan",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Asia/Baku",
        "place": "Azerbaijan",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Asia/Tbilisi",
        "place": "Georgia",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Asia/Dubai",
        "place": "Gulf",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Indian/Mauritius",
        "place": "Mauritius",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Indian/Reunion",
        "place": "Réunion",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Europe/Samara",
        "place": "Samara",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Europe/Saratov",
        "place": "Saratov",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Indian/Mahe",
        "place": "Seychelles",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Europe/Ulyanovsk",
        "place": "Ulyanovsk",
        "offset_minutes": -240,
        "offset": "+04:00"
    },
    {
        "name": "Asia/Kabul",
        "place": "Afghanistan",
        "offset_minutes": -240,
        "offset": "+04:30"
    },
    {
        "name": "Asia/Tehran",
        "place": "Iran",
        "offset_minutes": -240,
        "offset": "+04:30"
    },
    {
        "name": "Indian/Kerguelen",
        "place": "French Southern & Antarctic",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Indian/Maldives",
        "place": "Maldives",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Antarctica/Mawson",
        "place": "Mawson",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Karachi",
        "place": "Pakistan",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Dushanbe",
        "place": "Tajikistan",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Ashgabat",
        "place": "Turkmenistan",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Samarkand",
        "place": "Samarkand",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Tashkent",
        "place": "Tashkent",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Aqtau",
        "place": "Aqtau",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Aqtobe",
        "place": "Aqtobe",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Atyrau",
        "place": "Atyrau",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Oral",
        "place": "Oral",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Qyzylorda",
        "place": "Qyzylorda",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Yekaterinburg",
        "place": "Yekaterinburg",
        "offset_minutes": -300,
        "offset": "+05:00"
    },
    {
        "name": "Asia/Colombo",
        "place": "Colombo",
        "offset_minutes": -300,
        "offset": "+05:30"
    },
    {
        "name": "Asia/Kolkata",
        "place": "Kolkata",
        "offset_minutes": -300,
        "offset": "+05:30"
    },
    {
        "name": "Asia/Kathmandu",
        "place": "Nepal",
        "offset_minutes": -300,
        "offset": "+05:45"
    },
    {
        "name": "Asia/Dhaka",
        "place": "Bangladesh",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Asia/Thimphu",
        "place": "Bhutan",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Asia/Almaty",
        "place": "Almaty",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Asia/Qostanay",
        "place": "Kostanay",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Indian/Chagos",
        "place": "Indian Ocean",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Asia/Bishkek",
        "place": "Kyrgyzstan",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Asia/Omsk",
        "place": "Omsk",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Asia/Urumqi",
        "place": "Urumqi",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Antarctica/Vostok",
        "place": "Vostok",
        "offset_minutes": -360,
        "offset": "+06:00"
    },
    {
        "name": "Indian/Cocos",
        "place": "Cocos Islands",
        "offset_minutes": -360,
        "offset": "+06:30"
    },
    {
        "name": "Asia/Yangon",
        "place": "Myanmar",
        "offset_minutes": -360,
        "offset": "+06:30"
    },
    {
        "name": "Asia/Barnaul",
        "place": "Barnaul",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Indian/Christmas",
        "place": "Christmas Island",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Antarctica/Davis",
        "place": "Davis",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Hovd",
        "place": "Hovd",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Bangkok",
        "place": "Bangkok",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Ho_Chi_Minh",
        "place": "Ho Chi Minh City",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Krasnoyarsk",
        "place": "Krasnoyarsk",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Novokuznetsk",
        "place": "Novokuznetsk",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Novosibirsk",
        "place": "Novosibirsk",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Tomsk",
        "place": "Tomsk",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Jakarta",
        "place": "Jakarta",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Asia/Pontianak",
        "place": "Pontianak",
        "offset_minutes": -420,
        "offset": "+07:00"
    },
    {
        "name": "Australia/Perth",
        "place": "Australian Western",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Brunei",
        "place": "Brunei Darussalam",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Makassar",
        "place": "Central Indonesia",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Macau",
        "place": "Macao",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Shanghai",
        "place": "Shanghai",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Hong_Kong",
        "place": "Hong Kong",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Irkutsk",
        "place": "Irkutsk",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Kuala_Lumpur",
        "place": "Kuala Lumpur",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Kuching",
        "place": "Kuching",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Manila",
        "place": "Philippine",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Singapore",
        "place": "Singapore",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Taipei",
        "place": "Taipei",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Choibalsan",
        "place": "Choibalsan",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Asia/Ulaanbaatar",
        "place": "Ulaanbaatar",
        "offset_minutes": -480,
        "offset": "+08:00"
    },
    {
        "name": "Australia/Eucla",
        "place": "Australian Central Western",
        "offset_minutes": -480,
        "offset": "+08:45"
    },
    {
        "name": "Asia/Dili",
        "place": "East Timor",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Jayapura",
        "place": "Eastern Indonesia",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Tokyo",
        "place": "Japan",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Pyongyang",
        "place": "Pyongyang",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Seoul",
        "place": "Seoul",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Pacific/Palau",
        "place": "Palau",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Chita",
        "place": "Chita",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Khandyga",
        "place": "Khandyga",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Asia/Yakutsk",
        "place": "Yakutsk",
        "offset_minutes": -540,
        "offset": "+09:00"
    },
    {
        "name": "Australia/Darwin",
        "place": "Australian Central",
        "offset_minutes": -540,
        "offset": "+09:30"
    },
    {
        "name": "Australia/Adelaide",
        "place": "Adelaide",
        "offset_minutes": -540,
        "offset": "+09:30"
    },
    {
        "name": "Australia/Broken_Hill",
        "place": "Broken Hill",
        "offset_minutes": -540,
        "offset": "+09:30"
    },
    {
        "name": "Australia/Brisbane",
        "place": "Brisbane",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Australia/Lindeman",
        "place": "Lindeman",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Pacific/Guam",
        "place": "Chamorro",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Pacific/Chuuk",
        "place": "Chuuk",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Australia/Hobart",
        "place": "Hobart",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Antarctica/Macquarie",
        "place": "Macquarie",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Australia/Melbourne",
        "place": "Melbourne",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Australia/Sydney",
        "place": "Sydney",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Pacific/Port_Moresby",
        "place": "Papua New Guinea",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Asia/Ust-Nera",
        "place": "Ust-Nera",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Asia/Vladivostok",
        "place": "Vladivostok",
        "offset_minutes": -600,
        "offset": "+10:00"
    },
    {
        "name": "Australia/Lord_Howe",
        "place": "Lord Howe",
        "offset_minutes": -600,
        "offset": "+10:30"
    },
    {
        "name": "Pacific/Bougainville",
        "place": "Bougainville",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Antarctica/Casey",
        "place": "Casey",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Pacific/Kosrae",
        "place": "Kosrae",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Asia/Magadan",
        "place": "Magadan",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Pacific/Noumea",
        "place": "New Caledonia",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Pacific/Norfolk",
        "place": "Norfolk Island",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Pacific/Pohnpei",
        "place": "Ponape",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Asia/Sakhalin",
        "place": "Sakhalin",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Pacific/Guadalcanal",
        "place": "Solomon Islands",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Asia/Srednekolymsk",
        "place": "Srednekolymsk",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Pacific/Efate",
        "place": "Vanuatu",
        "offset_minutes": -660,
        "offset": "+11:00"
    },
    {
        "name": "Asia/Anadyr",
        "place": "Anadyr",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Fiji",
        "place": "Fiji",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Tarawa",
        "place": "Gilbert Islands",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Kwajalein",
        "place": "Kwajalein",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Majuro",
        "place": "Majuro",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Nauru",
        "place": "Nauru",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Auckland",
        "place": "New Zealand",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Asia/Kamchatka",
        "place": "Petropavlovsk-Kamchatski",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Funafuti",
        "place": "Tuvalu",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Wake",
        "place": "Wake Island",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Wallis",
        "place": "Wallis & Futuna",
        "offset_minutes": -720,
        "offset": "+12:00"
    },
    {
        "name": "Pacific/Chatham",
        "place": "Chatham",
        "offset_minutes": -720,
        "offset": "+12:45"
    },
    {
        "name": "Pacific/Apia",
        "place": "Apia",
        "offset_minutes": -780,
        "offset": "+13:00"
    },
    {
        "name": "Pacific/Kanton",
        "place": "Phoenix Islands",
        "offset_minutes": -780,
        "offset": "+13:00"
    },
    {
        "name": "Pacific/Fakaofo",
        "place": "Tokelau",
        "offset_minutes": -780,
        "offset": "+13:00"
    },
    {
        "name": "Pacific/Tongatapu",
        "place": "Tonga",
        "offset_minutes": -780,
        "offset": "+13:00"
    },
    {
        "name": "Pacific/Kiritimati",
        "place": "Line Islands",
        "offset_minutes": -840,
        "offset": "+14:00"
    }
]