import os
import urllib
import sys
import webapp2
import logging
import json

from google.appengine.api import users
from google.appengine.ext import ndb
from handlers import BaseRequestHandler, AuthHandler
import jinja2

from webapp2 import WSGIApplication, Route

from secrets import SESSION_KEY

if 'lib' not in sys.path:
    sys.path[0:0] = ['lib']


# The data model for Rowing Competition Network assumes we are using it with a non-relational database

class Account(ndb.Model):
    auth_id = ndb.IntegerProperty()
    email = ndb.StringProperty()
    username = ndb.StringProperty()

class Competition(ndb.Model):
    comp_name = ndb.StringProperty()
    comp_date = ndb.DateProperty()
    comp_desc = ndb.StringProperty()

class Rower(ndb.Model):
    account_id = ndb.KeyProperty(Kind= Account)
    name = ndb.StringProperty()
    email = ndb.StringProperty()
    club = ndb.StringProperty()
    pic = ndb.BlobProperty()

class Crew(ndb.Model):
    comp_id = ndb.KeyProperty(Kind= Competition)
    crew_number = ndb.IntegerProperty()
    crew_type = ndb.StringProperty()
    rower_count = ndb.IntegerProperty()
    cox = ndb.BooleanProperty()
    rower_id = ndb.KeyProperty(Kind=Rower, repeated=True)

class Friends_List(ndb.Model):
    rower_id = ndb.KeyProperty(Kind= Rower, indexed=True)
    friend_id = ndb.KeyProperty(Kind= Rower, indexed=True)
    status = ndb.IntegerProperty

# statuses can be 1 - your friend, 2 - waiting for you to accept, 
# 3 - waiting for them to accept, 0 - blocked

class Comp_List(ndb.Model):
    rower_id = ndb.KeyProperty(Kind= Rower, indexed=True)
    comp_id = ndb.KeyProperty(Kind= Competition, indexed=True)
    status = ndb.IntegerProperty()

# statuses can be 1 - you're competing, 2 - you're officiating, 
# 3 - you're spectating, 4 - you're friend is competing, 0 - you're blocked

class Crew_Times(ndb.Model):
    crew_id = ndb.KeyProperty(Kind= Crew)
    start_time_local = ndb.DateTimeProperty()
    end_time_local = ndb.DateTimeProperty()
    time_local = ndb.DateTimeProperty()
    start_time_server = ndb.DateTimeProperty()
    end_time_server = ndb.DateTimeProperty()
    time_server = ndb.DateTimeProperty()


JINJA_ENVIRONMENT = jinja2.Environment(loader=jinja2.FileSystemLoader(os.getcwd())) 

class MainPage(BaseRequestHandler):

    def get(self):

        """put code in here to load the main page:  This page will do the following:
            - check login status of user and redirect to login page if not logged-in
            - if logged-in get competitions the user is entered into or is the admin for
            - get statistics for that particular user
            - get their friends from the network (or facebook) and get news for those friends TODO
            - present page with all this information"""

        # First check if user is signed in and if not redirect to sign-in page
        if self.logged_in:

            user=self.current_user

            #retrieve the user's interesting competitions and the ones they are admin
            #for or they are rowing in or they are spectating or their friends are in
            #the objects returned are user, competitions, comp_summaries, statistics

            mycompetitions = Comp_List.query(Comp_List.rower_id==user.rower_id).fetch(20)
            comp_summaries = list()
    #       TODO: got this far now need to fill a variable list with the details of each competition
    #          the user is interested in 

            for comp in mycompetitions:
                comp.comp_summaries=Competition.query(Competition.comp_id==comp.comp_id).fetch()
                admin = comp.admin.get()
                comp.admin_name = admin.name #TODO correct the name of the iterable special variable
                                    # to add url links use this code -> comp.url=urllib.urlencode({'comp_key': comp.key})

            statistics = {}

            statistics = {'best net score': 68, 'highest competition ranking': '2nd', 'other stats': 'wow what a stat'}

            friends = {'friend name1': '/golfer_detail?golfer_id=1', 'friend name2' : '/golfer_detail?golfer_id=1',
                     'friend name3' : '/golfer_detail?golfer_id=1'}

            #TODO retrieve the user's network competitions and perhaps their club competitions or near to them too
            template_values = {
                'user': user,
                'fiends' : friends,
                'competitions': mycompetitions,
                'comp_summaries': comp_summaries,
                'statistics': statistics,
    #                'login_url': login_url,
    #                'logout_url': logout_url,
                }

            template = JINJA_ENVIRONMENT.get_template('templates/rcn_main.html')
            self.response.write(template.render(template_values))

        else:

            user=""
            template_values = {}

            template = JINJA_ENVIRONMENT.get_template('templates/rcn_login.html')
            self.response.write(template.render(template_values))
            return


