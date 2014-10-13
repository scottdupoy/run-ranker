var map = { };

module.exports.connect = function() {
  var guid = generateGuid();
  map[guid] = {
    socket: null,
    queue: [ ],
  };
  return guid;
};

module.exports.disconnect = function(guid) {
  if (guid in map) {
    delete map[guid];
  }
};

module.exports.send = function(guid, key, message) {
  if (!(guid in map)) {
    return;
  }
  var wrapper = map[guid];
  if (wrapper.socket == null) {
    wrapper.queue.push({ key: key, message: message });
    return;
  }
  wrapper.socket.emit(key, message);
};

module.exports.setSocket = function(guid, socket) {
  if (!guid in map) {
    return;
  }

  var wrapper = map[guid];
  wrapper.socket = socket;

  // flush any cached messages
  wrapper.queue.forEach(function(message) {
    socket.emit(message.key, message.message);
  });
  wrapper.queue = [ ];
};

function generateGuid() {
  //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

