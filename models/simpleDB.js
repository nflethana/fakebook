var AWS = require('aws-sdk');
AWS.config.loadFromPath('config.json');
var simpledb = new AWS.SimpleDB();
var uuid = require('node-uuid');

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
				} else if (data.Attributes[i].Name == 'interests') {
					interestsArray = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'affiliations') {
					affiliationsArray = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'dateofbirth') {
					fullname = data.Attributes[i].Value;
				} else if (data.Attributes[i].Name == 'password') {
					if (data.Attributes[i].Value == password) {
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
			console.log("in createAccount 1" + JSON.stringify(data));
			// user doesn't exists, so create it!
			simpledb.putAttributes({DomainName: 'users', ItemName: username, Attributes: [{'Name': 'password', 'Value': password}, {'Name': 'firstname', 'Value': firstname}, {'Name': 'lastname', 'Value': lastname}, {'Name': 'interests', 'Value': interestsArray.toString()}, {'Name': 'affiliations', 'Value': affiliationsArray.toString()}, {'Name': 'dateofbirth', 'Value': dateofbirthArray.toString()}, {'Name': 'posts1', 'Value': ''}]}, function(err, data) {
				if (err) {
					route_callback(null, "creation error: " + err);
				} else {
					route_callback(true, null);
				}
			});
		} else {
			console.log("in createAccount" + data + err);
			// user exists, so don't create
			route_callback(null, "Username already exists!");
		}
	});
};


var myDB_addPost = function(post, postingUser, wallUser, timestamp, route_callback) {
	
	if (myDB_areFriends(postingUser, wallUser)) {
		var uniqueID = uuid.v1();
		simpledb.putAttributes({DomainName: 'posts', ItemName: ''+uniqueID, Attributes: [{'Name': 'post', 'Value': post}, {'Name': 'postingUser', 'Value': postingUser}, {'Name': 'wallUser', 'Value': wallUser}, {'Name': 'comments', 'Value': ''}, {'Name': 'timestamp', 'Value': timestamp + ''}, {'Name': 'likes', 'Value': '0'}]}, function(err, data) {
			if (err) {
				route_callback(null, "creation error: " + err);
			} else {
				// ADD THE NEW POST TO A LIST OF USER'S POSTS
				simpledb.getAttributes({DomainName: 'users', ItemName: wallUser}, function(err,data) {
					if (err) {
						route_callback(false, "There was a database error");
					} else if (data.Attributes == undefined) {
						// it exists, so don't ruin the data
						route_callback(false, "User already exists!");
					} else {
						var user = {};
						for (i=0; i < data.Attributes.length; i++) {
							if (data.Attributes[i].Name == 'posts1') {
								if (data.Attributes[i].Value !== null) {
									if (data.Attributes[i].Value.length + uniqueID.length + 1 < 512) {
										simpledb.putAttributes({DomainName: 'users', ItemName: wallUser, Attributes: [{'Name': 'posts1', 'Value': data.Attributes[i].Value + uniqueID + ',', Replace: true}]}, function (err, data) {
											if (err) {
												route_callback(null, "creation error:" + err);
											} else {
												route_callback(true, null);
											}
										});
									}
								} else {
									simpledb.putAttributes({DomainName: 'users', ItemName: wallUser, Attributes: [{'Name': 'posts1', 'Value': data.Attributes[i].Value + uniqueID + ',', Replace: true}]}, function(err, data) {
										if (err) {
											route_callback(null, "creation error:" + err);
										} else {
											route_callback(true, null);
										}
									});
								}
							} else {
								//  Account for the case we need to look for posts2,3,4,etc.... and create them!
							}
						}


						// ADD A PART HERE THAT UPDATES FRIENDS OF MY NEW POST FOR TIMELINE PURPOSES


					}
				});
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
				route_callback(false, "User already exists!");
			} else {
				var user = {};
				for (i=0; i < data.Attributes.length; i++) {
					if (data.Attributes[i].Name == 'firstname') {
						user.firstname = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'lastname') {
						user.lastname = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'interests') {
						user.interestsArray = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'affiliations') {
						user.affiliationsArray = data.Attributes[i].Value;
					} else if (data.Attributes[i].Name == 'dateofbirth') {
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
				simpledb.putAttributes({DomainName: 'friendslist', ItemName: user1, Attributes: [{'Name': 'otherUsername', 'Value': user2}]}, function(err, data) {
					if (err) {
						error = err;
					} else {
						auth1 = true;
						error = null;
					}
				});
				simpledb.putAttributes({DomainName: 'friendslist', ItemName: user2, Attributes: [{'Name': 'otherUsername', 'Value': user1}]}, function(err, data) {
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
  addPost: myDB_addPost,
  getUserProfileData: myDB_getUserProfileData,
  areFriends: myDB_areFriends,
  addFriendship: myDb_addFriendship
};
                                        
module.exports = database;
                                        
