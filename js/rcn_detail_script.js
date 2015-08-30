
//ToDos
//1. stop touch and click firing twice on the button bind to one or other depending on device
//2. load in content of detail page using a pagecreate event
//3. fix the right panel on detail page which acts funny (possible becasue it is loaded more than once or becasue of number of DIVs)
//4. add clear option to the start/stop button on swipe
//5. add stage names to the button rather than start/stop

 //variables that will have a global scope:
 //variables event_id_urlsafe and last_timestamp have to be set in the dynamic document by jinja2


const REFRESH_TIME = 10; // for timer counting in milleseconds
const REFRESH_TIME2 = 1000; //for checking server for times in milleseconds
var crew_times = [];
var autoUpdate = true;
var last_timestamp = new Date(800000);
var refresh = [];
var gae_connected_flag = false;
var connection_status;
var touch_supported = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));

//------- this section for event handling on the screens ------------//




// this bit of code taken from ksloan/jquery-mobile-swipe-list project and amended

$(function() {

    // call the initialisation function for the Google App Engine API
    connection_status=init();

	$(':mobile-pagecontainer').on( "pagecreate", "#crewtimes", function() {

		get_crew_times();  //initialise the crew_times array and set connection status
		$(".connection-status").text(connection_status);
	    autoUpdate = true;
		get_times();

	});

	$( ':mobile-pagecontainer' ).on( "pagehide" , "#crewtimes", function() {
	    // stop the function calls and reset last_timestamp
	    autoUpdate = false;
	    last_timestamp = new Date(800000);

	    });


	$( document ).on( "connection", function(e) {

		connection_status = e.originalEvent.data;
		$(".connection-status").text(connection_status);

		});

	if touch_supported {
		$(':mobile-pagecontainer').on("tap", ".stopwatch", function())
	}


//original code from ksloan/jquery-mobile-swipe-list I updated to improve behaviour with JQuery Mobile

	function change_click_to_swipe(oe) {  //bound to click or tap when swipeable item is open
		oe.preventDefault();
		oe.stopPropagation();
		e= new $.Event({type: "swipe", data: "pvfired"});
		$(this).trigger(e);
	}

    $(document).on('swipe', '.swipe-delete li > a', function(e) {
            console.log(e)
            var change = 0;
            var new_left = '0px';
	 		var left = parseInt(e.target.style.left);
 			if (!left || left == 0) {  //the target is closed already then this is an action
 				left = 0  			  //on a new item so close any other open ones
 				$('.open').animate({left: 0}, 200);
 				$('.open').removeClass('open');
 			};
  			if (typeof(e.swipestop) !== 'undefined') { //must have been a real swipe
	            change = e.swipestop.coords[0] - e.swipestart.coords[0]; // get value of x axis change
 				change = (change < 0) ? -100 : 100;
	        } else {
	        	change = -left;  //if not a real swipe - it was one of our trapped events so set change to zero
	        }
	        change=change+left;
            if (change < -20) {
                new_left = '-100px';
             	$(e.target).addClass('open');
             	$(e.target).on('tap click vclick', change_click_to_swipe);
            } else if (change > 20) {
            	$(e.target).addClass('open');
             	$('.swipe-delete li > a').on('tap click vclick', change_click_to_swipe);
                new_left = '100px';
            } else {
             	$(e.target).off('tap click vclick', change_click_to_swipe);
            	$(e.target).removeClass('open');
                new_left = '0px'
            }
            $(e.target).animate({left: new_left}, 200);
            e.preventDefault();
            e.stopPropagation();
    });

    $('li .delete-btn').on('vclick', function(e) {
        e.preventDefault()
        $(this).parents('li').slideUp('fast', function() {
            $(this).remove()
        })
    });

    $('li .edit-btn').on('vclick', function(e) {
        e.preventDefault()
        $(this).parents('li').children('a').html('edited')
    });
});

//ksloan/jquery-mobile-swipe-list end

Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
}

