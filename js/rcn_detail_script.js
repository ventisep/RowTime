 //create the array to hold the times for each crew as a global variable accessible by all the functions, the index for the array will be the order in which the crews are displayed on the screen//
 //todo list:
 //	1.  find out how to set the ROWTIME_API variable based on the website being used so we
 //		dont have to keep changing the commented code when we promote to the website - DONE PV
 //	2.  create variables that will be set by JINJA2 so I can put the JS code in a seperate file - DONE PV

 //variables that will have a global scope:

    var crew_times = [];
    var last_timestamp = new Date(800000);
    var event_and_last_timestamp = {"event_id":event_id_urlsafe,
								"last_timestamp":last_timestamp.toISOString()};


//initialise the API calls to the rowtime-26 server.//
  function init() {
  	var ROWTIME_API = document.location.origin+"/_ah/api"
	//var ROWTIME_API = 'http://localhost:9000/_ah/api';
    //var ROWTIME_API = 'https://rowtime-26.appspot.com/_ah/api';
	gapi.client.load('observedtimes', 'v1', function() {api_loading_init();
	}, ROWTIME_API);
  }

  function api_loading_init() {
  	//this function is called when the API is initialised, put anything here we need to do at the start, for example get an initial read of the obeserved times if we need it//
	console.log("ROWTIME_API loaded and init function called");
  }

  function record_observed_time(observed_time) {
	// Insert an observed time into the rowtime-26 server//
	var recordtime = gapi.client.observedtimes.times.timecreate(observed_time).execute(function(resp) {
  		console.log(resp);
  	});
  }

  function get_times(){
   // Get the list of observed times since the last time it was requested//
   var request = gapi.client.observedtimes.times.listtimes(event_and_last_timestamp);
   console.log("timestamp as ISO string"+last_timestamp.toISOString())
      // Step 6: Execute the API request
   request.then(function(resp) {
    	last_timestamp = new Date(resp.result.last_timestamp);
    	console.log("timestamp as ISO string from result "+last_timestamp.toISOString());

    	for(var i=0; i<resp.result.times.length; i++) {
    		update_time_list(resp.result.times[i]);
    	}
    	//now have list of times to apply to the screen TODO PV
      });
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
       	
	//load the crew_times object with the crew times list retrieved from the database//
	function get_crew_times() {

	    for (var i=0; i < crew_data.length; i++) {   //step through the crew_data passed and assign it to crew_times
	    	crew_times.push(JSON.parse(crew_data[i])); //convert the JSON string to an object
	    	console.log("put crew number " + crew_times[i].crew_number+" into the object array");
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
		var button = document.getElementById("button_"+crew_num);
		crew_times[indx].start_time_local = time; //start time
		crew_times[indx].stage=0;
		var start_time_id = "start_"+crew_num;
		var start_time_textElement = document.getElementById(start_time_id);
		var the_button = document.getElementById(start_time_id);
		start_time_textElement.style.color = "green";
		start_time_textElement.value = time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3);
		button.value = "stop";
		button.style.color = "red";
		button.disabled = false;

	}

	function UpdateStopTime(indx,crew_num,time){
		var button = document.getElementById("button_"+crew_num);
		button.value = "Finished";
		crew_times[indx].end_time_local = time; //end time
		crew_times[indx].stage=1;
		crew_times[indx].stage_delta = crew_times[indx].end_time_local - crew_times[indx].start_time_local;
		var delta = new Date(crew_times[indx].stage_delta);
		button.style.color = "";
		button.disabled = true;
		var stop_time_textElement = document.getElementById("stop_"+crew_num);
		var delta_time_textElement = document.getElementById("delta_"+crew_num);
		stop_time_textElement.value = time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3);
		delta_time_textElement.value = delta.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+delta.getMilliseconds().toString()).slice(-3);
		stop_time_textElement.style.color = "red";
		delta_time_textElement.style.color = "black";
	}


	function ClickButton(indx, crew_num, time, stage){
		var button = document.getElementById("button_"+crew_num);
		if (button.value == "start") {
			UpdateStartTime(indx, crew_num, time);
			stage = 0;
			var observed_time = {event_id: event_id_urlsafe,
								  timestamp: time,
								  crew: crew_num,
								  stage: stage,
								  time: time};
			record_observed_time(observed_time);
			var refresh=100; // Refresh rate in milli seconds
			mytime=setTimeout('update_time('+crew_num+')',refresh)
		}
		else if(button.value == "stop") {
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

	function update_time(crew_num) {
		var button = document.getElementById("button_"+crew_num)
		if (button.value == "Finished"){
			return;
		}
		var stop_time_textElement = document.getElementById("stop_"+crew_num);
		var start_time_textElement = document.getElementById("start_"+crew_num);
		var difference = new Date(); //work out differnce "- crew_times[crew_index].start_time;""
		var d = difference.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+difference.getMilliseconds().toString()).slice(-3);
		stop_time_textElement.value = d;
		var refresh=10; // Refresh rate in milli seconds
		var mytime=setTimeout('update_time('+crew_num+')',refresh);
	}


