var maxTransferPackages = 90;
var transferPackages = [5, 10, 15, 30, 35, 40, 60, 65, 90];
var transferPackagesPrices = [5, 10, 15, 12.50, 17.50, 22.50, 25, 30, 37.50];

// For preferences
var userkey = '';
var lang = 'en';
var uiType = 'normal';
var color_code_upload = false;

// From pommepause.com poke
var new_version_available = false;

// From selectedPlan
var limitTotal = 50;
var surchargePerGb = 4.50;
var surchargeLimit = 50;

// For AJAX request & response
var xml_request = null;
var last_updated = 0;
var date_last_updated_data = new Date(); date_last_updated_data.setTime(0);
var response = null;
var load_usage_error = null;
var loadUsageTimer;
var pastAPIRequests = new Array();

var currentVersion = null;

// jQuery-like $() function that returns a SuperObject which can be used like a jQuery object: $('#id').val(value).html(value).css('top', '10px').etc()
function $(selector) {
    selector = selector.substr(1); // only selector == '#id' is supported here
    var result = new SuperObject();
    var elem = document.getElementById(selector);
	if (elem && elem.parentNode) {
		result.length = 1;
		result[0] = elem;
	}
	return result;
}
SuperObject = function() {
    length = 0;
}
SuperObject.prototype.val = function(value) {
    if (typeof value == 'undefined') {
        return this[0].value;
    }
    this[0].value = value;
    return this;
}
SuperObject.prototype.html = function(html) {
    if (typeof html == 'undefined') {
        return this[0].innerHTML;
    }
    this[0].innerHTML = html;
    return this;
}
SuperObject.prototype.css = function(property, value) {
    if (typeof value == 'undefined') {
        switch (property) {
            case 'display':
                return this[0].style.display;
            case 'marginTop':
                return this[0].style.marginTop;
            case 'paddingTop':
                return this[0].style.paddingTop;
            case 'top':
                return this[0].style.top;
            case 'left':
                return this[0].style.left;
            case 'width':
                return this[0].style.width;
            case 'height':
                return this[0].style.height;
            case 'background':
                return this[0].style.background;
            case 'fontWeight':
                return this[0].style.fontWeight;
            case 'color':
                return this[0].style.color;
            default:
                calert("Error: property " + property + " not implemented in SuperObject.prototype.css(property)");
                return null;
        }
    }
    switch (property) {
        case 'display':
            this[0].style.display = value; break;
        case 'marginTop':
            this[0].style.marginTop = value; break;
        case 'paddingTop':
            this[0].style.paddingTop = value; break;
        case 'top':
            this[0].style.top = value; break;
        case 'left':
            this[0].style.left = value; break;
        case 'width':
            this[0].style.width = value; break;
        case 'height':
            this[0].style.height = value; break;
        case 'background':
            this[0].style.background = value; break;
        case 'fontWeight':
            this[0].style.fontWeight = value; break;
        case 'color':
            this[0].style.color = value; break;
        default:
            calert("Error: property " + property + " not implemented in SuperObject.prototype.css(property, value)");
    }
    return this;
}
SuperObject.prototype.show = function(value) {
    var t = this[0].tagName.toLowerCase();
    if (t == 'span' || t == 'img') {
        return this.css('display', 'inline');
    }
    return this.css('display', 'block');
}
SuperObject.prototype.hide = function(value) {
    return this.css('display', 'none');
}
SuperObject.prototype.attr = function(attribute, value) {
    if (typeof value == 'undefined') {
        switch (attribute) {
            case 'src':
                return this[0].src;
            default:
                calert("Error: attribute " + attribute + " not implemented in SuperObject.prototype.attr(attribute)");
                return null;
        }
    }
    switch (attribute) {
        case 'src':
            this[0].src = value; break;
        default:
            calert("Error: attribute " + attribute + " not implemented in SuperObject.prototype.attr(attribute, value)");
    }
    return this;
}

