var http = require('http');
var express = require('express');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var yaml = require('js-yaml');
var fs = require('fs');

var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'config.yaml'), 'utf8'));

// using prototypes, order is important
var db = new (require('./shared/db'))(config);
var bridge = new (require('./app/bridge'))();
var stravaApi = new (require('./app/stravaApi'))(config);
var controller = new (require('./app/controller'))(bridge, db);
var routes = new (require('./routes/routes'))(config, controller, stravaApi);
var io = new (require('./app/sockets'))(bridge);
var messaging = new (require('./app/messaging'))(config, controller);
var retriever = new (require('./app/retriever'))(stravaApi, messaging, controller);

// hook up the final (cyclical) dependencies
controller.set(retriever, messaging);

// web server setup
var app = express();
var server = http.Server(app);

// TODO:
//  - if we hit a limit or have a problem then because activities are retrieved in reverse order
//    then i think the latest id logic is flawed
//  - how will we detect if a user deletes an activity?... (wait for full refresh)
//  - handle logging properly
//  - handle errors properly
//  - optional full retrievals via button
//  - switch to https

// set up app
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

// routes (could simplify this code by using a 'that' handle onto 'this' in the route functions)
app.get('/', function(req, res) { routes.home(req, res); });
app.get('/authorized', function(req, res) { routes.authorized(req, res); });
app.get('/logout', function(req, res) { routes.logout(req, res); });

// start db and comms, chaining functions together where necessary
io.connect(server);
db.connect(function(err) {
  if (err) {
    return console.log("ERROR: couldn't connect to db: " + err);
  }
  messaging.start(function(err) {
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

