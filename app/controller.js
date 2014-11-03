
function Controller(bridge) {
  this.bridge = bridge;
}

Controller.prototype.set = function(retriever) {
  this.retriever = retriever;
};

Controller.prototype.handleNewConnection = function(details) {
  // details.athleteId
  // details.accessToken
  details.guid = this.bridge.connect(details.athleteId);
  console.log('controller: new connection: athleteId: ' + details.athleteId + ' => ' + details.guid);
  this.retriever.retrieve(details);
  return details.guid;
};

Controller.prototype.handleRetrieveActivitiesError = function(athleteId, err) {
  // TODO
  console.log('TODO: ERROR: controller: handleRetrieveActivitiesError: ' + athleteId + ', ' + err);
};

Controller.prototype.handleRetrieveActivityStreamError = function(athleteId, err) {
  // TODO
  console.log('TODO: ERROR: controller: handleRetrieveActivityStreamError: ' + athleteId + ', ' + err);
};

Controller.prototype.handleNewActivity = function(newActivity) {
  // TODO
  console.log('TODO: controller: new activity: ' + newActivity.athleteId + ' / ' + newActivity.id + ' => ' + newActivity.name);
};

Controller.prototype.handleNewActivityStream = function(athleteId, activityId) {
  // TODO
  console.log('TODO: controller: new activity stream notification: ' + athleteId + ' / ' + activityId);
};

Controller.prototype.handleAllNewActivitiesIdentified = function(athleteId) { 
  // TOOD
  console.log('TODO: controller: all new activities identified for: ' + athleteId);
};

Controller.prototype.handleAnalysisResult = function(result) {
  var that = this;
  console.log('controller: analysis result: ' + result.athleteId + ' / ' + result.activityId + ' - ' + result.name);
  that.bridge.send(result.athleteId, 'log', 'analysis completed: ' + result.name);
  result.bestEfforts.forEach(function(bestEffort) {
    that.bridge.send(result.athleteId, 'log', '  ' + bestEffort.distance.name + ' = ' + bestEffort.effort.duration);
  });
};

module.exports = Controller;

