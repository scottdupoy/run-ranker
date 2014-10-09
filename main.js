var http = require('http');
var express = require('express');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');

var app = express();
var server = http.createServer(app);

// set up app
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(express.logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'dummy-secret',
  resave: true,
  saveUninitialized: true,
}));

// routes
app.get('/', function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('rdc');
});


var host = '0.0.0.0';
var port = process.env.PORT || 8082;
server.listen(port, host, function() {
  console.log('server listening on ' + host + ':' + port);
});



/*
var http = require('http');
http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain'});
  res.end('rdc: ' + process.env.PORT);
}).listen(process.env.PORT);
*/
