// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function rjust(width, string, padding) { 
  return (width <= string.length) ? string : rjust(width, padding + string, padding);
}

function percentageInRange(a, b, c) {return ((a-b)/(c-b));} 						// a = Value, b = Minimum, c = Maximum.
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// GLOBALS
// ----------------------------------------------------------------------------

var server = localStorage.server || window.location.hostname;					// Try and get the last used, locally stored address. Otherwise, try the hostname.
var websocket;
var data = { index_prev: undefined };
var debug = false;
var port_default = "8000";
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// INITIALIZE
// ----------------------------------------------------------------------------

$(document).ready(function() {
	var container = document.getElementById("list-overflow");
	Ps.initialize(container);
	doConnect();
	assignActions();
	flyoutInit();
	colorCycle.init();
});

function assignActions() {														// Assign Actions to...
	$("#card_test_textbox").keypress(function(e) {
		if (e.which == 13) cardServerConnect();
	});

	$("#button_play_pause").click(function() {									// Play/Pause Button
		websocket.send("0");
	});

	$("#button_stop").click(function() {										// Stop Button
		websocket.send("1");
	});	
	
	$("#button_prev").click(function() {										// Previous Button
		websocket.send("2");
	});
	
	$("#button_next").click(function() {										// Next Button
		websocket.send("3");
	});
	
	$("#slider_volume").mousedown(function(e) {									// Volume Slider
		websocket.send(
			"4" + (1 - (e.offsetY / $("#slider_volume").height())).toString()
		);
	});
	
	$("#progress-bar").mousedown(function(e) {									// Progress Bar
		websocket.send("6" + (
			(e.offsetX / $("#progress-bar").width()) * data.lengths[data.index]
		).toString());
	});
	
	$("#icon_volume").click(function() {										// Volume Icon (Mute)
		websocket.send("7");
	});
	
	$("#button_mode").click(function() {										// Mode Switcher
		websocket.send("8");
	});
	
	$(window).resize(columnLeftSize);											// Run actions on resize...
	columnLeftSize();															// and those same actions on page load.
}

