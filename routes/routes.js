
function Routes(config, controller, stravaApi) {
  this.config = config;
  this.controller = controller;
  this.stravaApi = stravaApi;
}

Routes.prototype.home = function(req, res) {
  var ip = getClientIp(req);
  if (req.session == null || req.session.accessToken == null) {
    console.log('home: source ip: ' + ip);
    return res.render('home', {
      clientId: this.config.strava.clientId,
      error: req.session.error,
    });
  }

  // render the landing page. include the guid which will be passed back
  // to the server via the websocket so everything can be brought together
  console.log('landing: source ip: ' + ip + ' => ' + req.session.athleteFirstName + ' ' + req.session.athleteLastName + ' - ' + req.session.guid);
  res.render('landing', {
    athleteId: req.session.athleteId,
    firstName: req.session.athleteFirstName,
    lastName: req.session.athleteLastName,
    guid: req.session.guid,
  });
};

Routes.prototype.logout = function(req, res) {
  console.log('logging out');
  req.session.destroy();
  res.redirect('/');
};

Routes.prototype.authorized = function(req, res) {
  if (req.query.error) {
    console.log('Login not authorized');
    return res.redirect('/');
  }
  
  // TODO: avoid the use of localController by using better abstraction
  var localController = this.controller;
  this.stravaApi.getAccessToken(req.query.code, function(err, data) {
    if (err) {
      console.log('get access token error: ' + err);
      req.session.error = 'Problem retrieving access token: ' + err;
      return res.redirect('/');
    }

    // this kicks off the retrieval process if necessary
    req.session.guid = localController.handleNewConnection({
      athleteId: data.athlete.id,
      accessToken: data.access_token,
    });
    req.session.accessToken = data.access_token;
    req.session.athleteId = data.athlete.id;
    req.session.athleteFirstName = data.athlete.firstname;
    req.session.athleteLastName = data.athlete.lastname;
    req.session.athleteProfileMedium = data.athlete.profile_medium;
    req.session.athleteProfileLarge = data.athlete.profile;
    req.session.athleteDataPreference = data.athlete.data_preference;
    req.session.athleteMeasurementPreference = data.athlete.measurement_preference;
    req.session.athleteEmail = data.athlete.email;
    req.session.error = '';
    res.redirect('/');
  });
};

function getClientIp(req) {
  var ip = req.headers['x-forwarded-for'];
  if (!ip) {
    ip = req.connection.remoteAddress;
  }
  return ip;
}

module.exports = Routes;

