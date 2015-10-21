
//ToDos
//1. consider how to create an off-line version of the time recording to speed up the user experience
//	 and allow use where the wifi or mobile connectivity is poor.
//2. make the call for crew data more efficient and sort out the resetting of the variables on second
//   use of the call
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


const REFRESH_TIME = 200; // for timer counting in tenths of seconds
const REFRESH_TIME2 = 2000; //for checking server for times in milleseconds
const LAST_TIMESTAMP_RESET = "2000-08-31T16:54:07.050741";
var crew_times = [];
var autoUpdate = true;
var last_timestamp = LAST_TIMESTAMP_RESET;  //iso format string
var refreshCount = 0;
var indexof = [];
var gae_connected_flag = false;
var connection_status;
var touch_supported = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0));

Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
}


function Rower(k,n) {
	this.rower_id = k;
	this.name = n;
}

function Stage(l,c,lt,st,t) {
	this.local_time = lt;
	this.server_time = st;
	this.time_textElement = t;
	this.label = l;
	this.classname = c;
}

function Crew(k,e,n,cn,d,s,ss,stl,sts,etl,ets,f,t,c,x,r,o) {
  this.event_id = e;
  this.crew_id = k;
  this.crew_number = n;
  this.crew_name = cn;
  this.division = d;
  this.inProgress = false;
  this.stage = s;
  this.nextstage = s;
  this.stages = ss; //array of Stage objects
  this.start_time_local = stl; //the time taken at the start line
  this.start_time_server - sts;
  this.start_time_textElement;
  this.end_time_local = etl; // the time taken at the finish line
  this.end_time_server = ets;
  this.end_time_textElement;
  this.delta_time;
  this.delta_time_textElement;
  this.pic_file = f;
  this.category = t;
  this.rower_count = c;
  this.cox = x;
  this.rowers = r;
  this.observedTimes = o; //array of observed times

  this.refreshDeltaTime = function(){
	var tempnow = new Date();
	this.delta_time = tempnow - this.start_time_local;
	this.delta_time_textElement.text(Convert_ms_tostring(this.delta_time, true).slice(0,-2));  //don't show milliseconds
  };

  this.UpdateStartTime = function(time, type) {
  	if (type == 0) { //add time
  		time = new Date(time);
		this.start_time_local = time; //start time but could be a stage event
		this.start_time_textElement.css("color","green");
		this.start_time_textElement.text(time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		this.inProgress = true;
	} else if (type == 1) {  //delete time
		this.start_time_textElement.css("color","green");
		this.start_time_textElement.text("");
		this.end_time_textElement.text("");
		this.delta_time_textElement.text("");
		this.button.removeClass(this.stages[this.nextstage].classname);
		this.stage = -1;
		this.nextstage = 0;
		this.button.addClass(this.stages[this.nextstage].classname);
		//this.stages[stage].time_textElement.text("");
		this.button.text(this.stages[this.nextstage].label);
		this.inProgress = false;
	}
	return;
 } 

 this.AddTimeEvent = function(timeEvent) { //to do for a later version
 	var stage = parseInt(timeEvent.stage);
 	if (stage == 0) {this.UpdateStartTime(timeEvent.time, timeEvent.obs_type);} //stage 0 is always the start
 	if (stage == this.stages.length-2) {this.UpdateStopTime(timeEvent.time, timeEvent.obs_type, stage);} //last but one stage is always the end
	if (timeEvent.obs_type == 0) {  //add the stage time provided
		this.stages[stage].local_time = new Date(timeEvent.time); //start time
		this.stages[stage].server_time = new Date(timeEvent.timestamp); //start time
		this.stage=stage;
		this.nextstage=this.stage+1;
		//this.stages[stage].time_textElement.css("color","green");
		//this.stages[stage].time_textElement.text(time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		this.button.text(this.stages[this.nextstage].label);
		this.button.removeClass(this.stages[this.stage].classname);
		this.button.addClass(this.stages[this.nextstage].classname);

	} else if (timeEvent.obs_type == 1) { //delete the stage time provided but not the overall 
										// stage of the crew this will be done only is start or
										// end times are deleted.
		this.stages[stage].local_time = null; //start time
		this.stages[stage].server_time = null; //start time
	}
	this.observedTimes.push(timeEvent);
	return;
 }

 this.UpdateStopTime = function(time, type, stage){
 	if (type == 0) { //add time
 		time = new Date(time);
		this.end_time_local = time; //end time
		this.inProgress = false;
		this.delta_time = this.end_time_local - this.start_time_local;
		this.button.text("Finished");
		this.button.css("background","grey");
		this.button.prop("disabled");
		this.end_time_textElement.text(time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3));
		this.delta_time_textElement.text(Convert_ms_tostring(this.delta_time, true).slice(0,-2));
		this.end_time_textElement.css("color","red");
		this.delta_time_textElement.css("color","black");
	} else if (type == 1){ //delete time
		this.end_time_textElement.text("");
		this.button.text("stop");
		this.button.css("background", "red");
		this.button.prop("enabled");
		this.button.removeClass(this.stages[this.nextstage].classname);
		this.stage = (stage >0) ? stage-1 : 0;
		this.nextstage = this.stage+1;
		this.button.addClass(this.stages[this.nextstage].classname);
		//this.stages[stage].time_textElement.text("");
		this.button.text(this.stages[this.nextstage].label);
		this.inProgress = true;
	}
	return;
 }
}

