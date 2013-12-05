var db = require('../models/simpleDB.js');

var getLogin = function(req, res) {
	// display error message if any
	if (req.session.msg !== '') {
		console.log(req.session.msg);
		res.render('login.ejs', {message: req.session.msg});
	} else {
		// otherwise render login page
		res.render('login.ejs', {message: null});
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
		// check the login
		db.checklogin(username, password, function(data, err) {
			if (err) {
				res.send('Error logging in');
			} else if (data) {
				// if the user is authenticated, then log him/her in
				if (data.auth) {
					// login user session and redirect
					req.session.username = username;
					req.session.password = password;
					req.session.fullname = data.fullname;
					res.redirect('/restaurants');
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
	if (req.session.msg) {
		res.render('signup.ejs', {message: req.session.msg});
	} else {
		// otherwise render signup page
		res.render('signup.ejs', {message: null});
	}
};

var postCreateaccount = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var fullname =  req.body.fullname;
	
	// if username or password is empty notify user and request new ones
	if (username === '') {
		req.session.msg = "Username cannot be blank!";
		res.redirect('/signup');
	} else if (password === '') {
		req.session.msg = "Password cannot be blank!";
		res.redirect('/signup');
	} else {
		// otherwise create the new account
		db.createAccount(username, password, fullname, function(data, err) {
			if (err) {
				// if there is an error redirect to signup and get ready to display error
				req.session.msg = err;
				res.redirect('/signup');
			}
			else if (data) {
				// otherwise log the user in and redirect to /restaurants
				req.session.username = username;
				req.session.password = password;
				req.session.fullname = fullname;
				res.redirect('/restaurants');
			}
		});
	}
};

var getRestaurants = function(req, res) {
	// if the user is logged in, get the data and render the page
	if (req.session.username && req.session.password && req.session.fullname) {
		db.getRestaurants(function (data, err) {
			if (err) {
				res.render('restaurants.ejs', {results: req.session.results, message: err, fullname: null, user: req.session.username});
			} else {
				// render the results
				req.session.results = data;
				res.render('restaurants.ejs', {results: req.session.results, message: null, fullname: req.session.fullname, user: req.session.username});
			}
		});
	} else {
		// request that the user login, and redirect to login page
		req.session.msg = "You must sign in first!";
		res.redirect('/');
	}
};

var postAddrestaurant = function(req, res) {
	var name = req.body.name;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	var description = req.body.description;
	
	// if anything is empty, prompt the user for more info
	if (name === "" || latitude === "" || longitude==="" || description==="") {
		res.render('restaurants.ejs', {results: req.session.results, message: "No entries can be empty!", fullname: req.session.fullname, user: req.session.username});
	}
	// add the restaurant otherwise
	db.addRestaurant(name, latitude, longitude, description, req.session.username, function(data, err) {
		if (err) {
			// show error message
			res.render('restaurants.ejs', {results: req.session.results, message: err, fullname: req.session.fullname, user: req.session.username});
		} else {
			// redirect after add
			var sleep = require('sleep');
			sleep.sleep(1);
			res.redirect('/restaurants');
		}
	});
};

var getLogout = function(req, res) {
	// delete information held in the session object to log the user out.  then redirect
	req.session.username = null;
	req.session.password = null;
	req.session.fullname = null;
	req.session.results = null;
	res.redirect('/');
};

var ajaxAdd = function(req, res){
	var lat = req.body.addlat;
	var lng = req.body.addlng;
	var name = req.body.addname;
	var desc = req.body.adddesc;
	var user = req.body.adduser;
	// if anything is empty, prompt the user for more info
	if (name === "" || lat === "" || lng==="" || desc==="") {
		res.send(false);
	}
	// add the restaurant otherwise
	db.addRestaurant(name, lat, lng, desc, user, function(data, err) {
		if (err) {
			// show error message
			res.send(false);
		} else {
			// return that it worked and end
			res.send(true);
		}
	});
};

var ajaxGetRestaurants = function(req, res) {
	// if the user is logged in, get the data and render the page
	if (req.session.username && req.session.password && req.session.fullname) {
		db.getRestaurants(function (data, err) {
			if (err) {
				res.render('restaurants.ejs', {results: req.session.results, message: err, fullname: null, user: req.session.username});
			} else {
				// render the results
				var newData = {};
				newData.array = data;
				newData.user = req.session.username;
				req.session.results = newData;
				res.send(newData);
			}
		});
	} else {
		// request that the user login, and redirect to login page
		req.session.msg = "You must sign in first!";
		res.redirect('/');
	}
};

var ajaxRemove = function(req, res) {
	if (req.session.username !== req.body.deluser) {
		res.send(false);
	} else {
		db.removeRestaurant(req.body.delname, function(data, err) {
			if (data) {
				res.send(true);
			} else {
				res.send(false);
			}
		});
	}
};

var routes = { 
  get_login: getLogin,
  post_checklogin: postChecklogin,
  get_signup: getSignup,
  post_createaccount: postCreateaccount,
  // get_profile: getProfile,
  // post_status: postStatus,
  // post_deletestatus: postDeleteStatus,
  // get_editprofile: getEditProfile,
  // post_editprofile: postEditProfile,
  // post_comment: postComment,

  get_restaurants: getRestaurants,
  post_addrestaurant: postAddrestaurant,
  get_logout: getLogout,
  get_ajaxgetrestaurants: ajaxGetRestaurants,
  post_ajaxadd: ajaxAdd,
  post_ajaxremove: ajaxRemove
};

module.exports = routes;
