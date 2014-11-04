var Athlete = require('./athlete');

// TODO:
//  - cache should have db handle so it can retrieve athlete details
//    when a new athlete is encountered by the cache. for now just wrap
//    the athleteId in a details object.
//  - add timer to flush out unaccessed athlete objects periodically

function Cache(bridge) {
  this.bridge = bridge;
  this.map = { };
}

Cache.prototype.getAthlete = function(athleteId) {
  if (athleteId in this.map) {
    return this.map[athleteId];
  }
  var athlete = new Athlete({ athleteId: athleteId }, this.bridge);
  this.map[athleteId] = athlete;
  return athlete;
};

module.exports = Cache;

