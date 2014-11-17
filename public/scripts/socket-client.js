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
    // need to cache in a top-level variable
    var data = JSON.parse(data);
    var template = $('#distancesTemplate').html();

    var distances = [ ];
    data.forEach(function(activity) {
      console.log('>> ' + JSON.stringify(activity));
      if (!("bestEfforts" in activity)) {
        return;
      }
      activity.bestEfforts.forEach(function(effort) {
        console.log('>>>> ' + JSON.stringify(effort));
      });
    });

    var renderedDistances = $($.mustache(template, { distances: distances }));
    $('#distances').replaceWith(renderedDistances);
  });

  // initiate async load
  socket.emit('load', guid);
});

