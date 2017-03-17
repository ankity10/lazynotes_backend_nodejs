var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var rabbit = require('./rabbit');
var verify_jwt = require('./utils/verify_jwt');
// User model to manipulate data in mongodb
var User = require('./models/user');

var redis_api = require('./redis_module');

var utils = require('./utils_updated');

// Creating instance of config module
var config = require('./config/config');

module.exports.run = function (worker) {

    console.log('   >> Worker PID:', process.pid);
    var scServer = worker.scServer;

    scServer.addMiddleware(scServer.MIDDLEWARE_EMIT, function (req, next) {
        if (req.event == 'sendmsg') {
            try {
                var signedAuthToken = req.socket.signedAuthToken;
            }
            catch (err) {
                console.log("Authenticated is pending ", err);
            }
            verify_jwt(signedAuthToken, config.secret, "", function (err, data) {
                if (err) {
                    console.error("error in jwt verification ", err);
                    // next("Error in authentication ", err);
                    // req.socket.disconnect(err);
                }
                else if (data) {
                    console.log("Successfully verified");
                    console.log(req.socket.user);
                    next();
                }
            });
        }
        else {
            next();
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

    app.use(morgan('tiny'));

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
        console.log("User Connected ");

        // create rabbitmq channel (virtual connection)
        rabbit.connection.createChannel(function (err, channel) {

            socket.on('auth', function (data) {
                var signedtoken = data;
                console.log("Authenticate called");
                console.log(socket.authState);
                // socket.setAuthToken(data);
                // console.log(socket.authKey);
                verify_jwt(signedtoken, config.secret, "", function (err, data) {
                    if (err) {
                        console.error("error in jwt verification ", err);
                    }
                    else if (data) {
                        console.log("Successfully verified");
                        socket.signedAuthToken = signedtoken;
                        socket.authToken = data;
                        // console.log(data);

                        User.findOne({_id: data._id}, function (err, user) {
                            if (err) {
                                console.log("Database Error, ", err);
                            }
                            else if (user) {
                                // user = user.toJWTUser()
                                socket.user = user;
                                // console.log(user);

                                socket.on('set-client-id', function (data) {
                                    console.log("set client id got called with id", data);
                                    socket.client_id = data;
                                    queue_name = socket.user.username + ":" + socket.client_id;
                                    channel.assertQueue(queue_name, {durable: true});

                                    socket.on('sendmsg', function (data) {
                                        var log = JSON.parse(data);
                                        console.log("Message got called");
                                        console.log("log data", data);
                                        utils.insert_note(socket.user, log.from_client_id, log, channel);
                                        // var rec = data.receiver;
                                        // channel.publish("from_" + sender, '', new Buffer(JSON.stringify(data)), {persistent: true});
                                    });

                                    channel.consume(queue_name, function (msg) {
                                        console.log(msg);
                                        hash = msg.content.toString();
                                        redis_api.read_log(hash, function (log) {

                                            socket.emit('msg', log, function (err, data) {
                                                if (err) {
                                                    console.log("Did not recieve by client ", err);
                                                }
                                                else {
                                                    console.log("Message is recieved by client");
                                                    redis_api.delete_log(hash);
                                                    channel.ack(msg);
                                                }
                                            })
                                        })
                                    }, {noAck: false});
                                });
                                socket.emit("auth-success", user);
                            }
                            else {
                                console.log("No user found")
                            }
                        });
                        socket.authState = "authenticated";
                    }
                });
                console.log(socket.authState);
            })

            socket.on('disconnect', function () {
                console.log("client disconnected")
                channel.close();
            })
        });
    });
};