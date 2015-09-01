
//ToDos
//1. line 65 prevent stop button changing twice s it reads from observed times
//   and picks up the start time before the stope time is recorded (set refresh = false
//   then process the sime entered, record it using API and check error status - if 
//   record time is an error - make sure user does not see change in time and do not
//   set refresh back to true.  on a retry, if successful, refresh will be set bck to true)
//
//2. load in content of detail page using a pagecreate event
//5. add stage names to the button rather than start/stop these should be part of the event
//   so add to data model as repeated group stage and stage desc.
//6. add a verify option at the end of the stages which allow edit of official times with
//   with the addition of an obs_type of 3 - design spike on whether to add these to the crew-times
//   table or whether to get rid of that table all-together
//
//7. Use offline storage to store the events and send back and forth async to the server enabling
//   offline use and times get synch'd when possible - precursor to this would be to save session
//   in offline storage (not sure this will work)

 //variables that will have a global scope:
 //variables event_id_urlsafe and last_timestamp have to be set in the dynamic document by jinja2


const REFRESH_TIME = 100; // for timer counting in milleseconds
const REFRESH_TIME2 = 1000; //for checking server for times in milleseconds
var crew_times = [];
var autoUpdate = true;
var last_timestamp = new Date(800000);
var refresh = [];
var indexof = [];
var gae_connected_flag = false;
var connection_status;
var touch_supported = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));

//------- this section for event handling on the screens ------------//


