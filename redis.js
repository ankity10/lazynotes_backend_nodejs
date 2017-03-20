var redis = require('redis');
var client = redis.createClient();

var winston = require("winston");

winston.loggers.add('redis', {
    console: {
        level: 'info',
        colorize: true,
        label: 'redis.js'
    },
    file: {
        level: "debug",
        filename: 'logs/log.txt'
    }
});

var log = winston.loggers.get('redis');


client.on('connect', function () {
    log.info('[ on connect ] Connected to Redis Server');
});


module.exports = {

    is_log_present: function (key_hash, callback) {
        client.exists(key_hash, function (error, result) {
            if (error) {
                log.error('[ is_log_present ] Error in is_log_present: ' + error);
            }
            else {
                callback(result);
            }
        });
    },

    insert_log: function (key_hash, note_log) {
        console.log("Inserting log with key", key_hash, " and log ", note_log);
        client.hmset(key_hash, note_log, function (error) {
            if (error) {
                log.error('[ insert_log ] Error in insert_log: ' + error);
            }
            log.info("[ insert_log ] Note log inserted into redis with key hash: " + key_hash);

        });
    },

    read_log: function (key_hash, callback) {
        client.hgetall(key_hash, function (error, result) {
            if (error)
                log.error('[ read_log ] Error in read_log: ' + error);
            log.info("[ read_log ] Reading log from redis with key hash: " + key_hash);
            callback(result);
        })
    },

    delete_log: function (key_hash) {
        client.del(key_hash, function (error, reply) {
            if (error)
                log.error('[ delete_log ] Error in delete_log: ' + error);
            log.info("[ delete_log ] Note log deleted successfully with key hash: " + key_hash);
        });
    }

};