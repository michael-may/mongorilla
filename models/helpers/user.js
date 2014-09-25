var _ = require('underscore'),
    jsSHA = require('jssha'),
    crypto = require('../../helpers/crypto.js');


var MongorillaUser = function(data) {

    if (!data.photo_url) {
        if (data.photo && data.photo.metadata && data.photo.metadata.s3_url) {
            data.photo_url = data.photo.metadata.s3_url;
        } else if (data.photo) {
            data.photo_url = '/api/fs.files/' + data.photo._id + '/raw';
        } else {
            data.photo_url = '/images/mock/gorilla-user-1.jpg';
        }
    }

    _.extend(this, data);

}

MongorillaUser.prototype.hasPermissions = function (mongorillaCollection, crudActions, specificProperty) {
    // crudActions must be a string: eg. "r", "c", or "cr"
    return this.roles && _(this.roles).any(function (roleName, i) {
        return _(global.config.roles).find(function (role) {
            return role.name === roleName && _(crudActions.split()).all(function (crudAction) {
                return !!~(role.permissions[mongorillaCollection.name]||'').indexOf(crudAction);
            });
        });
    });
};

MongorillaUser.getSessionUserByRoute = function (req, res) {
    return new MongorillaUser(req.session.user);
};

MongorillaUser.getFromConfigByAuth = function(user, pass) {

    // Only allow config file based login if in SETUP mode
    if(process.env.SETUP) {
        var userData = _(global.config.users).find(function (u) {
            // Generate SHA-1 sum, just for consistency with actual db logins
            var hash = new jsSHA(u.password, 'TEXT').getHash('SHA-1', 'HEX');
            return u.username === user && hash === pass;
        });

        return userData ? new MongorillaUser(userData) : null;
    } else {
        return false;
    }

};

MongorillaUser.getFromMongoByAuth = function(user, pass, callback) {

    getModel('mongorillaUser')
        .findOne({
            $or: [
                { username: user },
                { email: user }
            ]
        })
        .populate('photo')
        .exec(function (err, userData) {
            var user;
            if (userData) {
            	// Generate a salted hash of the user's password for comparison
                var challenge = crypto(pass, userData.email, userData.updated);

                if(challenge === userData.password) {
                    user = new MongorillaUser(userData.toJSON());
                }
            }
            callback.call(null, user);
        });

};

MongorillaUser.getFromConfigByUsername = function(username) {

    var userData = _(global.config.users).find(function (u) {
        return u.username === username;
    });

    return userData ? new MongorillaUser(userData) : null;

};

MongorillaUser.getFromMongoByUsername = function(username, callback) {

    getModel('mongorillaUser')
        .findOne({ username: username })
        .populate('photo')
        .exec(function (err, userData) {
            var user;
            if (userData) {
                user = new MongorillaUser(userData.toJSON());
            }
            callback.call(null, user);
        });

};

exports.MongorillaUser = MongorillaUser;