function copyCrew(myParsedJSON, crewObj) {
	var prop;

	for (prop in myParsedJSON) {
		crewObj[prop] = myParsedJSON[prop];
	}

	crewObj.button = $('#'+crewObj.crew_number);
	crewObj.start_time_textElement = $('#start_'+crewObj.crew_number);
	crewObj.end_time_textElement = $('#stop_'+crewObj.crew_number);
	crewObj.delta_time_textElement = $('#delta_'+crewObj.crew_number);

	if (crewObj.stages != undefined) {

		for (var i=0; i<crewObj.stages.length; i++) {
			//crewObj.stages[i].time_textElement = $("#stage_"+crewObj.stages[i].label+crewObj.crew_number);
			//crewObj.stages[i].delta_time_textElement = $("#delta_"+crewObj.stages[i].label+crewObj.crew_number);
			crewObj.stages[i].classname = crewObj.stages[i].label+"Class";
		}
		crewObj.stages.push({label : 'Finished', classname : 'FinishedClass'});
		crewObj.stage = -1; //not started
		crewObj.nextstage = 0; //started
	}

	crewObj.observedTimes = new Array(); //initialise the array that will hold times


	return crewObj;
}  

function RefreshDeltaTimes() {
	//only get's called on the first refresh need and then calls itself from there
	//until the refreshCount falls below 1
	var localArray = crew_times;
	var len = localArray.length; 
	for (i=0;i<len;i++) {
		if (localArray[i].inProgress) {
			crew_times[i].refreshDeltaTime();
		}
	}

	if (refreshCount>0){
		var timer = setTimeout(RefreshDeltaTimes,REFRESH_TIME); 
	};
}
//------- this section for event handling on the screens ------------//


