var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');

if (process.argv.length < 3 || isNaN(process.argv[2])) {
  console.log('ERROR: Please provide athlete id as argument');
  return;
}

var athleteId = +process.argv[2];
console.log('deleting all activities for athlete: ' + athleteId);

var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'config.yaml'), 'utf8'));
var db = new (require('../shared/db'))(config);

db.connect(function(err) {
  if (err) {
    console.log("ERROR: couldn't connect to the db: " + err);
    return;
  }
  db.deleteAllActivities(athleteId, function(err, result) {
    if (err) {
      console.log("ERROR: problem deleting activities: " + err);
    }
    else {
      console.log('deleted ' + result + ' activities for athlete ' + athleteId);
    }
    db.disconnect();
  });
});