function reloadPrefs() {
    if (window.widget) {
    	userkey = widget.preferenceForKey(makeKey("userkey"));
    	uiType = widget.preferenceForKey(makeKey("uiType"));
    	lang = widget.preferenceForKey(makeKey("lang"));
    	color_code_upload = widget.preferenceForKey(makeKey("colorCodeUpload"));
    } else {
        userkey = 'FFFFFF5F4DF3F8EA';
    }

	if (userkey && userkey.length > 0) {
		$('#userkey').val(userkey);
	}

	if (uiType && uiType.length > 0) {
		if (uiType == "small") {
			$("#uiType")[0].selectedIndex = 1;
		}
	} else {
		uiType = 'normal'; // Default
	}

	if (!lang || lang.length == 0) {
		lang = 'en';
	}
	if (lang == "fr") {
		$("#lang")[0].selectedIndex = 1;
	} else {
	    $("#lang")[0].selectedIndex = 0;
	}

	if (color_code_upload) {
		$("#color_code_upload")[0].checked = true;
	} else {
	    $("#color_code_upload")[0].checked = false;
	}

	translate(); // Maybe language changed; need to re-translate strings if so.
	changeUI();	// Maybe UI type changed; need to move/hide/show stuff if so.
}

function show() {
	reloadPrefs();
	
	if (!userkey || userkey == null || userkey.length == 0) {
		$('#loading').hide();
		$('#needs_config').show();
		return;
	}

	$("#ohnoes").hide();
	$('#needs_config').hide();
	if ($('#this_month').css('display') == 'none') {
		if (uiType == 'small') {
			$('#this_month_small_loader').show();
			$('#this_month_meter_1_small').css('marginTop', '2px');
		} else {
    		$('#loading').css('top', '30px');
    		$('#loading').show();
		}
	} else {
		$('#this_month_loader').show();
		$('#this_month_meter_1').css('marginTop', '-5px');
	}

	loadUsage();
}

var minute = 60*1000;
var hour = 60*minute;
var day = 24*hour;

function loadUsage() {
	var n = new Date();
	var now = n.getTime();

	// only refresh if it's been more than 6h since the last update, or if the data for the day before yesterday hasn't been downloaded yet.
	var lu = new Date(); lu.setTime(last_updated);
	if (last_updated == 0) {
    	calert("Dock restarted, or new install. Updating data...");
	} else {
    	calert("Now: " + now);
    	calert("Last Updated: " + last_updated);
    	if ((now - last_updated) <= 6*hour) {
        	calert("Won't update: data is only refreshed every 6 hours.");
    	}
    	if ((((now - date_last_updated_data.getTime()) > 2*day) && (now - last_updated) > 15*minute)) {
    	    calert("Oh, oh! Wait... The latest data is more than 2 days old... Let's retry every 15 minutes until it works then.");
    	}
	}
	if ((now - last_updated) > 6*hour || (((now - date_last_updated_data.getTime()) > 2*day) && (now - last_updated) > 15*minute)) {
		if (xml_request != null) {
			xml_request.abort();
			xml_request = null;
		}
		if (pastAPIRequests.length >= 19) {
		    var firstReqDate = pastAPIRequests.shift();
		    var elapsedTime = new Date().getTime() - firstReqDate.getTime();
		    if (elapsedTime < 15*minute) {
        	    calert(pastAPIRequests.length + " API requests were made in the last " + (elapsedTime/60) + " minutes. Maximum is 20 / 15 minutes. Won't send this request, to prevent getting blocked by Videotron.");
		        load_usage_error = t('throttled');
		        if (loadUsageTimer) {
		            clearTimeout(loadUsageTimer);
		        }
            	loadUsageTimer = setTimeout(loadUsage, 5*minute);
            	doneLoading({response: null, load_usage_error: null});
            	return;
		    }
		}
		pastAPIRequests.push(new Date());
		xml_request = new XMLHttpRequest();
		xml_request.onload = function(e) { loadUsage2(e, xml_request); }
		xml_request.open("GET", "https://www.videotron.com/api/1.0/internet/usage/wired/"+userkey+".json?lang="+lang+"&caller=videotron-mac.pommepause.com");
		xml_request.setRequestHeader("Cache-Control", "no-cache");
		xml_request.send(null);
    } else {
    	doneLoading({response: null, load_usage_error: null});
    }

	// Repeat every 20 minutes; will only refresh with the server every 6h anyway
	loadUsageTimer = setTimeout(loadUsage, 20*minute);
}

