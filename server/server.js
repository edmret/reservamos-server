'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var cookieParser = require('cookie-parser');
var session = require('express-session');
/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
var bodyParser = require('body-parser');

var app = module.exports = loopback();

//passport configuration
var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);



//providersPassportFile
var config = {};
try{
  config = require('../providers.json');
}catch(err){
  console.trace(err);
  process.exit(1);
}

// to support JSON-encoded bodies
app.middleware('parse', bodyParser.json());
// to support URL-encoded bodies
app.middleware('parse', bodyParser.urlencoded({
    extended: true,
}));


// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
    if (err) throw err;

    // start the server if `$ node server.js`
    if (require.main === module)
        app.start();
});


// The access token is only available after boot
app.middleware('auth', loopback.token({
    model: app.models.accessToken,
}));

app.middleware('session:before', cookieParser(app.get('cookieSecret')));
app.middleware('session', session({
    secret: 'kitty',
    saveUninitialized: true,
    resave: true,
}));

//initialice passport
passportConfigurator.init();

//Set up related models
passportConfigurator.setupModels({
    userModel: app.models.user,
    userIdentityModel: app.models.userIdentity,
    userCredentialModel: app.models.userCredential,
});

// Configure passport strategies for third party auth providers
for(var s in config) {
    var c = config[s];
    c.session = c.session !== false;
    passportConfigurator.configureProvider(s, c);
}

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

/*
app.get('/auth/account', ensureLoggedIn('/login'), function(req, res, next) {

    res.write( JSON.stringify(req.user) );

});*/

app.get('/auth/account', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');



    if(!!req.user){
      res.send(JSON.stringify(req.user, null, 3));
    }else{
      res.send(JSON.stringify( {
        error: true,
        message: "el usuario no está logueado"
      } , null, 3));
    }
});


app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};
