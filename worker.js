var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var rabbit = require('./rabbit');
var verify_jwt = require('./utils/verify_jwt');
// User model to manipulate data in mongodb
var User = require('./models/user');

var redis_api = require('./redis');

var utils = require('./utils');

// Creating instance of config module
var config = require('./config/config');

var winston = require("winston");

winston.loggers.add('worker', {
    console: {
        level: 'info',
        colorize: true,
        label: 'worker.js'
    },
    file: {
        level: "debug",
        filename: 'logs/log.txt'
    }
});

var log = winston.loggers.get('worker');

// log.info('Info logs');
// log.warn("warning logs");
// log.error("error logs");
// log.silly("silly logs");
// log.warn("debug logs");


var recieve = config.socketcluster_listners.receive;
var send = config.socketcluster_listners.send;
var authentication = config.socketcluster_listners.authentication;
var disconnect = config.socketcluster_listners.disconnect;
var set_client_id = config.socketcluster_listners.set_client_id;

module.exports.run = function (worker) {

    console.log('   >> Worker PID:', process.pid);
    var scServer = worker.scServer;

    scServer.addMiddleware(scServer.MIDDLEWARE_EMIT, function (req, next) {

        if (config.socketcluster_listners_list.indexOf(req.event) == -1) {
            log.error("[ middleware_emit ] ", req.event, " is not a valid listener, it is not defined on server");
        }
        else {
            if (req.event == recieve) {
                try {
                    var signedAuthToken = req.socket.signedAuthToken;
                }
                catch (err) {
                    log.error("[ middleware_emit ] Error: No token found on socket object, disconnecting");
                    req.socket.disconnect();
                }
                verify_jwt(signedAuthToken, config.secret, "", function (err, data) {
                    if (err) {
                        log.error("[ middleware_emit ] Verification Failed: Invalid token");
                        next("[ middleware_emit ] Error in authentication ", err);
                        req.socket.disconnect(err);
                    }
                    else if (data) {
                        log.info("[ middleware_emit ] Authentication successful");
                        next();
                    }
                });


            }
            else {
                next();
            }
        }
    });

    // this code handels http requests
    var app = require('express')();
    var httpServer = worker.httpServer;

    // BodyParser instance to include body attribute in "POST" requests and parse the variables in that body object.
    var bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    // Morgan instance to log each request on terminal
    var morgan = require('morgan');

    // app.use(morgan('dev'));

    app.use(serveStatic(path.resolve(__dirname, 'public')));

    httpServer.on('request', app);

    var apiRouter = require('./api');
    app.use('/api', apiRouter);

    var rootRouter = express.Router();

    rootRouter.get('/', function (req, res) {
        res.json({"messages": "Welcome to Index route. Try '/api' route to use api"});
    });

    app.use(rootRouter);
    // http handler finished

    /*
     In here we handle our incoming realtime connections and listen for events.
     */
    scServer.on('connection', function (socket) {

        log.info("[ on connection ] On connection got called");
        // create rabbitmq channel (virtual connection)
        rabbit.connection.createChannel(function (err, channel) {
            log.info("[ createchannel ] Rabbitmq channel created successfully");
            socket.on(authentication, function (data) {
                log.info("[ on ", authentication, " ] ", " got called");
                log.warn("[ on ", authentication, " ] ", "Token: ", data);
                var signedtoken = data;

                verify_jwt(signedtoken, config.secret, "", function (err, data) {
                    if (err) {
                        log.error("[ on ", authentication, " ] ", "Authentication failed: ", err);
                    }
                    else if (data) {
                        log.info("[on ", authentication, " ] ", "Authentication successful");
                        socket.signedAuthToken = signedtoken;
                        socket.authToken = data;


                        User.findOne({_id: data._id}, function (err, user) {
                            if (err) {
                                log.error("[ on ", authentication, " ] ", "Database Error: ", err);
                            }
                            else if (user) {
                                log.info("[ on ", authentication, " ] ", "User found in database");
                                socket.user = user;


                                socket.on(set_client_id, function (data) {
                                    log.info("[ on ",set_client_id," ] ","set-client-id got called with client-id:", data);
                                    socket.client_id = data;
                                    queue_name = socket.user.username + ":" + socket.client_id;
                                    channel.assertQueue(queue_name, {durable: true});
                                    log.warn("[ on ",set_client_id," ] ","Queue created successfully with name: ", queue_name);

                                    socket.on(recieve, function (data) {
                                        var notes_log = JSON.parse(data);
                                        log.info("[ on ",recieve," ] ", " got called with data: ", data);
                                        utils.insert_note(socket.user, notes_log.from_client_id, notes_log, channel);
                                    });

                                    channel.consume(queue_name, function (msg) {
                                        log.warn("[ channel.consume ] Consuming message from rabbitmq queue: ", queue_name, " msg: ", msg.content.toString());
                                        hash = msg.content.toString();

                                        redis_api.read_log(hash, function (note_log) {
                                            log.info("[ channel.consume/redis.read ] Reading complete log from redis");

                                            socket.emit(send, note_log, function (err, data) {
                                                log.info("[ channel.consume/on ",send," ] ", "Sending log to user with client_id: ", socket.user.client_id);
                                                if (err) {
                                                    log.warn("[ channel.consume/on ",send," ] ", "Acknowledgment is not recieved by server");
                                                }
                                                else {
                                                    console.log("[ channel.consume/on ",send," ] ", "Received message acknowledgment");
                                                    redis_api.delete_log(hash);
                                                    channel.ack(msg);
                                                    log.warn("[ channel.consume/on ",send," ] ", "Removing log from rabbitmq queue with queue name: ", queue_name);

                                                }
                                            })
                                        })
                                    }, {noAck: false});
                                });
                                socket.emit("auth-success", user);
                            }
                            else {
                                log.error("[on ", authentication, " ] ", "No user found")
                            }
                        });
                        socket.authState = "authenticated";
                    }
                });
            })

            socket.on(disconnect, function () {
                log.info("client disconnected with cliend-id: ", socket.client_id);
                channel.close();
                socket.disconnect();
            })
        });
    });
};