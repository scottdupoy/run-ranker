var https = require('https');
var perPage = 5;

function StravaApi(config) {
  this.config = config;
}

StravaApi.prototype.getAccessToken = function(code, callback) {
  var path = '/oauth/token?client_id=' + this.config.strava.clientId + '&client_secret=' + this.config.strava.clientSecret + '&code=' + code;
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

StravaApi.prototype.retrieveActivities = function(accessToken, latestId, callback, completedCallback) {
  retrieveActivitiesPage(accessToken, latestId, 1, callback, completedCallback);
};

function retrieveActivitiesPage(accessToken, latestId, page, callback, completedCallback) {
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
      console.log('TODO: stravaApi: don\'t do much filtering here, let the controller do it...');
      console.log('TODO: stravaApi: add full re-retrieval / check');
      var activities = JSON.parse(data);
      var newActivityRetrieved = false;
      activities.forEach(function (activity) {
        // TODO: send new gps (and manual) activities to the mediator
        // TODO: less filtering here
        //console.log('TODO: send new gps (and manual) activities to the mediator');
        newActivityRetrieved |= (activity.id > latestId);
        if (activity.type == "Run"
          && activity.id > latestId
          && !activity.trainer
          && !activity.manual
          && !activity.flagged
          && !activity.private) {
          console.log('  new run:      ' + activity.id + ' => ' + activity.name);
          callback(null, {
            id: activity.id,
            name: activity.name,
            distanceInKm: activity.distance / 1000.0,
            moving_time: activity.moving_time,
            elapsed_time: activity.elapsed_time,
            start_date: activity.start_date_local,
          });
        }
      });

      // stop if there are less than the perPage amount of activities
      console.log('stravaApi: retrieved ' + activities.length + ' / ' + perPage + ' results');
      if (newActivityRetrieved) {
        console.log('stravaApi: retrieving next page');
        retrieveActivitiesPage(accessToken, latestId, page + 1, callback);
      }

      if (activities.length < perPage) {
        console.log('stravaApi: calling completedCallback');
        completedCallback();
      }
    });
  })
  .on('error', function(err) {
    callback(err);
  })
  .end();
};

StravaApi.prototype.retrieveActivityStream = function(accessToken, activityId, callback) {
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

module.exports = StravaApi;

