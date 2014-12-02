
// TODO:
//  - add last checked timestamp so we don't do a check every time
//    the landing page is refreshed (should come from db ultimately)
//  - add last accessed timestamp so we can periodically clear out
//    old ones and keep memory usage under control
//  - add user preference settings (units, distances to display, etc)

var checkLimitInSeconds = 30;

function Athlete(details, bridge, distances) {
  this.details = details;
  this.bridge = bridge;
  this.distances = distances;

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
    activity.new = false;
    that.activities[activity.activityId] = activity;
  });
  this.haveDatabaseActivities = true;
  this.checkIfFinishedChecking();
  this.sendStateUpdate();
};

Athlete.prototype.addNewActivity = function(activity) {
  activity.new = true;
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
  activity.new = true;
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
  this.bridge.send(this.details.athleteId, 'error', 'ERROR: ' + err);
}

// can be called upon connection in case a check is already in progress
Athlete.prototype.sendStateUpdate = function() {
  // TODO: send a data structure under a different key
  // TODO: send the activities (not all the data points, however) when finished
  //       checking
  this.bridge.send(this.details.athleteId, 'state', JSON.stringify({
    athleteId: this.details.athleteId,
    activityCount: Object.keys(this.activities).length,
    checkInProgress: this.checking,
    haveDatabaseActivities: this.haveDatabaseActivities,
    haveAllNewActivities: this.haveAllNewActivities,
    newGpsActivities: this.newGpsActivities,
    newManualActivities: this.newManualActivities,
    activitiesBeingAnalysed: this.activitiesBeingAnalysed,
  }));

  this.bridge.send(this.details.athleteId, 'log',
    'state: athleteId: ' + this.details.athleteId + 
    ', activities: ' + Object.keys(this.activities).length +
    ', checking: ' + this.checking +
    ', db: ' + this.haveDatabaseActivities +
    ', all new: ' + this.haveAllNewActivities + 
    ', new gps: ' + this.newGpsActivities +
    ', new manual: ' + this.newManualActivities +
    ', being analysed: ' + this.activitiesBeingAnalysed);

  if (this.checking) {
    return;
  }

  // temp test code when check finished
  var that = this;
  var activityIds = Object.keys(this.activities);
  Object.keys(this.activities).forEach(function(activityId) {
    var activity = that.activities[activityId];
    if (!activity.new) {
      return;
    }
    var distanceInMiles = convertToMiles(activity.distanceInKm);
    that.bridge.send(that.details.athleteId, 'log', '  new activity:');
    that.bridge.send(that.details.athleteId, 'log', '    activityId:      ' + activity.activityId);
    that.bridge.send(that.details.athleteId, 'log', '    name:            ' + activity.name);
    that.bridge.send(that.details.athleteId, 'log', '    distanceInMiles: ' + roundFloat(distanceInMiles, 3));
    that.bridge.send(that.details.athleteId, 'log', '    pacePerMile:     ' + formatTime(activity.movingTime / distanceInMiles));
    that.bridge.send(that.details.athleteId, 'log', '    distanceInKm:    ' + roundFloat(activity.distanceInKm, 3));
    that.bridge.send(that.details.athleteId, 'log', '    pacePerKm:       ' + formatTime(activity.movingTime / activity.distanceInKm));
    if (activity.manual) {
      return;
    }
    activity.bestEfforts.forEach(function(bestEffort) {
      var effortInKm = bestEffort.distance.distanceInKm;
      var effortInMiles = convertToMiles(effortInKm);
      var duration = bestEffort.effort.duration;
      that.bridge.send(that.details.athleteId, 'log', '      best effort:');
      that.bridge.send(that.details.athleteId, 'log', '        name:            ' + bestEffort.distance.name);
      that.bridge.send(that.details.athleteId, 'log', '        duration:        ' + formatTime(duration));
      //that.bridge.send(that.details.athleteId, 'log', '        distanceInMiles: ' + roundFloat(effortInMiles, 3));
      //that.bridge.send(that.details.athleteId, 'log', '        distanceInKm:    ' + roundFloat(effortInKm, 3));
      that.bridge.send(that.details.athleteId, 'log', '        pacePerMile:     ' + formatTime(duration / effortInMiles));
      that.bridge.send(that.details.athleteId, 'log', '        pacePerKm:       ' + formatTime(duration / effortInKm));
    });
  });

  this.bridge.send(this.details.athleteId, 'data', JSON.stringify(this.projectData()));
};

Athlete.prototype.projectData = function() {
  // order will be somewhat random
  var projectedResults = {
    distances: this.distances.distances,
    activities: [ ],
  };

  var that = this;
  // TODO: add distances summaries to data payload 
  Object.keys(this.activities).forEach(function(activityId) {
    var activity = that.activities[activityId];

    var projection = {
      activityId: activity.activityId,
      name: activity.name,
      new: activity.new,
      manual: activity.manual,
      distanceInKm: activity.distanceInKm,
      elapsedTime: activity.elapsedTime,
      movingTime: activity.movingTime,
      date: activity.startDate,
    };

    activity.new = false;

    if (!activity.manual) {
      projection.bestEfforts = [ ];
      projection.manual = false;
      activity.bestEfforts.forEach(function(bestEffort) {
        projection.bestEfforts.push({
          distanceId: bestEffort.distance.id,
          duration: bestEffort.effort.duration,
        });
      });
    }

    projectedResults.activities.push(projection);
  });
  return projectedResults;
};

// TODO: these are for the UI:

function convertToMiles(km) {
  return km * 0.621371192;
}

function roundFloat(value, numberOfDecimalPlaces) {
  var scale = Math.pow(10, numberOfDecimalPlaces);
  return Math.round(value * scale) / scale;
}

function formatTime(seconds) {
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var seconds = Math.floor(seconds % 60);
  return padLeftZeroes(hours) + ':' + padLeftZeroes(minutes) + ':' + padLeftZeroes(seconds);
}

function padLeftZeroes(i) {
  if (i >= 10) {
    return '' + i;
  }
  return '0' + i;
}

module.exports = Athlete;

