


 //variables that will have a global scope:
 //variables event_id_urlsafe and last_timestamp have to be set in the parent document by jinja2


const REFRESH_TIME = 10; // for timer counting in milleseconds
const REFRESH_TIME2 = 1000; //for checking server for times in milleseconds
var crew_times = [];
var autoUpdate = true;
var last_timestamp = new Date(800000);
var refresh = [];
var gae_connected_flag = false;

$( document ).one( "pagecreate", "#crewtimes", function() {

    // call the initialisation function for the Google App Engine APIs but only on first visit
    var status=init();
	$(".connection-status").text(status);

    });

$( document ).on( "pagecreate", "#crewtimes", function() {

	get_crew_times();  //initialise the crew_times array and set connection status

    });

$( document ).on( "pagehide", "#crewtimes", function() {

    // stop the function calls and reset last_timestamp
    autoUpdate = false;
    //clear down all the other global variables used
    crew_times = [];
	refresh = [];

    });

// this bit of code taken from ksloan/jquery-mobile-swipe-list excellent project

$(function() {

    function disable_scroll() {
        $(document).on('vmousemove', prevent_default);
    }
    function enable_scroll() {
        $(document).unbind('vmousemove', prevent_default)
    }

    $(document).on('swipe', '.swipe-delete li > a', function(e) {
            console.log(e)
            var change = e.swipestop.coords[0] - e.swipestart.coords[0]; // anchor point
 			var left = parseInt(e.target.style.left);
 			if (!left) {left = 0};
 			var new_left;
 			change = (change < 0) ? -100 : 100;
 			change = change+left;
            if (change < -20) {
                new_left = '-100px';
             	$(e.target).addClass('open');
            } else if (change > 20) {
            	$(e.target).addClass('open');
                new_left = '100px';
            } else {
            	$(e.target).removeClass('open');
                new_left = '0px'
            }
            // e.currentTarget.style.left = new_left
            $(e.target).animate({left: new_left}, 200);
            //e.preventDefault();
            //e.stopPropagation();
        })
    $('li .delete-btn').on('vclick', function(e) {
        e.preventDefault()
        $(this).parents('li').slideUp('fast', function() {
            $(this).remove()
        })
    })
    $('li .edit-btn').on('vclick', function(e) {
        e.preventDefault()
        $(this).parents('li').children('a').html('edited')
    })
});

//ksloan/jquery-mobile-swipe-list end

Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
}

//load the crew_times object with the crew times list retrieved from the database//
function get_crew_times() {
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
	 	return("succesfully connected")
    }
    catch(err) {
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
	var recordtime = gapi.client.observedtimes.times.timecreate(observed_time).execute(function(resp) {
  		console.log(resp);
  	});
  }

  function get_times(){
   // Get the list of observed times since the last time it was requested//
   var request = gapi.client.observedtimes.times.listtimes(event_and_last_timestamp);
   request.then(function(resp) {
    	last_timestamp = new Date(resp.result.last_timestamp);
    	event_and_last_timestamp.last_timestamp = last_timestamp.toISOString();

   		for(var i=0; i<resp.result.times.length; i++) {
    		update_time_list(resp.result.times[i]);
    	}
      });
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
		if (button.text() == "Finished"){
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

