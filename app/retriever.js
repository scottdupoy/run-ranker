var db = require('./db');
var stravaApi = require('./stravaApi');
  //    - inform client of # of analysis to be done
//var tempFs = require('fs');

// really these would be user specific and retrieved from the database.
// there would probably be less than this amount.
var distances = [
  { id: 1, distance: 400, name: "400 m", type: "metric" },
  { id: 2, distance: 1000, name: "1 km", type: "metric" },
  { id: 3, distance: 5000, name: "5 km", type: "metric" },
  { id: 4, distance: 10000, name: "10 km", type: "metric" },
  { id: 5, distance: 804.672, name: "0.5 miles", type: "imperial" },
  { id: 6, distance: 1609.344, name: "1 mile", type: "imperial" },
  { id: 7, distance: 3218.688, name: "2 miles", type: "imperial" },
  { id: 8, distance: 8046.72, name: "5 miles", type: "imperial" },
  { id: 9, distance: 16093.44, name: "10 miles", type: "imperial" },
  { id: 10, distance: 21097.494, name: "Half marathon", type: "general" },
];

module.exports.retrieve = function(config, bridge, messaging, details) {
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

  var latestId = db.retrieveLatestId(details);
  bridge.send(details.guid, 'log', 'retrieving acts later than ' + latestId);
  
  var results = stravaApi.retrieveLatestActivities(config, details.access_token, latestId, function(err, newActivities) {
    if (err) {
      console.log('ERROR: could not retrieve activities: ' + err);
      bridge.send(details.guid, 'log', 'ERROR: could not retrieve activities: ' + err);
      return;
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
          distances: distances,
          points: points,
        };

        messaging.publishAnalysisRequest(request);
      });
    });
  });
};

