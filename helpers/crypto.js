
/*
 * Creates and returns a salted password hash based on:
 *   -Pre-hashed password (so we don't transmit plain-text passwords)
 *   -User's email address
 *   -Date string for user's last account update
 */

var jsSHA = require('jssha');

module.exports = function(passwordHash, userEmail, updatedDate) {
	var segment1,
		segment2,
		segment3,
		segment4;

	// Make sure our password has /actually/ been hashed
	// just in case hashing is disabled on the front-end somehow
	passwordHash = new jsSHA(passwordHash, 'TEXT').getHash('SHA-1', 'HEX');

	segment1 = passwordHash.substr(0, 20);
	segment2 = new jsSHA(userEmail, 'TEXT').getHash('SHA-256', 'HEX').substr(0, 44);
	segment3 = new jsSHA(updatedDate.toString(), 'TEXT').getHash('SHA-256', 'HEX').substr(-44);
	segment4 = passwordHash.substr(20);

	return new jsSHA(segment1 + segment2 + segment3 + segment4, 'TEXT').getHash('SHA-512', 'HEX');
}