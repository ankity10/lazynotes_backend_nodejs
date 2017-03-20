var redis_api = require("./redis.js");
// User model to manipulate data in mongodb
var User = require('./models/user');

module.exports =
    {

        insert_note: function (user, from_client_id, log, channel) {
            username = user.username;
            // var to_clients = ['client1', 'client2'];
            var to_clients = user.get_clients();
            var index = to_clients.indexOf(from_client_id);
            if (index > -1)
                to_clients.splice(index, 1);
            //Updating logs and insertion in RabbitMq
            console.log("clients list", to_clients);
            for (var i = 0; i < to_clients.length; i++) (function(i)
            {
                // var to_client_id = to_clients[i];
                // var is_present;
                var key_hash = username + ":" + log['note_hash'] + ":" + to_clients[i];
                console.log(" key hash with flag 0 ", key_hash);
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
                        var q = username + ":" + to_clients[i];
                        channel.assertQueue(q, {durable: true});

                        channel.sendToQueue(q, new Buffer(key_hash), {persistent: true});
                        var d = {};
                        d[from_client_id] = log['note_text'];
                        console.log(JSON.stringify(d));
                        new_obj["clients"] = JSON.stringify(d);
                        console.log("NEW LOG = ", new_obj);
                        console.log("key hash before inserting not present", key_hash);
                        redis_api.insert_log(key_hash, new_obj);
                    }

                    else {
                        var result;
                        redis_api.read_log(key_hash, function (result) {
                            var val = JSON.parse(result["clients"]);
                            val[from_client_id] = log['note_text'];
                            new_obj["clients"] = JSON.stringify(val);
                            console.log("UPDATED LOG = ", new_obj);
                            console.log("key hash before inserting present", key_hash);

                            redis_api.insert_log(key_hash, new_obj);
                        });
                    }
                });
            })(i);
            //Updating Notes collection
            var db = require('./models/note.js');
            var note_collection = db(username);
            note_collection.findOne({"note_hash": log['note_hash']}, function (error, result) {
                console.log("current mongo note", result);
                if (error)
                    console.log("Error in calling note model: " + error);
                else if (result == null) //No note created
                {
                    var d = {};
                    d[from_client_id] = log['note_text'];
                    var note_obj = {
                        note_hash: log['note_hash'],
                        window_title: log['window_title'],
                        process_name: log['process_name'],
                        clients: d
                    }
                    console.log("New note object", note_obj);
                    var obj = new note_collection(note_obj);
                    obj.save(function (error, data) {
                        if (error) {
                            console.log("Error in saving note: " + error);
                        } else {
                            console.log(data);
                        }
                    });
                }
                else //Note exists
                {
                    // new_obj = note_obj;
                    console.log("pre note object", result);
                    var note_obj = result;
                    note_obj['clients'][from_client_id] = log['note_text'];
                    console.log("updated note object", note_obj);
                    note_collection.findOneAndUpdate({"note_hash": log['note_hash']}, note_obj, {upsert: false}, function (err, doc) {
                            if (err) console.log("error in updating note");
                            console.log("Note successfully updated");
                    }
                    );
                }
            });


        },

        resolve_merge_conflict: function (user, from_client_id, log, channel) {
            username = user.username;

            var all_clients = user.get_clients();
            var to_clients = all_clients;
            var index = to_clients.indexOf(from_client_id);
            if (index > -1)
                to_clients.splice(index, 1);
            console.log("clients list", to_clients);

            var new_obj = {
                "note_hash": log['note_hash'],
                "window_title": log['window_title'],
                "process_name": log['process_name'],
                "resolve_flag": true
            };
            //Create entry in RabbitMq and updating Redis
            for (var i = 0; i < to_clients.length; i++) (function(i)

            {
                // var to_client_id = to_clients[i];
                var key_hash = username + ":" + log['note_hash'] + ":" + to_clients[i];
                console.log("Key_hash = " + key_hash);
                // var is_present;
                redis_api.is_log_present(key_hash, function (is_present) {
                    if (is_present == 0) //Not present
                    {
                        var q = username + ":" + to_clients[i];
                        channel.assertQueue(q, {durable: true});
                        channel.sendToQueue(q, new Buffer(key_hash), {persistent: true});
                        var d = {};
                        d[from_client_id] = log['note_text'];
                        new_obj["clients"] = JSON.stringify(d);
                        console.log("log not in redis ", new_obj);
                        console.log("key hash before inserting not present", key_hash);
                        var h = username + ":" + log['note_hash'] + ":" + to_clients[i];
                        redis_api.insert_log(h, new_obj);
                    }
                    else //Present
                    {
                        var result;
                        redis_api.read_log(key_hash, function (result) {
                            var val = {};
                            val[from_client_id] = log['note_text'];
                            new_obj["clients"] = JSON.stringify(val);
                            console.log("log present in redis ", new_obj);
                            console.log("key hash before inserting  present", key_hash);

                            var h = username + ":" + log['note_hash'] + ":" + to_clients[i];
                            redis_api.insert_log(h, new_obj);
                        });
                    }
                });
            })(i);
            //Remove from_client's logs if present
            var key_hash = username + ":" + log['note_hash'] + ":" + from_client_id;
            var is_present;
            redis_api.is_log_present(log['note_hash'], function (is_present) {
                if (is_present) //Present
                    redis_api.delete_log(key_hash);
            });

            //Updating Notes collection
            var db = require('./models/note.js');
            var note_collection = db(username);
            // var note_obj;
            note_collection.findOne({"note_hash": log['note_hash']}, function (error, result) {
                console.log("Flag 1: Queried note is ", result);

                if (error)
                    console.log("Error in calling note model: " + error);
                else if (result == null) //No note created
                {
                    var d = {};
                    d[from_client_id] = log['note_text'];
                    var note_obj = {
                        note_hash: log['note_hash'],
                        window_title: log['window_title'],
                        process_name: log['process_name'],
                        clients: d
                    };
                    var obj = new note_collection(note_obj);
                    obj.save(function (error, data) {
                        if (error)
                            console.log("Error in saving note: " + error);
                    });
                }
                else //Note exists
                {
                    // new_obj = note_obj;
                    console.log("pre note object", result);
                    var note_obj = result;
                    d = {};
                    d[from_client_id] = log['note_text'];
                    note_obj['clients'] = d;
                    console.log("updated note object", note_obj);
                    note_collection.findOneAndUpdate({"note_hash": result['note_hash']}, note_obj, {upsert: false}, function (err, doc) {
                            if (err) console.log("error in updating note");
                            console.log("Note successfully updated");
                        }
                    );
                }
            });
        }

    }