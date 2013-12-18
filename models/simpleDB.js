var AWS = require('aws-sdk');
AWS.config.loadFromPath('config.json');
var simpledb = new AWS.SimpleDB();
var uuid = require('node-uuid');
var async = require('async');

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
			// user doesn't exists, so create it!
			simpledb.putAttributes({DomainName: 'users', ItemName: username, Attributes: [{'Name': 'password', 'Value': password}, {'Name': 'firstname', 'Value': firstname}, {'Name': 'lastname', 'Value': lastname}, {'Name': 'interests', 'Value': interestsArray.toString()}, {'Name': 'affiliations', 'Value': affiliationsArray.toString()}, {'Name': 'dateofbirth', 'Value': dateofbirthArray.toString()} ]}, function(err, data) {
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


var myDB_addPost = function(post, postingUser, wallUser, timestamp, route_callback) {
	myDB_areFriends(postingUser, wallUser, function(status) {
		if (status) {
			var uniqueID = uuid.v1();
			simpledb.putAttributes({DomainName: 'posts', ItemName: ''+uniqueID, Attributes: [{'Name': 'post', 'Value': post}, {'Name': 'postingUser', 'Value': postingUser}, {'Name': 'wallUser', 'Value': wallUser}, {'Name': 'comments', 'Value': ''}, {'Name': 'timestamp', 'Value': timestamp + ''}, {'Name': 'likes', 'Value': '0'}]}, function(err, data) {
				if (err) {
					route_callback(null, "creation error: " + err);
				} else {
					// Add the new post to the users_posts_rltn table
					simpledb.putAttributes({DomainName: 'users_posts_rltn', ItemName: wallUser, Attributes: [{'Name': 'posts', Value: '' + uniqueID}]}, function(err, data) {
						if (err) {
							route_callback(null, "creation error in users_posts_rltn:" + err);
						} else {
							route_callback(true, null);
						}
					});
				}
			});
		} else {
			route_callback(false, "You must be friends to post on their wall!");
		}
	});
};

var myDB_getUserProfileData = function(requestedUsername, requestingUsername, route_callback) {
	console.log(requestedUsername+ " and "+requestingUsername);
	myDB_areFriends(requestedUsername, requestingUsername, function(flag) {
		if (flag) {
			simpledb.getAttributes({DomainName: 'users', ItemName: requestedUsername}, function(err,data) {
				if (err) {
					route_callback(false, "There was a database error");
				} else if (data.Attributes == undefined) {
					// it exists, so don't ruin the data
					route_callback(false, "User doesn't exist!");
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
					console.log("MIDWAY");
					statusesRaw = [];
					statuses = [];
					simpledb.getAttributes({DomainName: 'users_posts_rltn', ItemName: requestedUsername}, function(err, data) {
						if (err) {
							route_callback(false, "There was a database error getting from users_posts_rltn");
						} else if (data.Attributes !== undefined) {
							for (i=0; i<data.Attributes.length; i++) {
								if (data.Attributes[i].Name == 'posts') {
									statusesRaw.push(data.Attributes[i].Value);
								}
							}
							console.log("Before Async" + statusesRaw);
							async.forEach(statusesRaw, function(s, callback) {
								simpledb.getAttributes({DomainName: 'posts', ItemName: s}, function(err, data) {
									if (err) {

									} else {
										status = {};
										for (j=0; j<data.Attributes.length; j++) {
											if (data.Attributes[j].Name == "post") {
												status.post = data.Attributes[j].Value;
											} else if (data.Attributes[j].Name == "postingUser") {
												status.postingUser = data.Attributes[j].Value;
											} else if (data.Attributes[j].Name == "wallUser") {
												status.wallUser = data.Attributes[j].Value;
											} else if (data.Attributes[j].Name == "comments") {
												status.comments = data.Attributes[j].Value;
											} else if (data.Attributes[j].Name == "timestamp") {
												status.timestamp = data.Attributes[j].Value;
											} else if (data.Attributes[j].Name == "likes") {
												status.likes = data.Attributes[j].Value;
											}
										}
										statuses.push(status);
										callback(err);
									}
								});
							}
							, function (err) {
								console.log("in the outter function");
								user.statuses = statuses;
								user.username = requestedUsername;
								console.log("In getUserProfileData... " + JSON.stringify(user));
								route_callback(user, null);
							});
						} else {
							user.statuses = statuses;
							user.username = requestedUsername;
							route_callback(user, null);
						}
					});
				}
			});
		} else {
			route_callback(false, "I'm sorry, but you must be friends with this person to view their profile.");
		}
	});
};

var myDB_areFriends = function(user1, user2, callback) {
	// returns true iff user1 is a mutual friend with user2
	// return false iff user1 is NOT a mutual friend with user2
	console.log("U1: "+ user1 + " U2: "+user2);
	if (user1 == user2) {
		console.log("He's his own friend");
		callback(true);
	}
	else {
		var str = "SELECT * FROM friends WHERE friend='"+user2+"'";
		var flag = false;
		console.log(str);
		simpledb.select({SelectExpression: str}, function(err, data) {
			if (err) { console.log(err); }
			for (i=0; i<data.Items.length; i++) {
				if (data.Items[i].Name == user1) {
					console.log(user1 + " and " + user2 + " are friends already");
					flag = true;
				}
			}
			if (flag) {
				callback(true);
			} else {
				callback(false);
			}
		});
	}
	
};

var myDb_addFriendship = function(user1, user2, route_callback) {
	if (user1 === user2) {
		route_callback(false, "You're already friends with yourself silly!");
	} else if (myDB_areFriends(user1, user2)) {
		route_callback(false, "You are already with this person!");
	} else {
		simpledb.putAttributes({DomainName: 'friends', ItemName: user1, Attributes: [{'Name': 'friend', 'Value': user2}] }, function(err, data) {
			if (err) {
				route_callback(false, "Failed putAttributes Friend");
			} else {
				simpledb.putAttributes({DomainName: 'friends', ItemName: user2, Attributes: [{'Name': 'friend', 'Value': user1}] }, function(err, data) {
					if (err) {
						route_callback(false, "Failed putAttributes Friend 2");
					} else {
						// this is the success case?
						route_callback(true, null);
					}
				});
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
                                        
