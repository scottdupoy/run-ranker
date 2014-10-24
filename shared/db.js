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

module.exports.retrieveLatestId = function(details) {
  // TODO: START HERE: make the whole function async and return the result!
  collection.find({ athleteId: details.id }, { activityId: 1 }).sort({ activityId: -1 }).limit(1).toArray(function(err, results) {
    if (err) {
      // TODO: what should happen here? message via bridge and abort?
      return console.log('ERROR: ' + err);
    }
    if (results.length == 0) {
      console.log('NO RESULTS: NEED TO START AT 1!');
    }
    else {
      console.log('RESULT: NEED TO START AT ID: ' + results[0].activityId);
    }
  });

  console.log('>>>> STOP THE HARD-CODED ACTIVITY ID <<<<');
  return 209903142;
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

