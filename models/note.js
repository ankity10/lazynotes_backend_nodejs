'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    _ = require('lodash');

/**
 * Getter
 */
var escapeProperty = function (value) {
    return _.escape(value); // for more info check https://lodash.com/docs#escape
};


var NoteSchema = new Schema({
    note_hash: {
        type: String,
        unique: true,
        required: true,
        maxlength: [16, "Note_hash should be less than 16 characters"]
    },
    window_title: {
        type: String,
        required: true,
        maxlength: [100, "window_title should be less than 100 characters"]
    },
    process_name: {
        type: String,
        required: true,
        maxlength: [100, "process_name should be less than 100 characters"]
    },
    note_text: {
        type: String,
        required: true,
        maxlength: [10000, "note_text should be less than 10,000 chars"]
    }
});



module.exports = function (username) {
    return mongoose.model(username + "_notes", NoteSchema);
}