var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');

var db = require('../shared/db');
var messaging = require('./messaging');
var config = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', 'config.yaml'), 'utf8'));

// whole service is driven by comms
console.log('starting messaging');
messaging.start(config, db);

