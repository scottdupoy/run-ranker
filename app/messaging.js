var amqp = require('amqp');
var bridge;
var connection;
var exchange;
var analysisResultsQueue;

module.exports.start = function(config, bridge, callback) {
  console.log('starting messaging: ' + config.messaging.connectionString);
  bridge = bridge;
  
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
    createAnalysisResultsQueue);
  };

  var createAnalysisResultsQueue = function() {
    console.log('amqp: exchange "run-ranker" created and ready');
    analysisResultsQueue = connection.queue('analysis-results', {
      durable: true,
      exclusive: true,
      autoDelete: false,
    },
    bindAnalysisResultsQueue);
  };

  var bindAnalysisResultsQueue = function() {
    console.log('amqp: queue "analysis-results" created and ready');
    // TODO: bindings
    // TODO: subcriptions
    // TODO: handlers (some kind of proxy adapter) to bring it
    //       all back together - might need a layer between this
    //       and the bridge to coordinate everything
    callback();
  };

  connection.on('ready', createExchange);
};

