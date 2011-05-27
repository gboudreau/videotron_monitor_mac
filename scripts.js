/***********************************/
// SAVING AND RETRIEVING PREFERENCES
/***********************************/

// setup() is run when the body loads.  It checks to see if there is a preference for this widget
// and if so, applies the preference to the widget.
var username = '';
var uiType = 'normal';
var lang = 'en';
var plans = new Array();
var planId = 1;
var transferPackages = new Array();
var dataTransferPackagesBought = 0;
var dataTransferPackagesBoughtWhen = null;
var limitTotal = 30;
var surchargePerGb = 7.95;
var surchargeLimit = 50;
var xml_request_2 = null;
var new_version_available = false;
var color_code_upload = false;

function setup() {
	if (window.widget) {
		planId = widget.preferenceForKey(makeKey("planId"));
		dataTransferPackagesBought = widget.preferenceForKey(makeKey("dataTransferPackagesBought"));
		dataTransferPackagesBoughtWhen = widget.preferenceForKey(makeKey("dataTransferPackagesBoughtWhen"));
		if (dataTransferPackagesBoughtWhen) {
			dataTransferPackagesBoughtWhen = new Date(Date.parse(dataTransferPackagesBoughtWhen));
		}
		username = widget.preferenceForKey(makeKey("username"));
		uiType = widget.preferenceForKey(makeKey("uiType"));
		lang = widget.preferenceForKey(makeKey("lang"));
		color_code_upload = widget.preferenceForKey(makeKey("colorCodeUpload"));
	}
	if (plans.length == 0) {
		if (xml_request_2 != null) {
			xml_request_2.abort();
			xml_request_2 = null;
		}
		xml_request_2 = new XMLHttpRequest();
		xml_request_2.onload = function(e) {completeSetup(e, xml_request_2);}
		xml_request_2.overrideMimeType("text/xml");
		xml_request_2.open("GET", "http://dataproxy.pommepause.com/videotron_usage-11.php?get_plans=1");
		xml_request_2.setRequestHeader("Cache-Control", "no-cache");
		xml_request_2.send(null);
	} else {
		completeSetup(null, null);
	}
}


