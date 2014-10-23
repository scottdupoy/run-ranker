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
      durable: false,
      autoDelete: true,
    },
    bindAnalysisResultsQueue);
  };

  var bindAnalysisResultsQueue = function() {
    console.log('amqp: queue "analysis-results" created and ready');
    analysisResultsQueue.bind("run-ranker", "analysis-result", function() {
      console.log('amqp: queue "analysis-results" bound to key "analysis-result"');
      console.log('amqp: subscribing to results queue');
      analysisResultsQueue.subscribe(subscriber);
      callback();
    });
  };

  var subscriber = function(result) {
    console.log('analysis result: ' + result.guid);
    bridge.send(result.guid, 'log', 'analysis completed: ' + result.name + ' - ' + result.guid);
    result.bestEfforts.forEach(function(bestEffort) {
      bridge.send(result.guid, 'log', '  ' + bestEffort.distance.name + ' = ' + bestEffort.effort.duration);
    });
  };

  connection.on('ready', createExchange);
};

module.exports.publishAnalysisRequest = function(request) {
  exchange.publish("analysis-request", request, { });
};

