var redis_api = require("./redis_module.js");
// User model to manipulate data in mongodb
var User = require('./models/user');

module.exports =
    {

        insert_note: function (user, from_client_id, log, channel) {
            // var to_clients = ['client1', 'client2'];
            var to_clients = user.get_clients();
            var index = to_clients.indexOf(from_client_id);
            if (index > -1)
                to_clients.splice(index, 1);
            //Updating logs and insertion in RabbitMq
            for (var i = 0; i < to_clients.length; i++) {
                var to_client_id = to_clients[i];
                // var is_present;
                var key_hash = username + ":" + log['note_hash'] + "," + to_client_id;
                var new_obj = {
                    "note_hash": log['note_hash'],
                    "window_title": log['window_title'],
                    "process_name": log['process_name'],
                    "resolve_flag": false
                };
                //Insertion in RabbitMq queue
                redis_api.is_log_present(key_hash, function (is_present) {
                    if (is_present == 0) //Not present
                    {
                        var q = username + ":" + to_client_id;
                        channel.assertQueue(q, {durable: true});

                        channel.sendToQueue(q, new Buffer(key_hash), {persistent: true});
                        new_obj["clients"] = JSON.stringify({from_client_id: log['note_text']});
                        redis_api.insert_log(key_hash, new_obj);
                    }

                    else {
                        var result;
                        redis_api.read_log(key_hash, function (result) {
                            var val = JSON.parse(result["clients"]);
                            val[from_client_id] = log['note_text'];
                            new_obj["clients"] = JSON.stringify(val);
                            redis_api.insert_log(key_hash, new_obj);
                        });
                    }
                });
            }
            //Updating Notes collection
            var db = require('./models/note.js');
            var note_collection = db(username);
            var note_obj;
            note_collection.findOne({"note_hash": log['note_hash']}, function (error, note_obj) {
                if (error)
                    console.log("Error in calling note model: " + error);
                else if (note_obj == null) //No note created
                {
                    note_obj = {
                        note_hash: log['note_hash'],
                        window_title: log['window_title'],
                        process_name: log['process_name'],
                        clients: {
                            from_client_id: log['note_text']
                        }
                    }
                    var obj = new note_collection(note_obj);
                    obj.save(function (error, data) {
                        if (error)
                            console.log("Error in saving note: " + error);
                    });
                }
                else //Note exists
                {
                    new_obj = note_obj;
                    new_obj[clients][from_client_id] = log['note_text'];
                    //Remove old note
                    note_collection.remove({note_hash: log['note_hash']}, function (error) {
                        if (error)
                            console.log("Error in deleting old note: " + error);
                    });
                    //Save new note
                    new_obj.save(function (error, data) {
                        if (error)
                            console.log("Error in saving new note: " + error);
                    });
                }
            });


        },

        resolve_merge_conflict: function (user, from_client_id, log, channel) {

            var all_clients = user.get_clients();
            var to_clients = all_clients;
            var index = to_clients.indexOf(from_client_id);
            if (index > -1)
                to_clients.splice(index, 1);
            var new_obj = {
                "note_hash": log['note_hash'],
                "window_title": log['window_title'],
                "process_name": log['process_name'],
                "resolve_flag": true
            };
            //Create entry in RabbitMq and updating Redis
            for (var i = 0; i < to_clients.length; i++) {
                var to_client_id = to_clients[i];
                var key_hash = username + ":" + log['note_hash'] + "," + to_client_id;
                var is_present;
                redis_api.is_log_present(key_hash, function (is_present) {
                    if (is_present == 0) //Not present
                    {
                        var q = username + ":" + to_client_id;
                        channel.assertQueue(q, {durable: true});
                        channel.sendToQueue(q, new Buffer(key_hash), {persistent: true});
                        new_obj["clients"] = JSON.stringify({from_client_id: log['note_text']});
                        redis_api.insert_log(key_hash, new_obj);
                    }
                    else //Present
                    {
                        var result;
                        redis_api.read_log(key_hash, function (result) {
                            var val = JSON.parse(result["clients"]);
                            val[from_client_id] = log['note_text'];
                            new_obj["clients"] = JSON.stringify(val);
                            redis_api.insert_log(key_hash, new_obj);
                        });
                    }
                });
            }
            //Remove from_client's logs if present
            var key_hash = username + ":" + note_hash + "," + from_client_id;
            var is_present;
            redis_api.is_log_present(note_hash, function (is_present) {
                if (is_present) //Present
                    redis_api.delete_log(key_hash);
            });

            //Updating Notes collection
            var db = require('./models/note.js');
            var note_collection = db(username);
            var note_obj;
            note_collection.findOne({"note_hash": log['note_hash']}, function (error, note_obj) {
                if (error)
                    console.log("Error in calling note model: " + error);
                else if (note_obj == null) //No note created
                {
                    note_obj = {
                        note_hash: log['note_hash'],
                    window_title : log['window_title'],
                    process_name : log['process_name'],
                    clients : {
                        from_client_id: log['note_text']
                    }
                }
                    var obj = new note_collection(note_obj);
                    obj.save(function (error, data) {
                        if (error)
                            console.log("Error in saving note: " + error);
                    });
                }
                else //Note exists
                {
                    new_obj = note_obj;
                    new_obj[clients] = {from_client_id: log['note_text']};
                    //Remove old note
                    note_collection.remove({note_hash: log['note_hash']}, function (error) {
                        if (error)
                            console.log("Error in deleting old note: " + error);
                    });
                    //Save new note
                    new_obj.save(function (error, data) {
                        if (error)
                            console.log("Error in saving new note: " + error);
                    });
                }
            });
        }

    }