var redis_api = require("./redis_module.js");
// User model to manipulate data in mongodb
var User = require('./models/user');

module.exports = {

insert_note: function(username, from_client_id, log, channel) 
{
	var user;
	User.findOne({"username": username}, function(error, user) 
	{
		if(error)
			console.log("Error in calling User model: " + error);
		else
		{
			// var to_clients = ['client1', 'client2'];
			var to_clients = user.get_clients();
			var index = to_clients.indexOf(from_client_id);
			if(index > -1)
				to_clients.splice(index,1);
			//Updating logs and insertion in RabbitMq
			for(var i=0; i<to_clients.length; i++)
			{
				var to_client_id = to_clients[i];
				var is_present;
				var key_hash = username + ":" + log['note_hash'] + "," + from_client_id + "," + to_client_id;
				//Insertion in RabbitMq queue
				redis_api.is_log_present(key_hash, function(is_present) 
				{
					if(is_present == 0) //Not present
					{
						var q = username + ":" + to_client_id;
						channel.sendToQueue(q, new Buffer(key_hash),{persistent :true});
					}
				}						);
				log['from_client_id'] = from_client_id;
				log['to_client_id'] = to_client_id;
				redis_api.insert_log(key_hash, log);
			}
			//Updating Notes collection
			var db = require('./models/note.js');
			var note_collection = db(username);
			var note_obj;
			note_collection.findOne({"note_hash": log['note_hash']}, function(error, note_obj)
			{
				if(error)
					console.log("Error in calling note model: " + error);
				else
				{
					
				}
			});
		}
	}
				);
	


}


};