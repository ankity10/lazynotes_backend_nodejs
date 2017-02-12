/**
 * Created by ankit on 12/2/17.
 */
var db = require('./note');
// Mongoose ODM to manipulate mongodb.
var mongoose = require('mongoose');
// Creating instance of config module
var config = require('../config/config');

// Connecting to database using preconfigured path in 'config/config.js' (config.db)
mongoose.connect(config.db);

var note_variable = {
    note_hash: "nkhr888723r",
    window_title: "nbiud32t84973248903uei3",
    process_name: "terminal",
    client: {"hp pavilion": "this sample note_text"}
}
var noteCollection = db("kabra");
var note_obj = new noteCollection(note_variable);

note_obj.save(function (err, data) {
    console.log(err, data);
});

