'use strict';

const EmailHandler = require('./emailHandler');
const Config = require('./config');

class TeamCreatedEmailHandler extends EmailHandler {

	async getSendOptions () {
		const options = await super.getSendOptions();
		options.to = { email: this.message.to, name: 'CodeStream' };
		options.from = { email: Config.senderEmail, name: 'CodeStream' };
		return options;
	}
	
	async renderEmail () {
		this.content = `Created by ${this.user.email}`;
		this.subject = `Team ${this.message.teamName} is now on CodeStream!`;
	}
}

module.exports = TeamCreatedEmailHandler;
