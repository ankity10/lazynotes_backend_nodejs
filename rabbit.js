var amqp = require('amqplib/callback_api');
var exports = module.exports = {};

// http api
// http://localhost:15672/api/queues/%2f/client-name

amqp.connect('amqp://localhost', function (err, conn) {
    if (err) {
        console.error('Error connecting server ', err);
    }
    else {
        console.warn('Successfully connected creating channel');
        exports.connection = conn;
    }
});