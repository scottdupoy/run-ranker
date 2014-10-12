var socket;
var log;

$(function() {
  log = $('#log');

  socket = io();
  socket.on('log', function(data) {
    log.html(log.html() + data + '\n');
  });

  // initiate async load
  socket.emit('load', guid);
});

