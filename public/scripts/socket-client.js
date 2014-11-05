var socket;
var log;

$(function() {
  log = $('#log');

  socket = io();

  socket.on('log', function(data) {
    log.html(log.html() + data + '\n');
  });

  socket.on('error', function(err) {
    console.log('---- error -------------');
    console.log(err);
    console.log(JSON.parse(err));
    console.log('------------------------');
  });

  socket.on('state', function(state) {
    console.log('---- state -------------');
    console.log(JSON.parse(state));
    console.log('------------------------');
  });

  socket.on('data', function(data) {
    console.log('---- data --------------');
    console.log(JSON.parse(data));
    console.log('------------------------');
  });

  // initiate async load
  socket.emit('load', guid);
});

