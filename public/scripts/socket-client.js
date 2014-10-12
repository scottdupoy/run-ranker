var socket;
var log;

$(function() {
  log = $('#log');

  socket = io();
  socket.on('log', function(data) {
    log.html(log.html() + data + '\n');
  });

  $('#socket').click(function() {
    console.log('sending message via socket');
    socket.emit('req', 'test request');
    return false;
  });
});