class CompResultCalc(BaseRequestHandler):
    def get(self):

        requested_comp_key=ndb.Key(urlsafe=self.request.get('comp_key'))

        user = self.current_user

        comp = Competition.query(Competition.key == requested_comp_key).get() #TODO get admin name here so it can be shown in the screen
        logging.info('looking for results with competition key %s', type(requested_comp_key))

        rounds=list()
        rounds=Round.query(Round.comp_id==requested_comp_key).order(Round.golfer_id,Round.date).fetch()
        if not rounds:
            self.response.write("no rounds")
            return

        j=0
        i=0
        current_golfer = rounds[0].golfer_id
        golfer = Golfer.query(Golfer.key==current_golfer).get()
        ResultRows=list()
        ResultRows.append(LeagueResultRow())
        ResultRows[j].comp_id = requested_comp_key
        ResultRows[j].golfer_id = current_golfer
        ResultRows[j].golfer_name = golfer.name
        ResultRows[j].comp_name = comp.name
        ResultRows[j].current_handicap = golfer.current_handicap


        total_gscore = 0  
        total_nscore = 0  
        total_strokes = 0
        total_par = 0
        total_points = 0  
        total_underpar = 0

        for eachround in rounds:

            if eachround.golfer_id == current_golfer:
                ResultRows[j].round_gscores.append(eachround.scorecard.total_gscore)
                ResultRows[j].round_nscores.append(eachround.scorecard.total_nscore)
                ResultRows[j].round_strokes.append(eachround.scorecard.total_strokes)
                ResultRows[j].round_par.append(eachround.scorecard.total_par)
                ResultRows[j].round_points.append(eachround.scorecard.total_points)
                ResultRows[j].round_underpars.append(eachround.scorecard.total_underpar)
                total_gscore = total_gscore + ResultRows[j].round_gscores[i]    
                total_nscore = total_nscore + ResultRows[j].round_nscores[i]    
                total_strokes = total_strokes + ResultRows[j].round_strokes[i]    
                total_par = total_par + ResultRows[j].round_par[i]
                total_points = total_points + ResultRows[j].round_points[i]    
                total_underpar = total_underpar + ResultRows[j].round_underpars[i]
                i=i+1    
            else:
                ResultRows[j].total_gscore = total_gscore
                ResultRows[j].total_nscore = total_nscore
                ResultRows[j].total_strokes = total_strokes
                ResultRows[j].total_par = total_par
                ResultRows[j].total_points = total_points
                ResultRows[j].total_underpar = total_underpar
                total_gscore = 0
                total_nscore = 0
                total_strokes = 0
                total_par = 0 
                total_points = 0
                total_underpar = 0


                r = LeagueResultRow.query(ndb.AND(LeagueResultRow.comp_id==requested_comp_key, LeagueResultRow.golfer_id==current_golfer)).get()            
                if r:
                    ResultRows[j].key = r.key
                r=ResultRows[j]
                r.put()

                j=j+1
                i=0

                current_golfer = eachround.golfer_id
                golfer = Golfer.query(Golfer.key==current_golfer).get()
                ResultRows.append(LeagueResultRow())
                ResultRows[j].comp_id = requested_comp_key
                ResultRows[j].comp_name = comp.name
                ResultRows[j].golfer_name = golfer.name
                ResultRows[j].golfer_id = current_golfer
                ResultRows[j].current_handicap = golfer.current_handicap



        ResultRows[j].total_gscore = total_gscore
        ResultRows[j].total_nscore = total_nscore
        ResultRows[j].total_strokes = total_strokes
        ResultRows[j].total_par = total_par
        ResultRows[j].total_points = total_points
        ResultRows[j].total_underpar = total_underpar

        r = LeagueResultRow.query(ndb.AND(LeagueResultRow.comp_id==requested_comp_key, LeagueResultRow.golfer_id==current_golfer)).get()            
        if r:
            ResultRows[j].key = r.key
        r=ResultRows[j]
        r.put()
  
        template_values = {
                'results': ResultRows,
                'comp' : comp,
                'user' : user
            }

        template = JINJA_ENVIRONMENT.get_template('templates/gcn_detail.html')
        self.response.write(template.render(template_values))

