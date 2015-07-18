


 //variables that will have a global scope:
 //variables event_id_urlsafe and last_timestamp have to be set in the parent document by jinja2

    var crew_times = [];
    var last_timestamp = new Date(800000);
    var event_and_last_timestamp = {"event_id":event_id_urlsafe,
								"last_timestamp":last_timestamp.toISOString()};
	const REFRESH_TIME = 10; //in milleseconds
	var refresh = [];

	Number.prototype.pad = function(size) {
	      var s = String(this);
	      while (s.length < (size || 2)) {s = "0" + s;}
	      return s;
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
    }
    catch(err) {
    	alert("error connecting to internet: To try again reload the page");
    }
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
   request.then(function(resp) {
    	last_timestamp = new Date(resp.result.last_timestamp);

   		for(var i=0; i<resp.result.times.length; i++) {
    		update_time_list(resp.result.times[i]);
    	}
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
	    	refresh[i] = false;
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
		var stop_time_id = "stop_"+crew_num;
		var start_time_textElement = document.getElementById(start_time_id);
		var stop_time_textElement = document.getElementById(stop_time_id);
		var the_button = document.getElementById(start_time_id);
		start_time_textElement.style.color = "green";
		start_time_textElement.value = time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3);
		stop_time_textElement.value = "";
		button.value = "stop";
		button.style.color = "red";
		button.disabled = false;
		if (refresh[indx] == false){
			var mytime=setTimeout('update_time('+indx+','+crew_num+')',REFRESH_TIME);
			refresh[indx] = true;
		}


	}

	function UpdateStopTime(indx,crew_num,time){
		var button = document.getElementById("button_"+crew_num);
		button.value = "Finished";
		crew_times[indx].end_time_local = time; //end time
		crew_times[indx].stage=1;
		crew_times[indx].stage_delta = crew_times[indx].end_time_local - crew_times[indx].start_time_local;
		var delta = Convert_ms_tostring(crew_times[indx].stage_delta);
		button.style.color = "";
		button.disabled = true;
		var stop_time_textElement = document.getElementById("stop_"+crew_num);
		var delta_time_textElement = document.getElementById("delta_"+crew_num);
		stop_time_textElement.value = time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")+"."+("00"+time.getMilliseconds().toString()).slice(-3);
		delta_time_textElement.value = delta;
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

	function update_time(indx, crew_num) {
		var button = document.getElementById("button_"+crew_num)
		if (button.value == "Finished"){
			refresh[indx] = false;
			return;
		}
		var stop_time_textElement = document.getElementById("stop_"+crew_num);
		var start_time_textElement = document.getElementById("start_"+crew_num);
		var delta_time_textElement = document.getElementById("delta_"+crew_num);
		var tempnow = new Date();
		var stage_delta = tempnow - crew_times[indx].start_time_local;
		var dt = Convert_ms_tostring(stage_delta);
		delta_time_textElement.value = dt;
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
