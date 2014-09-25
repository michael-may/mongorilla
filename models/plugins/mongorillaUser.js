/*
 * Implements a pre-save function on the user model
 * to salt and hash the user's password before storing
 */

module.exports = function (schema, options) {
  
    schema.pre('save', function (next) {
        var jsSHA = require('jssha');
        var crypto = require('../../helpers/crypto.js');

        // Update date before passing to crypto
        this.updated = new Date();

        if(typeof this.newpassword !== 'undefined') {
            this.password = crypto(this.newpassword, this.email, this.updated);
            this.newpassword = '';
        } else if(typeof this.password !== 'undefined') {
            this.password = crypto(this.password, this.email, this.updated);
        } else {
            delete this.password;
        }

        next();
    });
  
}