class AddGolfer(BaseRequestHandler):
    def get(self):

        user=self.current_user
        g = user.golfer_id.get()


        template_values = {
            'golfer' : g,
            'golfer_id': g.key.id()
        }

        template = JINJA_ENVIRONMENT.get_template('templates/gcn_golfer.html')
        self.response.write(template.render(template_values))
        return

    def post(self):

        user = self.current_user
        g_old = user.golfer_id.get()


        #get the values from the golfer details form
        g = Golfer( name = self.request.get('name'),
                    club = self.request.get('club'),
                    current_handicap = float(self.request.get('current_handicap')),
                    email = self.request.get('email')
                    )

        golfer_id = int(self.request.get('golfer_id'))

        if golfer_id:
            g.key = ndb.Key('Golfer', golfer_id)
            try:
                g.put()
                error = "successful update"
            except:
                error = "problem updating golfer"
        else:
            try:
                g.key = g.put() 
                error = "successful insert"
            except:
                error = "problem writing new golfer"

        template_values = {
            'golfer': g,
            'golfer_id' : g.key.id(),
            'error' : error
        }

        template = JINJA_ENVIRONMENT.get_template('templates/gcn_golfer.html')
        self.response.write(template.render(template_values))


class login(AuthHandler):

    def post(self):

        email=self.request.get("email")
        password=self.request.get("password")
        name = self.request.get("name")
        auth_id = "gcn:"+email
        
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
            template = JINJA_ENVIRONMENT.get_template('templates/gcn_login.html')
            self.response.write(template.render(template_values))


class signup(AuthHandler):

    def post(self):

        email=self.request.get("email2")
        password=self.request.get("password2")
        name = self.request.get("name")
        auth_id = "gcn:%s" % email

        """TODO some validation of the above information"""

        user=self.auth.store.user_model.get_by_auth_id(auth_id)
        if user:
            #user already exists
            template_values = {'email' : email,
                            'name': name,
                            'error': 'email already in use - pleae login'}
            template = JINJA_ENVIRONMENT.get_template('templates/gcn_login.html')
            self.response.write(template.render(template_values))
        else:
            #add account
            golfer = Golfer(email= email, name=name)
            golfer.key = golfer.put()
            auth_id = "gcn:"+email
            account = Account(email=email, username=name, golfer_id = golfer.key)
            account.key = account.put()
            data = {"account" : account.key.id(),
                    "golfer_id" : golfer.key,
                    "name" : name,
                    "email" : email,
                    "password_raw":password}
            _attrs = self._to_user_model_attrs(data, self.USER_ATTRS["gcn"])


            ok, user = self.auth.store.user_model.create_user(auth_id, **_attrs)
            if ok:
                self.auth.set_session(self.auth.store.user_to_dict(user))


            self.redirect('/')
            return

