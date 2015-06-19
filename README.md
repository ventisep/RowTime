ALEX I have updated this so we can both edit the story of what we are doing on this page to begin with.  we can put this text into design files later but this will work over the next few days.


User story

As a timer user I want to get a List of crews with a button next to them and a number of timer boxes representing each stage of the race. First press of the button enters a start time subsequent presses enters a time for each stage until the finish time is recorded . A press after the finish offers a pop up to validate and publish the time.   Later I will want to validate times against other users also timing the race but initially it will be a single option.  Validate or record that an error has been made or cancel validation.

Technical design overview

The application is built using google app engine with Python on the server and a choice of apps in the front end.  We will start with a JavaScript client and html5

Using the main screen initiates logon and registration.  This passes the user to the main screen which allows selection of an event and creates a list of crews about to race with current status of timing and sets up a channel to receive updates with three options:
	1. Google app engine channels will send updates from other users when they record times by calling a broadcast function on asynchronous mode after updating the time event in the database at the backend.
	2. Google app engine will be called every few seconds with an API call to get timing events since the last numbered event received
	3. Google app engine will be called every few seconds for the complete list of crews and their times and stages using API end points
	4. Google app engine is called using jquery to get an HTML segment to update the current crew times.  Pols every 5 seconds.
	
I prefer option 1 or 2 because while the screen is refreshing it will reduce sensitivity to button press events and in a timing application we want the button press to be uninterrupted.  In practice the crews timing will only be updated every 1.5minutes or so and only 3 or 4 crews will be running at any one time so polling a lot seems to be excessive while channel service seems to be most efficient.  However, channel services is more difficult and can only be used with JavaScript so perhaps a 2 or 3 second polling frequency with an API endpoint is a better option.  I think I have talked myself into option 2. Which uses Google API end points.

So the key software components will be:

Client (JavaScript and Html5):
	- Page for login/register page
	- Header page with navigation tabs 
	- Page to enter event and crews for event
	- Page to choose event from list
	- Page with crews listed, times and start/split/stop button JavaScript to keep the time and button stage updated
	- Page with validation options

Server (Python)
	- Load login/register page
	- Process successful login and load main header and event list page
	- Process loading a page with crews, times, start/stop button)
	- Process adding an event and crews for event
	- Process API to record an observed time
	- Process API to retrieve observed times from other users since the last successful  request: return JSON
	- Process loading a validation page for a set of times for a crew
	- Process posting a valid set of times for a crew

Database Object entities

	- User Accounts (Account)
	- Regatta and head events (Event)
	- Crews taking part in an event (Crew)
	- Observed Times for a crew at a particular stage of the race (ObservedTime)
	- Validated times and splits for a crew in an event (ValidatedCrewTime)


More details on the components

Python in the backend: Process loading a page with crews, times, start/stop button)

	-  retrieve each crew from the database for an event and where they haven't started or finished less than 10mins ago
	-  create an iterable object with each crews timing record, which includes the crew number, name, number of stages in the race, timestamp for each stage. 
	- Pass this list of records to the jinja2 HTML template.

The template:
	- uses the list of records in a for loop to create a list of crews with time data and a start/stage/finish button.
	-  If the button is pressed then an action will run a JavaScript function to call the API to record an observed time
	- The function will be passed the crew-id, the DoM element[array] that should be updated with the time, the time the button was pressed, the DoM element containing the stage of the race. 

The JS function on timer button press will:

	- If race stage not finished then
		○ Update the record for the crew with the new timestamp and calculate the split times
		○ Post the updated record to the backend with the stage just recorded (using API)
		○ Update DoM elements showing the timestamp and the split on the screen
		○ Change the button colour and text to reflect the next stage to be recorded
		○ If race now finished then change button colour and text to "validate"
	- If race stage at validate then
		○  Go to the validate times page
		
The JS function onload of page will:

	- Use API to retrieve list of crews and their current time and race stage
	- Create an array representing each crew and their observed times so far. 
	- Use the array to create the page with list of crews and their times
	- Set up a polling function to retrieve new observations every 5s and use them to update the array and the page objects that have changed. 
	

Backend:

Python for recording observed times
	- Parse JSON data into crew time observation for a specific stage by a specific user
	- Check stage correct, one not missed, time within tolerance etc,
	- Record observation in Observation database entity with server timestamp as well as supplied time from the front end
	- Return time recorded and split calculated and any error codes or warnings
	
Python for validate page load and record results:
	- Get all time event observations for the specified Crew
	- Construct a ProposedCrewTimeRecord with optional times for each stage
	- Create a jinja2 template to allow the validator to chose the times or the average for each stage or to type in alternatives with comments
Validate post
	- Receive the validated times for each stage and the comments for adjustments
	- Record a ValidatedCrewTimeRecord with crew-id, name, validator, times validated with comments for any manual amended, splits calculated, total time calculated.

Data model notes
	- Observed time events needs to be keyed on event, crew, stage, user.  We can then allow multiple users to record an observed time. In the validation process we can work out the one validated record by choosing specific users or an average of observed times and record a full ValidatedCrewTime record.  

The user can select which post they are at so they can only see boats that have yet to go to their post and only press the button for boats about to get to their post next.
