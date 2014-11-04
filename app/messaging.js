var amqp = require('amqp');

var connectionOptions = {
  // defaults, but listing explicitly to remind myself what the setup is
  defaultExchangeName: '',
  reconnect: true,
  reconnectBackoffStrategy: 'linear',
  reconnectExponentialLimit: 120000,
  reconnectBackoffTime: 1000,
};

var exchangeName = 'run-ranker';
var exchangeOptions = {
  type: 'direct',
  durable: true,
  autoDelete: false,
};

var analysisResultsQueueName = 'analysis-results';
var analysisResultsQueueOptions = {
  durable: false,
  autoDelete: true,
};

var routingKey = 'analysis-result';

function Messaging(config, controller) {
  this.config = config;
  this.controller = controller;
  this.exchange = null;
  this.analysisResultsQueue = null;
}

Messaging.prototype.start = function(callback) {
  var that = this;

  console.log('starting messaging: ' + this.config.messaging.connectionString);
  
  var connection = amqp.createConnection({ url: this.config.messaging.connectionString }, connectionOptions);

  var createExchange = function() {
    console.log('amqp: connected');
    that.exchange = connection.exchange(exchangeName, exchangeOptions, createAnalysisResultsQueue);
  };

  var createAnalysisResultsQueue = function() {
    console.log('amqp: exchange "' + exchangeName + '" created and ready');
    that.analysisResultsQueue = connection.queue(analysisResultsQueueName, analysisResultsQueueOptions, bindAnalysisResultsQueue);
  };

  var bindAnalysisResultsQueue = function() {
    console.log('amqp: queue "' + analysisResultsQueueName + '" created');
    that.analysisResultsQueue.bind(exchangeName, routingKey, function() {
      console.log('amqp: queue "' + analysisResultsQueueName + '" bound to key "' + routingKey + '"');
      console.log('amqp: subscribing to queue: ' + analysisResultsQueueName);
      that.analysisResultsQueue.subscribe(subscriber);
      callback();
    });
  };

  var subscriber = function(result) {
    try {
      that.controller.handleAnalysisResult(result);
    }
    catch (err) {
      console.log('ERROR: unhandled consumer error: ' + err);
    }
  };

  connection.on('ready', createExchange);
};

Messaging.prototype.publishAnalysisRequest = function(request) {
  this.exchange.publish("analysis-request", request, { });
};

Messaging.prototype.publishNewManualActivity = function(activity) {
  this.exchange.publish("new-manual-activity", activity, { });
};

module.exports = Messaging;

