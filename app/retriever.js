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
  console.log('retrieving data: athleteId: ' + details.athleteId + ', accessToken: ' + details.accessToken);
  var that = this;
  
  var newActivityCallback = function(err, newActivity) {
    if (err) {
      return that.controller.handleRetrieveActivitiesError(details.athleteId, err);
    }

    // pass the new activity back to the controller, stop if it's a manual activity
    newActivity.athleteId = details.athleteId;
    that.controller.handleNewActivity(newActivity);
    if (newActivity.manual) {
      return;
    }

    // gps activity, so retrieve the gps data streams
    that.stravaApi.retrieveActivityStream(details.accessToken, newActivity.activityId, function(err, points) {
      if (err) {
        return that.controller.handleRetrieveActivityStreamError(details.athleteId, err);
      }
      
      // just a state update
      that.controller.handleNewActivityStream(details.athleteId, newActivity.id);

      // send to analyser (separate c++ process):
      var request = {
        guid: details.guid,
        athleteId: details.athleteId,
        activityId: newActivity.activityId,
        name: newActivity.name,
        movingTime: newActivity.movingTime,
        elapsedTime: newActivity.elapsedTime,
        distanceInKm: newActivity.distanceInKm,
        startDate: newActivity.startDate,
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

