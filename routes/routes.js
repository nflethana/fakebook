var db = require('../models/simpleDB.js');
var SHA3 = require('crypto-js/sha3');

var getLogin = function(req, res) {
	// display error message if any
	if (req.session.msg !== '') {
		res.render('login.ejs', {message: null});
	} else {
		// otherwise render login page
		res.render('login.ejs', {message: req.session.msg});
	}
};

var postChecklogin = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	
	// check for empty username or password
	if (username == '') {
		req.session.msg = 'Username cannot be blank!';
		res.redirect('/');
	} else if (password == '') {
		req.session.msg = 'Password cannot be blank!';
		res.redirect('/');
	} else {
		
		var hashedPassword = SHA3(password).toString();

		// check the login
		db.checklogin(username, hashedPassword, function(data, err) {
			if (err) {
				res.send('Error logging in');
			} else if (data) {
				// if the user is authenticated, then log him/her in
				if (data.auth) {
					// login user session and redirect
					req.session.username = username;
					req.session.password = password;
					req.session.userdata = data;
					res.redirect('/home/' + username);
				} else {
					// otherwise notify of incorrect password
					req.session.msg = "I'm sorry, the password you provided was incorrect";
					res.redirect('/');
				}
			} else {
				req.session.msg = "User not found!";
				res.redirect('/');
			}
		});
	}
};

var getSignup = function(req, res) {
	// show error message if any
	if (req.session.msg !== '') {
		res.render('signup.ejs', {message: null});
	} else {
		// otherwise render signup page
		res.render('signup.ejs', {message: req.session.msg});
	}
};

var postCreateaccount = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var firstname = req.body.firstname;
	var lastname = req.body.lastname;
	var interestArray = req.body.interests.split(",");
	var affiliationsArray = req.body.affiliations.split(",");
	var dateofbirthArray = req.body.dateofbirth.split("-");
	
	if (dateofbirthArray.length != 3 || dateofbirthArray[0].length != 2 || dateofbirthArray[1].length != 2 || dateofbirthArray[2].length != 4) {
		req.session.msg = "Date of Birth was not in the correct format!";
		res.redirect('signup');
	}

	// if username or password is empty notify user and request new ones
	if (username === '') {
		req.session.msg = "Username cannot be blank!";
		res.redirect('/signup');
	} else if (password === '') {
		req.session.msg = "Password cannot be blank!";
		res.redirect('/signup');
	} else if (firstname === '') {
		req.session.msg = "firstname cannot be blank!";
		res.redirect('/signup');
	} else if (lastname === '') {
		req.session.msg = "lastname cannot be blank!";
		res.redirect('/signup');
	} else {

		var hashedPassword = SHA3(password).toString();

		// otherwise create the new account
		db.createAccount(username, hashedPassword, firstname, lastname, interestArray, affiliationsArray, dateofbirthArray, function(data, err) {
			if (err) {
				// if there is an error redirect to signup and get ready to display error
				req.session.msg = err;
				res.redirect('/signup');
			} else if (data) {
				// otherwise log the user in and redirect to /restaurants
				req.session.username = username;
				req.session.password = password;
				newData = {};
				newData.firstname = firstname;
				newData.lastname = lastname;
				newData.interestArray = interestArray;
				newData.affiliationsArray = affiliationsArray;
				newData.dateofbirthArray = dateofbirthArray;
				req.session.userdata = newData;
				console.log("in postCreateaccount: " + req.session.msg);
				res.redirect('/home/' + username);
			}
		});
	}
};

var getLogout = function(req, res) {
	// delete information held in the session object to log the user out.  then redirect
	req.session.username = null;
	req.session.password = null;
	req.session.fullname = null;
	req.session.results = null;
	res.redirect('/');
};

var getProfile = function(req, res) {
	console.log(req.param('user'));
	console.log(req.session.username);
	if (req.session.username && req.session.password && req.session.userdata && req.param('user') === req.session.username) {
		//  Get the profile user's data
		db.getUserProfileData(req.param('user'), req.session.username, function(data, err) {
			if (data) {
				console.log(data);
				res.render('profile.ejs', {visitorData: req.session.userdata, walluserData: data, message: err});
			} else {
				console.log(data);
				res.render('profile.ejs', {visitorData: req.session.userdata, walluserData: data, message: err});
			}
		});
	} else if (req.session.username && req.session.password && req.session.userdata && req.params.profile) {
		db.getUserProfileData(req.param('user'), req.session.username, function(data, err) {
			if (data) {
				res.render('profile.ejs', {visitorData: req.session.userdata, walluserData: data, message: err});
			} else {
				res.render('profile.ejs', {visitorData: req.session.userdata, walluserData: data, message: err});
			}
		});
	} else {
		req.session.msg = "You must sign in first!";
		res.redirect('/');
	}
};

var postStatus = function(req, res) {
	var newData = {};
	if (req.session.username && req.session.password && req.session.userdata) {
		console.log(req.body.user);
		console.log(req.body.addPost);
		console.log(req.session.userdata);
		timestamp = new Date().getTime();
		db.addPost(req.body.addPost, req.session.username, req.body.user, timestamp, function(data, err) {
			if (err) {
				newData.stat = false;
				newData.err = err;
				res.send(newData);
			} else {
				newData.stat = true;
				newData.post = req.body.addPost;
				newData.postingUser = req.session.username;
				newData.walluserData = req.body.user;
				newData.timestamp = timestamp;
				res.send(newData);
			}
		});
	} else {
		newData.stat = false;
		newData.err = "Something wen't wrong when posting...";
		res.send(newData);
	}
};

var routes = {
  get_login: getLogin,
  post_checklogin: postChecklogin,
  get_signup: getSignup,
  post_createaccount: postCreateaccount,
  get_profile: getProfile,
  post_status: postStatus,
  // post_deletestatus: postDeleteStatus,
  // get_editprofile: getEditProfile,
  // post_comment: postComment,

  get_logout: getLogout
};

module.exports = routes;