function completeSetup(e, request) {
	if (!lang || lang.length == 0) {
		lang = 'en';
	}
	if (e != null) {
		xml_request_2 = null;
		if (!request.responseXML) {
			$('ohnoes').innerHTML = t("Oh Noes! There's been an error.<br/>Response is not XML.");
			$("ohnoes").style.display = "block";
			$("loading").style.display = "none";
			$('this_month_small_loader').style.display="none";
			$('this_month_meter_1_small').style.marginTop = '';
			$('this_month_loader').style.display="none";
			$('this_month_meter_1').style.marginTop = '';
			$('this_month_small').style.display = "none";
			$('this_month').style.display = "none";
			$('this_month_bandwidth').style.display = "none";
			$("last_updated").style.display = "none";
			last_updated = 0;
			return;
		} else {
			// Get the top level <plans> element 
			var plansXml = findChild(request.responseXML, 'plans');
			if (!plansXml) {
				$('ohnoes').innerHTML = t("Oh Noes! There's been an error.<br/>No 'plans' tag in response.");
				$("ohnoes").style.display = "block";
				$("loading").style.display = "none";
				$('this_month_small_loader').style.display="none";
				$('this_month_meter_1_small').style.marginTop = '';
				$('this_month_loader').style.display="none";
				$('this_month_meter_1').style.marginTop = '';
				$('this_month_small').style.display = "none";
				$('this_month').style.display = "none";
				$('this_month_bandwidth').style.display = "none";
				$("last_updated").style.display = "none";
				last_updated = 0;
				return;
			}
			
			for (var item = plansXml.firstChild; item != null; item = item.nextSibling) {
				if (item.nodeName == 'plan') {
					var id = item.attributes.getNamedItem('id').value,
					var name = findChild(item, 'name');
					var limit_gb = findChild(item, 'limit_gb');
					var surcharge_per_gb = findChild(item, 'surcharge_per_gb');
					var surcharge_limit = findChild(item, 'surcharge_limit');
					var p = new Object();
					p.id = id;
					p.name = name.firstChild.data;
					p.limit_gb = limit_gb.firstChild.data;
					p.surcharge_per_gb = surcharge_per_gb.firstChild.data;
					if (surcharge_limit.firstChild) {
						p.surcharge_limit = surcharge_limit.firstChild.data;
					} else {
						p.surcharge_limit = 999999;
					}
					$('plan').options[p.id] = new Option(t(p.name) + ' (' + p.limit_gb + t('GB') + ')', p.id);
					plans.push(p);
				}
				if (item.nodeName == 'data_transfer_pkg') {
					var amount = findChild(item, 'amount').firstChild.data;
					$('transfer_packages').options[$('transfer_packages').options.length] = new Option(amount + ' ' + t('GB'), amount);
					transferPackages.push(amount);
				}
			}
		}
	}

	if (typeof planId == 'undefined' || planId.length == 0 || planId < 0) {
		limitTotal = widget.preferenceForKey(makeKey("limitTotal"));
		if (!limitTotal || limitTotal.length == 0) {
			planId = 1; // Default
		} else {
			for (var i=0; i<plans.length; i++) {
				if (limitTotal == plans[i].limit_gb) {
					planId = i;
					break;
				}
			}
		}
	}
	limitTotal = parseInt(plans[planId].limit_gb);
	surchargePerGb = parseFloat(plans[planId].surcharge_per_gb);
	surchargeLimit = parseFloat(plans[planId].surcharge_limit);
	$('plan').selectedIndex = planId;

	if (username && username.length > 0) {
		$('username').value = username;
	}
	if (uiType && uiType.length > 0) {
		if (uiType == "small") {
			$("uiType").selectedIndex = 1;
		}
	} else {
		uiType = 'normal'; // Default
	}
	if (lang == "fr") {
		$("lang").selectedIndex = 1;
	}
	if (color_code_upload) {
		$("color_code_upload").checked = true;
	}

	translate(); // Maybe language changed; need to re-translate strings if so.
	changeUI(uiType);	// Maybe UI type changed; need to move/hide/show stuff if so.
}

function changeUI(uiType) {
	if (uiType == 'small') {
		$('front').style.background='url(Images/background-small'+t('img_suffix')+'.png) no-repeat top left';
		$('front').style.width = '178px';
		$('front').style.height = '180px';
		$('front').style.paddingTop = '75px';
		$('flip').style.left = '151px';
		$('fliprollie').style.left = '151px';
		$('this_month').style.display = "none";
		$('this_month_bandwidth').style.display = "none";
		if (currentDown > 0) {
			$('this_month_small').style.display = "block";
		}
	} else {
		$('front').style.background='url(Images/background'+t('img_suffix')+'.png) no-repeat top left';
		$('front').style.width = '408px';
		$('front').style.height = '130px';
		$('front').style.paddingTop = '55px';
		$('flip').style.left = '';
		$('fliprollie').style.left = '';
		if (currentDown > 0) {
			$('this_month').style.display = "block";
			$('this_month_bandwidth').style.display = "";
		}
		$('this_month_small').style.display = "none";
	}
}

/*********************************/
// HIDING AND SHOWING PREFERENCES
/*********************************/

// showPrefs() is called when the preferences flipper is clicked upon.  It freezes the front of the widget,
// hides the front div, unhides the back div, and then flips the widget over.
function showPrefs() {
	var front = $("front");
	var back = $("back");
	
	if (window.widget) {
		widget.prepareForTransition("ToBack");		// freezes the widget so that you can change it without the user noticing
	}
	
	front.style.display="none";		// hide the front
	back.style.display="block";		// show the back
	
	if (window.widget) {
		setTimeout('widget.performTransition();', 0);		// and flip the widget over	
	}

	$('fliprollie').style.display = 'none';  // clean up the front side - hide the circle behind the info button
}

