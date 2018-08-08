import * as React from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";
import Button from "../Stream/Button";
import * as actions from "./actions";

const isPasswordInvalid = password => password.length === 0;
const isEmailInvalid = email => {
	const emailRegex = new RegExp(
		"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
	);
	return email === "" || emailRegex.test(email) === false;
};

export class Login extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			email: props.initialEmail || "",
			password: "",
			passwordTouched: false,
			emailTouched: false,
			error: {
				invalidCredentials: false
			}
		};
	}

	onBlurPassword = () => this.setState({ passwordTouched: true });

	onBlurEmail = () => this.setState({ emailTouched: true });

	renderEmailError = () => {
		const { email, emailTouched } = this.state;
		if (isEmailInvalid(email) && emailTouched)
			return (
				<small className="error-message">
					<FormattedMessage id="login.email.invalid" />
				</small>
			);
	};

	renderPasswordHelp = () => {
		const { password, passwordTouched } = this.state;
		if (isPasswordInvalid(password) && passwordTouched) {
			return (
				<small className="error-message">
					<FormattedMessage id="login.password.required" />
				</small>
			);
		}
	};

	renderAccountMessage = () => {
		if (this.props.alreadySignedUp)
			return (
				<p>
					<FormattedMessage id="login.alreadySignedUp" />
				</p>
			);
		if (this.props.alreadyConfirmed)
			return (
				<p>
					<FormattedMessage id="login.alreadyConfirmed" />
				</p>
			);
	};

	renderError = () => {
		if (this.state.error.invalidCredentials)
			return (
				<div className="error-message form-error">
					<FormattedMessage id="login.invalid" />
				</div>
			);
		// if (this.props.errors.unknown)
		// 	return <UnexpectedErrorMessage classes="error-message page-error" />;
	};

	isFormInvalid = () => {
		const { password, email } = this.state;
		return isPasswordInvalid(password) || isEmailInvalid(email);
	};

	submitCredentials = async event => {
		event.preventDefault();
		if (this.isFormInvalid()) return;
		const { password, email } = this.state;
		this.setState({ loading: true });
		try {
			await this.props.authenticate({ password, email });
		} catch (error) {
			this.setState({ loading: false });
			this.setState({ error });
		}
	};

	handleClickSignup = event => {
		event.preventDefault();
		this.props.startSignup();
	};

	render() {
		return (
			<div id="login-page">
				<form id="login-form" className="standard-form" onSubmit={this.submitCredentials}>
					<fieldset className="form-body">
						{this.renderAccountMessage()}
						<div id="controls">
							<h3>New to CodeStream?</h3>
							<Button
								id="signup-button"
								className="control-button"
								type="button"
								onClick={this.handleClickSignup}
							>
								<FormattedMessage id="login.footer.signUp" />
							</Button>
							<div className="spacer" />
							<h3>Already Have an Account?</h3>
							{this.renderError()}
							<div id="email-controls" className="control-group">
								<label>
									<FormattedMessage id="login.email.label" />
								</label>
								<input
									id="login-input-email"
									className="native-key-bindings input-text control"
									type="text"
									name="email"
									value={this.state.email}
									onChange={e => this.setState({ email: e.target.value })}
									onBlur={this.onBlurEmail}
									required={this.state.emailTouched}
								/>
								{this.renderEmailError()}
							</div>
							<div id="password-controls" className="control-group">
								<label>
									<FormattedMessage id="login.password.label" />
								</label>
								<input
									id="login-input-password"
									className="native-key-bindings input-text"
									type="password"
									name="password"
									value={this.state.password}
									onChange={e => this.setState({ password: e.target.value })}
									onBlur={this.onBlurPassword}
									required={this.state.passwordTouched}
								/>
								{this.renderPasswordHelp()}
								{/* <div className="help-link">
									<a onClick={() => this.props.transition("forgotPassword")}>
										<FormattedMessage id="login.forgotPassword" />
									</a>
								</div> */}
							</div>
							<div className="button-group">
								<Button
									id="login-button"
									className="control-button"
									type="submit"
									loading={this.state.loading}
								>
									<FormattedMessage id="login.submitButton" />
								</Button>
							</div>
						</div>
					</fieldset>
				</form>
			</div>
		);
	}
}

export default connect(
	state => ({ initialEmail: state.configs.email }),
	actions
)(Login);
