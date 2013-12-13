var AWS = require('aws-sdk');
AWS.config.loadFromPath('config.json');
var simpledb = new AWS.SimpleDB();

/* The function below is an example of a database method. Whenever you need to 
   access your database, you should define a function (myDB_addUser, myDB_getPassword, ...)
   and call that function from your routes - don't just call SimpleDB directly!
   This makes it much easier to make changes to your database schema. */

var myDB_checklogin = function(username, password, route_callback) {
	simpledb.getAttributes({DomainName:'users', ItemName: username}, function(err, data) {
		if (err) {
			route_callback(null, "login error: " + err);
		} else if (data.Attributes == undefined) {
			route_callback(null, null);
		} else {
			// get all the user info to log them in
			var firstname;
			var lastname;
			var interestsArray;
			var affiliationsArray;
			var dateofbirthArray;
			var check = false;
			for (i=0; i < data.Attributes.length; i++) {
				if (data.Attributes[i].Name == 'firstname') {
					firstname = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'lastname') {
					lastname = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'interestsArray') {
					interestsArray = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'affiliationsArray') {
					affiliationsArray = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'dateofbirthArray') {
					fullname = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'password') {
					if (data.Attributes[i].Value == password) {
						console.log("User : " + username + "logged in");
						check = true;
					}
				}
			}
			if (check) {
				// user was authenticated correctly
				route_callback({username: username, firstname: firstname, lastname: lastname, interestsArray: interestsArray, affiliationsArray: affiliationsArray, dateofbirthArray: dateofbirthArray, auth: true}, null);
			} else {
				// user found, but password didn't match
				route_callback({auth: false}, null);
			}
		}
	});
};

var myDB_createAccount = function(username, password, firstname, lastname, interestsArray, affiliationsArray, dateofbirthArray, route_callback) {
	simpledb.getAttributes({DomainName: 'users', ItemName: username}, function(err,data) {
		if (err) {
			route_callback(null, "There was a database error");
		} else if (data.Attributes == undefined) {
			// user doesn't exists, so create it!
			simpledb.putAttributes({DomainName: 'users', ItemName: username, Attributes: [{'Name': 'password', 'Value': password}, {'Name': 'firstname', 'Value': firstname}, {'Name': 'lastname', 'Value': lastname}, {'Name': 'interests', 'Value': interestsArray.toString()}, {'Name': 'affiliations', 'Value': affiliationsArray.toString()}, {'Name': 'dateofbirth', 'Value': dateofbirthArray.toString()}]}, function(err, data) {
				if (err) {
					route_callback(null, "creation error: " + err);
				} else {
					route_callback(true, null);
				}
			});
		} else {
			// user exists, so don't create
			route_callback(null, "Username already exists!");
		}
	});
};

var myDB_getRestaurants = function(route_callback) {
	simpledb.select({SelectExpression: 'Select * from restaurants'}, function(err, data) {
		if (err) {
			route_callback(null, "Lookup error: " + err);
		} else {
			// get all the restaurant data, and save it in a good format
			var array = [];
			for (i=0; i<data.Items.length; i++) {
				array[i] = {};
				array[i].Name = data.Items[i].Name;
				for (j=0; j<data.Items[i].Attributes.length; j++) {
					if (data.Items[i].Attributes[j].Name == "latitude") {
						array[i].Latitude = data.Items[i].Attributes[j].Value;
					} else if (data.Items[i].Attributes[j].Name == "longitude") {
						array[i].Longitude = data.Items[i].Attributes[j].Value;
					} else if (data.Items[i].Attributes[j].Name == "description") {
						array[i].Description = data.Items[i].Attributes[j].Value;
					} else if (data.Items[i].Attributes[j].Name == "creator") {
						array[i].Creator = data.Items[i].Attributes[j].Value;
					}
				}
			}
			route_callback(array, null);
		}
	});
};

var myDB_addRestaurants = function(name, latitude, longitude, description, creator, route_callback) {
	simpledb.getAttributes({DomainName: 'restaurants', ItemName: name}, function(err,data) {
		if (err) {
			route_callback(null, "There was a database error");
		} else if (data.Attributes == undefined) {
			// if the restaurant doesn't exist, add a new one!
			simpledb.putAttributes({DomainName: 'restaurants', ItemName: name, Attributes: [{'Name': 'latitude', 'Value': latitude}, {'Name': 'longitude', 'Value': longitude}, {'Name': 'description', 'Value': description}, {'Name': 'creator', 'Value': creator}]}, function(err, data) {
				if (err) {
					route_callback(null, "creation error: " + err);
				} else {
					route_callback(true, null);
				}
			});
		} else {
			// it exists, so don't ruin the data
			route_callback(null, "Restaurant already exists!");
		}
	});
};

var myDB_removeRestaurant = function(name, route_callback) {
	simpledb.deleteAttributes({DomainName: 'restaurants', ItemName: name}, function(err,data) {
		if (err) {
			route_callback(false, "There was a database error");
		} else {
			// it was removed
			route_callback(true, null);
		}
	});
};

