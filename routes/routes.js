var http = require('http');

exports.home = function(config) {
  return function(req, res) {
    // TODO: check for token in session, if !present => home, otherwise => landing
    // landing needs a logout button which will clear the session
    res.render('home', { clientId: config.strava.clientId });
  };
};

exports.authorized = function(config) {
  return function(req, res) {
    if (req.query.error) {
      console.log('Login not authorized');
      return res.redirect('/');
    }
    res.redirect('/');
    console.log('Login authorized:');
    console.log('  code:  ' + req.query.code);
    
    var path = '/oauth/token?client_id=' + config.strava.clientId + '&client_secret=' + config.strava.clientSecret + '&code=' + req.query.code;
    var accessTokenRequest = http.request({
      host: 'www.strava.com',
      port: 80,
      path: path,
      method: 'POST'
    },
    function(tokenResponse) {
      console.log('token response headers: ' + JSON.stringify(tokenResponse.headers));
      // TODO: get access token and put it in the session!
    })    
    .on('error', function(err) {
      // TODO: redirect to an error page
       console.log('get access token error: ' + err);
    })
    .end();

  };
};

