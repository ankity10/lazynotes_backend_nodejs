/* Express instance*/
var express = require('express');

// Express router instance as apiRouter
var apiRouter = express.Router();

// Creating instance of config module
var config = require('./config/config');

// Exporting apiRouter, so that in can be included in root express app.
module.exports = apiRouter;

// jsonwebtoken instance to create json web tokens
var jwt = require('jsonwebtoken');

// Mongoose ODM to manipulate mongodb.
var mongoose = require('mongoose');

// Connecting to database using preconfigured path in 'config/config.js' (config.db)
mongoose.connect(config.db);

// Passport instance for Json web token login strategy.
var passport = require('passport');

// Initializing passport
apiRouter.use(passport.initialize());

// loading passport configuration.
require('./config/passport')(passport);

// User model to manipulate data in mongodb
var User = require('./models/user');

// Note model to manipulate data in mongodb
var Note = require('./models/note');

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
            success: true,
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
                    success: false,
                    message: "Error while finding username!!"
                };
            }
            // if user found then success false
            if (user) {
                return {
                    success: false,
                    message: "Username Already exists!!"
                };
            }
            // else username or email is available
            else {
                return {
                    success: true,
                    message: "Username is available"
                };

            }
        });

    } else {
        return {
            success: false,
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
apiRouter.post("/user/auth/signup", function (req, res) {
    var user = new User(req.body);
    console.log(user);

    user.verificationToken = base64url(crypto.randomBytes(200));
    user.verificationTokenExpires = Date.now() + 259200000 // 3 Days
    user.save(function (err, user) {
        // some error in saving the user then return
        if (err) {
            res.send(err);
            return;
        }
        // sending verification email
        emailToken(user.email, user.username, user.verificationToken, "/user/verify", function (err) {
            if (err) {
                console.log("Error-log: Email not sent");
            }
        });
        // if no error then return json object with success message
        var jwtuser = user.toJWTUser();
        // console.log("user id : "+jwtuser);
        var token = jwt.sign(jwtuser, config.secret, {
            expiresIn: 100080 // one week
        });
        res.json({
            success: true,
            token: "JWT " + token
        });

    });
});

/**
 * ["/login" api route to login in.]
 * @param  {[request object]} req                    [By default provided by express application]
 * @param  {[response object]} res                   [By default provided by express application]
 * @return {[Json]}                                  [Return a json object with keys "success" and "messaage"]
 */
apiRouter.post("/user/auth/login", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    // finding one user with username = 'username' or email = 'username' by using mongodb $or query
    User.findOne({$or: [{username: username}, {email: username}]}, function (err, user) {
        // if error in finding the user
        if (err) {
            res.send(err);
        }
        // if User not found
        if (!user) {
            res.json({
                success: false,
                message: "Authentication failed. User not found. "
            });
            // console.log(datetime);
        }
        // if a user found with that username
        else {
            // if password matches
            if (user.authenticate(password)) {
                var jwtuser = user.toJWTUser();
                console.log("jwt user : " + jwtuser);
                var token = jwt.sign(jwtuser, config.secret, {
                    expiresIn: 100080 // one week
                });
                res.json({
                    success: true,
                    token: token
                });
            }
            else {
                res.json({
                    success: false,
                    message: "Authentication failed. Password did not match. "
                });
            }
        }

    });
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
                    success: false,
                    message: "Reset Password failed. Some unkown error occured"
                });
            }
            // if no user found with that token
            if (!user) {
                res.json({
                    success: false,
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
                            success: true,
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
                success: false,
                message: "Verification failed. Some unkown error occured"
            });
        }
        // if no user found with that token
        if (!user) {
            res.json({
                success: false,
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
                        success: true,
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
                success: false,
                message: "Cannot update password"
            })
        }
        res.json({
            success: true,
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
                success: true,
                user: req.user.toJSON()
            })
        } else {
            res.json({
                success: false,
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
                            success: false,
                            message: "Cannot update user data"
                        })
                    }
                    res.json({
                        success: true,
                        data: newUser
                    })
                })
            }
            else {
                res.json({
                    success: false,
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
                        success: false,
                        message: "Cannot update user data"
                    })
                }
                res.json({
                    success: true,
                    data: newUser
                })
            })
        }
    });
//=================================== user routes ends =======================================