// hidePrefs() is called by the done button on the back side of the widget.  It performs the opposite transition
// as showPrefs() does.
function hidePrefs() {
	var front = $("front");
	var back = $("back");

	planId = $("plan").selectedIndex;
	dataTransferPackagesBought = parseInt($("transfer_packages").value);
	if (window.widget) {
		// save preferences
		widget.setPreferenceForKey(planId, makeKey("planId"));
		widget.setPreferenceForKey(dataTransferPackagesBought, makeKey("dataTransferPackagesBought"));
		if (dataTransferPackagesBought > 0) {
			dataTransferPackagesBoughtWhen = new Date();
			widget.setPreferenceForKey(dataTransferPackagesBoughtWhen.toString(), makeKey("dataTransferPackagesBoughtWhen"));
		} else {
			dataTransferPackagesBoughtWhen = null;
			widget.setPreferenceForKey(null, makeKey("dataTransferPackagesBoughtWhen"));
		}
		widget.setPreferenceForKey($("username").value == 'vlxxxxxx' ? '' : $("username").value, makeKey("username"));
		widget.setPreferenceForKey($("uiType").value, makeKey("uiType"));
		widget.setPreferenceForKey($("lang").value, makeKey("lang"));
		widget.setPreferenceForKey($("color_code_upload").checked, makeKey("colorCodeUpload"));

		if (window.widget) {
			widget.prepareForTransition("ToFront");		// freezes the widget and prepares it for the flip back to the front
		}

		back.style.display="none";			// hide the back
		front.style.display="block";		// show the front

		if (window.widget) {
			setTimeout ('widget.performTransition();', 0);		// and flip the widget back to the front
		}

		last_updated = 0;
		show();
		checkLimits();
		setNowBarsColor();
	}
	limitTotal = parseInt(plans[planId].limit_gb);
	surchargePerGb = parseFloat(plans[planId].surcharge_per_gb);
	surchargeLimit = parseFloat(plans[planId].surcharge_limit);
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
	widget.setPreferenceForKey(null, makeKey("limitType"));
	widget.setPreferenceForKey(null, makeKey("username"));
	widget.setPreferenceForKey(null, makeKey("limitTotal"));
	widget.setPreferenceForKey(null, makeKey("limitUpload"));
	widget.setPreferenceForKey(null, makeKey("limitDownload"));
	widget.setPreferenceForKey(null, makeKey("planId"));
	widget.setPreferenceForKey(null, makeKey("dataTransferPackagesBought"));
	widget.setPreferenceForKey(null, makeKey("dataTransferPackagesBoughtWhen"));
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
			clearInterval (animation.timer);
			animation.timer  = null;
		}
		
		var starttime = (new Date).getTime() - 13; 		// set it back one frame
		
		animation.duration = 500;												// animation time, in ms
		animation.starttime = starttime;										// specify the start time
		animation.firstElement = $ ('flip');		// specify the element to fade
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
		animation.firstElement = $ ('flip');
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
	$('fliprollie').style.display = 'block';
}
function exitflip(event) {
	$('fliprollie').style.display = 'none';
}

var last_updated = 0;
var date_last_updated_data = new Date(); date_last_updated_data.setTime(0);
var xml_request = null;

