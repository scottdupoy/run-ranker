var socketio = require('socket.io');

function Sockets(bridge) {
  this.bridge = bridge;
}

Sockets.prototype.connect = function(server) {
  var io = socketio(server);
  var that = this;

  io.sockets.on('connection', function(socket) {
    var guid = null;

    socket.on('load', function(sessionGuid) {
      // send connection confirmation message straight down the socket (so jump the cached message queue)
      guid = sessionGuid;
      socket.emit('log', 'socket connected to server');
      that.bridge.setSocket(guid, socket);
    });
    
    socket.on('disconnect', function() {
      if (guid === null) {
        return;
      }
      that.bridge.disconnect(guid);
    });
  });
};

module.exports = Sockets;

