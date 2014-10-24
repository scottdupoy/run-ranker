var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');

var db = require('../shared/db');
var messaging = require('./messaging');
var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'config.yaml'), 'utf8'));

// whole service is driven by comms
db.connect(config, function(err) {
  if (err) {
    console.log("ERROR: couldn't connect to the db: " + err);
    return;
  }
  messaging.start(config, db);
});

