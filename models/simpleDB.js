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
			var fullname;
			var check = false;
			for (i=0; i < data.Attributes.length; i++) {
				if (data.Attributes[i].Name == 'fullname') {
					fullname = data.Attributes[i].Value;
				}
				if (data.Attributes[i].Name == 'password') {
					if (data.Attributes[i].Value == password) {
						console.log("User : " + username + "logged in");
						check = true;
					}
				}
			}
			if (check) {
				// user was authenticated correctly
				route_callback({fullname: fullname, auth: true}, null);
			} else {
				// user found, but password didn't match
				route_callback({fullname: fullname, auth: false}, null);
			}
		}
	});
};

var myDB_createAccount = function(username, password, fullname, route_callback) {
	simpledb.getAttributes({DomainName: 'users', ItemName: username}, function(err,data) {
		if (err) {
			route_callback(null, "There was a database error");
		} else if (data.Attributes == undefined) {
			// user doesn't exists, so create it!
			simpledb.putAttributes({DomainName: 'users', ItemName: username, Attributes: [{'Name': 'password', 'Value': password}, {'Name': 'fullname', 'Value': fullname}]}, function(err, data) {
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

/* We define an object with one field for each method. For instance, below we have
   a 'lookup' field, which is set to the myDB_lookup function. In routes.js, we can
   then invoke db.lookup(...), and that call will be routed to myDB_lookup(...). */

var database = {
  checklogin: myDB_checklogin,
  createAccount: myDB_createAccount,
  getRestaurants: myDB_getRestaurants,
  addRestaurant: myDB_addRestaurants,
  removeRestaurant: myDB_removeRestaurant
};
                                        
module.exports = database;
                                        
