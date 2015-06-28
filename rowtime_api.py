
import endpoints
from protorpc import messages
from protorpc import message_types
from protorpc import remote
import datetime
import logging
from models import *

#The package= line is used by the underlying ProtoRpc when creating names for the ProtoRPC messages you 
#create. This package name will show up as a prefix to your message class names in the discovery 
#doc and client libraries.
package = 'RowTimePackage'

class ObservedTime(messages.Message):
  """used to store an observered time from a user for a specific Crew."""
  event = messages.StringField(1)
  timestamp = message_types.DateTimeField(2)
  crew = messages.IntegerField(3)
  stage = messages.IntegerField(4)
  time = message_types.DateTimeField(5)

class ObservedTimeList(messages.Message):
  """Used to provide a list of Observed times since last request for a specific event"""
  event = messages.StringField(1)
  last_timestamp = message_types.DateTimeField(2)
  times = messages.MessageField(ObservedTime, 3, repeated=True)

class CrewTime(messages.Message):
  """Used to provide the set of times for a specific Crew in an event"""
  event = messages.StringField(1)
  crew = messages.IntegerField(2)
  observed_time_list = messages.MessageField(ObservedTime, 3, repeated=True)

STORED_TIMES = ObservedTimeList(event = "bedford regatta", 
  times= [ObservedTime(timestamp = datetime.datetime.now(), crew = 123, stage = 0, time = datetime.datetime(2015,11,8,15,49,07,696869)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 123, stage = 0, time = datetime.datetime(2015,11,8,15,52,06,330000)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 124, stage = 0, time = datetime.datetime(2015,11,8,15,53,07,696869)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 124, stage = 0, time = datetime.datetime(2015,11,8,15,56,04,450000)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 123, stage = 0, time = datetime.datetime(2015,11,8,15,56,04,696869)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 124, stage = 0, time = datetime.datetime(2015,11,8,15,59,07,696869)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 123, stage = 0, time = datetime.datetime(2015,11,8,16,00,07,696869)),
	ObservedTime(timestamp = datetime.datetime.now(), crew = 124, stage = 0, time = datetime.datetime(2015,11,8,16,01,03,780000))])

@endpoints.api(name='observedtimes', version='v1')
class ObservedTimesApi(remote.Service):
  """ObservedTimes API v1.  This API allows the GET method to get a collection of
  observed times since the last time the user asked for a list and a POST method
  to record new times"""

  @endpoints.method(ObservedTime, ObservedTimeList,
                    path='times, http_method='GET',
                    name='times.listtimes')
  def times_list(self, request):

    return STORED_TIMES

  @endpoints.method(ObservedTime, ObservedTime,
                    path='times', http_method='POST',
                    name='times.timecreate')
  def time_create(self, request):

    current_time = datetime.datetime.now()  #get current time as soon as possible for server time
    logging.info(self)
    user=self.current_user


    saved_time = Observed_Times(crew_number=request.crew,
                        timestamp = datetime.datetime.now(),
                        stage=request.stage,
                        time_local=request.time,
                        time_server=current_time,
                        recorded_by=user.name).put()

    return ObservedTime(timestamp=saved_time.timestamp,
                        crew=saved_time.crew,
                        stage=saved_time.stage,
                        time=saved_time.time_local)
    
application = endpoints.api_server([ObservedTimesApi])