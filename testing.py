import os
import urllib
import sys
import datetime
from datetime import timedelta
from google.appengine.api import users
from google.appengine.ext import ndb
from handlers import BaseRequestHandler, AuthHandler
import jinja2

from models import *

JINJA_ENVIRONMENT = jinja2.Environment(loader=jinja2.FileSystemLoader(os.getcwd())) 

class CreateTestData(BaseRequestHandler):

    def get(self):

        """put code in here to load the test data"""

        # First check if user is signed in and if not redirect to sign-in page
        if self.logged_in:

        	user=self.current_user

        	try:
        		e=Events(
			    	event_name = "Marlow",
			    	event_date = datetime.date(2015,8,20),
			    	event_desc = "The last chance to excel before Henley").put()

	        	c=Crews(
				    event_id = e,
				    crew_number = 123,
				    crew_name = "Eton College RC",
				    pic_file = "Eton-RC.gif",
				    crew_type = "Coxed Quad 4x+",
				    rower_count = 4,
				    cox = True).put()

	        	c2=Crews(
				    event_id = e,
				    crew_number = 124,
				    crew_name = "Bedford Modern RC",
				    pic_file = "Bedford-Modern-School-RC.gif",
				    crew_type = "Coxed Quad 4x+",
				    rower_count = 4,
				    cox = True).put()

	        	ct=Crew_Times(
				    event_id = e,
				    crew_id = c).put()

	        	ct2=Crew_Times(
				    event_id = e,
				    crew_id = c2).put()

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
        



