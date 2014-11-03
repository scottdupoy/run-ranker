var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');

var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'config.yaml'), 'utf8'));
var db = new (require('../shared/db'))(config);
var messaging = require('./messaging');

// whole service is driven by comms
db.connect(function(err) {
  if (err) {
    console.log("ERROR: couldn't connect to the db: " + err);
    return;
  }
  messaging.start(config, db);
});

