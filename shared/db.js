var mongodb = require('mongodb').MongoClient;

function Db(config) {
  this.config = config;
  this.db = null;
  this.collection = null;
}

Db.prototype.connect = function(callback) {
  console.log('connecting to db: ' + this.config.db.connectionString);
  var that = this;
  mongodb.connect(this.config.db.connectionString, function(err, newConnection) {
    if (err) {
      return callback(err);
    }
    console.log('connected to db');
    that.db = newConnection;
    that.collection = that.db.collection('activities');
    callback();
  });
}

Db.prototype.disconnect = function() {
  if (this.db != null) {
    console.log('closing db connection');
    this.db.close();
    this.db = null;
  }
}

// - one table for activities - TODO: unique constraint on athlete + activity.
// - will need another table on user preferences (units, distances, net descents, etc)

Db.prototype.retrieveLatestActivityId = function(athleteId, callback) {
  var hackTarget = 3;
  if (hackTarget > 1) {
    console.log('>>>>>> TODO: REMOVE HACK TARGET <<<<<<');
  }
  this.collection.find({ athleteId: athleteId }, { activityId: 1 }).sort({ activityId: -1 }).limit(hackTarget).toArray(function(err, results) {
    if (err) {
      console.log('ERROR: db: could not retrieve latest id: ' + err);
      return callback(err);
    }
    if (results.length < hackTarget) {
      // trigger a full reload
      console.log('db: no activities for athlete id: ' + athleteId);
      callback(null, 0);
    }
    else {
      console.log('db: athlete id: ' + athleteId + ', latest activity id: ' + results[0].activityId);
      callback(null, results[hackTarget - 1].activityId);
    }
  });
};

Db.prototype.retrieveActivities = function(userId) {
  // TODO: return all db results (cache will already have been checked)
  return [ ];
};

Db.prototype.insertActivity = function(activity) {
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

  this.collection.update(key, data, options, function(err, recordsModified, status) {
    if (err) {
      console.log('ERROR: problem saving activity: ' + err);
    }
    else {
      console.log('activity saved: recordsModified: ' + recordsModified + ', status: ' + JSON.stringify(status));
    }
  });
};

Db.prototype.deleteAllActivities = function(athleteId, callback) {
  this.collection.remove({ athleteId: athleteId }, callback);
};

module.exports = Db;
