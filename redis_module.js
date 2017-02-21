var redis = require('redis');
var client = redis.createClient();
 
client.on('connect', function() { 
	console.log('Connected to redis client');
});

module.exports = {

	is_log_present: function(key_hash, callback) {
		client.exists(key_hash, function(error, result) {
			if(error)
				console.log('Error in is_log_present: ' + error);
			else
				callback(result);
		});
	},

	insert_log: function(key_hash, log) {
		console.log("Inserting log with key", key_hash, " and log ", log);
		client.hmset(key_hash, log, function(error) {
			if(error)
				console.log('Error in insert_log: ' + error);
		});
	},

	read_log: function(key_hash, callback) {
		client.hgetall(key_hash, function(error, result) {
			if(error)
				console.log('Error in read_log: ' + error);
			else
				callback(result);
		})
	},

	delete_log: function(key_hash) {
		client.del(key_hash, function(error, reply) {
			if(error)
				console.log('Error in delete_log: ' + error);
		});
	}

};