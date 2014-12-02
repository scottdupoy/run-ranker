var nameLengthLimit = 36;

var socket;
var log;

var data;

function formatSeconds(time) {
  // take seconds and format as hh:mm:ss
  time = Math.round(time);
  var seconds = time % 60;
  var minutes = Math.floor(time / 60) % 60;
  var hours = Math.floor(time / 3600);

  seconds = seconds < 10 ? "0" + seconds : seconds;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  hours = hours < 10 ? "0" + hours : hours;

  return hours + ':' + minutes + ':' + seconds;
}

function convertKmToMiles(km) {
  return km * 0.621371192;
}

function processData(rawData) {
  data = { };

  rawData.distances.forEach(function(distance) {
    data[distance.id] = {
      distance: distance,
      efforts: [ ],
    };
  });

  rawData.activities.forEach(function(activity) {
    if (!("bestEfforts" in activity)) {
      return;
    }

    // TODO: could make "new" be anything newly loaded or within the last ~week?
    activity.bestEfforts.forEach(function(effort) {
      var distance = data[effort.distanceId];
      var distanceInKm = distance.distance.distanceInKm;
      var distanceInMiles = convertKmToMiles(distanceInKm);
      distance.efforts.push({
        new: (activity.new ? 'NEW' : ''),
        duration: effort.duration, // for sorting, not rendering
        time: formatSeconds(effort.duration),
        paceK: formatSeconds(effort.duration / distanceInKm).substring(3, 8),
        paceM: formatSeconds(effort.duration / distanceInMiles).substring(3, 8),
        date: activity.date.substring(0, 10),
        name: activity.name,
        distanceK: distanceInKm,
        distanceM: distanceInMiles,
      });
    });
  });

  // sort by duration then add position ids
  rawData.distances.forEach(function(distance) {
    // sort
    var efforts = data[distance.id].efforts;
    efforts.sort(function (a, b) {
      return a.duration - b.duration;
    });

    // positions + new class
    var position = 1;
    efforts.forEach(function(effort) {
      // set the position
      effort.position = position;

      // add "new" class to row if necessary
      effort.newClass = '';
      if (effort.new == "NEW") {
        effort.newClass = " class='new'";
      }

      // tidy up name if it's too long
      if (effort.name.length > nameLengthLimit) {
        effort.name = effort.name.substring(0, nameLengthLimit - 3) + '...';
      }

      position++;
    });
  });
}

function selectDistance(distanceId) {

  // clear distance links and set the current one
  $('.distance').removeClass('selectedDistance');
  $('#' + distanceId).addClass('selectedDistance');

  // render the efforts
  var distanceData = data[distanceId.substring(8, distanceId.length)];
  var template = $('#effortsTemplate').html();
  var rendered = $($.mustache(template, distanceData));
  $('#efforts').replaceWith(rendered);
}

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

  socket.on('data', function(rawData) {
    // need to cache in a top-level variable
    var parsedData = JSON.parse(rawData);

    // get the distances and put them in ascending distance order (filter on metric/imperial later)
    var distances = parsedData.distances;
    distances.sort(function(a, b) {
      return a.distanceInKm - b.distanceInKm;
    });
    
    processData(parsedData);

    var template = $('#distancesTemplate').html();
    var renderedDistances = $($.mustache(template, { distances: distances }));
    $('#distances').replaceWith(renderedDistances);

    $('.distance')
      .click(function() {
        selectDistance($(this).attr('id'));
        return false;
      });

    selectDistance($('.distance').first().attr('id'));
  });

  // initiate async load
  socket.emit('load', guid);
});

