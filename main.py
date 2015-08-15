import os
import urllib
import sys
import webapp2
import logging
import json
import datetime
from datetime import timedelta
from google.appengine.api import users
from google.appengine.ext import ndb
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from handlers import BaseRequestHandler, AuthHandler
import jinja2
from webapp2 import WSGIApplication, Route
from secrets import SESSION_KEY
import csv
if 'lib' not in sys.path:
    sys.path[0:0] = ['lib']

from models import *


JINJA_ENVIRONMENT = jinja2.Environment(loader=jinja2.FileSystemLoader(os.getcwd())) 

class MainPage(BaseRequestHandler):

    def get(self):

        """put code in here to load the main page:  This page will do the following:
            - check login status of user and redirect to login page if not logged-in
            - if logged-in get list of events available in future and up to 2 weeks ago"""


        # First check if user is signed in and if not redirect to sign-in page
        if self.logged_in:

            user=self.current_user

            #retrieve the events in the future and up to 2 weeks ago **TODO***
            #query the Events entities looking for events that have an event date
            #greater than 2 weeks ago

            searchdate = datetime.date.today() - timedelta(weeks=4)

            eventlist = list()
            eventlist = Events.query(Events.event_date >= searchdate).order(Events.event_date).fetch()

            template_values = {
                'user': user,
                'events': eventlist,
                }

            template = JINJA_ENVIRONMENT.get_template('templates/rcn_main.html')
            self.response.write(template.render(template_values))

        else:

            user=""
            template_values = {}

            template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
            self.response.write(template.render(template_values))
            return


class LoadCrews(BaseRequestHandler):
    def get(self):

        requested_event_key=ndb.Key(urlsafe=self.request.get('event_key'))

        user = self.current_user

        event = Events.query(Events.key == requested_event_key).get()
        logging.info('looking for results with event key %s', type(requested_event_key))

        crews=list()
        crews=Crews.query(Crews.event_id==requested_event_key).order(Crews.crew_number).fetch()
        if not crews:
            self.response.write("no crews")
            return
        else:
            data = list()
            logging.info('got crew data %s', type(data))
            for crew in crews:
                #for each crew get their times and if there is none
                #in the database create a record for them
                crewtime = ndb.Key('Crew_Times', crew.key.id(), parent=requested_event_key).get()
                if not crewtime:
                    crewtime_key=Crew_Times(id = crew.key.id(),
                                        parent = requested_event_key,
                                        event_id = requested_event_key,
                                        crew_id = crew.key,
                                        crew_number = crew.crew_number).put()
                    logging.info('put data %s', crew.crew_number)
                else:
                    data.append({'crew_number' : crew.crew_number,
                        'start_time_local' : crewtime.start_time_local,
                        'end_time_local' : crewtime.end_time_local,
                        'start_time_server' : crewtime.start_time_server,
                        'end_time_server' : crewtime.end_time_server})
                    logging.info('appended data %s', crew.crew_number)
                
        jsondata=map(json.dumps, data)
        logging.info('got crew jsondata %s', jsondata)

        template_values = {
                'data': jsondata,
                'crews': crews,
                'event' : requested_event_key,
                'user' : user
            }

        template = JINJA_ENVIRONMENT.get_template('templates/rcn_detail.html')
        self.response.write(template.render(template_values))


class login(AuthHandler):

    def post(self):

        email=self.request.get("email")
        password=self.request.get("password")
        name = self.request.get("name")
        auth_id = "rcn:"+email
        
        try:
            user=self.auth.get_user_by_password(auth_id, password)
        except:
            user=""

        if user:

            user = self.auth.store.user_model.get_by_id(user["user_id"])

            logging.info('Found existing user to log in')
            # found the user so set their details into the session
            self.auth.set_session(self.auth.store.user_to_dict(user))
            self.redirect('/')
                
        else:

            #user does not exist or password is wrong provide error message
            template_values = {'email' : email,
                            'error': 'Not a Valid Account or incorrect password - please sign-up'}
            template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
            self.response.write(template.render(template_values))


class signup(AuthHandler):

    def post(self):

        email=self.request.get("email2")
        password=self.request.get("password2")
        name = self.request.get("name")
        auth_id = "rcn:%s" % email

        """TODO some validation of the above information"""

        user=self.auth.store.user_model.get_by_auth_id(auth_id)
        if user:
            #user already exists
            template_values = {'email' : email,
                            'name': name,
                            'error': 'email already in use - please login'}
            template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
            self.response.write(template.render(template_values))
        else:
            if email and password and name:
                #add account
                auth_id = "rcn:"+email
                account = Accounts(email=email, username=name)
                account.key = account.put()
                data = {"account" : account.key.id(),
                        "name" : name,
                        "email" : email,
                        "password_raw":password}
                _attrs = self._to_user_model_attrs(data, self.USER_ATTRS["rcn"])


                ok, user = self.auth.store.user_model.create_user(auth_id, **_attrs)
                if ok:
                    self.auth.set_session(self.auth.store.user_to_dict(user))


                self.redirect('/')
                return
            else:
                template_values = {'email' : email,
                                'name': name,
                                'error': 'information incomplete'}
                template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
                self.response.write(template.render(template_values))            
                return

class loadevent(BaseRequestHandler):
    def get(self):
        upload_url = blobstore.create_upload_url('/upload')

        template_values = {'upload_url' : upload_url}
        template = JINJA_ENVIRONMENT.get_template('templates/createevent.html')
        self.response.write(template.render(template_values))


class UploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
        upload_files = self.get_uploads('file')  # 'file' is file upload field in the form
        blob_info = upload_files[0]
        process_csv(blob_info)

        blobstore.delete(blob_info.key())  # optional: delete file after import
        self.redirect('/')


    def process_csv(blob_info):
        blob_reader = blobstore.BlobReader(blob_info.key())
        reader = csv.reader(blob_reader, delimiter=';')
        for row in reader:
            read_event_name, read_datetime, read_desc = row
            e =Events(
                    event_name = read_event_name,
                    event_date = datetime.date(read_datetime),
                    event_desc = read_desc).put()
            e.put()

        
# webapp2 config
app_config = {
  'webapp2_extras.sessions': {
    'cookie_name': '_simpleauth_sess',
    'secret_key': SESSION_KEY
  },
  'webapp2_extras.auth': {
    'user_attributes': []
  }
}

routes = [
  Route('/', handler='main.MainPage'),
  Route('/events', handler='main.MainPage'),
  Route('/loadcrews', handler='main.LoadCrews'),
  Route('/profile', handler='handlers.ProfileHandler', name='profile'),
  Route('/logout', handler='handlers.AuthHandler:logout', name='logout'),
  Route('/login', handler='main.login'),
  Route('/signup', handler='main.signup'),
  Route('/uploadevents', handler='main.loadevent'),
  Route('/upload', handler='main.UploadHandler'),
  Route('/testdata', handler='testing.CreateTestData'),
  Route('/auth/<provider>', handler='handlers.AuthHandler:_simple_auth', name='auth_login'),
  Route('/auth/<provider>/callback', handler='handlers.AuthHandler:_auth_callback', name='auth_callback')
]

application = webapp2.WSGIApplication(routes,config=app_config, debug=True)
