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
from handlers import BaseRequestHandler, AuthHandler
import jinja2
from webapp2 import WSGIApplication, Route
from secrets import SESSION_KEY

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

            searchdate = datetime.date.today() - timedelta(weeks=2)

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

        data=[{'crew_number' : 123,
                'start_time_local' : "8,9,12.1234",
                'end_time_local' : '2015,6,23,8,9,15,1235',
                'start_time_server' : "2015,06,23,8,9,12,1242",
                'end_time_server' : "2015,06,23,8,9,15,1237"},
                {'crew_number' : 124,
                'start_time_local' : "8,9,12.1234",
                'end_time_local' : '2015,6,23,8,9,15,1235',
                'start_time_server' : "2015,06,23,8,9,12,1242",
                'end_time_server' : "2015,06,23,8,9,15,1237"}]
                
        jsondata=map(json.dumps, data)
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

            #template_values = { 'written_user' : user,
            #                    'session' : self.session}
            #template = JINJA_ENVIRONMENT.get_template('templates/debug.html')
            #self.response.write(template.render(template_values))

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
  Route('/loadcrews', handler='main.LoadCrews'),
  Route('/profile', handler='handlers.ProfileHandler', name='profile'),
  Route('/logout', handler='handlers.AuthHandler:logout', name='logout'),
  Route('/login', handler='main.login'),
  Route('/signup', handler='main.signup'),
  Route('/testdata', handler='testing.CreateTestData'),
  Route('/auth/<provider>', handler='handlers.AuthHandler:_simple_auth', name='auth_login'),
  Route('/auth/<provider>/callback', handler='handlers.AuthHandler:_auth_callback', name='auth_callback')
]

application = webapp2.WSGIApplication(routes,config=app_config, debug=True)
