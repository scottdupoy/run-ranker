var amqp = require('amqp');

var exchangeName = 'run-ranker';

var requestQueueName = 'test-analysis-requests';
var requestRoutingKey = 'analysis-request';
var resultRoutingKey = 'analysis-result';

var connection;
var exchange;

var requestQueue;

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

var exchangeOptions = {
  type: 'direct',
  durable: true,
  autoDelete: false,
};

var queueOptions = {
  durable: false,
  autoDelete: true,
};

var createExchange = function() {
  console.log('amqp: connected');
  exchange = connection.exchange(exchangeName, exchangeOptions, createRequestQueue);
};

var createRequestQueue = function() {
  console.log('amqp: exchange "' + exchangeName + '" created and ready');
  requestQueue = connection.queue(requestQueueName, queueOptions, bindRequestQueue);
};

var bindRequestQueue = function() {
  console.log('amqp: queue "' + requestQueueName + '" created and ready');
  requestQueue.bind(exchangeName, requestRoutingKey, function() {
    console.log('amqp: queue "' + requestQueueName + '" bound to key: "' + requestRoutingKey + '"');
    requestQueue.subscribe(subscriber);
  });
};

var subscriber = function(message) {
  console.log('consumed message');
  console.log('  ' + message.guid + ' => ' + message.points.length + ' points');
  console.log('  publishing message: ' + resultRoutingKey);
  exchange.publish(resultRoutingKey, { message: 'results go here' }, { });
};

console.log('starting messaging');
connection = amqp.createConnection(options, nodeSpecificOptions);
connection.on('ready', createExchange);

