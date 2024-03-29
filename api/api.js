/* Express instance*/
var express = require('express');

// Express router instance as apiRouter
var apiRouter = express.Router();

// Creating instance of config module
var config = require('./../config/config');

// Exporting apiRouter, so that in can be included in root express app.
module.exports = apiRouter;

// jsonwebtoken instance to create json web tokens
var jwt = require('jsonwebtoken');

// Mongoose ODM to manipulate mongodb.
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
// Connecting to database using preconfigured path in 'config/config.js' (config.db)
mongoose.connect(config.db);

// Passport instance for Json web token login strategy.
var passport = require('passport');

// Initializing passport
apiRouter.use(passport.initialize());

// loading passport configuration.
require('./../config/passport')(passport);

// User model to manipulate data in mongodb
var User = require('./../models/user');

// Note model to manipulate data in mongodb
var Note = require('./../models/note');

// crypto module to generate verification token
var crypto = require('crypto');
// base64url module to convert base64 to base64 url friendly token
var base64url = require('base64url');

// sparkpost email api module
var SparkPost = require('sparkpost');
var sp = new SparkPost(config.sparkpost_api_key);

// async task
var async = require('async');

// lodash - utility functions
const utility = require('lodash');


// rabbit utility to create queues
var rabbit = require('./../utils/rabbit_util');

//
var winston = require("winston");

winston.loggers.add('colored', {
    console: {
        level: 'info',
        colorize: true,
        label: 'api.js'
    },
    file: {
        level: "debug",
        filename: 'logs/log.txt'
    }
});

var log = winston.loggers.get('colored');

log.info('Info logs');
log.warn("warning logs");
log.error("error logs");
log.silly("silly logs");
log.warn("debug logs");


/**
 * @param  {String}
 * @return {[type]}
 */
var emailToken = function (email, username, token, route, callback) {
    sp.transmissions.send({
        transmissionBody: {
            content: {
                from: config.emailFrom,
                subject: 'Testing!',
                html: '<html><body><p>Hey Siteflu your verification token is <a href="' + config.app_url + ':' + config.app_port + '/api' + route + '/?token=' + token + '&username=' + username + '" >Click this link to verify</a> </p></body></html>'
            },
            recipients: [
                {address: 'ankitwrk@gmail.com'}
            ]
        }
    }, function (err, res) {
        if (err) {
            callback(err);
            console.log('Whoops! Something went wrong');
            console.log(err);
        } else {
            callback(null);
            console.log('Woohoo! You just sent your first mailing!');
        }
    });
};


//================== user routes starts =======================

var username_availability = function (req) {
    if (req.body.username == req.user.username || req.body.email == req.user.email) {
        return {
            success: 1,
            message: "Username is available"
        };
    }
    if (req.body.username && req.body.email) {
        User.findOne({
            $or: [{
                email: req.body.email
            }, {
                username: req.body.username
            }]
        }, function (err, user) {
            // if there is any error
            if (err) {
                return {
                    success: 0,
                    message: "Error while finding username!!"
                };
            }
            // if user found then success false
            if (user) {
                return {
                    success: 0,
                    message: "Username Already exists!!"
                };
            }
            // else username or email is available
            else {
                return {
                    success: 1,
                    message: "Username is available"
                };

            }
        });

    } else {
        return {
            success: 0,
            message: "Field is empty!"
        };
    }
};

/**
 * ['/register' api route, for registration of user]
 * @param  {[request object]} req                    [By default provided by express application]
 * @param  {[response object]} res                   [By default provided by express application]
 * @return {[json]}                                  [Returns a json object]
 */