$(function() {

    // call the initialisation function for the Google App Engine API
    connection_status=init();

	$(document).on( "pagecreate", "#crewtimes", function() {

		get_crew_times();  //initialise the crew_times array and set connection status
		$(".connection-status").text(connection_status);
	    autoUpdate = true;
		get_times();
    	$(".ui-table-columntoggle-btn").appendTo($("#columnsTD"));

	});

	$(document).on( "pagehide" , "#crewtimes", function() {
	    // stop the function calls to update time and reset last_timestamp
	    autoUpdate = false;
	    last_timestamp = new Date(800000);

	    });


	$( document ).on( "connection", function(e) {

		connection_status = e.originalEvent.data;
		$(".connection-status").text(connection_status);

		});

	function record_stage(e) {
		time = new Date();
		var button = $(this);
		crew_num = button.attr("id");
		indx = indexof[crew_num];
		if (button.text() == "start") {
			UpdateStartTime(indx, crew_num, time);
			stage = 0;
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  obs_type: 0,  //an 0 = add time to the record type 1 = delete
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
								  obs_type: 0,
								  crew: crew_num,
								  stage: stage,
								  time: time};
			record_observed_time(observed_time);
		}
		else {
			alert("this crew is already Finished");

		}
	};

	if (touch_supported) {  //if this works delete clickButton function
		$('body').on("tap", ".stopwatch", record_stage)
	}
	else {
		$('body').on("click", ".stopwatch", record_stage)
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

    $(document).on('swipe', '.swipeable', function(e) {
    	//function to allow user to delete the last recorded time
            console.log(e)
            var time = new Date();
            autoUpdate = false;
            //get crew number that was swiped
            var crew_num = $(this).attr("id").split('_')[1];
            //move to a dialog to offer delete and edit options
            //confirm user wants to delete the last recorded time
            if (confirm("do you want to delete the last recorded time for crew "+crew_num+"?")) {
            	//change the API to add a delete event to the recorded time events
            	//create a function to proess the delete event
				var observed_time = {event_id: event_id_urlsafe,
									  timestamp: time,
									  obs_type: 1,  //type 1 is delete the last stage entered for that crew
									  crew: crew_num,
									  stage: 0, //we can set this to anything - it is ignored
									  time: time};
				record_observed_time(observed_time);//when auto-update comes back on the event should be processed
            	alert("delete time event added");
            } else {
            	alert("not deleted");
            }
            //if so then use API to delete the last recorded time by passing the url version
            // of the key (must change the record time API to return the key and store it)
            //return from dialogue
            autoUpdate = true;
            get_times();
            e.preventDefault();
            e.stopPropagation();

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
	indexof.length = 0;
    for (var i=0; i < crew_data.length; i++) {   //step through the crew_data passed and assign it to crew_times
    	crew_times.push(JSON.parse(crew_data[i])); //convert the JSON string to an object
    	indexof[crew_times[i].crew_number]=i; //create a lookup
    	console.log("put crew number " + crew_times[i].crew_number+" into the object array");
    	refresh[i] = false;
	}	

}
//initialise the API calls to the rowtime-26 server.//
  function init() {
  	var host = document.location.host.replace(/www./i, "");
  	var ROWTIME_API = document.location.protocol + "//"+ host+"/_ah/api" 
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
    	e = new $.Event({type: "connection", data: "Connection Error! try again"});
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
		e = new $.Event({type: "connection", data: "failed to record time: try again"});
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
   	var mytime=setTimeout('get_times()',REFRESH_TIME2);

   }

   function update_time_list(time) {
   	//Update the times in the crew_times array and update the screen//
   	//1.  for every hit against a crew number process the observed time//
   	for (var i=0; i<crew_times.length; i++) {
   		if (crew_times[i].crew_number == time.crew) {
   			UpdateTimes(i, time.crew, new Date(time.time), time.stage, time.obs_type);
   			}
   		}
   	}
       	
	function myFunction() {

		var rand_num = Math.floor((Math.random() * 10) + 1);
		background = "url('/images/rowingpic" + String(rand_num) + ".jpg')";
		document.body.style.backgroundImage = background;
	}

	function UpdateTimes(indx, crew_num, time, stage, obs_type){
		if (obs_type == 0) { //this is an time that has been added
			if (stage == 0){
				//a start time has been recorded//
				UpdateStartTime(indx, crew_num, time);
			} else if(stage ==1){
				//a stop time has been recorded//
				UpdateStopTime(indx,crew_num,time);
			} else { alert("stage parameter not set properly")}
		} else if (obs_type == 1) { //this is a time that is being deleted
			if (stage == 0){
				//delete of a start time has been recorded//
				DeleteStartTime(indx, crew_num);
			} else if(stage ==1){
				//delete of a stop time has been recorded//
				DeleteStopTime(indx, crew_num);
			} else { console.log("stage parameter not set right")}
		}
	}

	function UpdateStartTime(indx, crew_num, time){
		var button = $('#'+crew_num);
		crew_times[indx].start_time_local = time; //start time
		crew_times[indx].stage=0;
		var start_time_textElement = $("#start_"+crew_num);
		var stop_time_textElement = $("#stop_"+crew_num);
		start_time_textElement.css("color","green");
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

	function DeleteStartTime(indx, crew_num){
		var button = $('#'+crew_num);
		crew_times[indx].stage=0;
		var start_time_textElement = $("#start_"+crew_num);
		var stop_time_textElement = $("#stop_"+crew_num);
		var delta_time_textElement = $("#delta_"+crew_num);
		start_time_textElement.css("color","green");
		start_time_textElement.text("start: ");
		stop_time_textElement.text("stop: ");
		delta_time_textElement.text("delta: ");
		button.text("start");
		button.css("background", "#f6f6f6");
		button.prop("enabled");
		refresh[indx] = false;
	}

	function UpdateStopTime(indx,crew_num,time){
		var button = $('#'+crew_num);
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
		stop_time_textElement.css("color","red");
		delta_time_textElement.css("color","black");
	}

	function DeleteStopTime(indx, crew_num){
		var button = $('#'+crew_num);
		crew_times[indx].stage=0;
		var start_time_textElement = $("#start_"+crew_num);
		var stop_time_textElement = $("#stop_"+crew_num);
		stop_time_textElement.text("stop: ");
		button.text("stop");
		button.css("background", "red");
		button.prop("enabled");
		if (refresh[indx] == false){
			var mytime=setTimeout('update_time('+indx+','+crew_num+')',REFRESH_TIME);
			refresh[indx] = true;
		}
	}


	function ClickButton(indx, crew_num, time, stage){
		var button = $('#'+crew_num);
		if (button.text() == "start") {
			UpdateStartTime(indx, crew_num, time);
			stage = 0;
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  obs_type: 0, //an add time to the record type
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
								  obs_type: 0, //add time to the record, 1 would be a delete time
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
		var button = $("#"+crew_num);
		if (button.text() == "Finished" || refresh[indx] == false){   //this does not work if there is no button
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

