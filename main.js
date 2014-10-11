var http = require('http');
var express = require('express');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var yaml = require('js-yaml');
var fs = require('fs');

var routes = require('./routes/routes');
var app = express();
var server = http.createServer(app);
var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'config.yaml'), 'utf8'));

// set up app
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(express.logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: config.security.sessionSecret,
  resave: true,
  saveUninitialized: true,
}));

// routes
app.get('/', routes.home(config));
app.get('/authorized', routes.authorized(config));
app.get('/logout', routes.logout());

server.listen(config.http.port, config.http.host, function() {
  console.log('server listening on ' + config.http.host + ':' + config.http.port);
});

