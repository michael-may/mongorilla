module.exports = function (schema, options) {
  
    schema.pre('save', function (next) {
        var self = this;
        var mongoose = require('mongoose');
        var _ = require('underscore');
        var jsSHA = require('jssha');
        var crypto = require('../../helpers/crypto.js');

        // Update date before passing to crypto
        this.updated = new Date();
        this.password = crypto(this.password, this.email, this.updated);

        next();
    });
  
}
