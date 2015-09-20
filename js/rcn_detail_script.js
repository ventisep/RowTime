
//ToDos
//1. consider how to create an off-line version of the time recording to speed up the user experience
//	 and allow use where the wifi or mobile connectivity is poor.
//4. tidy up files that are not needed
//5. tidy up the picture file names
//
//4. add stage names to the button rather than start/stop these should be part of the event
//   so add to data model as repeated group stage and stage desc.
//5. add a verify option at the end of the stages which allow edit of official times with
//   with the addition of an obs_type of 3 - design spike on whether to add these to the crew-times
//   table or whether to get rid of that table all-together
//
//6. Use offline storage to store the events and send back and forth async to the server enabling
//   offline use and times get synch'd when possible - precursor to this would be to save session
//   in offline storage (not sure this will work)

 //variables that will have a global scope:
 //variables event_id_urlsafe and last_timestamp have to be set in the dynamic document by jinja2


const REFRESH_TIME = 100; // for timer counting in milleseconds
const REFRESH_TIME2 = 1000; //for checking server for times in milleseconds
const LAST_TIMESTAMP_RESET = "2000-08-31T16:54:07.050741";
var crew_times = [];
var autoUpdate = true;
var last_timestamp = LAST_TIMESTAMP_RESET;  //iso format string
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
	    last_timestamp = LAST_TIMESTAMP_RESET;

	    });


	$( document ).on( "connection", function(e) {

		connection_status = e.originalEvent.data;
		$(".connection-status").text(connection_status);

		});

	function record_stage(e) {
		//todo this is called when the .stopwatch class of button is called
		//it determines what to do depending on the current stage which is on the 
		//button's text label.
		//to make an offline version - this function should write the information into
		//a local data store rather than direct to the server.  An event handler which triggers on
		//the local store change then should call the write to the server
		//we also would need to change the array crew_times[] to be held in the local store
		//
		//to make a multi-stage version we would need to line up each stage with a button text
		//which would have to come from the event information. then do the following:
		//if stage is in the list of possible stages, call a replacement for the UpdateStartTime
		//function called UpdateStageTime.  Use stage as a parameter for this function and process
		//accordingly.  
		time = new Date();
		autoUpdate = false;  //switch of reading from server till new time recorded
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
		autoUpdate = true;  //switch on reading from server
		get_times();
		e.preventDefault();
        e.stopPropagation();


	};

	if (touch_supported) {
		$('body').on("tap", ".stopwatch", record_stage)
	}
	else {
		$('body').on("click", ".stopwatch", record_stage)
	}


    function flip($front, $back, crew_num, time) {


        $front.css({  //this works perfectly now need backside
            transform: "rotateY(180deg)",
            "backface-visibility": "hidden",
        	"transform-style": "preserve-3d",
      		"-webkit-perspective": 1,//$back["outerWidth"]()*1,
        	perspective: 1,//$front["outerWidth"]()*1,
        	transition: "all 1s ease-out",
      		"z-index": "-1"
      	});
      	$back.css({
      		transform: "rotateY(0deg)",
      		"margin-right": "5%",
      		"transform-style": "preserve-3d",
      		"-webkit-perspective": $back["outerWidth"]()*2,
      		perspective: $back["outerWidth"]()*2,
      		transition:"all 1s ease-out",
      		"z-index": "0"
      	});

      	$front.data("flipped", true);
      	$confirm_button=$back.find('.confirm');
      	$cancel_button=$back.find('.cancel');

      	$confirm_button.data("crew_num", crew_num);
      	$confirm_button.data("time", time);

      	$cancel_button.on("click tap", function(){
      		unflip($front, $back);
        	e.preventDefault();
            e.stopPropagation();      		
      	});

      	$confirm_button.on("click tap", function(e){
      		var time = $(this).data("time");
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  obs_type: 1,  //type 1 is delete the last stage entered for that crew
								  crew: $(this).data("crew_num"),
								  stage: 0, //we can set this to anything - it is ignored
								  time: time};
			record_observed_time(observed_time);//when auto-update comes back on the event should be processed
        	unflip($front, $back);
        	e.preventDefault();
            e.stopPropagation();

      	});

    }


    function unflip($front, $back) {
    	console.log("got to unflip");

      	$back.css({
      		transform: "rotateY(180deg)",
  			"-webkit-transform": "rotateY(-180deg)",
      		"transform-style": "preserve-3d",
      		perspective: $back["outerWidth"]()*2,
      		transition:"all 1s ease-out",
      		"z-index": "-1"
      	});
        $front.css({  //this works perfectly now need backside
            transform: "rotateY(0deg)",
            "backface-visibility": "hidden",
        	"transform-style": "preserve-3d",
        	perspective: $front["outerWidth"]()*2,
        	transition: "all 1s ease-out",
      		"z-index": "0"
      	});

      	$confirm_button=$back.find('.confirm');
      	$cancel_button=$back.find('.cancel');
        $confirm_button.off("click tap");
        $cancel_button.off("click tap");


      	$front.data("flipped", false);
      	autoUpdate = true;
      	get_times();

    }

    $(document).on('swipe', '.swipeable', function(e) {
    	//function to allow user to delete the last recorded time
            var time = new Date();
            autoUpdate = false;
            console.log(e)
            //get crew number that was swiped
            var crew_num = $(this).attr("id").split('_')[1];
            var $frontside = $(this).find('.front');
            var $backside = $(this).find('.back');
            
            if ($frontside.data("flipped")) {
            	unflip($frontside, $backside)
            } else {
            	flip($frontside, $backside, crew_num, time)
            }

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
    }
    catch(err) {
    	e = new $.Event({type: "connection", data: "Connection Error! try again"});
		$(document).trigger(e);
    	return("error connecting...!");
    }
  }

  function clock_accuracy_async() {
  	var accuracy = {client_time : null,
  					server_time : null,
  					diff_in_ms : null,
  					latency : null};
  	var resp_time = null;
	var latency = null;				

  	console.log("syncing time")
    client_time = {client_time: new Date()};  //needs to be an object like clocksyncrequest
    var clocksyncrequest = gapi.client.observedtimes.clock.clockcheck(client_time).execute(function(resp) {
	  		resp_time = new Date();
	  		accuracy.latency = resp_time - client_time.client_time;
	  		accuracy.client_time = client_time.client_time;
	  		accuracy.server_time = resp.server_time
	  		accuracy.diff_in_ms = resp.diff_in_ms
			console.log("client time: "+accuracy.client_time);
			console.log("server time: "+accuracy.server_time);
			console.log("diff time: "+accuracy.diff_in_ms);
			console.log("latency: "+accuracy.latency)
			$(document).data("accuracy", accuracy);
			if (accuracy.diff_in_ms<accuracy.latency && accuracy.diff_in_ms > 0){
				e = new $.Event({type: "connection", data: "Successfully connected - your time is exact"});
				} else {
				e = new $.Event({type: "connection", data: "Successfully connected - your time is NOT EXACT"});
				}
			$(document).trigger(e);
	});
  }

  function api_loading_init() {
  	//this function is called when the API is initialised, put anything here we need to do at the start, for example get an initial read of the obeserved times if we need it//
	console.log("ROWTIME_API loaded and init function called now getting synch time");
    // once the API is loaded check the connection latency and server/client times to
    // establish how accurate the measurements will be.
    clock_accuracy_async();

	e = new $.Event({type: "connection", data: "Successfully connected"});
	$(document).trigger(e);
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
   		return;
   }
 	var request = gapi.client.observedtimes.times.listtimes(event_and_last_timestamp);
  	try {
	   request.then(function(resp) {
	    	last_timestamp = resp.result.last_timestamp;
	    	event_and_last_timestamp.last_timestamp = last_timestamp;
	    	if (resp.result.times) {
		   		for(var i=0; i<resp.result.times.length; i++) {
		    		update_time_list(resp.result.times[i]);
		    	}
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
		start_time_textElement.text(time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		stop_time_textElement.text("");
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
		start_time_textElement.text("");
		stop_time_textElement.text("");
		delta_time_textElement.text("");
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
		stop_time_textElement.text(time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		delta_time_textElement.text(delta);
		stop_time_textElement.css("color","red");
		delta_time_textElement.css("color","black");
	}

	function DeleteStopTime(indx, crew_num){
		var button = $('#'+crew_num);
		crew_times[indx].stage=0;
		var start_time_textElement = $("#start_"+crew_num);
		var stop_time_textElement = $("#stop_"+crew_num);
		stop_time_textElement.text("");
		button.text("stop");
		button.css("background", "red");
		button.prop("enabled");
		if (refresh[indx] == false){
			var mytime=setTimeout('update_time('+indx+','+crew_num+')',REFRESH_TIME);
			refresh[indx] = true;
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
		delta_time_textElement.text(dt);
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

