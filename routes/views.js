/* jshint node: true */
'use strict';

var express = require('express');
var router = express.Router();
var Access = require(__dirname + '/../config/access');
var helpers = require(__dirname + '/helpers');

router.index = function (req, res) {
	if (req.isAuthenticated()) {
		// Redirect volunteers to the submission page, if they have no pending requests
		if (req.user.access === Access.VOLUNTEER) {
			helpers.getRequests(req, res, {
				userId: req.user._id,
				isPending: true,
			}, function (err, requests) {
				var hasPendingRequests = requests.length > 0;
				if (!err && !hasPendingRequests && req.user.access === Access.VOLUNTEER) {
					res.redirect('/dashboard/submit');
				} else {
					res.redirect('/dashboard');
				}
			});
		} else {
			res.redirect('/dashboard');
		}
	} else {
		res.redirect('/login');
	}
};

router.renderLogin = function (req, res) {
	var sub = {};
	if (req.session.submission) {
		sub = req.session.submission;
		req.session.submission = null;
	}

	res.render('login.jade', {
		title: 'Login',
		messages: req.flash('loginFlash'),
		links: [
			{ text: 'Login', href: '/login', active: true },
		],
		hideLogout: true,
		submission: sub,
	});
};

router.renderRegister = function (req, res) {
	var sub = {};
	if (req.session.submission) {
		sub = req.session.submission;
		req.session.submission = null;
	}

	res.render('register.jade', {
		title: 'Register',
		messages: req.flash('registerFlash'),
		links: [
			{ text: 'Login', href: '/login' },
		],
		hideLogout: true,
		submission: sub,
		token: req.params.token,
	});
};

router.renderReset = function (req, res) {
	var sub = {};
	if (req.session.submission) {
		sub = req.session.submission;
		req.session.submission = null;
	}

	res.render('forgot_password.jade', {
		title: 'Forgot Password',
		messages: req.flash('resetFlash'),
		links: [
			{ text: 'Login', href: '/login' },
		],
		hideLogout: true,
		submission: sub,
	});
};

/* incomplete */
router.renderValidReset = function (req, res) {
	res.render('reset.jade', {
		title: 'Password Reset',
		messages: req.flash('validResetFlash'),
		links: [
			{ text: 'Login', href: '/login' },
		],
		hideLogout: true,
	});
};

router.renderSubform = function (req, res) {
	var sub = {};
	if (req.session.submission) {
		sub = req.session.submission;
		req.session.submission = null;
	}

	var links = [
		{ text: 'Dashboard', href: '/dashboard' },
		{ text: 'Submit a Request', href: '/dashboard/submit', active: true },
	];
	if (req.user.access >= Access.STAFF) {
		links.push({ text: 'Users', href: '/users' });
	}

	if (req.user.access == Access.ADMIN) {
		links.push({ text: 'Add Users', href: '/users/add' });
	}

	res.render('submissionForm.jade', {
		title: 'Submission Form',
		links: links,
		messages: req.flash('submissionFlash'),
		shouldSelectRequestee: req.user.access >= Access.STAFF,
		submission: sub,
		text: {
			submit: 'Submit All Legs',
		},
	});
};

router.renderEditRequest = function (req, res) {
	var sub = {};
	if (req.session.submission) {
		sub = req.session.submission;
		req.session.submission = null;
	} else if (req.request) {
		var legs = [];
		for (var i = 0; i < req.request.legs.length; i++) {
			// Convert the start and end dates into a format that
			// will be accepted by JS Dates
			var leg = req.request.legs[i];
			var start = '' + leg.startDate;
			var end = '' + leg.endDate;
			leg.startDate = (parseInt(start.substring(4, 6)) + 1) + ' ' +
				start.substring(6, 8) + ' ' +
				start.substring(0, 4);
			leg.endDate = (parseInt(end.substring(4, 6)) + 1) + ' ' +
				end.substring(6, 8) + ' ' +
				end.substring(0, 4);

			// Rename the countryCode to country, to match front-end
			leg.country = leg.countryCode;
			delete leg.countryCode;
			legs.push(leg);
		}

		sub = {
			volunteer: req.request.volunteer._id,
			reviewer: (req.request.reviewer ? req.request.reviewer._id : null),
			legs: req.request.legs,
			counterpartApproved: '' + req.request.counterpartApproved,
		};
	}

	var links = [
		{ text: 'Dashboard', href: '/dashboard' },
		{ text: 'Submit a Request', href: '/dashboard/submit' },
	];
	if (req.user.access >= Access.STAFF) {
		links.push({ text: 'Users', href: '/users' });
	}

	if (req.user.access == Access.ADMIN) {
		links.push({ text: 'Add Users', href: '/users/add' });
	}

	res.render('submissionForm.jade', {
		title: 'Edit Request',
		links: links,
		messages: req.flash('submissionFlash'),
		shouldSelectRequestee: req.user.access >= Access.STAFF,
		submission: sub,
		text: {
			submit: 'Update Leave Request',
		},
	});
};