var postIndex = 0;
var myDB_addPost = function(post, postingUser, wallUser, timestamp, route_callback) {
	
	if (myDB_areFriends(postingUser, wallUser)) {
		postIndex++;
		simpledb.putAttributes({DomainName: 'posts', ItemName: ''+postIndex, Attributes: [{'Name': 'post', 'Value': post}, {'Name': 'postingUser', 'Value': postingUser}, {'Name': 'wallUser', 'Value': wallUser}, {'Name': 'comments', 'Value': ''}, {'Name': 'timestamp', 'Value': timestamp}, {'Name': 'likes', 'Value': '0'}]}, function(err, data) {
			if (err) {
				route_callback(null, "creation error: " + err);
			} else {
				route_callback(true, null);
			}
		});
	} else {
		route_callback(false, "You must be friends to post on their wall!");
	}
};

var myDB_getUserProfileData = function(requestedUsername, requestingUsername, route_callback) {
	//  Get the requestedUser's data iff the users are mutual friends
	if (myDB_areFriends(requestedUsername, requestingUsername)) {
		simpledb.getAttributes({DomainName: 'users', ItemName: requestedUsername}, function(err,data) {
			if (err) {
				route_callback(false, "There was a database error");
			} else if (data.Attributes == undefined) {
				// it exists, so don't ruin the data
				route_callback(false, "Restaurant already exists!");
			} else {
				var user = {};
				for (i=0; i < data.Attributes.length; i++) {
					if (data.Attributes[i].Name == 'firstname') {
						user.firstname = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'lastname') {
						user.lastname = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'interestsArray') {
						user.interestsArray = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'affiliationsArray') {
						user.affiliationsArray = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'dateofbirthArray') {
						user.dateofbirthArray = data.Attributes[i].Value;
					}
				}
				user.username = requestedUsername;
				route_callback(user, null);
			}
		});
	} else {
		route_callback(false, "I'm sorry, but you must be friends with this person to view their profile.");
	}
};

var myDB_areFriends = function(user1, user2) {
	// returns true iff user1 is a mutual friend with user2
	// return false iff user1 is NOT a mutual friend with user2
	if (user1 === user2) {
		return true;
	}
	simpledb.getAttributes({DomainName: 'fiendslist', ItemName: user1}, function(err,data) {
		if (err) {
			return false;
		} else if (data.Attributes == undefined) {
			return false;
		} else {
			for (i=0; i < data.Attributes.length; i++) {
				if (data.Attributes[i].Name == 'otherUsername') {
					if (data.Attributes[i].Value === data.Attributes[i].Value === user2){
						return true;
					}
				}
			}
		}
	});
};

var myDb_addFriendship = function(user1, user2) {
	if (user1 === user2) {
		route_callback(false, "You're already friends with yourself silly!");
	} else {
		simpledb.getAttributes({DomainName: 'friendslist', ItemName: user1}, function(err,data) {
			if (err) {
				route_callback(null, "There was a database error");
			} else if (data.Attributes == undefined) {
				// user doesn't exists, so create it!
				var auth1 = false;
				var auth2 = false;
				var error;
				simpledb.putAttributes({DomainName: 'friendslist', ItemName: username, Attributes: [{'Name': 'password', 'Value': password}, {'Name': 'firstname', 'Value': firstname}, {'Name': 'lastname', 'Value': lastname}, {'Name': 'interests', 'Value': interestsArray.toString()}, {'Name': 'affiliations', 'Value': affiliationsArray.toString()}, {'Name': 'dateofbirth', 'Value': dateofbirthArray.toString()}]}, function(err, data) {
					if (err) {
						error = err;
					} else {
						auth1 = true;
						error = null;
					}
				});
				simpledb.putAttributes({DomainName: 'friendslist', ItemName: username, Attributes: [{'Name': 'password', 'Value': password}, {'Name': 'firstname', 'Value': firstname}, {'Name': 'lastname', 'Value': lastname}, {'Name': 'interests', 'Value': interestsArray.toString()}, {'Name': 'affiliations', 'Value': affiliationsArray.toString()}, {'Name': 'dateofbirth', 'Value': dateofbirthArray.toString()}]}, function(err, data) {
					if (err) {
						error = err;
					} else {
						auth2 = true;
						error = null;
					}
				});

				if (auth1 && auth2) {
					route_callback(true, error);
				} else {
					route_callback(false, error);
				}
			} else {
				// connection exists, so don't create one
				route_callback(null, "These users are already friends!");
			}
		});
	}
};


/* We define an object with one field for each method. For instance, below we have
   a 'lookup' field, which is set to the myDB_lookup function. In routes.js, we can
   then invoke db.lookup(...), and that call will be routed to myDB_lookup(...). */

var database = {
  checklogin: myDB_checklogin,
  createAccount: myDB_createAccount,
  getRestaurants: myDB_getRestaurants,
  addRestaurant: myDB_addRestaurants,
  removeRestaurant: myDB_removeRestaurant,
  addPost: myDB_addPost,
  getUserProfileData: myDB_getUserProfileData,
  areFriends: myDB_areFriends,
  addFriendship: myDb_addFriendship
};
                                        
module.exports = database;
                                        