function show() {
	setup();

	var n = new Date();
	var now = n.getTime();

	if (!username || username == null || username.length == 0) {
		$('loading').style.display='none';
		$('needs_config').style.display='block';
		return;
	}

	// only refresh if the day changed, or it's been more than 24h since the last update, or if the data for the day before yesterday hasn't been downloaded yet.
	var lu = new Date(); lu.setTime(last_updated);
	if ((now - last_updated) > 24*60*60*1000 || ((n.getDate() != lu.getDate() || n.getMonth() != lu.getMonth() || n.getYear() != lu.getYear() || (now - date_last_updated_data.getTime()) > 2*24*60*60*1000) && (now - last_updated) > 15*60*1000)) {
		$("ohnoes").style.display = "none";
		if ($('this_month').style.display=='none') {
			if (uiType == 'small') {
				$('this_month_small_loader').style.display='inline';
				$('this_month_meter_1_small').style.marginTop = '2px';
			} else {
				$('loading').style.top = '30px';
				$('loading').style.display='block';
			}
		} else {
			$('this_month_loader').style.display='inline';
			$('this_month_meter_1').style.marginTop = '-5px';
		}
		$('needs_config').style.display='none';
		if (xml_request != null) {
			xml_request.abort();
			xml_request = null;
		}
		xml_request = new XMLHttpRequest();
		xml_request.onload = function(e) {load_xml(e, xml_request);}
		xml_request.overrideMimeType("text/xml");
		xml_request.open("GET", "http://dataproxy.pommepause.com/videotron_usage-11.php?"+username);
		xml_request.setRequestHeader("Cache-Control", "no-cache");
		xml_request.send(null);
    }
}

