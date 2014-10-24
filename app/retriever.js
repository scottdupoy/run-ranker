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

  // - LATER: check db for user
  //    - LATER: if not there then add

  // - LATER: check db for acts (for now stub out and issue a last retrieved act id)
  //    - LATER: immediately return the results that we know about. on ui provide a dialogue 
  //             and option to close it and review the data that's already there

  // - check api for acts summary

  // - foreach new act
  //    - retrieve data points
  //    - send message to analyser
  //    - forward high-level analysis results to client

  bridge.send(details.guid, 'log', 'retrieving latest activity id for athleteId: ' + details.id);
  db.retrieveLatestId(details, function(err, latestId) {
    if (err) {
      return bridge.send(details.guid, 'log', 'ERROR: problem retrieving latest activity id for athlete ' + details.id + ' - ' + err);
    }

    bridge.send(details.guid, 'log', 'retrieving acts later than ' + latestId);
    var results = stravaApi.retrieveLatestActivities(config, details.access_token, latestId, function(err, newActivities) {
      if (err) {
        console.log('ERROR: could not retrieve activities: ' + err);
        return bridge.send(details.guid, 'log', 'ERROR: could not retrieve activities: ' + err);
      }

      if (newActivities.length == 0) {
        return bridge.send(details.guid, 'log', 'no new acts - finished.');
      }

      bridge.send(details.guid, 'log', 'identified ' + newActivities.length + ' new acts - processing them');

      // process for analysis could be:
      //  - have an _.after call to collate all the results
      //  - foreach over each one
      //     - https request for each individual activity
      //     - in handler then we fire it to analyser (which may be in process for the first iteration moment)

      // haven't really factored in db writes or where they'll happen yet. could be downstream
      // node process picking up the analysis completion events. would be a window of re-processing
      // race condition but risk and impact is low.

      newActivities.forEach(function(newActivity) {
        stravaApi.retrieveActivityStream(config, details.access_token, newActivity.id, function(err, points) {
          if (err) {
            console.log('ERROR: could not retrieve activity stream: ' + err);
            bridge.send(details.guid, 'log', 'ERROR: could not retrieve activity stream: ' + err);
            // TODO: still need to call _.after completed callback on failure
            return;
          }
          
          console.log('retrieved stream data for activity: ' + newActivity.id + ' => ' + points.length + ' points => ' + newActivity.name);
          bridge.send(details.guid, 'log', 'retrieved stream data for activity: ' + newActivity.id + ' => ' + points.length + ' points => ' + newActivity.name);

          // send to analyser (c++ process):
          // TODO: result of that process calling _.after callback to coordinate all
          //       the results at the end
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
  });
};