//load the crew_times object with the crew times list retrieved from the database//
function get_crew_times() {

	crew_times.length = 0; // initialise crew Array before filling it with the crew list
	refresh.length = 0; //initialise the refresh array before setting it up
    for (var i=0; i < crew_data.length; i++) {   //step through the crew_data passed and assign it to crew_times
    	crew_times.push(JSON.parse(crew_data[i])); //convert the JSON string to an object
    	console.log("put crew number " + crew_times[i].crew_number+" into the object array");
    	refresh[i] = false;
	}	

}
//initialise the API calls to the rowtime-26 server.//
  function init() {
  	var ROWTIME_API = document.location.protocol + "//"+ document.location.host+"/_ah/api" //works for localhost but only for https:/rowtime if
  																						// the user types in https://rowtime-26.appspot.com without the www and not http
	//var ROWTIME_API = 'http://localhost:9000/_ah/api';
    //var ROWTIME_API = 'https://rowtime-26.appspot.com/_ah/api';

    try {
		gapi.client.load('observedtimes', 'v1', function() {api_loading_init();
	 	}, ROWTIME_API);
	 	e = new $.Event({type: "connection", data: "Successfully connected"});
		$(document).trigger(e);
	 	return("succesfully connected")
    }
    catch(err) {
    	e = new $.Event({type: "connection", data: "Connection Error"});
		$(document).trigger(e);
    	return("error connecting...!");
    }
  }

  function api_loading_init() {
  	//this function is called when the API is initialised, put anything here we need to do at the start, for example get an initial read of the obeserved times if we need it//
	console.log("ROWTIME_API loaded and init function called");
	gae_connected_flag=true;
  }

  function record_observed_time(observed_time) {
	// Insert an observed time into the rowtime-26 server//
	try {
		var recordtime = gapi.client.observedtimes.times.timecreate(observed_time).execute(function(resp) {
	  		console.log(resp);
	  	e = new $.Event({type: "connection", data: "recorded time"});
		$(document).trigger(e);
	  	});
	} catch(err) {
		e = new $.Event({type: "connection", data: "failed to record time"});
		$(document).trigger(e);
		console.log("recording time failed");
		return("error connecting...!");
	}
  }

  function get_times(){
   // Get the list of observed times since the last time it was requested//
   if (autoUpdate==false) {
   		last_timestamp = new Date(800000);
   		return;
   }
 	var request = gapi.client.observedtimes.times.listtimes(event_and_last_timestamp);
  	try {
	   request.then(function(resp) {
	    	last_timestamp = new Date(resp.result.last_timestamp);
	    	event_and_last_timestamp.last_timestamp = last_timestamp.toISOString();

	   		for(var i=0; i<resp.result.times.length; i++) {
	    		update_time_list(resp.result.times[i]);
	    	}
	      });
		e = new $.Event({type: "connection", data: "get times - success"});
		$(document).trigger(e);	   	  
	} catch(err) {
	   	e = new $.Event({type: "connection", data: "get times - failed"});
		$(document).trigger(e);
   	}
   	if (autoUpdate == true) {
   		var mytime=setTimeout('get_times()',REFRESH_TIME2);
   	} else {
	   	last_timestamp = new Date(800000); //reset lst timestamp so next request gets all times
	}
   }

   function update_time_list(time) {
   	//Update the times in the crew_times array and update the screen//
   	//1.  for every hit against a crew number process the observed time//
   	for (var i=0; i<crew_times.length; i++) {
   		if (crew_times[i].crew_number == time.crew) {
   			UpdateTimes(i, time.crew, new Date(time.time), time.stage);
   			}
   		}
   	}
       	
	function myFunction() {

		var rand_num = Math.floor((Math.random() * 10) + 1);
		background = "url('/images/rowingpic" + String(rand_num) + ".jpg')";
		document.body.style.backgroundImage = background;
	}

	function UpdateTimes(indx, crew_num, time, stage){
		if (stage == 0){
			//a start time has been recorded//
			UpdateStartTime(indx, crew_num, time);
		} else if(stage ==1){
			//a stop time has been recorded//
			UpdateStopTime(indx,crew_num,time);
		} else { alert("stage parameter not set properly")}
	}

	function UpdateStartTime(indx, crew_num, time){
		var button = $("#button_"+crew_num);
		crew_times[indx].start_time_local = time; //start time
		crew_times[indx].stage=0;
		var start_time_textElement = $("#start_"+crew_num);
		var stop_time_textElement = $("#stop_"+crew_num);
		start_time_textElement.css("green");
		start_time_textElement.text("start: "+time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		stop_time_textElement.text("stop: ");
		button.text("stop");
		button.css("background", "red");
		button.prop("enabled");
		if (refresh[indx] == false){
			var mytime=setTimeout('update_time('+indx+','+crew_num+')',REFRESH_TIME);
			refresh[indx] = true;
		}


	}

	function UpdateStopTime(indx,crew_num,time){
		var button = $("#button_"+crew_num);
		crew_times[indx].end_time_local = time; //end time
		crew_times[indx].stage=1;
		crew_times[indx].stage_delta = crew_times[indx].end_time_local - crew_times[indx].start_time_local;
		var delta = Convert_ms_tostring(crew_times[indx].stage_delta);
		button.text("Finished");
		button.css("background","grey");
		button.prop("disabled");
		var stop_time_textElement = $("#stop_"+crew_num);
		var delta_time_textElement = $("#delta_"+crew_num);
		stop_time_textElement.text("stop: "+time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		delta_time_textElement.text("delta: "+delta);
		stop_time_textElement.css("style","red");
		delta_time_textElement.css("style","black");
	}


	function ClickButton(indx, crew_num, time, stage){
		var button = $("#button_"+crew_num);
		if (button.text() == "start") {
			UpdateStartTime(indx, crew_num, time);
			stage = 0;
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  crew: crew_num,
								  stage: stage,
								  time: time};
			record_observed_time(observed_time);
		}
		else if(button.text() == "stop") {
			UpdateStopTime(indx, crew_num, time);
			stage = 1;
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  crew: crew_num,
								  stage: stage,
								  time: time};
			record_observed_time(observed_time);
		}
		else {
			alert("button not start or stop");

		}
	}

	function update_time(indx, crew_num) {
		var button = $("#button_"+crew_num);
		if (button.text() == "Finished"){   //this does not work if there is no button
			refresh[indx] = false;
			return;
		}
		var stop_time_textElement = $("#stop_"+crew_num);
		var start_time_textElement = $("#start_"+crew_num);
		var delta_time_textElement = $("#delta_"+crew_num);
		var tempnow = new Date();
		var stage_delta = tempnow - crew_times[indx].start_time_local;
		var dt = Convert_ms_tostring(stage_delta);
		delta_time_textElement.text("delta: "+dt);
		var mytime=setTimeout('update_time('+indx+','+crew_num+')',REFRESH_TIME);
		refresh[indx] = true;

	}

	function Convert_ms_tostring(number){
		var ms = number%1000;
		var seconds=new Number(((number/1000)%60).toFixed(0));
		var minutes=new Number(((number/(1000*60))%60).toFixed(0));
		var hours=new Number(((number/(1000*60*60))%24).toFixed(0));
		var dt = hours.pad()+":"+minutes.pad()+":"+seconds.pad()+"."+ms.pad(3);
		return dt
	}