function loadUsage2(e, request) {
    if (request.status != 200) {
        load_usage_error = 'HTTP error: ' + request.status;
        return;
    }
    
	if (request.response) {
		var response = request.response;
	} else {
		var response = request.responseText;
	}
	eval('apiResponse = (' + response + ');');
	
	for (var i=0; i<apiResponse.messages.length; i++) {
	    if (apiResponse.messages[i].severity == 'error') {
	        if (loadUsageTimer) {
	            clearTimeout(loadUsageTimer);
	        }
	        if (apiResponse.messages[i].code.indexOf('noUsage') != -1 || apiResponse.messages[i].code.indexOf('noProfile.') != -1) {
                load_usage_error = tt('no_data', 2);
            	loadUsageTimer = setTimeout(loadUsage, 2*minute);
	        }
	        else if (apiResponse.messages[i].code == 'blocked_ip') {
                load_usage_error = 'API error: ' + apiResponse.messages[i].text;
            	loadUsageTimer = setTimeout(loadUsage, 24*hour+1*minute);
	        }
	        else if (apiResponse.messages[i].code == 'invalidToken' || apiResponse.messages[i].code == 'invalidTokenClass' || apiResponse.messages[i].code == 'noProfile') {
                load_usage_error = 'API error: ' + apiResponse.messages[i].text;
	            // No auto-refresh
	        } else {
                load_usage_error = 'API error: ' + apiResponse.messages[i].text;
            	loadUsageTimer = setTimeout(loadUsage, 20*minute);
	        }
        	doneLoading({response: null, load_usage_error: load_usage_error});
            return;
	    }
	}
	
	response = new Object();
	response.periodStartDate = stringToDate(apiResponse.periodStartDate, true);
	response.periodEndDate = stringToDate(apiResponse.periodEndDate, true);
	response.usageTimestamp = stringToDate(apiResponse.internetAccounts[0].usageTimestamp, false);
	
	response.maxCombinedBytes = apiResponse.internetAccounts[0].maxCombinedBytes;
	response.uploadedBytes = apiResponse.internetAccounts[0].uploadedBytes;
	response.downloadedBytes = apiResponse.internetAccounts[0].downloadedBytes;
	
	response.packageName = apiResponse.internetAccounts[0].packageName;
	response.packageCode = apiResponse.internetAccounts[0].packageCode;
	
	// @TODO Waiting for the API to report those...
    surchargeLimit = 99999;
    surchargePerGb = 1.50;
	if (response.packageCode) {
    	if (response.packageCode == 500 || response.packageCode == 521 || response.packageCode == 518 || response.packageCode == 544 || response.packageCode == 1177 || response.packageCode == 1178) {
    	    surchargeLimit = 50;
    	    surchargePerGb = 4.50;
    	}
	} else {
    	if (response.packageName == 'High-Speed Internet' || response.packageName == 'Basic Internet' || response.packageName == 'Internet haute vitesse' || response.packageName == 'Internet Intermédiaire') {
    	    surchargeLimit = 50;
    	    surchargePerGb = 4.50;
    	}
	}
	response.surchargeLimit = surchargeLimit
	response.surchargePerGb = surchargePerGb;
	
	calert("Got new usage data from server...");
	calert(response);

	// set last_updated to the current time to keep track of the last time a request was posted
	last_updated = (new Date).getTime();
	
	doneLoading({response: response, load_usage_error: load_usage_error});
}

