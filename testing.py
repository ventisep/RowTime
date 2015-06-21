import os
import urllib
import sys
import datetime
from datetime import timedelta
from google.appengine.api import users
from google.appengine.ext import ndb
from handlers import BaseRequestHandler, AuthHandler
from models import *


class CreateTestData(BaseRequestHandler):

    def get(self):

        """put code in here to load the test data"""

        # First check if user is signed in and if not redirect to sign-in page
        if self.logged_in:

        	user=self.current_user

        	try:
        		e=Events(
			    	event_name = "Marlow",
			    	event_date = datetime.date(2015,6,20),
			    	event_desc = "The last chance to excel before Henley").put()

	        	s=Sequence(
				    event = e,
				    seq = 0).put()

	        	c=Crews(
				    event_id = e,
				    crew_number = 123,
				    crew_type = "Coxed Quad 4x+",
				    rower_count = 4,
				    cox = True).put()

	        	ot=Observed_Times(
				    event_id = e,
				    sequence_number = 0,
				    crew_number = 123,
				    stage = 0,
				    time_local = datetime.datetime(2015,6,20,14,13,10,1234),
				    time_server = datetime.datetime(2015,6,20,14,13,10,3000),
				    recorded_by = user.name).put()

	        	ct=Crew_Times(
				    event_id = e,
				    crew_id = c).put()

	        except:
        		message = sys.exc_info()[0]
        		raise


        	self.response.write("data loaded")

        else:
            user=""
            template_values = {}
            template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
            self.response.write(template.render(template_values))
            return
        



