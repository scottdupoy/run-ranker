var socketio = require('socket.io');

exports.connect = function(server, bridge) {
  var io = socketio(server);

  io.sockets.on('connection', function(socket) {
    var guid = null;

    socket.on('load', function(sessionGuid) {
      // send connection confirmation message straight down the socket (so jump the cached message queue)
      guid = sessionGuid;
      socket.emit('log', 'socket connected to server');
      bridge.setSocket(guid, socket);
    });
    
    socket.on('disconnect', function() {
      if (guid === null) {
        return;
      }
      bridge.disconnect(guid);
    });
  });
};

