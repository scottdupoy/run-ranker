var mongodb = require('mongodb').MongoClient;

// Schema:
// - activities
// - distances

// TODO:
// - unique constraint on athleteId + activityId
// - index on athleteId and maybe activityId
// - will need another table on user preferences (units, distances, net descents, etc)

function Db(config) {
  this.config = config;
  this.db = null;
  this.activities = null;
  this.distances = null;
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
    that.activities = that.db.collection('activities');
    that.distances = that.db.collection('distances');
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

Db.prototype.retrieveLatestActivityId = function(athleteId, callback) {
  var hackTarget = 5;
  if (hackTarget > 1) {
    console.log('>>>>>> TODO: REMOVE HACK TARGET <<<<<<');
  }
  this.activities.find({ athleteId: athleteId }, { activityId: 1 }).sort({ activityId: -1 }).limit(hackTarget).toArray(function(err, results) {
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

Db.prototype.retrieveActivities = function(athleteId, callback) {
  this.activities.find({ athleteId: athleteId }).toArray(function(err, activities) {
    if (err) {
      return callback(err);
    }
    callback(null, activities);
  });
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

  this.activities.update(key, data, options, function(err, recordsModified, status) {
    if (err) {
      // TODO: this should get bubbled up
      console.log('ERROR: problem saving activity: ' + err);
    }
    else {
      console.log('activity saved: recordsModified: ' + recordsModified + ', status: ' + JSON.stringify(status));
    }
  });
};

Db.prototype.deleteAllActivities = function(athleteId, callback) {
  this.activities.remove({ athleteId: athleteId }, callback);
};

Db.prototype.insertDistance = function(distance, callback) {
  console.log('inserting distance: id: ' + distance.id + ', distanceInKm: ' + distance.distanceInKm + ', name: ' + distance.name + ', type: ' + distance.type);
  this.distances.update({ id: distance.id }, distance, { upsert: true }, callback);
};

Db.prototype.retrieveDistances = function(callback) {
  console.log('retrieving distances');
  var that = this;
  this.distances.find().toArray(function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, results);
  });
};

module.exports = Db;

