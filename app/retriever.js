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

function Retriever(stravaApi, messaging, controller) {
  this.stravaApi = stravaApi;
  this.messaging = messaging;
  this.controller = controller;
}

Retriever.prototype.retrieve = function(details, latestId) {
  console.log('retrieving data:');
  console.log('  guid:        ' + details.guid);
  console.log('  athleteId:   ' + details.athleteId);
  console.log('  accessToken: ' + details.accessToken);

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

  var that = this;
  
  var newActivityCallback = function(err, newActivity) {
    if (err) {
      return that.controller.handleRetrieveActivitiesError(details.athleteId, err);
    }

    // pass the new activity back to the controller
    newActivity.athleteId = details.athleteId;
    that.controller.handleNewActivity(newActivity);

    // TODO: conditionalise this so we can handle manual activities
    console.log('TODO: retriever: conditionalise stream retrievals for gps activities only');

    that.stravaApi.retrieveActivityStream(details.accessToken, newActivity.id, function(err, points) {
      if (err) {
        return that.controller.handleRetrieveActivityStreamError(details.athleteId, err);
      }
      
      // just a state update
      that.controller.handleNewActivityStream(details.athleteId, newActivity.id);

      // send to analyser (separate c++ process):
      var request = {
        guid: details.guid,
        athleteId: details.athleteId,
        activityId: newActivity.id,
        name: newActivity.name,
        movingTime: newActivity.moving_time,
        elapsedTime: newActivity.elapsed_time,
        distanceInKm: newActivity.distanceInKm,
        startDate: newActivity.start_date,
        distances: distances,
        points: points,
      };

      that.messaging.publishAnalysisRequest(request);
    });
  };

  var retrieveActivitiesCompletedCallback = function() {
    that.controller.handleAllNewActivitiesIdentified(details.athleteId);
  };

  this.stravaApi.retrieveActivities(details.accessToken, latestId, newActivityCallback, retrieveActivitiesCompletedCallback);
};

module.exports = Retriever;

