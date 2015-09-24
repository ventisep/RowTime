
import urllib
import endpoints
from google.appengine.ext import ndb
from google.appengine.api import users
from protorpc import messages
from protorpc import message_types
from protorpc import remote
import datetime
from datetime import tzinfo
import logging
from models import *
import os
import urllib
import sys
import webapp2
import logging
import json
from datetime import timedelta, time, date
from handlers import BaseRequestHandler, AuthHandler
import jinja2
from webapp2 import WSGIApplication, Route
from secrets import SESSION_KEY

#The package= line is used by the underlying ProtoRpc when creating names for the ProtoRPC messages you 
#create. This package name will show up as a prefix to your message class names in the discovery 
#doc and client libraries.
package = 'RowTimePackage'

class TimesRequest(messages.Message):
  "used to store the request for a list of times since the last timestamp"
  event_id = messages.StringField(1)
  last_timestamp = messages.StringField(2)

class ClockSyncRequest(messages.Message):
  "used to store the request for a comparison of time between the server and the client"
  client_time = message_types.DateTimeField(1)

class ClockSyncReply(messages.Message):
  "used to reply with the server time and comparison to the client time"
  client_time = message_types.DateTimeField(1)
  server_time = message_types.DateTimeField(2)
  diff_in_ms = messages.FloatField(3)

class ObservedTime(messages.Message):
  """used to store an observered time from a user for a specific Crew."""
  event_id = messages.StringField(1)
  timestamp = message_types.DateTimeField(2)
  obs_type = messages.IntegerField(3)
  crew = messages.IntegerField(4)
  stage = messages.IntegerField(5)
  time = message_types.DateTimeField(6)

class ObservedTimeList(messages.Message):
  """Used to provide a list of Observed times since last request for a specific event"""
  event_id = messages.StringField(1)
  last_timestamp = message_types.DateTimeField(2)
  times = messages.MessageField(ObservedTime, 3, repeated=True)

class CrewTime(messages.Message):
  """Used to provide the set of times for a specific Crew in an event"""
  event_id = messages.StringField(1)
  crew = messages.IntegerField(2)
  observed_time_list = messages.MessageField(ObservedTime, 3, repeated=True)

@endpoints.api(name='observedtimes', version='v1')
class ObservedTimesApi(remote.Service):
  """ObservedTimes API v1.  This API allows the GET method to get a collection of
  observed times since the last time the user asked for a list and a POST method
  to record new times"""

  @endpoints.method(TimesRequest, ObservedTimeList,
                    path='times', http_method='GET',
                    name='times.listtimes')
  def times_list(self, request):

    eventkey = ndb.Key(urlsafe = request.event_id)
    last_timestamp = datetime.datetime.strptime(request.last_timestamp, "%Y-%m-%dT%H:%M:%S.%f")
#    last_timestamp = request.last_timestamp

    retrieved_times = ObservedTimeList()

    searched_times=Observed_Times.query(ndb.AND(Observed_Times.event_id==eventkey,
                                                Observed_Times.timestamp>last_timestamp)).fetch()

    if searched_times:
      i=0
      for time in searched_times:
        retrieved_times.times.append(ObservedTime())
        retrieved_times.times[i].event_id = request.event_id
        retrieved_times.times[i].timestamp = time.timestamp 
        retrieved_times.times[i].obs_type = time.obs_type
        retrieved_times.times[i].crew = time.crew_number
        retrieved_times.times[i].stage = time.stage 
        retrieved_times.times[i].time = time.time_local
        retrieved_times.last_timestamp = time.timestamp
        i = i+1
    else:
      retrieved_times.last_timestamp = last_timestamp

    retrieved_times.event_id = request.event_id

    return retrieved_times

  @endpoints.method(ObservedTime, ObservedTime,
                    path='times', http_method='POST',
                    name='times.timecreate')
  def time_create(self, request):

    current_time = datetime.datetime.now()  #get current time as soon as possible for server time
    logging.info(self)

    user="paul-backend"
    ot = ObservedTime()
    eventkey = ndb.Key(urlsafe = request.event_id)
    utc_time = request.time - request.time.utcoffset()
   
    if request.obs_type == 0:
      saved_time = Observed_Times(event_id = eventkey,
                          crew_number=request.crew,
                          timestamp = current_time,
                          obs_type = request.obs_type,
                          stage=request.stage,
                          time_local=utc_time.replace(tzinfo=None),
                          time_server=current_time,
                          recorded_by=user).put()
      saved_stage = request.stage
    else: 
      if request.obs_type == 1:
        last_time=Observed_Times.query(ndb.AND(ndb.AND(Observed_Times.event_id==eventkey,
                                                  Observed_Times.crew_number==request.crew),
                                                  Observed_Times.obs_type == 0)).order(-Observed_Times.timestamp).get()

        #get the last valid add time event and add a delete record for that stage
        if last_time:
          saved_time = Observed_Times(event_id = eventkey,
                          crew_number=request.crew,
                          timestamp = current_time,
                          obs_type = request.obs_type,
                          stage=last_time.stage,
                          time_local=utc_time.replace(tzinfo=None),
                          time_server=current_time,
                          recorded_by=user)
          last_time.obs_type = 2 # 2 represents adds that have been cancelled
          last_time.put()
          saved_time.put()
          saved_stage = last_time.stage
          logging.info("got to the put statement")
        else:
          return("error")

    ot.timestamp=current_time
    ot.obs_type=request.obs_type
    ot.crew=request.crew
    ot.stage=saved_stage
    ot.time=current_time
    

    return ot


  @endpoints.method(ClockSyncRequest, ClockSyncReply,
                    path='clock', http_method='POST',
                    name='clock.clockcheck')
  def clockcheck(self, request):

    current_time = datetime.datetime.now()  #get current time as soon as possible for server time

    time=ClockSyncReply()
    logging.info("request %s", request.client_time)
    utc_time = request.client_time

    time.server_time = current_time
    time.client_time = utc_time.replace(tzinfo=None)
    time.diff_in_ms = (time.server_time - time.client_time).total_seconds()*1000
    logging.info("time server %s", time.server_time)
    return time


application = endpoints.api_server([ObservedTimesApi])