$(function() {

    // call the initialisation function for the Google App Engine API
    connection_status=init();

	$(document).on( "pagecreate", "#crewtimes", function() {

		get_crew_list();  //initialise the crew_times array and set connection status
		$(".connection-status").text(connection_status);
	    autoUpdate = true;
    	$(".ui-table-columntoggle-btn").appendTo($("#columnsTD"));
        $("#table-column-toggle").tablesorter({sortAppend: [[7,0]], headers: {7: {sorter:'shortTime'}}});
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

		time = new Date();
		autoUpdate = false;  //switch off reading from server till new time recorded
		var button = $(this);
		crew_num = button.attr("id");
		indx = indexof[crew_num];
		var observed_time = {event_id: event_id_urlsafe,
							 timestamp: time,
							 obs_type: 0,  //an 0 = add time to the record type 1 = delete
							 stage: crew_times[indx].nextstage,
							 crew: crew_num,
							 time: time};		

		crew_times[indx].AddTimeEvent(observed_time);
		record_observed_time(observed_time);
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


        $front.css({
            transform: "rotateY(180deg)",
            "backface-visibility": "hidden",
        	"transform-style": "preserve-3d",
      		"-webkit-perspective": $back["outerWidth"]()*2,
        	perspective: $front["outerWidth"]()*2,
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

      //	for (i=0; i<crew_times[indexof[crew_num]].observedtimes.length;i++) {
	  //   		var divstring = "<div id='"+crew_times[indexof[crew_num]].observedtimes[i].time_id+"'>time: "+
	  //    							crew_times[indexof[crew_num]].observedtimes[i].obs_type+"</div>"
	  //    		$back.prepend(divstring);
      //	};

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
      		var crew_num = $(this).data("crew_num");
      		indx = indexof[crew_num];
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  obs_type: 1,  //type 1 is delete the last stage entered for that crew
								  crew: crew_num,
								  stage: crew_times[indx].stage, //we can set this to anything - it is ignored
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



//load the crew_times object with the crew times list retrieved from the database//
function get_crew_list() {
	//if using the API version then call the API here to get back a JSON string
	crew_times.length = 0; // initialise crew Array before filling it with the crew list
	indexof.length = 0;
	var eventRequest = {event_id: event_id_urlsafe};
	var crewListRequest = gapi.client.observedtimes.crew.list(eventRequest).execute(function(resp) {

    for (var i=0; i < resp.result.crews.length; i++) {   //step through the crew_data passed and assign it to crew_times
    	var tmpcrew = new Crew();
    	tmpcrew = copyCrew(resp.result.crews[i],tmpcrew);//convert the JSON string to an object
    	crew_times.push(tmpcrew); 
    	indexof[crew_times[i].crew_number]=i; //create a lookup
    	// console.log("put crew number " + crew_times[i].crew_number+" into the object array");
	}
	get_times(); //now the crews are loaded it is safe to load any times already recorded

	});	

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

  function initgapi() {
    	e = new $.Event({type: "connection", data: "Gapi - loaded"});
		$(document).trigger(e);
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
	  		accuracy.client_time = resp.client_time;
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
			$(".ClientTime").text(accuracy.client_time.slice(11,-3));
			$(".ServerTime").text(accuracy.server_time.slice(11,-3));
			$(".TimeDiff").text(accuracy.diff_in_ms);
			$(".Latency").text(accuracy.latency);
	});
  }

  function api_loading_init() {
  	//this function is called when the API is initialised, put anything here we need to do at the start, for example get an initial read of the obeserved times if we need it//
	console.log("ROWTIME_API loaded and init function called now getting synch time");
 	e = new $.Event({type: "connection", data: "Successfully connected - checking time"});
	$(document).trigger(e);
	gae_connected_flag=true;

	// once the API is loaded check the connection latency and server/client times to
    // establish how accurate the measurements will be.
    clock_accuracy_async();
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
		  e = new $.Event({type: "connection", data: "getting times"});
		  $(document).trigger(e);
		  request.then(function(resp) {
	    	last_timestamp = resp.result.last_timestamp;
	    	event_and_last_timestamp.last_timestamp = last_timestamp;
	    	if (resp.result.times) {
		   		for(var i=0; i<resp.result.times.length; i++) {
		    		crew_times[indexof[resp.result.times[i].crew]].AddTimeEvent(resp.result.times[i]);
		    		e = new $.Event({type: "connection", data: "got times"});
					$(document).trigger(e);	
		    	}
	    		$("#table-column-toggle").trigger("update");
		   }
   		   var mytime=setTimeout('get_times()',REFRESH_TIME2);
	      });
 
	} catch(err) {
	   	e = new $.Event({type: "connection", data: "get times - failed"});
		$(document).trigger(e);
		var mytime=setTimeout('get_times()',REFRESH_TIME2); //keep trying
   	}

   }


	function Convert_ms_tostring(number, nopad){
		var ms = number%1000; //the number of ms left
		var seconds=(((number-ms)/1000)%60);
		var minutes=(((((number-ms)/1000)-seconds)/60)%60);
		var hours=(((((((number-ms)/1000)-seconds)/60)-minutes)/60)%24);
		if (nopad) {
			var dt;
			if (hours>0) {
				dt = String(hours)+":"+minutes.pad(2)+":"+seconds.pad(2)+"."+ms.pad(3);
			} else if (minutes>0) {
				dt= String(minutes)+":"+seconds.pad(2)+"."+ms.pad(3);
			} else if (seconds>0) {
				dt = String(seconds)+"."+ms.pad(3);
			} else {
				dt="."+ms.pad(3);		
			}
		} else {
			var dt = hours.pad()+":"+minutes.pad()+":"+seconds.pad()+"."+ms.pad(3);
		}
		return dt
	}


