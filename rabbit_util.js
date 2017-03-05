var rabbit = require('./rabbit');


module.exports = {
	'create_queue': function(queue_name, callback) {
		rabbit.connection.createChannel(function (err, channel) {
			channel.assertQueue(queue_name, {durable: true});
			callback();
		})
	}
}

