
// TODO:
//  - add last checked timestamp so we don't do a check every time
//    the landing page is refreshed (should come from db ultimately)
//  - add last accessed timestamp so we can periodically clear out
//    old ones and keep memory usage under control
//  - add user preference settings (units, distances to display, etc)

var checkLimitInSeconds = 30;

function Athlete(details, bridge) {
  this.details = details;
  this.bridge = bridge;

  this.activities = { }; // keyed on activityId

  this.checking = false;
  this.checkTimestamp = 0;
  this.haveDatabaseActivities = false;
};

Athlete.prototype.setAsChecking = function() {
  console.log('athlete: setAsChecking');
  this.haveAllNewActivities = false;
  this.newGpsActivities = 0;
  this.newManualActivities = 0;
  this.activitiesBeingAnalysed = 0;
  this.checkTimestamp = Date.now();
  this.checking = true;
};

Athlete.prototype.canCheck = function() {
  if (this.checking) {
    console.log('athlete: canCheck: false, already checking');
    return false;
  }
  if (this.checkTimestamp == 0) {
    console.log('athlete: canCheck: true, not checked yet');
    return true;
  }
  var secondsSinceLastCheck = Math.round((Date.now() - this.checkTimestamp) / 1000);
  if (secondsSinceLastCheck < checkLimitInSeconds) {
    console.log('athlete: canCheck: false, only ' + secondsSinceLastCheck + ' seconds since last check');
    return false;
  }
  console.log('athlete: canCheck: true, ' + secondsSinceLastCheck + ' seconds since last check');
  return true;
}

Athlete.prototype.addDatabaseActivities = function(databaseActivities) {
  var that = this;
  databaseActivities.forEach(function(activity) {
    that.activities[activity.activityId] = activity;
  });
  this.haveDatabaseActivities = true;
  this.checkIfFinishedChecking();
  this.sendStateUpdate();
};

Athlete.prototype.addNewActivity = function(activity) {
  this.activities[activity.activityId] = activity;
  if (activity.manual) {
    this.newManualActivities++;
  }
  else {
    this.newGpsActivities++;
    this.activitiesBeingAnalysed++;
  }
  this.sendStateUpdate();
};

Athlete.prototype.allNewActivitiesAdded = function() {
  this.haveAllNewActivities = true;
  this.checkIfFinishedChecking();
  this.sendStateUpdate();
};

Athlete.prototype.addAnalysedActivity = function(activity) {
  // overwrite the activity (from before it was analyse)
  this.activities[activity.activityId] = activity;
  this.activitiesBeingAnalysed--;
  this.checkIfFinishedChecking();
  this.sendStateUpdate();
};

Athlete.prototype.checkIfFinishedChecking = function() {
  if (this.haveDatabaseActivities && this.haveAllNewActivities && this.activitiesBeingAnalysed == 0) {
    console.log('athlete: check completed: ' + this.details.athleteId);
    this.checking = false;
  }
};

Athlete.prototype.checkFailed = function(err) {
  // TODO: switch this to an error key
  this.checking = false;
  this.bridge.send(this.details.athleteId, 'log', 'ERROR: ' + err);
}

// can be called upon connection in case a check is already in progress
Athlete.prototype.sendStateUpdate = function() {
  // TODO: send a data structure under a different key
  // TODO: send the activities (not all the data points, however) when finished
  //       checking
  this.bridge.send(this.details.athleteId, 'log',
    'state: athleteId: ' + this.details.athleteId + 
    ', activities: ' + Object.keys(this.activities).length +
    ', checking: ' + this.checking +
    ', db: ' + this.haveDatabaseActivities +
    ', all new: ' + this.haveAllNewActivities + 
    ', new gps: ' + this.newGpsActivities +
    ', new manual: ' + this.newManualActivities +
    ', being analysed: ' + this.activitiesBeingAnalysed);
};

module.exports = Athlete;

