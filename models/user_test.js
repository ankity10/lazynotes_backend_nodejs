/**
 * Created by ankit on 12/2/17.
 */
var User = require('./user');
// Mongoose ODM to manipulate mongodb.
var mongoose = require('mongoose');
// Creating instance of config module
var config = require('../config/config');

// Connecting to database using preconfigured path in 'config/config.js' (config.db)
mongoose.connect(config.db);

var user = {
    'username': 'ankity10',
    'name': "Ankit Yadav",
    'email': "ankitwrk@gmail.com",
    'clients': [{
        'name': "Hp pavilion",
        'note_text': "hello world!"
    }]
};

var new_user = new User(user);
console.log(new_user.get_clients());
new_user.save();