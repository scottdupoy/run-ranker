var http = require('http');
var express = require('express');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var favicon = require('serve-favicon');
var yaml = require('js-yaml');
var fs = require('fs');
var socketio = require('socket.io');

var routes = require('./routes/routes');

var app = express();
var server = http.Server(app);
var io = socketio(server);
var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, 'config.yaml'), 'utf8'));

// socket hash to bring all the comms together
var socketHash = { };

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

//io.set('log level', 1);
io.sockets.on('connection', function(socket) {

  socket.emit('log', 'Connected to server');  

  var guid = null;
  console.log('SOCKET: client connected');
  /*
  socket.on('start', function(sessionGuid) {
    console.log('SOCKET: ' + sessionGuid + ' - start');
    // todo: if the start comes in after we have some results
    //       then these will have needed caching and then need 
    //       flushing through the socket
    socketHash[sessionGuid] = socket;
  });
  */
  socket.on('disconnect', function() {
    if (guid === null) {
      console.log('SOCKET: DISCONNECT: unknown, ignoring');
      return;
    }
    console.log('SOCKET: DISCONNECT: ' + guid);
    delete socketHash[guid];
  });
});