function columnLeftSize() {														// Resizes the left column to be the correct size. 
	$("#column-left").width($(window).width() - $("#column-right").width());	// What I just said.
	$("#border-shadow-1").css("right", $("#column-right").width());				// Oh, it also correctly positions that right column shadow div.
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// WEBSOCKET
// ----------------------------------------------------------------------------

function cardServerConnect() {													// Assigned to "CONNECT" button on server dialog.												
	server = $("#card_test_textbox").val();										// Sets server address to whatever user entered.
	cardServerHide();															// Hides the card to show loading indicator and prevent further input.
	doConnect();																// Attempts to connect.
}

function doConnect() {															// Try to connect to server.
	localStorage.server = server;
	try {
		if (server.indexOf(':') === -1)											// If port isn't given...
			websocket = new WebSocket("ws://" + server + ":" + port_default);	// Use default port. (Typically 8000.)
		else																	// Else...
			websocket = new WebSocket("ws://" + server);						// Use port provided.
	} catch(e) {																// If there's an error...
		cardServerShow();														// Show connect dialog again [TODO: SHOW ERROR MESSAGE IN DIALOG]
	}
	websocket.onopen = function(evt) { onOpen(evt); };							// All of these lines assign actions to the server. The function names should be self-explanatory.
	websocket.onclose = function(evt) { onClose(evt); };
	websocket.onmessage = function(evt) { onMessage(evt); };
	websocket.onerror = function(evt) { onError(evt); };
}

function onOpen(evt) {															// On server connection.
	if (debug) console.log("connected to " + server);							// Debug function, confirms connection to server.
	screenLoadHide();															// Hide the loading screen.
}

function onClose(evt) {															// On sever disconnect.
	if (debug) console.log("disconnected");										// Debug function, confirms disconnection.
	cardServerShow();															// Show server dialog.
	screenLoadShow();															// Show loading screen.
}

function screenLoadShow() {														// Show loading screen.
	if ($("#load-bg").hasClass("element_fade_out")) {
		$("#load-bg").removeClass("element_fade_out");
		$("#load-bg").addClass("element_fade_in");
	}
}

function screenLoadHide() {														// Hide loading screen.
	$("#load-bg").removeClass("element_fade_in");
	$("#load-bg").addClass("element_fade_out");
}

function cardServerShow() {														// Show server dialog.
	$("#card_test_textbox")	.val(server)										// Set textbox value to server address.
							.focus();											// Focus textbox.
	$("#card_test")	.removeClass("element_fade_out")
					.addClass("element_fade_in");
}

function cardServerHide() {														// Hide server dialog.
	$("#card_test")	.removeClass("element_fade_in")
					.addClass("element_fade_out");
	$("#card_test_textbox").blur();												// Defocus textbox.	
}

function onError(evt) {															// On connection error.
	if (debug) console.log('error: ' + evt.data);								// Debug function, log error in console.
	websocket.close();															// Close connection.
}

function onMessage(evt) {														// On data received.
	if (debug) console.log(evt.data);											// Debug function, log data in console.
	mode = evt.data.substring(0,1);												// First character of data string represents the mode.
	data = $.extend(data, JSON.parse(evt.data.substring(1, evt.data.length)));	// The rest of the string is JSON data, which will be added to the "data" object, replacing any old variables.
	switch(mode) {																// Switch-case method to handle each mode.
		case '0':																// Initialization mode.
			setPlaylist();
			setIndex();
			setPlaying();
			setProgress();
			setVolume();
			setMute();
			setMode();
			setColorTime();
			setColorCycle();
			break;
		case '1':																// Song list, not implemented.
			if (debug) console.log("Reserved for files, not implemented.");
			break;
		case '2':																// Playing/not playing.
			setPlaying();
			break;
		case '3':																// Change index of currently playing song.
			setIndex();
			setColorCycle();
			break;
		case '4':																// Song lengths list, not implemented.
			if (debug) console.log("Reserved for lengths, not implemented.");
			break;
		case '5':																// Song position.
			setProgress();
			setColorTime();
			break;
		case '6':																// Volume.
			setVolume();
			break;
		case '7':																// Mute.
			setMute();
			break;
		case '8':																// Mode of playlist. (e.g. Shuffle, repeat, etc.)
			setMode();
			break;
	}
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// GUI MANIPULATION
// ----------------------------------------------------------------------------

function setColorCycle() {														// Change currently active color cycle and total time. (Client only)
	colorCycle.changeCycle(
		data.cycles[data.cycles_index[data.index]],
		data.lengths[data.index]
	);
}

function setColorTime() { colorCycle.time = data.time; }						// Sets current time of color cycle.

function setPlaylist() {														// Populates the actual HTML playlist with received data.
	var string = "";															// Prepares HTML string by initializing it as clear.
	for (var i = 0; i < data.files.length; i++)									// For each song in data object...
		string += 	"<tr id='playlist-option-" +								// Create a table row...
					i +															// With and ID appropriate for its index...
					"' class='playlist-option'><td>" +							// And give it the appropriate class. Then, create a data cell...	
					data.files[i] + "</td><td>" +								// With the song title, and close it. Then, create another...
					Math.floor(data.lengths[i] / 60).toString() +				// With the song length's minutes...
					":" +														// A colon...
					rjust(2, Math.round(data.lengths[i] % 60).toString(), "0") +	// The song length's seconds...
					"</td></tr>";												// And close it. Then close the table row.
	$("#playlist").html(string);												// Set the playlist's contents to the string we just made.
	$(".playlist-option").click(function() {									// For each playlist option, when it is clicked...
		var id = $(this).attr("id").replace("playlist-option-", "");			// Get its id...
		websocket.send("5" + id);												// And send the id to the server with mode 5 (Change song index).
	});
}

function setPlaying() {															// Set the playing/pause button to the correct character.
	if (data.playing)															// We playin'?
		$("#button_play_pause").text("pause");									// Then we gotta be pausin'!
	else																		// Otherwise...
		$("#button_play_pause").text("play_arrow");								// We best get playin'!
}

function setIndex() {															// Set currently playing song.
	$("#song-title").text(data.files[data.index]);								// Set the big song title.
	if (data.index_prev !== null)												// If we've picked a song before... (I honestly don't know when this wouldn't be true.)
		$("#playlist-option-" + data.index_prev)								// Make the previous song lose the "highlighted" look...
			.removeClass("playlist-option-active");
	$("#playlist-option-" + data.index).addClass("playlist-option-active");		// And give it to the other option.
	data.index_prev = data.index;												// Also, the previous index will now be the current, for the next time this function is run.
}

function setProgress() {														// Set how much the progress bar is filled.
	$("#progress-bar-fill").css(												// To this, we set a <div> inside of the bar to a width equal to the percentage of the song's progression.
		"width",
		Math.min(
			((data.time / data.lengths[data.index]) * 100), 100
		).toString() + "%"
	);
}

function setVolume() {															// Set the current volume.
	$("#slider_volume_set").css(												// Works kinda like the progress bar, except vertical.
		"height",
		(data.volume * 100).toString() + "%"
	);
}

function setMute() {															// Set the mute/volume button. 
	if (data.mute)																// This works like the play/pause button.
		$("#icon_volume").text("volume_mute");
	else
		$("#icon_volume").text("volume_up");
}

function setMode() {															// Set playlist mode button.
	var text = "arrow_forward";													// By default, will be an arrow. (Case 0: Play all once)
	switch(data.mode) {
		case 1:																	// Case 1: Repeat
			text = "repeat";	
			break;
		case 2:																	// Case 2: Repeat one track
			text = "repeat_one";
			break;
		case 3:																	// Case 3: Shuffle
			text = "shuffle";
	}
	$("#button_mode").text(text);												// Set button icon.
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// FLYOUTS
// ----------------------------------------------------------------------------

function flyoutInit() {															// Initialize all flyouts.
	$(document).click(function(e) {												// When the page is clicked anywhere...
		if (debug) console.log(e);												// Debug function, log event data
		if(e.target.classList.contains("flyout")) {								// If the target is a flyout...
			$("#" + e.target.id)												// Open the flyout!
				.addClass("flyout_open")
				.removeClass("flyout_default");

			$("#" + e.target.id + " .flyout_contents")							// Open the contents!
				.addClass("flyout_contents_open")
				.removeClass("flyout_contents_default");

			$("#" + e.target.id + " .flyout_container")							// Open the container!
				.addClass("flyout_container_open")
				.removeClass("flyout_container_default");
		} else {																// Otherwise...
			if (!e.target.classList.contains("flyout_object")) {				// If the target is not a flyout object...
				for (var i = 0; i < $(".flyout").length; i++) {					// For each flyout...
					$($(".flyout")[i])											// Close the flyout!
						.addClass("flyout_default")
						.removeClass("flyout_open");
					
					$("#" + $(".flyout")[i].id + " .flyout_contents")			// Close the contents!
						.addClass("flyout_contents_default")
						.removeClass("flyout_contents_open");

					$("#" + $(".flyout")[i].id + " .flyout_container")			// Close the container!
						.addClass("flyout_container_default")
						.removeClass("flyout_container_open");
				}
			}
		}
	});
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// COLOR CYCLING
// ----------------------------------------------------------------------------

var colorCycle = {																// Background color cycling. (Shares code with server-side color cycle.)
	element: undefined,															// Target element for background color.

	refreshRate: 1000/4,														// Refresh rate, in milliseconds.
	fadeOut: 2,																	// Fade out time, in seconds.
	fadeOutOffset: 1,															// Fade out offset time from end of song, in seconds.

	time: 0,																	// Current time.
	queue: [],																	// Queue of colors to cycle through. Each time is how long it takes to fade INTO the color.
	timeTotal: undefined,														// Total time of current cycle.
	
	init: function() {															// Initialize the cycle.
		this.element = document.getElementById("column-left");					// Get element by id.
		$(this.element).css(													// Change the CSS of the element to fade in such a way that it syncs up with the refresh rate.
			"transition",
			"background-color " +
				(this.refreshRate/1000).toString() + "s linear"
		);
		setInterval(function(){													// Set the update function to run in time with the refresh rate.
			colorCycle.threadMain();
		}, this.refreshRate);
	},
	
	changeCycle: function(string, timeTotal) {												// Change the cycle by loading from a string.
		this.queue = [];														// Empty the queue.
		var arrayFile = string.split("\n");										// Split the string by lines.
		for (var i = 0; i < arrayFile.length; i++) {							// For each line...
			var arrayLine = arrayFile[i].split(",");							// Split the line by commas.
			this.queue.push({													// Create a new color cycle object with...
				color: arrayLine.slice(0,3).map(								// The color, created from the first 3 arguments in the line.
					function(x){return parseInt(x);}								// (Convert each color from a string to an integer.)
				),
				time: parseFloat(arrayLine[3])									// The time, represented by the 4th argument and converted to a float.
			});
		}
		this.timeTotal = timeTotal;
	},
	
	threadMain: function() {													// Update current color.
		if ((this.queue.length !== 0) && (this.timeTotal !== undefined)) {
			var i = 0;															// Set the current index to 0.
			var timeReach = 0;													// Set the total time from each color in the queue needed to reach past or equal to the current time.
			while (this.time >= timeReach) {									// While the current time is greater than or equal to the needed time... 
				i %= this.queue.length;																// Get the remainder (modulo) the current index by the length of the queue.
				timeReach += this.queue[i].time;								// Add the time at the current index in the queue to the total time.
				i++;															// Increment the index by 1.
			}
			i--;																// Subtract one from the index.

			var percentage = percentageInRange(									// Get the fade percentage between the destination index and the initial.
				this.time,
				timeReach - this.queue[i].time,
				timeReach
			);
			
			var colorCurrent = [];												// Set the current color to an empty array.
			var colorInit;
			for (var c = 0; c < 3; c++) {										// For r, g, and b...
				if (i <= 0)														// If the current index is less than or equal to 0...
					if (this.time >= this.queue[0].time)						// If the current time is greater than the time the first color lasts...
						colorInit =	this.queue[this.queue.length - 1].color[c];	// Set the color to fade in from to the last color in the queue. This allows the cycle to repeat smoothly.
					else														// Otherwise...
						colorInit = 0;											// Set the fade in color to black.
				else															// Otherwise...
					colorInit = this.queue[i - 1].color[c];						// Set the initial color to one before the current index.
				var colorDest = this.queue[i].color[c]							// The destination color will always be at the current index.
				
				var colorResult =												// Get the resultant color between these two, with the progression dictated by the percentage found earlier.
					(percentage * (colorDest - colorInit)) + colorInit;
				
				var fadeEnd = this.timeTotal - this.fadeOutOffset;				// The end time for the fade-out is the total time of the cycle minus the fade out offset.
				var fadeStart = fadeEnd - this.fadeOut;
				if (this.time >= fadeStart) {									// If the current time is greater than the start time of the fade...
					colorResult *= 1 - Math.min(Math.max(percentageInRange(		// Darken the color based on the progression of the fade.
						this.time,
						fadeStart,
						fadeEnd
					),0),1);
				}
				colorCurrent.push(Math.round(colorResult));						// Add the resultant color to the array.
			}
			this.element.style.backgroundColor =								// Set the color of the element.
				"rgb(" + colorCurrent.toString() + ")";
		}
	}
};
// ----------------------------------------------------------------------------