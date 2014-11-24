var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');
var _ = require('underscore');

console.log('seeding distance data');

var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'config.yaml'), 'utf8'));
var db = new (require('../shared/db'))(config);

var distances = [
  { id: 1, distanceInKm: 0.4, name: "400 m", type: "metric" },
  { id: 2, distanceInKm: 1, name: "1 km", type: "metric" },
  { id: 3, distanceInKm: 5, name: "5 km", type: "metric" },
  { id: 4, distanceInKm: 10, name: "10 km", type: "metric" },
  { id: 5, distanceInKm: 0.804672, name: "0.5 miles", type: "imperial" },
  { id: 6, distanceInKm: 1.609344, name: "1 mile", type: "imperial" },
  { id: 7, distanceInKm: 3.218688, name: "2 miles", type: "imperial" },
  { id: 8, distanceInKm: 8.04672, name: "5 miles", type: "imperial" },
  { id: 9, distanceInKm: 16.09344, name: "10 miles", type: "imperial" },
  { id: 10, distanceInKm: 21.097494, name: "Half marathon", type: "general" },
];

db.connect(function(err) {
  if (err) {
    console.log("ERROR: couldn't connect to the db: " + err);
    return;
  }
  
  // do the inserts and schedule a check when they're all completed
  var inserted = _.after(distances.length, checkResults);
  distances.forEach(function(distance) {
    db.insertDistance(distance, function(err) {
      if (err) {
        console.log('ERROR: problem inserting distance: ' + distance.name + ' => ' + err);
      }
      inserted();
    });
  });
});

var checkResults = function() {
  db.retrieveDistances(function(err, results) {
    if (err) {
      console.log("ERROR: problem retrieving distances after insertion: " + err);
    }
    else {
      console.log('retrieved distances:');
      results.forEach(function(result) {
        console.log('  id: ' + result.id + ', name: ' + result.name + ', km: ' + result.distanceInKm + ', type: ' + result.type);
      });
    }
    db.disconnect();
  });
};

