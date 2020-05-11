'use strict';

const ConfirmationWithLinkTest = require('./confirmation_with_link_test');
const TokenHandler = require(process.env.CS_API_TOP + '/server_utils/token_handler');
const ApiConfig = require(process.env.CS_API_TOP + '/config/config');
const ObjectID = require('mongodb').ObjectID;

class UserNotFound extends ConfirmationWithLinkTest {

	get description () {
		return 'should return an error when confirming with a token that has a uid for an unknown user';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'user'
		};
	}

	// before the test runs...
	before (callback) {
		// run the standard setup for a confirmation, but put in a random uid
		super.before(error => {
			if (error) { return callback(error); }
			const tokenHandler = new TokenHandler(ApiConfig.getPreferredConfig().secrets.auth);
			const payload = tokenHandler.decode(this.data.token);
			payload.uid = ObjectID();
			this.data.token = tokenHandler.generate(payload, 'conf');
			callback();
		});
	}
}

module.exports = UserNotFound;