apiRouter.post("/auth/signup", function (req, res) {
    var user = new User(req.body);
    log.warn("[ /auth/signup ] Requested, post params: ", req.body);

    if (req.body.client_id) {
        log.warn("[ /auth/signup ] /auth/signup", {client_id: req.body.client_id});
        var client_id = req.body.client_id;
        user.clients = [];
        user.clients.push(client_id);

        user.verificationToken = base64url(crypto.randomBytes(200));
        user.verificationTokenExpires = Date.now() + 259200000 // 3 Days
        user.save(function (err, user) {
            // some error in saving the user then return
            if (err) {
                log.error("[ /auth/signup ] Error is saving user", {user: user});
                res.json({
                    message: err,
                    success: 0
                });
                return;
            }
            // sending verification email
            // emailToken(user.email, user.username, user.verificationToken, "/user/verify", function (err) {
            //     if (err) {
            //         console.log("Error-log: Email not sent");
            //     }
            // });
            // if no error then return json object with success message
            var jwtuser = user.toJWTUser();

            var is_new;

            var token = jwt.sign(jwtuser, config.secret, {
                expiresIn: 100080 // one week
            });

            if (jwtuser.clients.indexOf(client_id) == -1) {
                is_new = 1;
                log.warn("[ /auth/signup ] Client with client id: ", client_id, " is new");


                user.save(function (err, user) {
                    // some error in saving the user then return
                    if (err) {
                        res.send(err);
                        log.info("[ /auth/signup ] Error saving user information");
                        return;
                    }
                });
            }
            else {
                is_new = 0;
                log.warn("[ /auth/signup ] Client with client id: ", client_id, " is old");

            }

            var queue_name = user.username + ":" + client_id;

            rabbit.create_queue(queue_name, function () {
                // sending response after craeting queue
                log.info("[ /auth/signup ] Queue created successfully with name ", queue_name);
                log.info("[ /auth/signup ] User signup successful");
                res.json({
                    success: 1,
                    token: token,
                    is_new: is_new
                });
            })
        });
    }
    else {
        log.error("[ /auth/signup ] signup failed: No 'cliend_id' is provided in post params", {post_params: req.body});
        res.json({
            success: 0,
            message: "field 'client_id' for the post request /api" + req.url + " is required"
        });
    }

});

/**
 * ["/login" api route to login in.]
 * @param  {[request object]} req                    [By default provided by express application]
 * @param  {[response object]} res                   [By default provided by express application]
 * @return {[Json]}                                  [Return a json object with keys "success" and "messaage"]
 */
apiRouter.post("/auth/login", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var client_id = req.body.client_id;

    log.warn("[ /auth/login ] requested, post params", req.body);

    if (client_id) {
        // finding one user with username = 'username' or email = 'username' by using mongodb $or query
        User.findOne({$or: [{username: username}, {email: username}]}, function (err, user) {
            // if error in finding the user
            if (err) {
                log.error("[ /auth/login ] Error saving user", {err: err});
                res.send(err);
            }
            // if User not found
            if (!user) {
                log.error("[ /auth/login ] Authentication failed User not found", {post_params: req.body});
                res.json({
                    success: 0,
                    message: "Authentication failed. User not found. "
                });
                // console.log(datetime);
            }
            // if a user found with that username
            else {
                // if password matches
                if (user.authenticate(password)) {
                    log.info("[ /auth/login ] Authentication successful");
                    var jwtuser = user.toJWTUser();

                    var is_new;

                    var token = jwt.sign(jwtuser, config.secret, {
                        expiresIn: 100080 // one week
                    });

                    if (jwtuser.clients.indexOf(client_id) == -1) {
                        log.warn("[ /auth/login ] Client with client id: ", client_id, " is new");
                        is_new = 1;

                        user.clients.push(client_id);
                        user.save(function (err, user) {
                            // some error in saving the user then return
                            if (err) {
                                log.error("[ auth/login ] Error in saving the user ", err);
                                res.send(err);
                                return;
                            }
                        });
                    }
                    else {
                        is_new = 0;
                        log.warn("[ /auth/login ] Client with client id: ", client_id, " is old");
                    }

                    var queue_name = user.username + ":" + client_id;

                    rabbit.create_queue(queue_name, function () {

                        log.info("[ /auth/login ] Queue created successfully with name ", queue_name);
                        log.info("[ /auth/login ] User Logged in successfully");

                        // sending response after craeting queue
                        res.json({
                            success: 1,
                            token: token,
                            is_new: is_new
                        });
                    })
                }
                else {
                    log.error("[ /auth/login ] Authentication failed: wrong password");
                    res.json({
                        success: 0,
                        message: "Authentication failed. Password did not match. "
                    });
                }
            }
        });
    }
    else {
        log.error("[ /auth/login ] login failed: No 'cliend_id' is provided in post params", {post_params: req.body});
        res.json({
            success: 0,
            message: "field 'client_id' for the post request /api" + req.url + " is required"
        });
    }
});

