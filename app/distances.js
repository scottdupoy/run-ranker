function Distances(db) {
  this.db = db;
  this.distances = [ ];
}

Distances.prototype.load = function(callback) {
  var that = this;
  this.db.retrieveDistances(function(err, results) {
    that.distances = results;
    console.log('distances: loaded ' + that.distances.length + ' distances from db');
    callback(err);
  });
};

module.exports = Distances;