class TestData(BaseRequestHandler):

    def get(self):

        """class Golfer(ndb.Model):
            name = ndb.StringProperty()
            club = ndb.StringProperty()
            current_handicap = ndb.FloatProperty()
            pic = ndb.BlobProperty()"""

        """TODO add some stuff to add different types of test data """

        user = self.current_user
        g= user.golfer_id.get()    

        if not g:        
            g = Golfer( name = user.name,
                club = "Woburn Golf Club",
                current_handicap = 20)
            
            g.key=g.put()

        """class Account(ndb.Model):
            user_id = ndb.KeyProperty(kind=user)
            username = ndb.StringProperty()
            golfer_id = ndb.KeyProperty(kind=Golfer)"""

        a_key = ndb.Key(Account, user.key.id())
        a= a_key.get()     

        if not a:
            a = Account(
                username = g.name,
                golfer_id = g.key)

            a.key=a.put()

        c= Course.query(Course.name == "Dukes Course").get()            
        if not c:
            c = Course(
                club = "Woburn Golf Club",
                name = "Dukes Course",
                teebox = "Yellow",
                standard_scratch = 72.3,
                hole_num = (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18),
                stroke_index = (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18),
                par = (4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4))

            c.key=c.put()

        """class Competition(ndb.Model):
            name = ndb.StringProperty(indexed=True)
            golfer_ids = ndb.KeyProperty(kind=Golfer, repeated=True)
            comp_type = ndb.StringProperty() # type of tournament, 'league' is only supported in V1 IMPROVEMENT add more types
            admin = ndb.KeyProperty(kind= Golfer)
            start_date = ndb.DateProperty()
            end_date = ndb.DateProperty()

            def create_summary(self, i):
                
                summary_results = LeagueResultsRow.query(LeagueResultsRow.comp_id==self.key).fetch(i)

                for res in summary_results:
                    res.golfer = Golfer.query(Golfer.key==res.golfer_id).get()

                return summary_results"""


        mycompetition = Competition(
                    name = "Another Competition",
                    golfer_ids = [g.key],
                    comp_type = "league", # type of tournament, 'league' is only supported in V1 IMPROVEMENT add more types
                    admin = g.key)
        mycompetition.key=mycompetition.put()




        """class Network(ndb.Model):
            name = ndb.StringProperty(indexed = True)
            golfer_id = ndb.KeyProperty(kind=Golfer) #should this be a repeated property to link golfers to a network more quickly? IMPROVEMENT

        class Scorecard(ndb.Model):
            standard_scratch = ndb.FloatProperty()
            total_gscore = ndb.IntegerProperty()  #the design here allows for details for each hole to be entered but this is not required
            total_nscore = ndb.IntegerProperty()  #as the total data can be filled instead of calculated.  If detail flag is set to yes then
            total_strokes = ndb.IntegerProperty()
            total_par = ndb.IntegerProperty()
            total_underpar = ndb.IntegerProperty()
            total_points = ndb.IntegerProperty()  #the code expects the data for each hole to be completed.
            hole_detail = ndb.BooleanProperty()
            hole_num = ndb.IntegerProperty(repeated = True)
            stroke_index = ndb.IntegerProperty(repeated = True)
            stroke = ndb.IntegerProperty(repeated = True)
            gscore = ndb.IntegerProperty(repeated = True)
            nscore = ndb.IntegerProperty(repeated = True)
            stableford_points = ndb.IntegerProperty(repeated = True)
            putts = ndb.IntegerProperty(repeated = True)
            par = ndb.IntegerProperty(repeated = True)
            penalties = ndb.IntegerProperty(repeated = True)

        class Round(ndb.Model):
            comp_id = ndb.KeyProperty(kind= Competition)
            golfer_id = ndb.KeyProperty(kind= Golfer)
            marker_id = ndb.KeyProperty(kind= Golfer)
            course_id = ndb.KeyProperty(kind= Course)
            handicap = ndb.FloatProperty()
            date = ndb.DateProperty()
            signed = ndb.BooleanProperty() #round complete or in-progress if signed off no more changes allowed
            scorecard = ndb.StructuredProperty(Scorecard) # could be done as an array but using a structure
            #because I can then add more attributes of the score later, but array might be faster IMPROVEMENT"""

        scard = Scorecard(standard_scratch = 71.3,
                    total_gscore = 92,  #the design here allows for details for each hole to be entered but this is not required
                    total_nscore = 73,  #as the total data can be filled instead of calculated.  If detail flag is set to yes then
                    total_points = 35,  #the code expects the data for each hole to be completed.
                    total_strokes = 19,
                    total_underpar = 1,
                    total_par = 72,
                    hole_detail = True,
                    hole_num = c.hole_num,
                    stroke_index = c.stroke_index,
                    stroke = (1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1),
                    par = c.par,
                    gscore = (7,5,4,5,6,4,5,5,5,6,4,5,6,5,4,5,5,5),
                    nscore = (6,4,3,4,5,3,4,4,4,5,3,4,5,4,3,4,4,4),
                    stableford_points = (1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2))

        r = Round(comp_id = mycompetition.key,
                    golfer_id = a.golfer_id,
                    marker_id = a.golfer_id,
                    course_id = c.key,
                    strokes = 19,
                    handicap = g.current_handicap,
                    signed = True, #round complete or in-progress if signed off no more changes allowed
                    scorecard = scard)

        r.key=r.put()
        

