var https = require('https');

exports.home = function(config) {
  return function(req, res) {
    if (req.session == null || req.session.access_token == null) {
      console.log('home');
      return res.render('home', { clientId: config.strava.clientId });
    }
    console.log('landing: ' + req.session.athlete_firstname + ' ' + req.session.athlete_lastname);
    return res.render('landing', {
      access_token: req.session.access_token,
      id: req.session.athlete_id,
      firstname: req.session.athlete_firstname,
      lastname: req.session.athlete_lastname,
      email: req.session.athlete_email
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

exports.authorized = function(config) {
  return function(req, res) {
    if (req.query.error) {
      console.log('Login not authorized');
      return res.redirect('/');
    }
    
    var path = '/oauth/token?client_id=' + config.strava.clientId + '&client_secret=' + config.strava.clientSecret + '&code=' + req.query.code;
    var accessTokenRequest = https.request({
      host: 'www.strava.com',
      port: 443,
      path: path,
      method: 'POST'
    },
    function(tokenResponse) {
      var data = '';
      tokenResponse.on('data', function(chunk) {
        data += chunk;
      });
      tokenResponse.on('end', function() {
        data = JSON.parse(data);
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
    })
    .on('error', function(err) {
       console.log('get access token error: ' + err);
       res.redirect('/');
    })
    .end();
  };
};

