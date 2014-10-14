var amqp = require('amqp');
var fs = require('fs');
var _ = require('underscore');

var exchangeName = 'run-ranker';
var resultQueueName = 'test-analysis-result';
var requestRoutingKey = 'analysis-request';
var resultRoutingKey = 'analysis-result';

var connection;
var exchange;

var resultQueue;

if (process.argv.length < 4) {
  console.log('ERROR: Insufficient arguments, please provide AMQP credentials');
  return;
}

var user = process.argv[2];
var password = process.argv[3];

console.log('starting messaging: user: ' + user + ', password: ' + password);

var options = {
  url: 'amqp://' + user + ':' + password + '@localhost:5672',
};

var nodeSpecificOptions = {
  defaultExchangeName: exchangeName,
  reconnect: true,
};

connection = amqp.createConnection(options, nodeSpecificOptions);
connection.on('ready', createExchange);

var exchangeOptions = {
  type: 'direct',
  durable: true,
  autoDelete: false,
};

var queueOptions = {
  durable: false,
  autoDelete: true,
};

var files = [
  '205188557.json',
  '205856900.json',
  '206788433.json',
  '207019772.json',
];

function shutdown() {
  // stop reconnection attempts and disconnect
  connection.implOptions.reconnect = false;
  console.log('all expected results received');
  console.log('amqp: disconnecting (reconnect: ' + connection.implOptions.reconnect + ')');
  connection.disconnect();
  console.log('amqp: disconnected, should exit...');
}

// setup the shutdown when results have been received for all of the requests
var fileResultReceived = _.after(files.length, shutdown);

function createExchange() {
  console.log('amqp: connected');
  exchange = connection.exchange(exchangeName, exchangeOptions, function() {
    console.log('amqp: exchange created');
    resultQueue = connection.queue(resultQueueName, queueOptions, function() {
      console.log('amqp: result queue created');
      resultQueue.bind(exchangeName, resultRoutingKey, function() {
        console.log('amqp: result queue bound to key');
        console.log('amqp: subscribing to result queue');
        resultQueue.subscribe(subscriber);
        sendTestMessages();
      });
    });
  });
};

var subscriber = function(message) {
  console.log('RESULT: ' + JSON.stringify(message));
  console.log('  ' + message.message);
  fileResultReceived();
}

var sendTestMessages = function() {
  console.log('amqp: ready to send messages');
  files.forEach(function(file) {
    fs.readFile(file, function(err, data) {
      if (err) {
        return console.log('ERROR: could not read file: ' + file + ' => ' + err);
      }
      var request = JSON.parse(data);
      console.log('amqp: sending data for file: ' + file + ' => ' + request.points.length + ' points');
      exchange.publish(requestRoutingKey, request, { });
    });
  });
};

