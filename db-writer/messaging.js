var amqp = require('amqp');
var connection;
var exchange;
var queue;

module.exports.start = function(config, db) {
  console.log('starting messaging: ' + config.messaging.connectionString);
  
  connection = amqp.createConnection({
    url: config.messaging.connectionString
  }, {
    // defaults, but listing explicitly to remind myself what the setup is
    defaultExchangeName: '',
    reconnect: true,
    reconnectBackoffStrategy: 'linear',
    reconnectExponentialLimit: 120000,
    reconnectBackoffTime: 1000,
  });

  var createExchange = function() {
    console.log('amqp: connected');
    exchange = connection.exchange('run-ranker', {
      type: 'direct',
      durable: true,
      autoDelete: false,
    },
    createQueue);
  };

  var createQueue = function() {
    console.log('amqp: exchange "run-ranker" created and ready');
    // want this queue to persist so we always add new analysis results to the database
    queue = connection.queue('db-writer-analysis-results', {
      durable: true,
      autoDelete: false,
    },
    bindQueue);
  };

  var bindQueue = function() {
    console.log('amqp: queue "db-writer-analysis-results" created');
    queue.bind("run-ranker", "analysis-result", function() {
      console.log('amqp: queue "db-writer-analysis-results" bound to key "analysis-result"');
      queue.bind("run-ranker", "new-manual-activity", function() {
        console.log('amqp: queue "db-writer-analysis-results" bound to key "new-manual-activity"');
        console.log('amqp: subscribing to queue');
        queue.subscribe(subscriber);
      });
    });
  };

  var subscriber = function(activity) {
    console.log('messaging: analysis result: ' + activity.athleteId + ' / ' + activity.activityId + ' => ' + activity.name);
    db.insertActivity(activity);
  };

  connection.on('ready', createExchange);
};