function doneLoading(response) {
	if (response.load_usage_error) {
		$('#ohnoes').html(t(response.load_usage_error));
		$("#ohnoes").show();
		$("#loading").hide();
		$('#this_month_small_loader').hide();
		$('#this_month_meter_1_small').css('marginTop', '');
		$('#this_month_loader').hide();
		$('#this_month_meter_1').css('marginTop', '');
		$('#this_month_small').hide();
		$('#this_month').hide();
		$('#this_month_bandwidth').hide();
		$("#last_updated").hide();
		return;
	}
	
	response = response.response;

	if (response == null) {
		$('#this_month_small_loader').hide();
		$('#this_month_meter_1_small').css('marginTop', '');
    	$('#this_month_loader').hide();
    	$('#this_month_meter_1').css('marginTop', '');
		return;
	}

	limitTotal = parseInt(response.maxCombinedBytes/1024/1024/1024);
	surchargeLimit = response.surchargeLimit;
	surchargePerGb = response.surchargePerGb;
	
	$("#ohnoes").hide();

	$("#loading").hide();
	$('#this_month_small_loader').hide();
	$('#this_month_meter_1_small').css('marginTop', '');
	$('#this_month_loader').hide();
	$('#this_month_meter_1').css('marginTop', '');
	$("#last_updated").show();
	$('#needs_config').hide();

	$('#this_month_start_small').html(t('Since')+' '+dateFormat(response.periodStartDate));
	$('#this_month_start').html('('+t('started')+' '+dateFormat(response.periodStartDate)+')');
	var last_updated_date = new Date(response.usageTimestamp);
	$('#this_month_end').html(dateFormat(last_updated_date, true));

	var this_month_start = new Date(response.periodStartDate);
	var next_month_start = new Date(response.periodEndDate); next_month_start.setDate(next_month_start.getDate()+1);
	var now = new Date(response.usageTimestamp);

	down = numberFormatGB(response.downloadedBytes, 'B');
	up = numberFormatGB(response.uploadedBytes, 'B');
	
	$('#this_month_down').html((down < 1 ? '0' : '') + down.toFixed(2) + ' ' + t("GB"));
	$('#this_month_up').html((up < 1 ? '0' : '') + up.toFixed(2) + ' ' + t("GB"));
	$('#this_month_total').html((down + up < 1 ? '0' : '') + (down + up).toFixed(2) + ' ' + t("GB"));

    if (uiType == 'small') {
    	$('#this_month_small').show();
    } else {
    	$('#this_month').show();
    }

	checkLimits(down, up);

	// Now bar(s)
	calert('Calcul du surplus:');
	var nowPercentage = (now.getTime()-this_month_start.getTime())/(next_month_start.getTime()-this_month_start.getTime());
	calert('nowPercentage = (' + dateTimeFormat(now) + ' - ' + dateTimeFormat(this_month_start) + ') / (' + dateTimeFormat(next_month_start) + ' - ' + dateTimeFormat(this_month_start) + ') = ' + nowPercentage);

	var metersWidth = 361;
	var nowPos = parseInt((nowPercentage*metersWidth).toFixed(0));
	if (nowPos > (metersWidth)) { nowPos = metersWidth; }
	$('#this_month_now_1').css('left', (29+nowPos)+'px');

	metersWidth = 141;
	nowPosSmall = parseInt((nowPercentage*metersWidth).toFixed(0));
	if (nowPosSmall > (metersWidth)) { nowPosSmall = metersWidth; }
	$('#this_month_now_1_small').css('left', (21+nowPosSmall)+'px');

	var nowBandwidth = parseFloat((nowPercentage*limitTotal-down-up).toFixed(2));
	calert('surplus = (' + nowPercentage + ' * ' + limitTotal + ') - ' + down + ' - ' + up + ' = ' + nowBandwidth);

	// 'Today is the $num_days day of your billing month.'
	var num_days = Math.floor((now.getTime()-this_month_start.getTime())/(24*60*60*1000))+1;
	num_days = parseInt(num_days.toFixed(0));

	var suffix = "";
	if (uiType == "small") {
		suffix = "_small";
	}
	if (parseInt($('#this_month_meter_1_end').css('left').replace('px','')) <= 1+parseInt(nowPos) || num_days == 0) {
		$('#this_month_now_1_img'+suffix).attr('src', 'Images/now.gif');
	} else {
		$('#this_month_now_1_img'+suffix).attr('src', 'Images/now_nok.gif');
	}

	if (uiType == "small") {
	    $('#this_month_bandwidth_small').show();
	} else {
	    $('#this_month_bandwidth').show();
    }

	// Now data
	var n = (down+up) * 100.0 / limitTotal;
	var limitPercentage = n.toFixed(0);

	// 'Today is the $num_days day of your billing month.'
	switch (num_days) {
	    case 1: num_days = t('1st'); break;
	    case 2: num_days = t('2nd'); break;
	    case 3: num_days = t('3rd'); break;
	    case 21: num_days = t('21st'); break;
	    case 22: num_days = t('22nd'); break;
	    case 23: num_days = t('23rd'); break;
	    case 31: num_days = t('31st'); break;
	    default: num_days = num_days + t('th');
	}
	var endOfMonthBandwidth = (down+up) / nowPercentage;

	if (limitPercentage > 100) {
	    // 'Current extra charges: $overLimit'
		var overLimit = ((down+up) - limitTotal) * surchargePerGb;
		if (overLimit > surchargeLimit) {
			overLimit = surchargeLimit;
		}

        // 'Extra charges with $maxTransferPackages of transfer packages (the maximum): $hypotetic_overLimit.'
		var hypoteticOverLimit = ((down+up) - (limitTotal+maxTransferPackages)) * surchargePerGb;
		if (hypoteticOverLimit > surchargeLimit) {
			hypoteticOverLimit = surchargeLimit;
		} else if (hypoteticOverLimit < 0) {
		    // 'To get no extra charges, you'd need to buy another $extraPackages of extra transfer packages.'
		    for (var i=0; i<transferPackages.length; i++) {
		        if ((down+up) - (limitTotal+transferPackages[i]) < 0) {
		            extraPackages = transferPackages[i];
		            extraPackagesPrice = transferPackagesPrices[i];
		            break;
		        }
		    }
		}
    }

    if (uiType == 'small') {
    	if (down+up > limitTotal+maxTransferPackages) {
    	    // You're doomed!
            var text = '';
    	} else if (down+up > limitTotal) {
    	    // All is not lost... Buy transfer packages!
            var text = '<span class="nowbw neg">' + tt('over_limit_tip_small', [extraPackages.toString(), extraPackagesPrice.toFixed(2)]) + '</span>';
    	} else if (nowBandwidth < 0 && num_days != '0th') {
    	    // Not on a good path!
    		var text = tt('Surplus', ['neg', nowBandwidth]);
    	} else {
    	    // All is well
    		var text = tt('Surplus', ['pos', nowBandwidth]);
    	}
    } else {
    	if (down+up > limitTotal+maxTransferPackages) {
    	    // You're doomed!
            var text = '<span class="nowbw neg">' + tt('used_and_quota', [(down+up).toFixed(0), limitTotal]) + tt('current_extra', overLimit.toFixed(0)) + '</span>';
    	} else if (down+up > limitTotal) {
    	    // All is not lost... Buy transfer packages!
            var text = '<span class="nowbw neg">' + tt('used_and_quota', [(down+up).toFixed(0), limitTotal]) + tt('current_extra', overLimit.toFixed(0)) + tt('over_limit_tip', [extraPackages.toString(), extraPackagesPrice.toFixed(2)]) + '</span>';
    	} else if (nowBandwidth < 0 && num_days != '0th') {
    	    // Not on a good path!
            var text = '<span class="nowbw neg">' + tt('used_and_quota', [(down+up).toFixed(0), limitTotal]) + tt('expected_over_limit_tip', [num_days, endOfMonthBandwidth.toFixed(0)]) + '</span>';
    	} else {
    	    // All is well
    		var text = tt('accumulated_daily_surplus', ['pos', nowBandwidth, (nowBandwidth > 0 ? t("Download more stuff!") : '')]);
    	}
    }
	$('#this_month_now_bw_usage'+suffix).html(text);
}

