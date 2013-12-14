/* Some initialization boilerplate. Also, we include the code from
   routes/routes.js, so we can have access to the routes. Note that
   we get back the object that is defined at the end of routes.js,
   and that we use the fields of that object (e.g., routes.get_main)
   to access the routes. */

var express = require('express');
var routes = require('./routes/routes.js');
var app = express();

app.use(express.bodyParser());
app.use(express.logger("default"));
// set up cookies
app.use(express.cookieParser());
app.use(express.session({secret: 'thisIsMySecret'}));

app.configure(function(){
	app.use(function(req,res,next){
		res.setHeader("Cache-Control", "no-cache, must-revalidate");
		return next();
	});
});

app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

/* Below we install the routes. The first argument is the URL that we
   are routing, and the second argument is the handler function that
   should be invoked when someone opens that URL. Note the difference
   between app.get and app.post; normal web requests are GETs, but
   POST is often used when submitting web forms ('method="post"'). */

// Set up all routes
app.get('/', routes.get_login);
app.post('/checklogin', routes.post_checklogin);
app.get('/signup', routes.get_signup);
app.post('/createaccount', routes.post_createaccount);
app.get('/:user', routes.get_profile);
app.post('/status', routes.post_status);
// app.post('/deletestatus', routes.post_deletestatus);
// app.get('/edit/:profile', routes.get_editprofile);
// app.post('/edit/:profile', routes.post_editprofile);
// app.post('/comment', routes.post_comment);

app.get('/restaurants', routes.get_restaurants);
app.post('/addrestaurant', routes.post_addrestaurant);
app.get('/logout', routes.get_logout);
app.post('/ajaxadd', routes.post_ajaxadd);
app.get('/ajaxgetrestaurants', routes.get_ajaxgetrestaurants);
app.post('/ajaxremove', routes.post_ajaxremove);

/* Run the server */

console.log('Author: Ethan Abramson (etha)');
app.listen(8080);
console.log('Server running on port 8080. Now open http://localhost:8080/ in your browser!');
