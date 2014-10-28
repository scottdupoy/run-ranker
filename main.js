var http = require('http');
var express = require('express');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var yaml = require('js-yaml');
var fs = require('fs');

// TODO: add some kind of construction layer to stop having to pass objects through method calls
var routes = require('./routes/routes');
var bridge = require('./app/bridge');
var io = require('./app/sockets');
var messaging = require('./app/messaging');
var stravaApi = require('./app/stravaApi');
var retriever = require('./app/retriever');
var db = require('./shared/db');

var app = express();
var server = http.Server(app);
var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'config.yaml'), 'utf8'));

// TODO:
//  - don't cache activities in a results array then process them all when we
//    all of them, need to fire async events requesting the data to be processed
//    at the same time.
//  - if we hit a limit or have a problem then because activities are retrieved in reverse order
//    then i think the latest id logic is flawed
//  - add mediator object described in app/retriever.js
//  - store high-level details of manually entered runs. want monthly totals.
//  - how will we detect if a user deletes an activity?...

// set up app
// TODO: (1) handling logging properly, (2) handle errors properly
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: config.security.sessionSecret,
  resave: true,
  saveUninitialized: true,
}));

// routes
app.get('/', routes.home(config, bridge, retriever, messaging, db));
app.get('/authorized', routes.authorized(config, stravaApi));
app.get('/logout', routes.logout());

// start db and comms, chaining functions together where necessary
io.connect(server, bridge);
db.connect(config, function(err) {
  if (err) {
    return console.log("ERROR: couldn't connect to db: " + err);
  }
  messaging.start(config, bridge, function(err) {
    if (err) {
      console.log("ERROR: couldn't start messaging: " + err);
      db.disconnect();
      return;
    }
    console.log('rabbitmq connection initiated, starting http server');
    server.listen(config.http.port, config.http.host, function() {
      console.log('server listening on ' + config.http.host + ':' + config.http.port);
    });
  });
});

