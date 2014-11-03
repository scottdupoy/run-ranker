
function Bridge() {
  // need a map to find the athleteIds when disconnecting
  this.guidMap = { };

  // need a map from athleteId to guids to sockets
  this.socketMap = { };
}

Bridge.prototype.connect = function(athleteId) {
  // add the guid and a link back to the athleteId
  var guid = generateGuid();
  console.log('bridge: adding guid mapping for athleteId: ' + athleteId + ', guid: ' + guid);
  this.guidMap[guid] = athleteId;

  // see if there is already an open connection for this athleteId
  if (!(athleteId in this.socketMap)) {
    // no sockets for this athleteId so create an empty entry in the socketMap
    console.log('bridge: adding socket mapping for athleteId: ' + athleteId);
    this.socketMap[athleteId] = { };
  }
  var mappings = this.socketMap[athleteId];

  // add the new guid and a queue to hold any messages that should be sent
  // before the client socket actually connects
  mappings[guid] = {
    socket: null,
    queue: [ ]
  };

  return guid;
};

Bridge.prototype.disconnect = function(guid) {
  if (!(guid in this.guidMap)) {
    return;
  }

  var athleteId = this.guidMap[guid];
  console.log('bridge: removing guid lookup: ' + guid);
  delete this.guidMap[guid];

  if (!(athleteId in this.socketMap)) {
    return;
  }

  var mappings = this.socketMap[athleteId];
  if (guid in mappings) {
    console.log('bridge: removing athleteId ' + athleteId + ' guid ' + guid);
    delete mappings[guid];
  }
};

Bridge.prototype.send = function(athleteId, key, message) {
  if (!(athleteId in this.socketMap)) {
    return;
  }

  // find mappings then iterate over them, sending or queueing for each
  var mappings = this.socketMap[athleteId];
  for (var guid in mappings) {
    // check it's a key and not a prototype property
    if (!mappings.hasOwnProperty(guid)) {
      continue;
    }

    var mapping = mappings[guid];
    if (mapping.socket == null) {
      mapping.queue.push({ key: key, message: message });
    }
    else {
      mapping.socket.emit(key, message);
    }
  }
};

Bridge.prototype.setSocket = function(guid, socket) {
  // find the corresponding athleteId
  if (!(guid in this.guidMap)) {
    console.log('WARN: unexpected missing athleteId for guid: ' + guid);
    return;
  }
  var athleteId = this.guidMap[guid];

  if (!(athleteId in this.socketMap)) {
    console.log('WARN: unexpected missing athleteId in socketMap: ' + athleteId + ' (adding it)');
    this.socketMap[athleteId] = { };
  }
  var mappings = this.socketMap[athleteId];

  if (!(guid in mappings)) {
    console.log('WARN: unexpected missing mapping for guid ' + guid + ' for athleteId ' + athleteId + ' (adding it)');
    mappings[guid] = {
      socket: null,
      queue: [ ],
    };
  }

  var mapping = mappings[guid];
  mapping.socket = socket;

  // flush any cached messages
  mapping.queue.forEach(function(message) {
    socket.emit(message.key, message.message);
  });
  mapping.queue = [ ];
};

function generateGuid() {
  //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

module.exports = Bridge;

