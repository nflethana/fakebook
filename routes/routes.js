var db = require('../models/simpleDB.js');
var SHA3 = require('crypto-js/sha3');

var getLogin = function(req, res) {
	// display error message if any
	if (req.session.msg !== '') {
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
					res.redirect('/' + username);
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
			}
			else if (data) {
				// otherwise log the user in and redirect to /restaurants
				req.session.username = username;
				req.session.password = password;
				newDate = {};
				newData.firstname = firstname;
				newData.lastname = lastname;
				newData.interestArray = interestArray;
				newData.affiliationsArray = affiliationsArray;
				newData.dateofbirthArray = dateofbirthArray;
				req.session.userdata = newData;
				res.redirect('/' + username);
			}
		});
	}
};

var getRestaurants = function(req, res) {
	// if the user is logged in, get the data and render the page
	if (req.session.username && req.session.password) {
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
		db.addPost(req.body.addPost, req.session.username, req.body.user, 'timestamp', function(data, err) {
			if (err) {
				newData.stat = false;
				newData.err = err;
				res.send(newData);
			} else {
				newData.stat = true;
				newData.post = req.body.addPost;
				newData.postingUser = req.session.username;
				newData.walluserData = req.body.user;
				newData.timestamp = 'timestamp';
				res.send(newData);
			}
		});
	} else {
		newData.stat = false;
		newData.err = "Something wen't wrong when posting...";
		res.send(newData);
	}
}

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

  get_restaurants: getRestaurants,
  post_addrestaurant: postAddrestaurant,
  get_logout: getLogout,
  get_ajaxgetrestaurants: ajaxGetRestaurants,
  post_ajaxadd: ajaxAdd,
  post_ajaxremove: ajaxRemove
};

module.exports = routes;