router.renderApproval = function (req, res) {
	helpers.fetchWarnings(function (err, warnings) {
		if (!err) {
			// Merge warnings to requests
			for (var i = 0; i < req.request.legs.length; i++) {
				var cc = req.request.legs[i].countryCode;
				req.request.legs[i].warnings = (warnings[cc] ? warnings[cc] : []);
			}

			if (req.request.status.isPending === false) {
				var flash = {};
				if (req.request.status.isApproved === false) {
					flash = {
						text: 'This request has been denied.',
						class: 'danger',
					};
				} else {
					flash = {
						text: 'This request has been approved.',
						class: 'success',
					};
				}

				req.flash('approvalFlash', flash);
			} else {
				var pendingFlash = {
					text: 'This request is currently pending.',
					class: 'warning',
				};
				req.flash('approvalFlash', pendingFlash);
			}

			var links = [
				{ text: 'Dashboard', href: '/dashboard' },
				{ text: 'Submit a Request', href: '/dashboard/submit' },
			];
			if (req.user.access >= Access.STAFF) {
				links.push({ text: 'Users', href: '/users' });
			}

			if (req.user.access == Access.ADMIN) {
				links.push({ text: 'Add Users', href: '/users/add' });
			}

			res.render('approval.jade', {
				title: 'Request Approval',
				links: links,
				messages: req.flash('approvalFlash'),
				request: req.request,
			});
		} else {
			throw err;
		}
	});
};

router.renderDashboard = function (req, res) {
	if (req.session.returnTo) {
		var redirectTo = req.session.returnTo;
		delete req.session.returnTo;
		res.redirect(redirectTo);
	} else {
		var links = [
			{ text: 'Dashboard', href: '/dashboard', active: true },
			{ text: 'Submit a Request', href: '/dashboard/submit' },
		];
		if (req.user.access >= Access.STAFF) {
			links.push({ text: 'Users', href: '/users' });
		}

		if (req.user.access == Access.ADMIN) {
			links.push({ text: 'Add Users', href: '/users/add' });
		}

		res.render('dashboard.jade', {
			title: 'Dashboard',
			links: links,
			messages: req.flash('dashboardFlash'),
		});
	}
};

router.renderUsers = function (req, res) {
	if (req.user.access >= Access.STAFF) {
		helpers.getUsers({
			maxAccess: req.user.access,
		}, function (err, users) {
			if (err) {
				console.error(err);
			}

			// Split users based on their access level
			var admins = [];
			var staff = [];
			var volunteers = [];
			for (var i = 0; i < users.length; i++) {
				var user = users[i];
				switch (user.access) {
					case Access.ADMIN:
						admins.push(user);
						break;
					case Access.STAFF:
						staff.push(user);
						break;
					case Access.VOLUNTEER:
						volunteers.push(user);
						break;
				}
			}

			var links = [
				{ text: 'Dashboard', href: '/dashboard' },
				{ text: 'Submit a Request', href: '/dashboard/submit' },
				{ text: 'Users', href: '/users', active: true },
			];

			if (req.user.access == Access.ADMIN) {
				links.push({ text: 'Add Users', href: '/users/add' });
			}

			res.render('users.jade', {
				title: 'Users',
				links: links,
				messages: req.flash('usersFlash'),
				admins: admins,
				staff: staff,
				volunteers: volunteers,
			});
		});
	}
};

router.renderProfile = function (req, res) {
	var userId = req.params.userId;

	if (userId === undefined) {
		userId = req.user._id;
	}

	// Verify that the user has the right access to view this profile
	if ((req.user.access == Access.VOLUNTEER &&
		req.user._id == userId) ||
		(req.user.access > Access.VOLUNTEER)) {
		helpers.getUsers({ user: { _id: userId } }, function (err, users) {
			if (err) {
				console.error(err);
			} else {
				if (users.length > 0) {
					var user = users[0];
					var links = [
						{ text: 'Dashboard', href: '/dashboard' },
						{ text: 'Submit a Request', href: '/dashboard/submit' },
					];
					if (req.user.access >= Access.STAFF) {
						links.push({ text: 'Users', href: '/users' });
					}

					if (req.user.access == Access.ADMIN) {
						links.push({ text: 'Add Users', href: '/users/add' });
					}

					res.render('profile.jade', {
						title: 'Profile',
						links: links,
						messages: req.flash('profileFlash'),
						userToShow: user,
						profileClass: ((user._id.equals(req.user._id) ? 'active' : '')),
					});
				} else {
					req.flash('dashboardFlash', {
						text: 'The profile for the requested user could not be found.',
						class: 'danger',
					});
					res.redirect('/dashboard');
				}
			}
		});
	} else {
		req.flash('dashboardFlash', {
			text: 'You do not have access to view this profile.',
			class: 'danger',
		});
		res.redirect('/dashboard');
	}
};

router.renderAddUsers = function (req, res) {
	if (req.user.access >= Access.STAFF) {
		var links = [
			{ text: 'Dashboard', href: '/dashboard' },
			{ text: 'Submit a Request', href: '/dashboard/submit' },
			{ text: 'Users', href: '/users' },
			{ text: 'Add Users', href: '/users/add', active: true },
		];

		res.render('addUsers.jade', {
			title: 'Add Users',
			links: links,
			messages: req.flash('addUsersFlash'),
		});
	} else {
		req.flash({ text: 'You do not have access to this page.', class: 'danger' });
		res.redirect('/dashboard');
	}
};

module.exports = router;