var currentDown = 0;
var currentUp = 0;
function load_xml(e, request) {
	xml_request = null;
	if (!request.responseXML) {
		$('ohnoes').innerHTML = t("Oh Noes! There's been an error.<br/>Response is not XML.");
		$("ohnoes").style.display = "block";
		$("loading").style.display = "none";
		$('this_month_small_loader').style.display="none";
		$('this_month_meter_1_small').style.marginTop = '';
		$('this_month_loader').style.display="none";
		$('this_month_meter_1').style.marginTop = '';
		$('this_month_small').style.display = "none";
		$('this_month').style.display = "none";
		$('this_month_bandwidth').style.display = "none";
		$("last_updated").style.display = "none";
		last_updated = 0;
		return;
	} else {
		// Get the top level <usage> element 
		var usage = findChild(request.responseXML, 'usage');
		if (!usage) {
			$('ohnoes').innerHTML = t("Oh Noes! There's been an error.<br/>No usage tag in response.");
			$("ohnoes").style.display = "block";
			$("loading").style.display = "none";
			$('this_month_small_loader').style.display="none";
			$('this_month_meter_1_small').style.marginTop = '';
			$('this_month_loader').style.display="none";
			$('this_month_meter_1').style.marginTop = '';
			$('this_month_small').style.display = "none";
			$('this_month').style.display = "none";
			$('this_month_bandwidth').style.display = "none";
			$("last_updated").style.display = "none";
			last_updated = 0;
			return;
		}

		var new_version = findChild(usage, 'new_version');
		if (new_version) {
			new_version_available = true;
		}

		var error = findChild(usage, 'error');
		if (error) {
			$('ohnoes').innerHTML = t(error.firstChild.data);
			$("ohnoes").style.display = "block";
			$("loading").style.display = "none";
			$('this_month_small_loader').style.display="none";
			$('this_month_meter_1_small').style.marginTop = '';
			$('this_month_loader').style.display="none";
			$('this_month_meter_1').style.marginTop = '';
			$('this_month_small').style.display = "none";
			$('this_month').style.display = "none";
			$('this_month_bandwidth').style.display = "none";
			$("last_updated").style.display = "none";
			last_updated = 0;
			return;
		}

		$("ohnoes").style.display = "none";

		var transferPeriods = new Array;
		var transferDays = new Array;

		// Get all transfer elements subordinate to the usage element
		for (var item = usage.firstChild; item != null; item = item.nextSibling) {
			if (item.nodeName == 'transfer') {
				var date = findChild(item, 'date');
				var down = findChild(item, 'download');
				var up = findChild(item, 'upload');
				if (date != null && down != null && up != null) {
					var date_from = findChild(date, 'from');
					var date_to = findChild(date, 'to');
					if (date_from != null && date_to != null) {
						transferPeriods[transferPeriods.length] = {
							date_from: new Date(Date.parse(date_from.firstChild.data)),
							date_to: new Date(Date.parse(date_to.firstChild.data)),
							download: down.firstChild.data,
							download_units: down.attributes.getNamedItem('unit').value,
							upload: up.firstChild.data,
							upload_units: up.attributes.getNamedItem('unit').value
						};
					} else {
						transferDays[transferDays.length] = {
							date: new Date(Date.parse(date.firstChild.data)),
							download: down.firstChild.data,
							download_units: down.attributes.getNamedItem('unit').value,
							upload: up.firstChild.data,
							upload_units: up.attributes.getNamedItem('unit').value
						};
					}
				}
			}
		}
		
		if (dataTransferPackagesBoughtWhen && dataTransferPackagesBoughtWhen > transferPeriods[0]['date_from']) {
			for (var i=0; i<$('transfer_packages').options.length; i++) {
				if ($('transfer_packages').options[i].value == dataTransferPackagesBought) {
					$('transfer_packages').selectedIndex = i;
					break;
				}
			}
		} else {
			dataTransferPackagesBought = 0;
			widget.setPreferenceForKey(dataTransferPackagesBought, makeKey("dataTransferPackagesBought"));
		}

		// This month
		$("loading").style.display = "none";
		$('this_month_small_loader').style.display="none";
		$('this_month_meter_1_small').style.marginTop = '';
		$('this_month_loader').style.display="none";
		$('this_month_meter_1').style.marginTop = '';
		$("last_updated").style.display = "block";
		$('needs_config').style.display='none';

		var ids = new Array("this","last","previous");
		for (i=0; i<3; i++) {
			var transfer = transferPeriods[i];
			var id = ids[i];
			if (i==0) {
				$(id+'_month_start_small').innerHTML = t('Since')+' '+dateFormat(transfer['date_from'])+'';
				$(id+'_month_start').innerHTML = '('+t('started')+' '+dateFormat(transfer['date_from'])+')';
				$(id+'_month_end').innerHTML = dateFormat(transfer['date_to']) + (uiType != "small" ? ' @ 23h59' : '');
				date_last_updated_data = transfer['date_to'];
				var this_month_start = transfer['date_from'];
				var now = transfer['date_to'];
				now.setDate(now.getDate()+1);
			} else {
				$(id+'_month_dates').innerHTML = '('+dateFormat(transfer['date_from']) + 
					' to ' + dateFormat(transfer['date_to'])+')';
			}
			down = numberFormatGB(transfer['download'], transfer['download_units']);
			up = numberFormatGB(transfer['upload'], transfer['upload_units']);
			$(id+'_month_down').innerHTML = (down < 1 ? '0' : '') + down.toFixed(2) + ' ' + t("GB");
			$(id+'_month_up').innerHTML = (up < 1 ? '0' : '') + up.toFixed(2) + ' ' + t("GB");
			$(id+'_month_total').innerHTML = (down + up < 1 ? '0' : '') + (down + up).toFixed(2) + ' ' + t("GB");
			
			if (i==0) {
				if (uiType == 'small') {
					$(id+'_month_small').style.display = "block";
				} else {
					$(id+'_month').style.display = "block";
				}
				currentDown = down;
				currentUp = up;
				checkLimits();

				// Now bar(s)
				var next_month_start = new Date(1900+this_month_start.getYear(), this_month_start.getMonth()+1, this_month_start.getDate());
				nowPercentage = (now.getTime()-this_month_start.getTime())/(next_month_start.getTime()-this_month_start.getTime());
				var metersWidth = 361;
				nowPos = parseInt((nowPercentage*metersWidth).toFixed(0));
				if (nowPos > (metersWidth)) { nowPos = metersWidth; }
				$('this_month_now_1').style.left = (21+nowPos)+'px';
				var metersWidth = 141;
				nowPosSmall = parseInt((nowPercentage*metersWidth).toFixed(0));
				if (nowPosSmall > (metersWidth)) { nowPosSmall = metersWidth; }
				$('this_month_now_1_small').style.left = (21+nowPosSmall)+'px';
				nowBandwidth = parseFloat((nowPercentage*(limitTotal+dataTransferPackagesBought)-currentDown-currentUp).toFixed(2));
				setNowBarsColor();
			}
		}

		// set last_updated to the current time to keep track of the last time a request was posted
		last_updated = (new Date).getTime();
	}
}