apiRouter.get('/notes', passport.authenticate('jwt', {session: false}), function (req, res) {
    log.warn("[ /notes ] requested, User: ", req.user.username);
    var db = require('./../models/note.js');
    var Note = db(req.user.username);

    Note.find({}, function (err, notes) {
        if (err) {
            log.error("[ /notes ] Notes.find() failed: username=", req.user.username);
            res.send({
                message: err,
                success: 0
            });
            return;
        }
        else {
            log.info("[ /notes ] Notes fetched from database successfully");
            res.send({
                success: 1,
                notes: notes
            })
        }

    });
});

apiRouter.get("/rabbitmq/queue/message/count", passport.authenticate("jwt", {session: false}), function (req, res) {
    // console.log(req.user);
    // console.log(req.query);
    log.warn("[ /rabbitmq/queue/message/count ] requested, Username: ",
        req.user.username, "params => {queue:", req.query.queue, "}");
    var queue = req.query.queue;

    if (queue) {
        var request = require('request');
        request.get(
            'http://guest:guest@localhost:15672/api/queues/%2f/' + queue,
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    // console.log(body)
                    var msg_count;
                    try {
                        msg_count = JSON.parse(body).backing_queue_status.len;
                    }
                    catch (err){
                        msg_count = 0;
                    }
                    log.info("[ /rabbitmq/queue/message/count ] Message count fetched successfully from rabbitmq server " + JSON.parse(body).backing_queue_status);
                    res.json({
                        success: 1,
                        message_count: msg_count,
                    });
                }
                else if (!error) {
                    log.error("[ /rabbitmq/queue/message/count ] Error: Queue not found in rabbitmq server");
                    log.warn("[ /rabbitmq/queue/message/count ] Response from rabbit sever: ", response.body);
                    delete response.request;
                    res.json({
                        success: 0,
                        message: "Object not found on queuing server",
                        server_response: response.body,
                        status_code: response.statusCode
                    });
                }
                else {
                    log.error("[ /rabbitmq/queue/message/count ] Error: ", error);
                    log.warn("[ /rabbitmq/queue/message/count ] Response from rabbit sever: ", response.body);

                    res.json({
                        success: 0,
                        message: error
                    })
                }
            }
        );
    }
    else {
        log.error("[ /rabbitmq/queue/message/count ] Require 'queue' as GET query parameter");
        res.json({
            success: 0,
            message: "Require 'queue' as GET query parameter"

        })
    }
});


apiRouter.route('/user/resetpassword')
// generate a reset token and send an email
    .post(function (req, res) {
        async.waterfall([
                function (done) {
                    crypto.randomBytes(200, function (err, buf) {
                        var token = base64url(buf);
                        done(err, token);
                    });
                },
                function (token, done) {
                    User.findOne({
                        $or: [{
                            email: req.body.username
                        }, {
                            username: req.body.username
                        }]
                    }, function (err, user) {
                        if (err || !user) return done(true);
                        done(err, user, token);
                    });
                },
                function (user, token, done) {
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                    user.save(function (err) {
                        done(err, token, user);
                    });
                },
                function (token, user, done) {
                    emailToken(user.email, user.username, user.resetPasswordToken, "/resetpassword", function (err) {
                        if (!err) {
                            done(null, user);
                            // return;
                        } else {
                            error = {
                                message: "Email sending failed",
                                error: err
                            };
                            done(error, user);
                        }
                    })
                }
            ],
            // callback for async
            function (err, user) {
                var response = {
                    message: 'Mail successfully sent',
                    status: 'success'
                };
                if (err) {
                    res.json(err);
                }
                else {
                    res.json(response);
                }
            });
    })
    // verify the generated resetpassword link
    .get(function (req, res) {
        // find one user with queried email and token
        User.findOne({
            username: req.query.username,
            resetPasswordToken: req.query.token,
            resetPasswordExpires: {
                $gt: Date.now()
            }
        }, function (err, user) {
            // if there is any error
            if (err) {
                res.json({
                    success: 0,
                    message: "Reset Password failed. Some unkown error occured"
                });
            }
            // if no user found with that token
            if (!user) {
                res.json({
                    success: 0,
                    message: "Reset Password failed. Reset token expired or invalid"
                });
            }
            else {
                // set user verified and reset verification token
                user.resetPasswordToken = "";
                user.resetPasswordExpires = "";
                // save the updated user instance
                user.save(function (err) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        res.json({
                            success: 1,
                            message: "Password reset successful"
                        });
                    }
                })
            }
        });
    });