function stringToDate(string, resetTime) {
    var d = new Date();
    if (resetTime) {
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
    }
    if (string.indexOf('T') != -1) {
        string = string.split('T')[0];
    }
    string = string.split('-');
    var year = string[0];
    var month = string[1];
    var day = string[2];
    d.setYear(year);
    d.setDate(day);
    d.setMonth((month-1));
    return d;
}

function changeUI() {
	if (uiType == 'small') {
		$('#front').css('background', 'url(Images/background-small'+t('img_suffix')+'.png) no-repeat top left');
		$('#front').css('width', '178px');
		$('#front').css('height', '180px');
		$('#front').css('paddingTop', '75px');
		$('#flip').css('left', '151px');
		$('#fliprollie').css('left', '151px');
		$('#this_month').hide();
		$('#this_month_bandwidth').hide();
		if (response && response.downloadedBytes > 0) {
			$('#this_month_small').show();
		}
	} else {
		$('#front').css('background', 'url(Images/background'+t('img_suffix')+'.png) no-repeat top left');
		$('#front').css('width', '408px');
		$('#front').css('height', '130px');
		$('#front').css('paddingTop', '55px');
		$('#flip').css('left', '');
		$('#fliprollie').css('left', '');
		if (response && response.downloadedBytes > 0) {
			$('#this_month').show();
			$('#this_month_bandwidth').show();
		}
		$('#this_month_small').hide();
	}
}

/*********************************/
// HIDING AND SHOWING PREFERENCES
/*********************************/

// showPrefs() is called when the preferences flipper is clicked upon.  It freezes the front of the widget,
// hides the front div, unhides the back div, and then flips the widget over.
function showPrefs() {
	var front = $("#front");
	var back = $("#back");
	
	if (window.widget) {
		widget.prepareForTransition("ToBack");		// freezes the widget so that you can change it without the user noticing
	}
	
	front.hide();		// hide the front
	back.show();		// show the back
	
	if (window.widget) {
		setTimeout('widget.performTransition();', 0);		// and flip the widget over	
	}

	$('#fliprollie').hide();  // clean up the front side - hide the circle behind the info button
}

