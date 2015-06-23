# The data model for Rowing Competition Network assumes we are using it with a non-relational database
from google.appengine.ext import ndb

class Accounts(ndb.Model):
    auth_id = ndb.IntegerProperty()
    email = ndb.StringProperty()
    username = ndb.StringProperty()

class Events(ndb.Model):
    event_name = ndb.StringProperty()
    event_date = ndb.DateProperty()
    event_desc = ndb.StringProperty()

class Sequence(ndb.Model):
    event = ndb.KeyProperty(kind= Events)
    seq = ndb.IntegerProperty()

class Rowers(ndb.Model):
    account_id = ndb.KeyProperty(kind= Accounts)
    name = ndb.StringProperty()
    email = ndb.StringProperty()
    club = ndb.StringProperty()
    pic = ndb.BlobProperty()

class Crews(ndb.Model):
    event_id = ndb.KeyProperty(kind= Events)
    crew_number = ndb.IntegerProperty()
    pic = ndb.BlobProperty()
    crew_type = ndb.StringProperty()
    rower_count = ndb.IntegerProperty()
    cox = ndb.BooleanProperty()
    rower_id = ndb.KeyProperty(kind=Rowers, repeated=True)

class Observed_Times(ndb.Model):
    event_id = ndb.KeyProperty(kind=Events)
    sequence_number = ndb.IntegerProperty()
    crew_number = ndb.IntegerProperty()
    stage = ndb.IntegerProperty()
    time_local = ndb.DateTimeProperty()
    time_server = ndb.DateTimeProperty()
    recorded_by = ndb.StringProperty()

class Crew_Times(ndb.Model):
    event_id = ndb.KeyProperty(kind= Events)
    crew_id = ndb.KeyProperty(kind= Crews)
    crew_number = ndb.IntegerProperty()
    start_time_local = ndb.DateTimeProperty()
    end_time_local = ndb.DateTimeProperty()
    start_time_server = ndb.DateTimeProperty()
    end_time_server = ndb.DateTimeProperty()

    def todict(o):
        return o.__dict__