/**
 * [Unprotected verification route, used for email verification]
 * @param  {[request object]} req                    [By default provided by express application]
 * @param  {[response object]} res                   [By default provided by express application]
 * @return {[Json]}
 */

apiRouter.get('/user/verify', function (req, res) {
    // find one user with queried username and token
    User.findOne({
        username: req.query.username,
        verificationToken: req.query.token,
        verificationTokenExpires: {
            $gt: Date.now()
        }
    }, function (err, user) {
        // if there is any error
        if (err) {
            res.json({
                success: 0,
                message: "Verification failed. Some unkown error occured"
            });
        }
        // if no user found with that token
        if (!user) {
            res.json({
                success: 0,
                message: "Verification failed. Verification token expired or invalid"
            });
        }
        // if user found then set verified and reset the token
        else {
            // set user verified and reset verification token
            user.verified = true;
            user.verificationToken = "";
            user.verificationTokenExpires = "";
            // save the updated user instance
            user.save(function (err) {
                if (err) {
                    res.send(err);
                }
                else {
                    res.json({
                        success: 1,
                        message: "Verification successful"
                    });
                }
            })
        }
    })
});

apiRouter.post('/user/password/change', function (req, res) {
    var newPassword = req.body.newPassword;
    var user = req.user;
    user.password = newPassword;
    user.save(function (error) {
        if (error) {
            res.status(500).json({
                success: 0,
                message: "Cannot update password"
            })
        }
        res.json({
            success: 1,
            message: "User password updated successfully"
        });
    })
})

//Checks for username available or not while signup
apiRouter.post('/user/availability', function (req, res) {
    console.log(res.body.username);
    res.json(username_availability(req));
});

// parameter required is
apiRouter.route('/user/me')
// This route will be used by angular to check if a user is logged in
    .get(passport.authenticate('jwt', {session: false}), function (req, res) {
        console.log(req.user);
        if (req.isAuthenticated()) {
            res.json({
                success: 1,
                user: req.user.toJSON()
            })
        } else {
            res.json({
                success: 0,
                user: null
            })
        }
    })

    // This will update user details
    .put(passport.authenticate('jwt', {session: false}), function (req, res) {
        if (req.body.username != undefined || req.body.email != undefined) {
            console.log("present");
            if (username_availability(req).success) {
                var user = req.user;
                var newUser = utility.extend(user, req.body);
                newUser.save(function (error) {
                    if (error) {
                        res.status(500).json({
                            success: 0,
                            message: "Cannot update user data"
                        })
                    }
                    res.json({
                        success: 1,
                        data: newUser
                    })
                })
            }
            else {
                res.json({
                    success: 0,
                    message: "Username or Email already registered"
                })
            }
        }
        else {
            var user = req.user;
            var newUser = utility.extend(user, req.body);
            newUser.save(function (error) {
                if (error) {
                    res.status(500).json({
                        success: 0,
                        message: "Cannot update user data"
                    })
                }
                res.json({
                    success: 1,
                    data: newUser
                })
            })
        }
    });


//=================================== user routes ends =======================================

