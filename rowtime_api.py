
import endpoints
from protorpc import messages
from protorpc import message_types
from protorpc import remote
import datetime
import logging

#The package= line is used by the underlying ProtoRpc when creating names for the ProtoRPC messages you 
#create. This package name will show up as a prefix to your message class names in the discovery 
#doc and client libraries.
package = 'RowTimePackage'

class ObservedTime(messages.Message):
  """used to store an observered time from a user for a specific Crew."""
  keysequence = messages.IntegerField(1)
  crew = messages.IntegerField(2)
  stage = messages.IntegerField(3)
  time = message_types.DateTimeField(4)

class ObservedTimeList(messages.Message):
  """Used to provide a list of Observed times since last request for a specific event"""
  event = messages.StringField(1)
  last_key_sequence = messages.IntegerField(2)
  times = messages.MessageField(ObservedTime, 3, repeated=True)

class CrewTime(messages.Message):
  """Used to provide the set of times for a specific Crew in an event"""
  event = messages.StringField(1)
  crew = messages.IntegerField(2)
  observed_time_list = messages.MessageField(ObservedTime, 3, repeated=True)

STORED_TIMES = ObservedTimeList(event = "bedford regatta", last_key_sequence = 2, 
  times= [ObservedTime(keysequence = 0, crew = 123, stage = 0, time = datetime.datetime(2015,11,8,15,49,07,696869)),
	ObservedTime(keysequence = 1, crew = 123, stage = 0, time = datetime.datetime(2015,11,8,15,52,06,330000)),
	ObservedTime(keysequence = 2, crew = 124, stage = 0, time = datetime.datetime(2015,11,8,15,53,07,696869)),
	ObservedTime(keysequence = 3, crew = 124, stage = 0, time = datetime.datetime(2015,11,8,15,56,04,450000)),
	ObservedTime(keysequence = 4, crew = 123, stage = 0, time = datetime.datetime(2015,11,8,15,56,04,696869)),
	ObservedTime(keysequence = 5, crew = 124, stage = 0, time = datetime.datetime(2015,11,8,15,59,07,696869)),
	ObservedTime(keysequence = 6, crew = 123, stage = 0, time = datetime.datetime(2015,11,8,16,00,07,696869)),
	ObservedTime(keysequence = 7, crew = 124, stage = 0, time = datetime.datetime(2015,11,8,16,01,03,780000))])

@endpoints.api(name='observedtimes', version='v1')
class ObservedTimesApi(remote.Service):
  """ObservedTimes API v1.  This API allows the GET method to get a collection of
  observed times since the last time the user asked for a list and a POST method
  to record new times"""

  SEQ_RESOURCE = endpoints.ResourceContainer(
      message_types.VoidMessage,
      seq=messages.IntegerField(1, variant=messages.Variant.INT32))

  @endpoints.method(SEQ_RESOURCE, ObservedTimeList,
                    path='times/{seq}', http_method='GET',
                    name='times.listtimes')
  def times_list(self, request):
    return STORED_TIMES

  @endpoints.method(ObservedTime, ObservedTime,
                    path='times', http_method='POST',
                    name='times.timecreate')
  def time_create(self, request):

    logging.info(self)
    return ObservedTime(keysequence=8,
                        crew=request.crew,
                        stage=request.stage,
                        time=request.time)
    
application = endpoints.api_server([ObservedTimesApi])