var nowPos;
var nowBandwidth;
var nowPercentage
function setNowBarsColor() {
	var suffix = "";
	if (uiType == "small") {
		suffix = "_small";
	}
	if (parseInt($('this_month_meter_1_end').style.left.replace('px','')) <= 1+parseInt(nowPos)) {
		$('this_month_now_1_img'+suffix).src = 'Images/now'+suffix+'.gif';
	} else {
		$('this_month_now_1_img'+suffix).src = 'Images/now_nok'+suffix+'.gif';
	}
	if (uiType == "small") {
		$('this_month_bandwidth_small').style.display = "";
		$('this_month_now_bw_usage_small').innerHTML = t('Surplus available') + ': <span class="nowbw '+(nowBandwidth > 0 ? 'pos' : 'neg')+'">' + nowBandwidth.toFixed(1) + t('GB') + '</span>';
	} else {
		$('this_month_bandwidth').style.display = "";
		$('this_month_now_bw_usage').innerHTML = t('Accumulated daily surplus') + ': <span class="nowbw '+(nowBandwidth > 0 ? 'pos' : 'neg')+'">' + nowBandwidth + ' ' + t('GB') + '</span>. ' + (nowPercentage < 1 ? (nowBandwidth > 0 ? t("Download more stuff!") : t("Slow down buddy!")) : '');
	}
	if (new_version_available) {
		if (uiType == "small") {
			$('this_month_bandwidth_small').style.display = "";
			$('this_month_now_bw_usage_small').innerHTML = '<span style="color:red">' + t('New version available') + '</span>';
		} else {
			$('this_month_now_bw_usage').style.display = "";
			$('this_month_now_bw_usage').innerHTML = '<span style="color:red">' + t('A new version is available.') + '</span>';
		}
	}
}

