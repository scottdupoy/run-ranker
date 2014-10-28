var stravaApi = require('./stravaApi');

// really these would be user specific and retrieved from the database.
// there would probably be less than this amount.
var distances = [
  { id: 1, distanceInKm: 0.4, name: "400 m", type: "metric" },
  { id: 2, distanceInKm: 1, name: "1 km", type: "metric" },
  { id: 3, distanceInKm: 5, name: "5 km", type: "metric" },
  { id: 4, distanceInKm: 10, name: "10 km", type: "metric" },
  { id: 5, distanceInKm: 0.804672, name: "0.5 miles", type: "imperial" },
  { id: 6, distanceInKm: 1.609344, name: "1 mile", type: "imperial" },
  { id: 7, distanceInKm: 3.218688, name: "2 miles", type: "imperial" },
  { id: 8, distanceInKm: 8.04672, name: "5 miles", type: "imperial" },
  { id: 9, distanceInKm: 16.09344, name: "10 miles", type: "imperial" },
  { id: 10, distanceInKm: 21.097494, name: "Half marathon", type: "general" },
];

module.exports.retrieve = function(config, bridge, messaging, db, details) {
  console.log('retrieving data:');
  console.log('  id:           ' + details.id);
  console.log('  guid:         ' + details.guid);
  console.log('  access_token: ' + details.access_token);
  bridge.send(details.guid, 'log', 'checking for new data');

  // - LATER: check db for acts (for now stub out and issue a last retrieved act id)
  // - LATER: immediately return the results that we know about. on ui provide a dialogue 
  //          and option to close it and review the data that's already there

  // need some mediating object on athleteId
  //  - will need to know if a check was made recently
  //  - will need to know if activity analyses are pending
  //  - will need to bring pending results back together and notify the ui
  //  - will need to notify ui when all pending results are in and pull everything back together
  //  - will need to harmonise multiple browser sessions for the same athlete (will the access tokens conflict? - prob not)
  // for now am just firing and forgetting the analysis requests. the bridge still delivers to the ui session
  // but doesn't know how many results its expecting.

  bridge.send(details.guid, 'log', 'retrieving latest activity id for athleteId: ' + details.id);
  db.retrieveLatestId(details, function(err, latestId) {
    if (err) {
      return bridge.send(details.guid, 'log', 'ERROR: problem retrieving latest activity id for athlete ' + details.id + ' - ' + err);
    }

    bridge.send(details.guid, 'log', 'retrieving acts later than ' + latestId);

    var results = stravaApi.retrieveLatestActivities(config, details.access_token, latestId, function(err, newActivity) {
      if (err) {
        console.log('ERROR: problem retrieving activities: ' + err);
        return bridge.send(details.guid, 'log', 'ERROR: could not retrieve activities: ' + err);
      }

      // TODO: notify mediator that there is a new activity

      // leaving this commented as a reminder that a mechanism is needed to indicate all results have been
      // identified and so just need to wait for any [remaining] pending results to come in.
      //if (newActivities.length == 0) {
      //  return bridge.send(details.guid, 'log', 'no new acts - finished.');
      //}

      stravaApi.retrieveActivityStream(config, details.access_token, newActivity.id, function(err, points) {
        if (err) {
          // TODO: still need to mark an activity as not pending any more
          console.log('ERROR: could not retrieve activity stream: ' + err);
          bridge.send(details.guid, 'log', 'ERROR: could not retrieve activity stream: ' + err);
          return;
        }
        
        console.log('retrieved stream data for activity: ' + newActivity.id + ' => ' + points.length + ' points => ' + newActivity.name);
        bridge.send(details.guid, 'log', 'retrieved stream data for activity: ' + newActivity.id + ' => ' + points.length + ' points => ' + newActivity.name);

        // send to analyser (separate c++ process):
        var request = {
          guid: details.guid,
          athleteId: details.id,
          activityId: newActivity.id,
          name: newActivity.name,
          movingTime: newActivity.moving_time,
          elapsedTime: newActivity.elapsed_time,
          distanceInKm: newActivity.distanceInKm,
          startDate: newActivity.start_date,
          distances: distances,
          points: points,
        };

        messaging.publishAnalysisRequest(request);
      });
    });
  });
};

