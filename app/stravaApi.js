var https = require('https');
var perPage = 200;

module.exports.getAccessToken = function(config, code, callback) {
  var path = '/oauth/token?client_id=' + config.strava.clientId + '&client_secret=' + config.strava.clientSecret + '&code=' + code;
  var accessTokenRequest = https.request({
    host: 'www.strava.com',
    port: 443,
    path: path,
    method: 'POST'
  },
  function(tokenResponse) {
    var data = '';
    tokenResponse.on('data', function(chunk) {
      data += chunk;
    });
    tokenResponse.on('end', function() {
      callback(null, JSON.parse(data));
    });
  })
  .on('error', function(err) {
    callback(err);
  })
  .end();
};

module.exports.retrieveLatestActivities = function(config, accessToken, latestId, callback) {
  retrieveActivitiesPage(config, accessToken, latestId, 1, [ ], callback);
};

function retrieveActivitiesPage(config, accessToken, latestId, page, results, callback) {
  console.log('retrieving activities page ' + page);
  var options = {
    host: 'www.strava.com',
    port: 443,
    method: 'GET',
    path: '/api/v3/athlete/activities?page=' + page + '&per_page=' + perPage + '&access_token=' + accessToken,
  };
  https.request(options, function(response) {
    var data = '';
    response.on('data', function(chunk) {
      data += chunk;
    })
    response.on('end', function() {
      var activities = JSON.parse(data);
      var anyActivitiesAfterLatestId = false;
      activities.forEach(function (activity) {
        anyActivitiesAfterLatestId |= activity.id > latestId;
        if (activity.type == "Run"
          && activity.id > latestId
          && !activity.trainer
          && !activity.manual
          && !activity.flagged
          && !activity.private) {
          console.log('  new run:      ' + activity.id + ' => ' + activity.name);
          results.push({
            id: activity.id,
            name: activity.name,
            distanceInKm: activity.distance / 1000.0,
            moving_time: activity.moving_time,
            elapsed_time: activity.elapsed_time,
            start_date: activity.start_date_local,
          });
        }
      });
      if (anyActivitiesAfterLatestId) {
        retrieveActivitiesPage(config, accessToken, latestId, page + 1, results, callback);
      }
      else {
        // TODO: by caching the results in an array it means that no results are processed until all of the results are in.
        callback(null, results);
      }
    });
  })
  .on('error', function(err) {
    callback(err);
  })
  .end();
};

module.exports.retrieveActivityStream = function(config, accessToken, activityId, callback) {
  // note: stream call could also request things like heartrate, temp, grade_smooth, etc
  https.request({
    host: 'www.strava.com',
    port: 443,
    path: '/api/v3/activities/' + activityId + '/streams/time,latlng,distance,altitude?access_token=' + accessToken,
    method: 'GET'
  },
  function(response) {
    var data = '';
    response.on('data', function(chunk) {
      data += chunk;
    });
    response.on('end', function() {
      handleStreams(JSON.parse(data), callback);
    });
  })
  .on('error', function(err) {
    callback(err);
  })
  .end();
};

function handleStreams(streams, callback) {
  // extract the named streams (in an array at the moment, not sure of order)
  var latlng = null;
  var time = null;
  var distance = null;
  var altitude = null;
  streams.forEach(function(stream) {
    if (stream.type == "latlng") {
      latlng = stream.data;
    }
    else if (stream.type == "time") {
      time = stream.data;
    }
    else if (stream.type == "distance") {
      distance = stream.data;
    }
    else if (stream.type == "altitude") {
      altitude = stream.data;
    }
  });

  if (latlng == null || time == null) {
    return callback('no position or time data');
  }

  var results = [ ];
  var count = streams[0].original_size;
  for (var i = 0; i < count; i++) {
    var coordinate = latlng[i];
    var point = {
      lat: coordinate[0],
      lon: coordinate[1],
      time: time[i],
    };
    if (distance != null) {
      point.distance = distance[i];
    }
    if (altitude != null) {
      point.altitude = altitude[i];
    }
    results.push(point);
  }

  callback(null, results);
}

