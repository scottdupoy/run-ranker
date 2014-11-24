function Retriever(stravaApi, messaging, controller, distances) {
  this.stravaApi = stravaApi;
  this.messaging = messaging;
  this.controller = controller;
  this.distances = distances;
}

Retriever.prototype.retrieve = function(details, latestId, distances) {
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

