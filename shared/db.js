var mongodb = require('mongodb').MongoClient;

var db = null;
var collection;

module.exports.connect = function(config, callback) {
  console.log('connecting to db: ' + config.db.connectionString);
  mongodb.connect(config.db.connectionString, function(err, newConnection) {
    if (err) {
      return callback(err);
    }
    console.log('connected to db');
    db = newConnection;
    collection = db.collection('activities');
    callback();
  });
}

module.exports.disconnect = function() {
  if (db != null) {
    console.log('closing db connection');
    db.close();
    db = null;
  }
}

// - one table for activities, that should be it, unique constraint on athlete + activity.

module.exports.retrieveLatestId = function(details, callback) {
  var hackTarget = 3;
  if (hackTarget > 1) {
    console.log('>>>>>> TODO: REMOVE HACK TARGET <<<<<<');
  }
  collection.find({ athleteId: details.id }, { activityId: 1 }).sort({ activityId: -1 }).limit(hackTarget).toArray(function(err, results) {
    if (err) {
      console.log('ERROR: db: could not retrieve latest id: ' + err);
      return callback(err);
    }
    if (results.length < hackTarget) {
      console.log('db: no activities for athlete id: ' + details.id);
      callback(null, 0);
    }
    else {
      console.log('db: athlete id: ' + details.id + ', latest activity id: ' + results[0].activityId);
      callback(null, results[hackTarget - 1].activityId);
    }
  });
};

module.exports.retrieveActivities = function(userId) {
  // TODO: return any cached results, for now assuming none
  return [ ];
};

module.exports.insertActivity = function(activity) {
  console.log('inserting activity: athleteId: ' + activity.athleteId + ', activityId: ' + activity.activityId + ', name: ' + activity.name);

  key = {
    athleteId: activity.athleteId,
    activityId: activity.activityId,
  };

  // strip out the guid before saving the activity
  data = activity;
  delete data.guid;

  options = {
    upsert: true,
  };

  collection.update(key, data, options, function(err, recordsModified, status) {
    if (err) {
      console.log('ERROR: problem saving activity: ' + err);
    }
    else {
      console.log('activity saved: recordsModified: ' + recordsModified + ', status: ' + JSON.stringify(status));
    }
  });
};

