var redis_api = require("./redis.js");
// User model to manipulate data in mongodb
var User = require('./models/user');
var Type = require('type-of-is');


//
var winston = require("winston");

winston.loggers.add('utils', {
    console: {
        level: 'info',
        colorize: true,
        label: 'util.js'
    },
    file: {
        level: "debug",
        filename: 'logs/log.txt'
    }
});

var log = winston.loggers.get('utils');


module.exports =
    {
        insert_note: function (user, from_client_id, note_log, channel) {

            log.warn("[ insert note ] insert_note got called by client-id: ", from_client_id);
            log.warn("[ insert note ] inserted note got called by user: ", user.username, user.clients);
            username = user.username;

            var to_clients = user.get_clients();

            var index = to_clients.indexOf(from_client_id);
            // if (index > -1)
            //     to_clients.splice(index, 1);
            var all_clients = user.get_clients();

            log.info("[ insert note ] all_clients list: ", all_clients);

            log.info("[ insert note ] to_clients list: ", to_clients);

            var new_obj = {
                "note_hash": note_log['note_hash'],
                "window_title": note_log['window_title'],
                "process_name": note_log['process_name'],

            };

            log.warn("[ insert note ] Note to be inserted is: ", new_obj);

            //Create entry in RabbitMq and updating Redis
            for (var i = 0; i < to_clients.length; i++) (function (i) {

                if (to_clients[i] != from_client_id) {

                    var key_hash = username + ":" + note_log['note_hash'] + ":" + to_clients[i];
                    log.warn("[ loop to_client ] Key_hash for client-id: ", to_clients[i], " is: ", key_hash);

                    // var is_present;
                    redis_api.is_log_present(key_hash, function (is_present) {
                        if (is_present == 0) //Not present
                        {
                            log.info("[ loop/Absent in Redis ] Notes log not present in redis");
                            var queue_name = username + ":" + to_clients[i];
                            channel.assertQueue(queue_name, {durable: true});
                            channel.sendToQueue(queue_name, new Buffer(key_hash), {persistent: true});
                            log.info("[ loop/Absent in Redis ] Note hash inserted into queue: ", queue_name);
                            new_obj["note_text"] = note_log['note_text'];
                            var h = username + ":" + note_log['note_hash'] + ":" + to_clients[i];
                            redis_api.insert_log(h, new_obj);
                        }
                        else //Present
                        {
                            log.info("[ loop/Present in Redis ] Note log present in redis");
                            redis_api.read_log(key_hash, function (result) {
                                new_obj["note_text"] = note_log['note_text'];
                                var h = username + ":" + note_log['note_hash'] + ":" + to_clients[i];
                                redis_api.insert_log(h, new_obj);
                            });
                        }
                    });
                }

            })(i);

            //Remove from_client's note_logs if present
            var key_hash = username + ":" + note_log['note_hash'] + ":" + from_client_id;
            redis_api.is_log_present(log['note_hash'], function (is_present) {
                if (is_present) //Present
                    redis_api.delete_log(key_hash);
            });

            //Updating Notes collection
            var db = require('./models/note.js');
            var note_collection = db(username);

            note_collection.findOne({"note_hash": note_log['note_hash']}, function (error, result) {
                if (error) {
                    log.error("[ insert note/mongo ] Error in database while fetching notes:", error);
                }
                else if (result == null) //Note does not exists.
                {
                    log.info("[ insert note/mongo ] Note does not exists in Database, new note will be inserted");
                    var note_obj = {
                        note_hash: note_log['note_hash'],
                        window_title: note_log['window_title'],
                        process_name: note_log['process_name'],
                        note_text: note_log['note_text']
                    };
                    var obj = new note_collection(note_obj);
                    obj.save(function (error, data) {
                        if (error) {
                            log.error("[ insert note/mongo ] Error in saving note");
                            return;
                        }
                        log.info("[ insert note/mongo ] Note inserted into Database");
                    });
                }
                else //Note exists
                {
                    log.info("[ insert note/mongo ] Note exists in Database");
                    var note_obj = result;
                    note_obj['note_text'] = note_log['note_text'];
                    note_collection.findOneAndUpdate({"note_hash": result['note_hash']}, note_obj, {upsert: false}, function (err, doc) {
                            if (err) {
                                log.error("[ insert note/mongo ] Error in updating Note in Database");
                            }
                            log.info("[ insert note/mongo ] Note updated successfully in Database");
                        }
                    );
                }
            });
        }

    }