// hidePrefs() is called by the done button on the back side of the widget.  It performs the opposite transition
// as showPrefs() does.
function hidePrefs() {
	var front = $("#front");
	var back = $("#back");
	if (window.widget) {
		// save preferences
		widget.setPreferenceForKey($("#userkey").val() == '1234567890ABCDEF' ? '' : $("#userkey").val(), makeKey("userkey"));
		widget.setPreferenceForKey($("#uiType").val(), makeKey("uiType"));
		widget.setPreferenceForKey($("#lang").val(), makeKey("lang"));
		widget.setPreferenceForKey($("#color_code_upload")[0].checked, makeKey("colorCodeUpload"));

		if (window.widget) {
			widget.prepareForTransition("ToFront");		// freezes the widget and prepares it for the flip back to the front
		}

		back.hide();
		front.show();

		if (window.widget) {
			setTimeout('widget.performTransition();', 0);		// and flip the widget back to the front
		}

		last_updated = 0;
		show();
	}
}

// makeKey makes the widget multi-instance aware
function makeKey(key) {
	return (widget.identifier + "-" + key);
}

/***************/
// WIDGET EVENTS
/***************/

// removed is called when the widget is removed from the Dashboard
function removed() {
	widget.setPreferenceForKey(null, makeKey("userkey"));
	widget.setPreferenceForKey(null, makeKey("uiType"));
	widget.setPreferenceForKey(null, makeKey("lang"));
	widget.setPreferenceForKey(null, makeKey("colorCodeUpload"));
}

// focused is called when the widget gets key focus
function focused() {
}

// blurred is called when the widget looses key focus
function blurred() {
}

// Here we register for some widget events
if (window.widget) {
	widget.onremove = removed;
	window.onfocus = focused;
	window.onblur = blurred;
}	

// PREFERENCE BUTTON ANIMATION (- the pref flipper fade in/out)
var flipShown = false;		// a flag used to signify if the flipper is currently shown or not.

// A structure that holds information that is needed for the animation to run.
var animation = {duration:0, starttime:0, to:1.0, now:0.0, from:0.0, firstElement:null, timer:null};

// mousemove() is the event handle assigned to the onmousemove property on the front div of the widget. 
// It is triggered whenever a mouse is moved within the bounds of your widget.  It prepares the
// preference flipper fade and then calls animate() to performs the animation.
function mousemove(event) {
	if (!flipShown)	{		// if the preferences flipper is not already showing...
		if (animation.timer != null) {			// reset the animation timer value, in case a value was left behind
			clearInterval(animation.timer);
			animation.timer = null;
		}
		
		var starttime = (new Date).getTime() - 13; 		                        // set it back one frame
		
		animation.duration = 500;												// animation time, in ms
		animation.starttime = starttime;										// specify the start time
		animation.firstElement = $('#flip')[0];		                            // specify the element to fade
		animation.timer = setInterval ("animate();", 13);						// set the animation function
		animation.from = animation.now;											// beginning opacity (not ness. 0)
		animation.to = 1.0;														// final opacity
		animate();																// begin animation
		flipShown = true;														// mark the flipper as animated
	}
}

// mouseexit() is the opposite of mousemove() in that it preps the preferences flipper
// to disappear.  It adds the appropriate values to the animation data structure and sets the animation in motion.
function mouseexit(event) {
	if (flipShown) {
		// fade in the flip widget
		if (animation.timer != null) {
			clearInterval (animation.timer);
			animation.timer  = null;
		}
		
		var starttime = (new Date).getTime() - 13;
		
		animation.duration = 500;
		animation.starttime = starttime;
		animation.firstElement = $('#flip')[0];
		animation.timer = setInterval ("animate();", 13);
		animation.from = animation.now;
		animation.to = 0.0;
		animate();
		flipShown = false;
	}
}

// animate() performs the fade animation for the preferences flipper. It uses the opacity CSS property to simulate a fade.
function animate() {
	var time = (new Date).getTime();
	var T = limit_3(time-animation.starttime, 0, animation.duration);
	if (T >= animation.duration) {
		clearInterval (animation.timer);
		animation.timer = null;
		animation.now = animation.to;
	} else {
		var ease = 0.5 - (0.5 * Math.cos(Math.PI * T / animation.duration));
		animation.now = computeNextFloat (animation.from, animation.to, ease);
	}
	
	animation.firstElement.style.opacity = animation.now;
}

