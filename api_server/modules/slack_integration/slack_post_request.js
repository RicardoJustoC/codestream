// fulfill an inbound-email request, called by the inbound email server to
// ingest an inbound email and turn it into a post for the stream

'use strict';

var RestfulRequest = require(process.env.CS_API_TOP + '/lib/util/restful/restful_request');
var BoundAsync = require(process.env.CS_API_TOP + '/server_utils/bound_async');
var PostCreator = require(process.env.CS_API_TOP + '/modules/posts/post_creator');
var PostPublisher = require(process.env.CS_API_TOP + '/modules/posts/post_publisher');
var EmailNotificationSender = require(process.env.CS_API_TOP + '/modules/posts/email_notification_sender');
var UserCreator = require(process.env.CS_API_TOP + '/modules/users/user_creator');
var AddTeamMembers = require(process.env.CS_API_TOP + '/modules/teams/add_team_members');
const Errors = require('./errors');

class SlackPostRequest extends RestfulRequest {

	constructor (options) {
		super(options);
		this.errorHandler.add(Errors);
	}

	// authorize the client (slack-bot) to make this request
	authorize (callback) {
		// we rely on a secret, known only to the slack-bot and the
		// API server ... disallowing arbitrary clients to call this request
		if (this.request.body.secret !== this.api.config.secrets.integration) {
			return callback(this.errorHandler.error('unauthorized'));
		}
		callback();
	}

	// process the request...
	process(callback) {
		this.log(`Processing an inbound slack post from ${this.request.body.authorEmail}`);
		BoundAsync.series(this, [
			this.requireAllow,
			this.getTeam,
			this.getRepo,
			this.getStream,
			this.getParentPost,
			this.getOrCreateAuthor,
			this.addToTeam,
			this.createPost
		], callback);
	}

	// these parameters are required and/or optional for the request
	requireAllow (callback) {
		this.requireAllowParameters(
			'body',
			{
				required: {
					string: ['teamId', 'repoId', 'streamId', 'authorEmail', 'authorUsername', 'parentPostId', 'text'],
				},
				optional: {
					'array(string)': ['mentionedUsers']
				}
			},
			callback
		);
	}

	// get the team
	getTeam (callback) {
		this.data.teams.getById(
			this.request.body.teamId.toLowerCase(),
			(error, team) => {
				if (error) { return callback(error); }
				if (!team) {
					return callback(this.errorHandler.error('notFound', { info: 'team' }));
				}
				this.team = team;
				callback();
			}
		);
	}

	// get the repo
	getRepo (callback) {
		this.data.repos.getById(
			this.request.body.repoId.toLowerCase(),
			(error, repo) => {
				if (error) { return callback(error); }
				if (!repo) {
					return callback(this.errorHandler.error('notFound', { info: 'repo' }));
				}
				this.repo = repo;
				if (repo.get('teamId') !== this.team.id) {
					return callback(this.errorHandler.error('repoNoMatchTeam'));
				}
				callback();
			}
		);
	}

	// get the stream
	getStream (callback) {
		this.data.streams.getById(
			this.request.body.streamId.toLowerCase(),
			(error, stream) => {
				if (error) { return callback(error); }
				if (!stream) {
					return callback(this.errorHandler.error('notFound', { info: 'stream' }));
				}
				this.stream = stream;
				if (stream.get('teamId') !== this.team.id) {
					return callback(this.errorHandler.error('streamNoMatchTeam'));
				}
				callback();
			}
		);
	}

	// get the parent post
	getParentPost (callback) {
		this.data.posts.getById(
			this.request.body.parentPostId.toLowerCase(),
			(error, parentPost) => {
				if (error) { return callback(error); }
				if (!parentPost) {
					return callback(this.errorHandler.error('notFound', { info: 'parent post' }));
				}
				this.parentPost = parentPost;
				if (parentPost.get('streamId') !== this.stream.id) {
					return callback(this.errorHandler.error('parentPostNoMatchStream'));
				}
				callback();
			}
		);
	}

	// if we can't find the author (by matching email), we'll create one as part of the team
	getOrCreateAuthor (callback) {
		const user = {
			email: this.authorEmail,
			username: this.request.body.authorUsername
		};
		this.userCreator = new UserCreator({
			request: this,
			dontSaveIfExists: true,	// if the user exists, just return that user, no need to save
			subscriptionCheat: this.subscriptionCheat // allows unregistered users to subscribe to me-channel, needed for mock testing
		});
		this.userCreator.createUser(
			user,
			(error, userCreated) => {
				if (error) { return callback(error); }
				this.author = userCreated;
				process.nextTick(callback);
			}
		);
	}

	// if we couldn't find a matching author, we created one, and now we need to
	// add them to the team
	addToTeam (callback) {
		// first check if a user we found is a member of the team
		if (this.userCreator.existingModel) {
			if (!this.author.hasTeam(this.team.id)) {
				return callback(this.errorHandler.error('userNotOnTeam'));
			}
			else {
				return callback();
			}
		}
		// add the users to the team
		let adder = new AddTeamMembers({
			request: this,
			users: [this.author],		// add the user issuing the request
			teamId: this.team.id,
			subscriptionCheat: this.subscriptionCheat // allows unregistered users to subscribe to me-channel, needed for mock email testing
		});
		adder.addTeamMembers(callback);
	}

	// create a post for this slack-post in our stream
	createPost (callback) {
		this.user = this.author;
		this.postCreator = new PostCreator({
			request: this
		});
		this.postCreator.createPost({
			streamId: this.stream.id,
			text: this.request.body.text,
			parentPostId: this.parentPost.id
		}, error => {
			if (error) { return callback(error); }
			this.post = this.postCreator.model;
			this.trackPost();
			callback();
		});
	}

	// track this post for analytics, with the possibility that the user may have opted out
	trackPost () {
		const preferences = this.author.get('preferences') || {};
		if (preferences.telemetryConsent === false) { // note: undefined is not an opt-out, so it's opt-in by default
			return;
		}
		const trackObject = {
			distinct_id: this.author.id,
			Type: 'Chat',
			Thread: 'Parent',
			Category: 'Source File',
			'Email Address': this.author.get('email'),
			'Join Method': this.author.get('joinMethod'),
			'Team ID': this.team.id,
 			'Team Size': this.team.get('memberIds').length,
			'Endpoint': 'Slack',
			'Plan': 'Free', // FIXME: update when we have payments
			'Date of Last Post': new Date(this.post.get('createdAt')).toISOString()
		};
		if (this.author.get('registeredAt')) {
			trackObject['Date Signed Up'] = new Date(this.author.get('registeredAt')).toISOString();
		}
		this.api.services.analytics.track(
			'Post Created',
			trackObject,
			{
				request: this,
				user: this.user
			}
		);
	}

	// after the post is created...
	postProcess (callback) {
		BoundAsync.parallel(this, [
			this.publishPost,
			this.sendNotificationEmails
		], callback);
	}

	// after the post is created, publish it to the team or stream
	publishPost (callback) {
		new PostPublisher({
			data: this.responseData,
			request: this,
			messager: this.api.services.messager,
			stream: this.stream.attributes
		}).publishPost(callback);
	}

	// send an email notification as needed to users who are offline
	sendNotificationEmails (callback) {
		new EmailNotificationSender({
			request: this,
			team: this.postCreator.team,
			repo: this.postCreator.repo,
			stream: this.stream,
			post: this.postCreator.model,
			creator: this.fromUser
		}).sendEmailNotifications(callback);
	}
}

module.exports = SlackPostRequest;
