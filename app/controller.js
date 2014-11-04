var Cache = require('./cache');

function Controller(bridge, db) {
  this.bridge = bridge;
  this.db = db;
  this.cache = new Cache(this.bridge);
}

Controller.prototype.set = function(retriever, messaging) {
  this.retriever = retriever;
  this.messaging = messaging;
};

Controller.prototype.handleNewConnection = function(details) {
  details.guid = this.bridge.connect(details.athleteId);
  console.log('controller: new connection: athleteId: ' + details.athleteId + ' => ' + details.guid);

  var athlete = this.cache.getAthlete(details.athleteId);
  if (!athlete.canCheck()) {
    athlete.sendStateUpdate();
    return details.guid;
  }

  athlete.setAsChecking();

  // kick of async latest activity id retrieval which chains the full retrieval
  var that = this;
  this.db.retrieveLatestActivityId(details.athleteId, function(err, latestId) {
    if (err) {
      return athlete.checkFailed('database latest id retrieval: ' + err);
    }
    that.retriever.retrieve(details, latestId);
  });

  // kick off async database lookup of activities if not already loaded
  if (!athlete.haveDatabaseActivities) {
    this.db.retrieveActivities(details.athleteId, function(err, activities) {
      if (err) {
        return athlete.checkFailed('database activity retrieval: ' + err);
      }
      athlete.addDatabaseActivities(activities);
    });
  }
  return details.guid;
};

Controller.prototype.handleRetrieveActivitiesError = function(athleteId, err) {
  this.cache.getAthlete(athleteId).checkFailed('retrieve activities failed: ' + err);
};

Controller.prototype.handleRetrieveActivityStreamError = function(athleteId, err) {
  this.cache.getAthlete(athleteId).checkFailed('retrieve activity stream failed: ' + err);
};

Controller.prototype.handleNewActivity = function(activity) {
  console.log('controller: new activity: ' + activity.athleteId + ' / ' + activity.id + ' => ' + activity.name);
  this.cache.getAthlete(activity.athleteId).addNewActivity(activity);

  if (activity.manual) {
    // publish a message so the db-writer inserts this activity
    // note: could do this in-process but trying to keep things fast so delegate responsibility
    this.messaging.publishNewManualActivity(activity);
  }
};

Controller.prototype.handleNewActivityStream = function(athleteId, activityId) {
  console.log('controller: new activity stream notification: ' + athleteId + ' / ' + activityId);
  // could add state in Athlete, but not doing this yet
};

Controller.prototype.handleAllNewActivitiesIdentified = function(athleteId) { 
  console.log('controller: all new activities identified for: ' + athleteId);
  this.cache.getAthlete(athleteId).allNewActivitiesAdded();
};

Controller.prototype.handleAnalysisResult = function(result) {
  console.log('controller: analysis result: ' + result.athleteId + ' / ' + result.activityId + ' - ' + result.name);
  this.cache.getAthlete(result.athleteId).addAnalysedActivity(result);
};

module.exports = Controller;