// these functions are utilities used by animate()
function limit_3(a, b, c) {
    return a < b ? b : (a > c ? c : a);
}
function computeNextFloat(from, to, ease) {
    return from + (to - from) * ease;
}

// these functions are called when the info button itself receives onmouseover and onmouseout events
function enterflip(event) {
	$('#fliprollie').show();
}
function exitflip(event) {
	$('#fliprollie').hide();
}

function checkLimits(currentDown, currentUp) {
	$('#this_month_now_1').show();
	$('#this_month_now_1_small').show();
	if (uiType == "small") {
    	$('#this_month_now_1_small').css('top', '105px');
	}

	// Numbers colors
	$('#this_month_total').css('fontWeight', 'bold');
	$('#this_month_total').css('color', getLimitColor(currentDown+currentUp, limitTotal));
	$('#this_month_down').css('fontWeight', 'normal');
	$('#this_month_up').css('fontWeight', 'normal');
	$('#this_month_down').css('color', "#000000");
	$('#this_month_up').css('color', "#000000");
	
	$('#this_month_down_small').html('<span style="font-weight:bold;color:' + $('#this_month_total').css('color') + '">' + (currentDown+currentUp).toFixed(2) + '</span>/' + limitTotal + t('GB') + '&nbsp;');
	
	// Meters
	var metersWidth = 360;
	$('#this_month_meter_1_text').html(t('Download + Upload'));
	var x = (getLimitPercentage(currentDown+currentUp, limitTotal)*metersWidth/100.0 + 1).toFixed(0);
	if (x > (metersWidth+1)) { x = (metersWidth+1); }
	$('#this_month_meter_1_end').css('width', ((metersWidth+1)-x) + 'px');
	$('#this_month_meter_1_end').css('left', x + 'px');

	if (color_code_upload) {
		x = (getLimitPercentage(currentUp, limitTotal)*metersWidth/100.0 + 1).toFixed(0);
		$('#this_month_meter_1_start').css('width', x + 'px');
		$('#this_month_meter_1_start').css('left', '1px');
	} else {
		$('#this_month_meter_1_start').css('width', '0px');
	}

	metersWidth = 140;
	$('#this_month_meter_1_text_small').html(t('Down + Up'));
	var x = (getLimitPercentage(currentDown+currentUp, limitTotal)*metersWidth/100.0 + 1).toFixed(0);
	if (x > (metersWidth+1)) { x = (metersWidth+1); }
	$('#this_month_meter_1_end_small').css('width', ((metersWidth+1)-x) + 'px');
	$('#this_month_meter_1_end_small').css('left', x + 'px');

	if (color_code_upload) {
		x = (getLimitPercentage(currentUp, limitTotal)*metersWidth/100.0 + 1).toFixed(0);
		$('#this_month_meter_1_start_small').css('width', x + 'px');
		$('#this_month_meter_1_start_small').css('left', '1px');
	} else {
		$('#this_month_meter_1_start_small').css('width', '0px');
	}

	// Percentage
	$('#this_month_percentage_1').css('left', t('this_month_percentage_1_pos_total'));
	$('#this_month_percentage_1').html(getLimitPercentage(currentDown+currentUp, limitTotal)+'%');
	$('#this_month_percentage_1_small').css('left', t('this_month_percentage_1_small_pos_total'));
	$('#this_month_percentage_1_small').html(getLimitPercentage(currentDown+currentUp, limitTotal)+'%');
}

function getLimitPercentage(number, limit) {
	return (number * 100.0 / limit).toFixed(0);
}

function getLimitColor(number, limit) {
	var color = '#01B200';
	if (getLimitPercentage(number, limit) >= 75) {
		color = '#D79800';
	}
	if (getLimitPercentage(number, limit) >= 90) {
		color = '#FF7F00';
	}
	if (getLimitPercentage(number, limit) >= 98) {
		color = '#FF0900';
	}
	return color;
}

function dateFormat(d) {
	return d.getFullYear()+'-'+(d.getMonth()+1 < 10 ? '0'+(d.getMonth()+1) : (d.getMonth()+1))+'-'+(d.getDate() < 10 ? '0'+d.getDate() : d.getDate());
}

