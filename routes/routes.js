exports.home = function(config, bridge, retriever, messaging, db) {
  return function(req, res) {
    var ip = getClientIp(req);
    if (req.session == null || req.session.access_token == null) {
      console.log('home: source ip: ' + ip);
      console.log('user-agent: ' + req.headers['user-agent']);
      return res.render('home', { clientId: config.strava.clientId });
    }

    var guid = bridge.connect();
    req.session.guid = guid;
    console.log('landing: source ip: ' + ip + ' => ' + req.session.athlete_firstname + ' ' + req.session.athlete_lastname + ' - ' + guid);

    res.render('landing', {
      //access_token: req.session.access_token,
      id: req.session.athlete_id,
      firstname: req.session.athlete_firstname,
      lastname: req.session.athlete_lastname,
      guid: guid,
    });

    retriever.retrieve(config, bridge, messaging, db, {
      id: req.session.athlete_id,
      guid: guid,
      access_token: req.session.access_token,
    });
  };
};

exports.logout = function() {
  return function(req, res) {
    console.log('logging out');
    req.session.destroy();
    res.redirect('/');
  };
};

exports.authorized = function(config, stravaApi) {
  return function(req, res) {
    if (req.query.error) {
      console.log('Login not authorized');
      return res.redirect('/');
    }
    
    stravaApi.getAccessToken(config, req.query.code, function(err, data) {
      if (err) {
        // TODO: propogate the error to the UI, will need to cache in the session
        console.log('get access token error: ' + err);
        return res.redirect('/');
      }
      req.session.access_token = data.access_token;
      req.session.athlete_id = data.athlete.id;
      req.session.athlete_firstname = data.athlete.firstname;
      req.session.athlete_lastname = data.athlete.lastname;
      req.session.athlete_profile_medium = data.athlete.profile_medium;
      req.session.athlete_profile_large = data.athlete.profile;
      req.session.athlete_data_preference = data.athlete.data_preference;
      req.session.athlete_measurement_preference = data.athlete.measurement_preference;
      req.session.athlete_email = data.athlete.email;
      res.redirect('/');
    });
  };
};

function getClientIp(req) {
  var ip = req.headers['x-forwarded-for'];
  if (!ip) {
    ip = req.connection.remoteAddress;
  }
  return ip;
}

