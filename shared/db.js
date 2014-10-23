
module.exports.retrieveLatestId = function(details) {
  // TODO: just stubbing out for now, need to retrieve and insert the details if unavailable
  return 209903142;
};

module.exports.retrieveActivities = function(userId) {
  // TODO: return any cached results, for now assuming none
  return [ ];
};

module.exports.insertActivity = function(activity) {
  // TODO
  console.log('TODO: INSERT ACTIVITY');
  console.log('  guid:                  ' + activity.guid);
  console.log('  athleteId              ' + activity.athleteId);
  console.log('  activityId:            ' + activity.activityId);
  console.log('  activity.name:         ' + activity.name);
  console.log('  activity.distanceInKm: ' + activity.distanceInKm);
  console.log('  activity.movingTime:   ' + activity.movingTime);
  console.log('  activity.elapsedTime:  ' + activity.elapsedTime);
  console.log('  activity.startDate     ' + activity.startDate);
};

