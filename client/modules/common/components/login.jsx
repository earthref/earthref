import {Meteor} from 'meteor/meteor';
import React, { useState } from 'react';
import { Button, Icon, Header, Form, Grid, Modal, Segment, Message, Dimmer, Loader } from 'semantic-ui-react';
import { useLocation, useHistory } from "react-router-dom";
import Cookies from 'js-cookie';

import {portals} from '/lib/configs/portals';

const orcidRedirectURL = Meteor.isDevelopment ? 'http://localhost:3000/orcid' : 'https://beta.earthref.org/orcid';
const orcidAuthorizeURL = `https://sandbox.orcid.org/oauth/authorize?client_id=APP-F8JQS3NCYGINEF7B&response_type=code&scope=/read-limited%20/activities/update&redirect_uri=${orcidRedirectURL}`;

export function LogIn({ openInitially, className, portal }) {
	const history = useHistory();
	const location = useLocation();
	const [open, setOpen] = useState(openInitially);
	const [email, setEmail] = useState();
	const [emailError, setEmailError] = useState();
	const [password, setPassword] = useState();
	const [passwordError, setPasswordError] = useState();
	const [loggingIn, setLogginIn] = useState();
	const [logInError, setLogInError] = useState();

  return (
		<Modal size='small' open={open} onClose={() => setOpen(false)}
			trigger={
				<Button className={className} onClick={() => setOpen(true)}>
					<Icon color={portals[portal].color} name='user'/>
					Log In / Register
				</Button>
			}
		>
			<Modal.Header>
				Log In to EarthRef
			</Modal.Header>
			<Modal.Content>
				<Segment basic>
					<Grid columns={2} relaxed='very' divided stackable>
						<Grid.Column>
							<Header as='h4' textAlign='center'>
								With an ORCID iD:
							</Header>
							<img src='/ORCIDiD_icon64x64.png' style={{ margin: '1em auto', display: 'block' }}/>
							<Button fluid color='black' as='a' href={orcidAuthorizeURL} onClick={() => {
								localStorage.setItem('orcid.nextLocation', location.pathname + location.search);
							}}>
								Log In or Register with ORCID
							</Button>
							<Message>
								If an email in your <b>ORCID</b> profile matches your <b>EarthRef</b> account, then
								the accounts will be linked. Otherwise, a new <b>EarthRef</b> account will be created.
							</Message>
						</Grid.Column>
						<Grid.Column>
							<Header as='h4' textAlign='center'>
								Without an ORCID iD:
							</Header>
							<Message error>
								An <b>ORCID</b> account is necessary for new registrations or making contributions to <b>EarthRef</b>.
							</Message>
							<Form>
								<Form.Input
									required
									icon='mail'
									iconPosition='left'
									label='Email'
									error={emailError}
									onChange={(e, { value }) => { setEmail(value); setEmailError(undefined); }}
								/>
								<Form.Input
									required
									icon='key'
									iconPosition='left'
									label='Password'
									type='password'
									error={passwordError}
									onChange={(e, { value }) => { setPassword(value); setPasswordError(undefined); }}
								/>
								<Form.Button fluid
									color={portals[portal].color}
									content='Log In to EarthRef' 
									disabled={!email || !password} 
									loading={loggingIn}
									error={logInError}
									onClick={() => {
										setLogginIn(true);
										setEmailError(undefined);
										setPasswordError(undefined);
										setLogInError(undefined);
										Meteor.call('esPasswordLogIn', { email, password }, (error, user) => {
											console.log(user, error);
											if (error && error.error === "Email") { setEmailError(error.reason); setLogginIn(false); }
											else if (error && error.error === "Password") { setPasswordError(error.reason); setLogginIn(false); }
											else if (error) { setLogInError(error.reason); setLogginIn(false); }
											else {
												Cookies.set('mail_id', user.handle, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
												Cookies.set('user_id', user.id, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
												Cookies.set('name', `${user.name.first} ${user.name.family}`, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
												history.replace(location);
											}
										});
									}}
								/>
							</Form>
						</Grid.Column>
					</Grid>            
				</Segment>
				<Segment basic>
					<Message warning style={{ textAlign: 'center' }}>
						To reset your <b>EarthRef</b> password, first log in or register with <b>ORCID</b> above.
					</Message>
				</Segment>
			</Modal.Content>
			<Modal.Actions>
				<Button icon basic negative as='a' href={'mailto:webmaster@earthref.org?subject=[EarthRef Log In Help]%20I%27m%20having%20trouble%20logging%20in'} style={{ float: 'left' }}>
					<Icon name='mail'/>
					&nbsp;<b>Having Trouble?</b>&nbsp;Email Us
				</Button>
				<Button negative content='Cancel' onClick={() => setOpen(false)}/>
			</Modal.Actions>
		</Modal>
  );
}

export function ORCIDLoggingInModal({ code }) {
	const history = useHistory();
  const [record, setRecord] = useState();
  const [error, setError] = useState();

	if (code && !error && !record) {
		Meteor.call('updateUserWithORCID', { code, id: Cookies.get('user_id', Meteor.isDevelopment ? {} : { domain: '.earthref.org'}) }, (error, record) => {
			if (error) {
				console.error(error);
				setError(error);
			} else {
				// console.log(record);
				Cookies.set('mail_id', record.handle, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
				Cookies.set('user_id', record.id, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
				Cookies.set('name', `${record.name.first} ${record.name.family}`, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
				history.push(localStorage.getItem('orcid.nextLocation'));
			}
		});
	}

  return (
		<Modal size='small' open={true}>
			<Modal.Header>Logging In to EarthRef with ORCID</Modal.Header>
			<Modal.Content>
				{ error && 
					<Message icon error>
						<Icon name='warning' />
						<Message.Content>
							<Message.Header>{ error.error }</Message.Header>
							{ error.reason }
						</Message.Content>
					</Message>
				}
				{ !error && !record &&
					<Segment basic padded='very'>
						<Dimmer active inverted>
							<Loader inline='centered' size='large' />
						</Dimmer>
					</Segment>
				}
				{ !error && record && 
					<div>{ localStorage.getItem('orcid.nextLocation') }</div>
				}
			</Modal.Content>
			<Modal.Actions>
				<Button 
					basic
					negative
					as='a'
					href={'mailto:webmaster@earthref.org?subject=[EarthRef Log In Help]%20I%27m%20having%20trouble%20logging%20in%20with%20ORCID'} 
					style={{ float: 'left' }}
				>
					<Icon name='mail'/>
					&nbsp;<b>Having Trouble?</b>&nbsp;Email Us
				</Button>
				<Button negative content='Cancel' onClick={() =>
					history.push(localStorage.getItem('orcid.nextLocation'))
				} />
				{ error &&
					<Button as='a' href={ orcidAuthorizeURL }>
						<img 
							src='/ORCIDiD_icon64x64.png'
							style={{ margin: '-.2em 1em -.3em -.5em', height: '1.25em' }}
						/>
						Retry ORCID Login
					</Button>
				}
			</Modal.Actions>
		</Modal>
  );
}
