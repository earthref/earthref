import {Meteor} from 'meteor/meteor';
import _ from 'lodash';
import React, { useState } from 'react';
import { Button, Icon, Form, Table, Modal, Segment, Message, Dimmer, Loader, Divider } from 'semantic-ui-react';
import Cookies from 'js-cookie';
import owasp from 'owasp-password-strength-test';

import { portals } from '/lib/configs/portals';

const orcidRedirectURL = Meteor.isDevelopment ? 'http://localhost:3000/orcid' : 'https://beta.earthref.org/orcid';
const orcidAuthorizeURL = `https://sandbox.orcid.org/oauth/authorize?client_id=APP-F8JQS3NCYGINEF7B&response_type=code&scope=/read-limited%20/activities/update&redirect_uri=${orcidRedirectURL}`;

owasp.config({
  allowPassphrases       : false,
  maxLength              : 128,
  minLength              : 10,
  minPhraseLength        : 20,
  minOptionalTestsToPass : 3,
});

export function User({ openInitially, className, portal }) {
  const [open, setOpen] = useState(openInitially);
  const [user, setUser] = useState();
	const [error, setError] = useState();
	const [orcid, setORCID] = useState({ error: undefined, isUpdating: false });
	const [email, setEmail] = useState({ value: undefined, error: undefined, isUpdating: false });
	const [password, setPassword] = useState({ value: undefined, error: undefined, isUpdating: false });
	const [handle, setHandle] = useState({ value: undefined, error: undefined, isUpdating: false });
	const [firstNames, setFirstNames] = useState({ value: undefined, error: undefined, isUpdating: false });
	const [familyName, setFamilyName] = useState({ value: undefined, error: undefined, isUpdating: false });

	const id = parseInt(Cookies.get('user_id', Meteor.isDevelopment ? {} : { domain: '.earthref.org'}));
	if (!error && (!user || user.id !== id)) {
		Meteor.call('esGetUserByID', {id}, (error, user) => {
			if (error) {
				console.error(error);
				setError(error);
			} else {
				console.log(user);
				setUser(user);
			}
		});
	}

  return (
		<Modal size='small' open={open} closeIcon onClose={() => setOpen(false)}
			trigger={
				<Button className={className} onClick={() => setOpen(true)}>
					<Icon color={portals[portal].color} name='user'/>
					{ Cookies.get('name', Meteor.isDevelopment ? {} : { domain: '.earthref.org'}) }
				</Button>
			}
		>
			<Modal.Header>
				EarthRef Account
			</Modal.Header>
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
				{ !error && (!user || user.id !== id) &&
					<Segment basic padded='very'>
						<Dimmer active inverted>
							<Loader inline='centered' size='large' />
						</Dimmer>
					</Segment>
				}
				{ !error && user &&
					<>
						{ user.orcid && user.orcid.id &&
							<Table definition>
								<Table.Body>
									<Table.Row>
										<Table.Cell>
											<img src='/ORCIDiD_icon64x64.png'
												style={{ height: '1.25em', margin: '-.25em .25em -.25em 0' }}
											/>
											ORCID iD
										</Table.Cell>
										<Table.Cell>
											<a href={'https://orcid.org/' + user.orcid.id}>
												{'https://orcid.org/' + user.orcid.id}
											</a>
										</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell><Icon name='user'/>First Names *</Table.Cell>
										<Table.Cell>{ user.name && user.name.first || '' }</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell><Icon name='users'/>Last Name *</Table.Cell>
										<Table.Cell>{ user.name && user.name.family || '' }</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell><Icon name='mail'/>Email *</Table.Cell>
										<Table.Cell>{ user.email || '' }</Table.Cell>
									</Table.Row>
								</Table.Body>
								<Table.Footer fullWidth>
								<Table.Row>
									<Table.HeaderCell colSpan='2'>
										<b>* Log in to your <a href={'https://orcid.org/' + user.orcid.id}>ORCID account</a> to edit these values.</b>
									</Table.HeaderCell>
								</Table.Row>
								<Table.Row>
									<Table.HeaderCell colSpan='2'>
										<Button	floated='right'
											disabled={ password.error || orcid.error || orcid.isUpdating }
											onClick={() => {
												if (!user || !user.password) {
													setPassword(x => { 
														return {
															...x, 
															error: 'An EarthRef password is required before disconnecting your account from ORCID.', 
															isUpdating: false 
														};
													});
												} else {
													setORCID({ error: undefined, isUpdating: true });
													Meteor.call('esDisconnectUserORCID', { id: user.id }, (error) => {
														if (error) {
															console.error(error);
															setORCID({ error: error.reason, isUpdating: false });
														} else {
															setORCID({ error: undefined, isUpdating: false });
															let updatedUser = _.cloneDeep(user);
															delete updatedUser.orcid;
															setUser(updatedUser);
														}
													});
												}
											}}
										>
											{ orcid.isUpdating && 
												<Icon loading name='spinner'/>
											}
											{ !orcid.isUpdating && 
												<img src='/ORCIDiD_icon64x64.png'
													style={{ height: '1.25em', margin: '-.25em .25em -.25em 0' }}
												/>
											}
											Disconnect Your EarthRef Account From ORCID
										</Button>
									</Table.HeaderCell>
								</Table.Row>
							</Table.Footer>
							</Table>
						}
						{ (!user.orcid || !user.orcid.id) && 
							<>
								<Button	fluid as='a' href={ orcidAuthorizeURL }>
									<img src='/ORCIDiD_icon64x64.png'
										style={{ height: '1.25em', margin: '-.25em .25em -.25em 0' }}
									/>
									Connect Your EarthRef Account to ORCID
								</Button>
								<Divider hidden />
							</>
						}
						<Form>
            { (!user.orcid || !user.orcid.id || !user.name) && 
								<>
									<Form.Input
										icon='user'
										iconPosition='left'
										label='First Names'
										placeholder='John A.'
										error={firstNames.error}
										value={firstNames.value !== undefined ? firstNames.value :  (user.name && user.name.first) || ''}
										onChange={(e, { value }) => setFirstNames(x => { return { ...x, value }; }) }
										action={firstNames.value !== undefined && {
											content: 'Save',
											icon: firstNames.isUpdating && <Icon loading name='spinner' /> || 'save',
											color: portals[portal].color,
											disabled: firstNames.isUpdating,
											onClick: () => {
												if (firstNames.value === '') {
													setFirstNames(x => { return {...x, error: 'First Names cannot be blank.', isUpdating: false }; });
												} else {
													setFirstNames(x => { return {...x, error: undefined, isUpdating: true }; });
													Meteor.call('esUpdateUser', { id: user.id, name: { first: firstNames.value }}, (error, updatedUser) => {
														if (error) {
															console.error(error);
															setFirstNames(x => { return {...x, error: error.reason, isUpdating: false }; });
														} else {
															setFirstNames({ value: undefined, error: undefined, isUpdating: false });
															Cookies.set('name', `${updatedUser.name.first} ${updatedUser.name.family}`, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
															setUser(updatedUser);
														}
													});
												}
											}
										}}
									/>
									<Form.Input
										icon='users'
										iconPosition='left'
										label='Family Name'
										placeholder='Doe'
										error={familyName.error}
										value={familyName.value !== undefined ? familyName.value :  (user.name && user.name.family) || ''}
										onChange={(e, { value }) => setFamilyName(x => { return { ...x, value }; }) }
										action={familyName.value !== undefined && {
											content: 'Save',
											icon: familyName.isUpdating && <Icon loading name='spinner' /> || 'save',
											color: portals[portal].color,
											disabled: familyName.isUpdating,
											onClick: () => {
												if (firstNames.value === '') {
													setFamilyName(x => { return {...x, error: 'Family Name cannot be blank.', isUpdating: false }; });
												} else {
													setFamilyName(x => { return {...x, error: undefined, isUpdating: true }; });
													Meteor.call('esUpdateUser', { id: user.id, name: { family: familyName.value }}, (error, updatedUser) => {
														if (error) {
															console.error(error);
															setFamilyName(x => { return {...x, error: error.reason, isUpdating: false }; });
														} else {
															setFamilyName({ value: undefined, error: undefined, isUpdating: false });
															Cookies.set('name', `${updatedUser.name.first} ${updatedUser.name.family}`, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
															setUser(updatedUser);
														}
													});
												}
											}
										}}
									/>
								</>
							}
              { (!user.orcid || !user.orcid.id || !user.email) && 
                <Form.Input
                  icon='mail'
                  iconPosition='left'
                  label='Email'
                  placeholder='Email'
                  error={email.error}
                  value={user.email || ''}
                  onChange={(e, { value }) => setEmail(x => { 
                    return { ...x, 
                      error: 'Please connect your account to ORCID with the button above to control your EarthRef email.' 
                    };
                  }) }
                />
							}
							<Form.Input
								icon='at'
								iconPosition='left'
								label='Handle'
								error={handle.error}
								value={handle.value !== undefined ? handle.value :  user.handle || ''}
								onChange={(e, { value }) => setHandle(x => { return { ...x, value }; }) }
								action={handle.value !== undefined && {
									content: 'Save',
									icon: handle.isUpdating && <Icon loading name='spinner' /> || 'save',
									color: portals[portal].color,
									disabled: handle.isUpdating,
									onClick: () => {
										if (handle.value === '') {
											setHandle(x => { return {...x, error: 'The handle cannot be blank.', isUpdating: false }; });
										} else {
											setHandle(x => { return {...x, error: undefined, isUpdating: true }; });
											Meteor.call('esGetUserByHandle', { handle: handle.value }, (error, existingUser) => {
												if (!error && existingUser) {
													console.error('existingUser', existingUser);
													setHandle(x => { return {...x, error: 'The handle already exists.', isUpdating: false }; });
												} else {
													Meteor.call('esUpdateUser', { id: user.id, handle: handle.value }, (error, updatedUser) => {
														if (error) {
															console.error(error);
															setHandle(x => { return {...x, error: error.reason, isUpdating: false }; });
														} else {
															setHandle({ value: undefined, error: undefined, isUpdating: false });
															Cookies.set('mail_id', `${updatedUser.handle}`, Meteor.isDevelopment ? {} : { domain: '.earthref.org'});
															setUser(updatedUser);
														}
													});
												}
											});
										}
									}
								}}
							/>
							<Form.Input
								icon='key'
								iconPosition='left'
								label='Password'
								type='password'
								error={password.error}
								value={password.value !== undefined ? password.value : ''}
								placeholder={user.has_password && '********' || 'Create a Password'}
								onChange={(e, { value }) => setPassword(x => { return { ...x, value }; }) }
								action={password.value !== undefined && {
									content: 'Save',
									icon: password.isUpdating && <Icon loading name='spinner' /> || 'save',
									color: portals[portal].color,
									disabled: password.isUpdating,
									onClick: () => {
										const passwordTest = owasp.test(password.value);
										if (passwordTest.errors.length) {
											setPassword(x => { return {...x, error: passwordTest.errors.join(' '), isUpdating: false }; });
										} else {
											setPassword(x => { return {...x, error: undefined, isUpdating: true }; });
											Meteor.call('esUpdateUser', { id: user.id, password: password.value }, (error, updatedUser) => {
												if (error) {
													console.error(error);
													setPassword(x => { return {...x, error: error.reason, isUpdating: false }; });
												} else {
													setPassword({ value: undefined, error: undefined, isUpdating: false });
													setUser(updatedUser);
												}
											});
										}
									}
								}}
							/>
						</Form>
					</>
				}
			</Modal.Content>
			{ error &&
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
						<Button
							onClick={() => { setUser(undefined); setError(undefined); }}
						>
							Retry Fetching User Data
						</Button>
				</Modal.Actions>
			}
		</Modal>
  );
}