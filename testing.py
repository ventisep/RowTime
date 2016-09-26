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

        		s=Stages(
			    	event_id = e,
			    	stage_index = 0,
			    	label = "start").put()

        		s=Stages(
			    	event_id = e,
			    	stage_index = 1,
			    	label = "stop").put()

	        	c=Crews(
				    event_id = e,
				    crew_number = 123,
				    crew_name = "Eton College RC",
				    pic_file = "etn.gif",
				    crew_type = "Coxed Quad 4x+",
				    rower_count = 4,
				    cox = True).put()

	        	c2=Crews(
				    event_id = e,
				    crew_number = 124,
				    crew_name = "Bedford Modern RC",
				    pic_file = "bms.gif",
				    crew_type = "Coxed Quad 4x+",
				    rower_count = 4,
				    cox = True).put()


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
        

class ConvertData(BaseRequestHandler):

    def get(self):

        """This code converts old databases to the new format with a stages section"""

        # First check if user is signed in and if not redirect to sign-in page
        if self.logged_in:
            user=self.current_user
            event_list = list()
            event_list = Events.query().fetch()
            #read each event and add stages start and stop to them
            for e in event_list:

                s1=Stages(event_id = e.key,
    		    	stage_index = 0,
    		    	label = "start").put()
                
                s2=Stages(event_id = e.key,
    		    	stage_index = 1,
    		    	label = "stop").put()

        	self.response.write("stages added")

        else:
            user=""
            template_values = {}
            template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
            self.response.write(template.render(template_values))
            return