class UpdateRound(BaseRequestHandler):
    """what does this handler do?"""
    def get(self):

        round_id = ''
        round_id=self.request.get('round_id')
        if round_id:
            r = ndb.Key("Round", round_id).get()
            if r:
                scard = r.scorecard
            else:
                scard = Scorecard()
        else:
            scard = Scorecard()

        requested_comp_key=ndb.Key(urlsafe=self.request.get('comp_key'))
        comp = requested_comp_key.get()
        user = self.current_user
        scard.hole_detail=False
        course_list = Course.query().fetch()
        golfer_list = Golfer.query().fetch() #TODO reduce this to just the list of golfers in this competition

        s = ["gscore1", "gscore2", "gscore3", "gscore4", "gscore5", "gscore6", "gscore7", "gscore8", "gscore9", "gscore10", "gscore11", "gscore12", "gscore13", "gscore14", "gscore15", "gscore16", "gscore17", "gscore18"]
        p = ["par1", "par2", "par3", "par4", "par5", "par6", "par7", "par8", "par9", "par10", "par11", "par12", "par13", "par14", "par15", "par16", "par17", "par18"]
        st = ["stroke1", "stroke2", "stroke3", "stroke4", "stroke5", "stroke6", "stroke7", "stroke8", "stroke9", "stroke10", "stroke11", "stroke12", "stroke13", "stroke14", "stroke15", "stroke16", "stroke17", "stroke18"]
        holes = [0, 1, 2, 3, 4, 5, 6, 7 ,8, 9, 10, 11, 12, 13, 14, 15, 16, 17]


        template_values = {'comp' : comp,
                        'golfer_list' : golfer_list,
                        'course_list' : course_list,
                        'user': user,
                        'scard': scard,
                        'gscore_label': s,
                        'par_label' : p,
                        'stroke_label' : st,
                        'error': ''}

        template = JINJA_ENVIRONMENT.get_template('templates/gcn_scoreentry.html')
        self.response.write(template.render(template_values))

    def post(self):

        strokes = 1
        s = ["gscore1", "gscore2", "gscore3", "gscore4", "gscore5", "gscore6", "gscore7", "gscore8", "gscore9", "gscore10", "gscore11", "gscore12", "gscore13", "gscore14", "gscore15", "gscore16", "gscore17", "gscore18"]
        p = ["par1", "par2", "par3", "par4", "par5", "par6", "par7", "par8", "par9", "par10", "par11", "par12", "par13", "par14", "par15", "par16", "par17", "par18"]
        st = ["stroke1", "stroke2", "stroke3", "stroke4", "stroke5", "stroke6", "stroke7", "stroke8", "stroke9", "stroke10", "stroke11", "stroke12", "stroke13", "stroke14", "stroke15", "stroke16", "stroke17", "stroke18"]
        holes = [0, 1, 2, 3, 4, 5, 6, 7 ,8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

        requested_comp_key=ndb.Key(urlsafe=self.request.get('comp_key'))
        comp = requested_comp_key.get()
        user = self.current_user
        course_list = Course.query().fetch()
        golfer_list = Golfer.query().fetch()
        scorecard= Scorecard()
        error = ''

        if self.request.get("scard.hole_detail") == True:
            
            for hole in holes: 
                scorecard.gscores.append(int(self.request.get(s[hole]))) 
                scorecard.pars.append(int(self.request.get(p[hole])))
                scorecard.strokes.append(int(self.request.get(st[hole])))
                scorecard.nscores.append(gscores[hole]-strokes[hole])
                if (scorecard.par[hole]-scorecard.nscore[hole]+2) > 0:
                    scorecard.points.append(par[hole]-scorecard.nscore[hole]+2)
                else:
                    scorecard.points.append(0)
                scorecard.total_gscore = scorecard.total_gscore+scorecard.gscores[hole]
                scorecard.total_nscore = scorecard.total_nscore+scorecard.nscores[hole]
                scorecard.total_par = scorecard.total_par+scorecard.pars[hole]
                scorecard.total_strokes = scorecard.total_strokes+scorecard.strokes[hole]
                scorecard.total_points = scorecard.total_points+scorecard.points[hole]
                scorecard.total_underpar = scorecard.total_underpar+(scorecard.nscores[hole]-scorecard.pars[hole])
        else:
                scorecard.total_gscore = int(self.request.get("scard.total_gscore"))
                scorecard.total_par = int(self.request.get("scard.total_par"))
                scorecard.total_strokes = int(self.request.get("scard.total_strokes"))
                scorecard.total_nscore = scorecard.total_gscore-scorecard.total_strokes
                scorecard.total_points = int(self.request.get("scard.total_points"))
                scorecard.total_underpar = scorecard.total_nscore-scorecard.total_par

        template_values = {'comp' : comp,
                        'golfer_list' : golfer_list,
                        'course_list' : course_list,
                        'user': user,
                        'scard': scorecard,
                        'gscore_label': s,
                        'par_label' : p,
                        'stroke_label' : st,
                        'error': ''}

        template = JINJA_ENVIRONMENT.get_template('templates/gcn_scoreentry.html')
        self.response.write(template.render(template_values))

        
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
  Route('/detail', handler='main.CompResultCalc'),
  Route('/testdata', handler='main.TestData'),
  Route('/updateround', handler='main.UpdateRound'),
  Route('/golfer', handler='main.AddGolfer'),
  Route('/profile', handler='handlers.ProfileHandler', name='profile'),
  Route('/logout', handler='handlers.AuthHandler:logout', name='logout'),
  Route('/login', handler='main.login'),
  Route('/signup', handler='main.signup'),
  Route('/auth/<provider>', handler='handlers.AuthHandler:_simple_auth', name='auth_login'),
  Route('/auth/<provider>/callback', handler='handlers.AuthHandler:_auth_callback', name='auth_callback')
]

application = webapp2.WSGIApplication(routes,config=app_config, debug=True)