var k = 0;
function checkLimits() {
	$('this_month_now_1').style.display='inline';
	$('this_month_now_1_small').style.display='inline';
	if (uiType == "small") {
		$('this_month_now_1_small').style.top='105px';
	}

	// Numbers colors
	$('this_month_total').style.fontWeight='bold';
	$('this_month_total').style.color = getLimitColor(currentDown+currentUp, limitTotal+dataTransferPackagesBought);
	$('this_month_down').style.fontWeight='normal';
	$('this_month_up').style.fontWeight='normal';
	$('this_month_down').style.color = "#000000";
	$('this_month_up').style.color = "#000000";
	
	if (currentDown+currentUp > limitTotal+dataTransferPackagesBought) {
		var overLimit = ((currentDown+currentUp) - (limitTotal+dataTransferPackagesBought)) * surchargePerGb;
		if (overLimit > surchargeLimit) {
			overLimit = surchargeLimit;
		}
		$('this_month_total').innerHTML = $('this_month_total').innerHTML + ' ('+overLimit.toFixed(0)+'$)';
	}

	$('this_month_down_small').innerHTML = '<span style="font-weight:bold;color:'+$('this_month_total').style.color+'">'+(currentDown+currentUp).toFixed(2) + '</span>/' + (limitTotal+dataTransferPackagesBought) + 'GB&nbsp;';

	// Meters
	var metersWidth = 360;
	$('this_month_meter_1_text').innerHTML = t('Download + Upload');
	var x = (getLimitPercentage(currentDown+currentUp, limitTotal+dataTransferPackagesBought)*metersWidth/100.0 + 1).toFixed(0);
	if (x > (metersWidth+1)) { x = (metersWidth+1); }
	$('this_month_meter_1_end').style.width = ((metersWidth+1)-x) + 'px';
	$('this_month_meter_1_end').style.left = x + 'px';

	if (color_code_upload) {
		x = (getLimitPercentage(currentUp, limitTotal+dataTransferPackagesBought)*metersWidth/100.0 + 1).toFixed(0);
		$('this_month_meter_1_start').style.width = x + 'px';
		$('this_month_meter_1_start').style.left = '1px';
	} else {
		$('this_month_meter_1_start').style.width = '0px';
	}

	metersWidth = 140;
	$('this_month_meter_1_text_small').innerHTML = t('Down + Up');
	var x = (getLimitPercentage(currentDown+currentUp, limitTotal+dataTransferPackagesBought)*metersWidth/100.0 + 1).toFixed(0);
	if (x > (metersWidth+1)) { x = (metersWidth+1); }
	$('this_month_meter_1_end_small').style.width = ((metersWidth+1)-x) + 'px';
	$('this_month_meter_1_end_small').style.left = x + 'px';

	if (color_code_upload) {
		x = (getLimitPercentage(currentUp, limitTotal+dataTransferPackagesBought)*metersWidth/100.0 + 1).toFixed(0);
		$('this_month_meter_1_start_small').style.width = x + 'px';
		$('this_month_meter_1_start_small').style.left = '1px';
	} else {
		$('this_month_meter_1_start_small').style.width = '0px';
	}

	// Percentage
	$('this_month_percentage_1').style.left = t('this_month_percentage_1_pos_total');
	$('this_month_percentage_1').innerHTML = getLimitPercentage(currentDown+currentUp, limitTotal+dataTransferPackagesBought)+'%';
	$('this_month_percentage_1_small').style.left = t('this_month_percentage_1_small_pos_total');
	$('this_month_percentage_1_small').innerHTML = getLimitPercentage(currentDown+currentUp, limitTotal+dataTransferPackagesBought)+'%';
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

function $(e) {
	return document.getElementById(e);
}

function findChild(element, nodeName) {
	var child = null;
	for (child = element.firstChild; child != null; child = child.nextSibling) {
		if (child.nodeName == nodeName) {
			break;
		}
	}
	return child;
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
    } catch (ex) { alert(ex); }
    return key;
}

function translate() {
	$('needs_config').innerHTML = t("needs_config");
	$('loading').innerHTML = t("Loading... Please wait.");
	$('ohnoes').innerHTML = t("Oh Noes! There's been an error.");
	$('this_month_intro').innerHTML = t("This month");
	$('this_month_down_suffix').innerHTML = t("download");
	$('this_month_up_suffix').innerHTML = t("upload");
	$('last_updated_intro').innerHTML = t("Last updated");
	$('username_intro').innerHTML = t("Vid&eacute;otron Username");
	$('plan_intro').innerHTML = t("Type of access");
	$('transfer_packages_intro').innerHTML = t("Data transfer packages");
	$('interface_intro').innerHTML = t("Widget interface");
	$('upload_color_intro').innerHTML = t("Colored Upload");
	$('lang_intro').innerHTML = t("Language");
	$('uiType').options[0].text = t("Normal");
	$('uiType').options[1].text = t("Minimal");
	if (plans) {
		for (var i=0; i<plans.length; i++) {
			$('plan').options[i].text = t(plans[i].name) + ' (' + plans[i].limit_gb + t('GB') + ')';
		}
	}
	if (transferPackages) {
		for (var i=0; i<transferPackages.length; i++) {
			$('transfer_packages').options[i].text = $('transfer_packages').options[i].value + ' ' + t('GB');
		}
	}
	if ($('doneButton').innerHTML=='') {
		createGenericButton($('doneButton'), t('Done'), hidePrefs, 100);
	}
}

if (window.widget) {
	widget.onshow = show;
}
window.onload = show;