function dateTimeFormat(d) {
	return d.getFullYear()+'-'+(d.getMonth()+1 < 10 ? '0'+(d.getMonth()+1) : (d.getMonth()+1))+'-'+(d.getDate() < 10 ? '0'+d.getDate() : d.getDate()) +
	    ' ' + (d.getHours() < 10 ? '0'+d.getHours() : d.getHours()) + ':' + (d.getMinutes() < 10 ? '0'+d.getMinutes() : d.getMinutes()) + ':'  + (d.getSeconds() < 10 ? '0'+d.getSeconds() : d.getSeconds());
}

var units = new Array("B","KB","MB","GB");
function numberFormatGB(number, unit) {
	var go = false;
	for (var i = 0, len = units.length; i < len; i++) {
		if (go) {
			number = number / 1024;
		}
		if (units[i] == unit) {
			go = true;
		}
	}
	return number;
}

/***********************************/
// Internationalization
/***********************************/

var localizedStrings = new Array();

function t(key) {
    try {
        var ret = localizedStrings[lang][key];
        if (ret === undefined) {
            ret = key;
		}
        return ret;
    } catch (ex) { calert(ex); }
    return key;
}

function tt(key, substitutions) {
    try {
        var ret = localizedStrings[lang][key];

        if (ret === undefined) {
            ret = key;
		}
        var i = 1;
        if (typeof substitutions == 'string') {
            substitutions = [substitutions];
        }
        while (ret.indexOf('$'+i+'$') != -1) {
            ret = ret.replace('\$' + i + '\$', substitutions[i-1]);
            i++;
        }
        ret = ret.replace('\$\$', '$');
    } catch (ex) { calert(ex); }
	return ret;
}

function translate() {
    $('#where_to_find_user_key').html(t('where_to_find_user_key'));
	$('#needs_config').html(t("needs_config"));
	$('#loading').html(t("Loading... Please wait."));
	$('#ohnoes').html(t("Oh Noes! There's been an error."));
	$('#this_month_intro').html(t("This month"));
	$('#this_month_down_suffix').html(t("download"));
	$('#this_month_up_suffix').html(t("upload"));
	$('#last_updated_intro').html(t("Last updated"));
	$('#userkey_intro').html(t("Vid&eacute;otron User Key"));
	$('#interface_intro').html(t("Widget interface"));
	$('#upload_color_intro').html(t("Colored Upload"));
	$('#lang_intro').html(t("Language"));
	$('#uiType')[0].options[0].text = t("Normal");
	$('#uiType')[0].options[1].text = t("Minimal");
	if ($('#doneButton').html() == '') {
		createGenericButton($('#doneButton')[0], t('Done'), hidePrefs, 100);
	}

	currentVersion = getCurrentVersion();
	$('#version').html(currentVersion);
	checkLatestVersion();
}

function getCurrentVersion() {
	var request = new XMLHttpRequest();
	request.open('GET', 'Info.plist', false);
	request.send();
	var nodes = request.responseXML.getElementsByTagName('dict')[0].childNodes;
	var nodeLength = nodes.length;
	for (var i = 0; i < nodeLength; i++) {
		if (nodes[i].nodeType == 1 && nodes[i].tagName.toLowerCase() == 'key') {
			if (nodes[i].firstChild.data == 'CFBundleShortVersionString') {
				return nodes[i+2].firstChild.data;
			}
		}
	}
    return "Unknown version";
}

function checkLatestVersion() {
	var request = new XMLHttpRequest();
	request.open('GET', 'http://dataproxy.pommepause.com/videotron-widget_latest-version.txt', false);
	request.send();

    if (request.status != 200) {
        return;
    }
	if (request.responseText) {
		var response = request.responseText;
	} else {
		var response = request.response;
	}
	response = response.split("\n");
	var newVersion = response[0];
	
	if (newVersion != currentVersion) {
	    if (lang == 'fr') {
	        $('#new_version_avail').css('width', '180px');
	    } else {
	        $('#new_version_avail').css('width', '150px');
	    }
    	var newVersionDownloadURL = response[1];
    	$("#new_version_avail").show();
    	$("#new_version_avail").html(tt('new_version_available', [newVersionDownloadURL, newVersion]));
	} else {
	    //calert("You are running the latest version of the Videotron widget: " + currentVersion);
	}
}

function calert(what) {
    if (typeof console != 'undefined') {
        console.log(what);
    } else {
        alert(what);
    }
}

if (window.widget) {
	widget.onshow = show;
}
window.onload = show;
