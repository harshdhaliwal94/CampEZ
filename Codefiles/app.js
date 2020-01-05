var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose    = require("mongoose");
//variables for authentication setup
var passkey    = require("passport");
var passkeylocal = require("passport-local");

// var async = require("async");
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var async = require("async");
var flash = require("connect-flash");

var dotenv = require('dotenv');
dotenv.load();

var NodeGeocoder = require('node-geocoder');
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

mongoose.connect('mongodb://localhost:27017/ece651', { useCreateIndex:true, useNewUrlParser: true }); 

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname+"/public"));

//creating user schema 
var passmongo = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    //to keep username unique
    username: {type:String,required:true,unique: true},
    password: String,
    PassresetToken: String,
    PassresetExpire  : Date,
    //to keep email unique
    email:{type:String,required:true,unique: true},
    isEmailVerified: { type: Boolean, default: false },
    isAdminType:{type:Boolean,default: false}
});

UserSchema.plugin(passmongo);
var User = mongoose.model("User", UserSchema);

const EmailtokenSchema = new mongoose.Schema({
    _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now, expires: 43200 }
});
var Emailtoken = mongoose.model("Emailtoken", EmailtokenSchema);

//passport config for application
app.use(require("express-session")({
    secret: "ece651project",
    resave: false,
    saveUninitialized: false
}));

//app.use(express.cookieParser('keyboard cat'));
//app.use(express.session({ cookie: {maxAge: 60000}}));
app.use(flash());
//app.use(flash());
app.use(passkey.initialize());
app.use(passkey.session());
passkey.use(new passkeylocal(User.authenticate()));
passkey.serializeUser(User.serializeUser());
passkey.deserializeUser(User.deserializeUser());


app.use(function(req, res, next){
   res.locals.loggedUser = req.user;
   res.locals.msg=req.msg;
   res.locals.error=req.error;
    res.locals.success=req.success;
    res.locals.token=req.params.token;
   next();
});

var commentSchema = mongoose.Schema({
    text: String,
    author: String
});
var Comment = mongoose.model("Comment", commentSchema);


//Setting up camp schema
var cgschema = new mongoose.Schema({
   name: String,
   image: String,
   address: String,
   description: String,
   tel: Number,
   fax: Number,
   email: String,
   lat: Number,
   lng: Number,
   comments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Comment"
      }
   ]
});

function isSignedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/signin");
}

function checkUserCampground(req, res, next){
        if(req.isAuthenticated()){
                if(req.params.commentid){
                    let commentAuthor;
                    Comment.findById(req.params.commentid, function(err,comment){
                    commentAuthor = comment.author;
                    if( req.user.isAdminType || req.user.username===commentAuthor){
                        next();
                    }
                    else {
                        console.log("error", "You don't have permission to delete comment!");
                        req.flash("error", "You don't have permission to do that!");
                        res.redirect("/campinfo?id="+req.params.campid); 
                        }
                    });
                } else if(req.params.campid){
                    if( req.user.isAdminType){
                        next();
                    } else {
                        req.flash("error", "You don't have permission to do that!");
                        res.redirect("/campinfo?id="+req.params.campid);
                    }
                }

           
        } else {
            req.flash("error", "You need to be signed in to do that!");
            res.redirect("/login");
        }
    }

var Camps = mongoose.model("Camps", cgschema);

app.get("/", function(req, res){
   res.render("home");
});

app.get("/home", function(req, res){
   res.render("home");
});


// To show all camps
app.get("/camplist", function(req,res){
    Camps.find({}, function(err,camplist){
      if(err){
          console.log(err);
      } else {
         res.render("camplist",{camplist:camplist});
      }
   });
});

// Adding new camplist to database
app.post("/addcamptodb",isSignedIn, function(req, res){
   var name = req.body.name;
   var image = req.body.image;
   var desc=req.body.desc;
   var tel=req.body.tel;
   var fax=req.body.fax;
   var email=req.body.email;
   geocoder.geocode(req.body.address, function (err, data) {
    if (err || !data.length) {
      console.log(err);
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var add = data[0].formattedAddress;
    var newCampground = {name: name, image: image,description:desc,address:add,tel:tel,fax:fax,email:email,lat:lat,lng:lng};
   //creating new camp and saving it to database
   Camps.create(newCampground, function(err, newlyCreated){
       if(err){
	   console.log('camp is not being saved');
           console.log(err);
       } else {
	   
           //redirecting back to camplist page 
           res.redirect("/camplist");
       }
   });
});
});

// redirecting to add camp page
app.get("/addcamp",isSignedIn, function(req, res){

   res.render("addcamp");

});


//redirection to signup page
app.get("/signup", function(req, res){
   res.render("signup"); 
});
//submission of signup page
app.post("/adduser", function(req, res){
    User.findOne({username: req.body.username}, function(err, user){
       //console.log(req.body.username);
       if(err) {return res.render("signup",{msg:"Error occured please try again"});}
       if(user) {return res.render("signup",{msg:"User already exists. Please choose another username"});}
       
        var tempUser = new User({username: req.body.username,email:req.body.email});
        if(req.body.adminCode === 'ece651admin') {
      tempUser.isAdminType = true;
    }
        User.register(tempUser, req.body.password, function(err, user){
            if(err){
               
                if (err.code == 11000){
                res.render("signup",{msg:"Account with the email already exists."});
                }
                else{res.render("signup",{msg:"Error occured please try again"});}
            }
            else{
                
                // Create a verification token for this user
                var token = new Emailtoken({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
 
                // Save the verification token
                token.save(function (err) {
                    if (err) { return res.status(500).send({ msg: err.message }); }
 
                    // Send the email
                    let resendToken = true;
                    var transporter = nodemailer.createTransport({ service: 'Gmail', auth: { user: 'campezteam@gmail.com', pass: process.env.GMAILPW } });
                    var mailOptions = { from: 'campezteam@gmail.com', to: user.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + '?q=' + token.token + '.\n' };
                    transporter.sendMail(mailOptions, function (err) {
                        if (err) { return res.status(500).send({ msg: err.message }); }
                        res.render("signin",{msg:"A verification email has been sent to "+user.email, resendToken: resendToken});
                    });
                });

            }
         
        });
    });
});

//Resend verification token
app.get('/resendtoken', function(req,res){
    res.render('resendtoken');
});

app.post('/resendtoken', function(req, res, next) {
    User.findOne({ email: req.body.email }, function(err, user) {             // email coming from form
      
        if(err) {return res.render("resendtoken",{msg:"Error occured please try again"});}         //Error handling
        
        if (!user) {
          req.flash('error','Account with that email address does not exists. Please try again');
          return res.redirect('/resendtoken');
        }
        if (user.isEmailVerified){return res.render("signin",{msg: 'This user has already been verified.'})}
        // If we found a user whose email is not verified, generate a new token and resend email
        // Create a verification token for this user
        var token = new Emailtoken({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
        // Save the verification token
        token.save(function (err) {
        if (err) { return res.status(500).send({ msg: err.message }); }
 
        // Send the email
        let resendToken = true;
        var transporter = nodemailer.createTransport({ service: 'Gmail', auth: { user: 'campezteam@gmail.com', pass: process.env.GMAILPW } });
        var mailOptions = { from: 'campezteam@gmail.com', to: user.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + '?q=' + token.token + '.\n' };
        transporter.sendMail(mailOptions, function (err) {
            if (err) { return res.status(500).send({ msg: err.message }); }
            res.render("signin",{msg:"A verification email has been sent to "+user.email, resendToken: resendToken});
            });
        });
    });
});



//Login feature
app.get("/signin", function(req, res){
   res.render("signin"); 
});


app.post("/checksignin", function(req, res, next) {
  passkey.authenticate("local", function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.render("signin",{msg:"Please check your username and password"}); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      if (!req.user.isEmailVerified) {req.logout();
                                      let resendToken = true;
                                      //return res.status(401).send({ type: 'not-verified', msg: 'Your account has not been verified.' });} 
                                      return res.render("signin",{msg:"Your Email is not Verified. Kindly click the link sent to your email",resendToken:resendToken});}
      return res.redirect("/camplist");
    });
  })(req, res, next);
});





// User signout logic
app.get("/signout", function(req, res){
   req.logout();
   res.redirect("/camplist");
});





//Display more information about selected campground

//app.get("/campinfo/:id", function(req, res){
app.get("/campinfo", function(req, res){    
    //console.log(req.query.id);
    Camps.findById(req.query.id).populate("comments").exec(function(err,camp){
       if(err){
           //console.log("It enters error!");
           res.render("campinfo",{camp:camp, clientApiKey:process.env.GEOCODER_PUBLIC_API_KEY});
       } else {
          let maplink = "https://maps.googleapis.com/maps/api/js?key="+process.env.GEOCODER_PUBLIC_API_KEY+"&callback=initMap";
          res.render("campinfo",{camp:camp, maplink:maplink});
       }
    });
    
});


app.get("/comments/new/:id",isSignedIn,  function(req, res){
    //console.log("hello");
    Camps.findById(req.params.id, function(err, camp){
        if(err){
            res.render("addcomment", {camp: camp});
        } else {
             res.render("addcomment", {camp: camp});
        }
    })
});

app.post("/comments/add/:id",isSignedIn, function(req, res){
   Camps.findById(req.params.id, function(err, camp){
       if(err){
           console.log(err);
           res.redirect("/camplist");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               camp.comments.push(comment);
               camp.save();
               res.redirect('/campinfo/?id='+camp._id);
           }
        });
       }
   });

});


app.get('/confirmation', function (req, res, next){
    // req.assert('email', 'Email is not valid').isEmail();
    // req.assert('email', 'Email cannot be blank').notEmpty();
    // req.assert('token', 'Token cannot be blank').notEmpty();
    // req.sanitize('email').normalizeEmail({ remove_dots: false });
 
    // Check for validation errors    
    // var errors = req.validationErrors();
    // if (errors) return res.status(400).send(errors);
 
    // Find a matching token
    Emailtoken.findOne({ token: req.query.q }, function (err, token) {
        // console.log(token);
        if(err) {return res.render("signin",{msg:"Error occured please try the link sent via email again"});}
        if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });
 
        // If we found a token, find a matching user
        User.findOne({ _id: token._userId }, function (err, user) {
            // console.log(req.body);
            if(err) {return res.render("signin",{msg:"Error occured please try the link sent via email again"});}
            if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
            if (user.isEmailVerified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });
 
            // Verify and save the user
            user.isEmailVerified = true;
            user.save(function (err) {
                if (err) { return res.status(500).send({ msg: err.message }); }
                return res.render("signin",{msg:"The account has been verified. Please log in."});
            });
        });
    });

});

// app.post('/resend', userController.resendTokenPost);



var port = process.env.PORT || 3000;
app.listen(port, process.env.IP, function(){
   console.log("Server Started!!!");
});

// password reset
// forgot password

app.get('/forgot', function(req, res) {
  res.render('forgot');
});

app.post('/forgot', function(req, res, next) {
    //array of functions
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {             // email coming from form
      
     if(err) {return res.render("forgot",{msg:"Account with that email address does not exists. Please try again"});}         //Error handling
        
        if (!user) {
          req.flash('error','Account with that email address does not exists. Please try again');
         // res.render("forgot",{msg:'Account with that email address does not exists. Please try again'});
          return res.redirect('/forgot');
        }

        user.PassresetToken  = token;
        user.PassresetExpire  = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var mtport  = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'campezteam@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'campezteam@gmail.com',
        subject: 'CampEZ Password Reset',
        text: 'You are receiving this mail because you (or someone else) have requested to reset the password of your account.\n\n' + 
          'Click on the given link, or paste the link into your browser to complete the process:\n\n' +           
           'http://' + req.headers.host + '/reset/' + token + '\n\n' +           
            'If you did not request to change your password, please ignore this email.\n'
      };
      mtport.sendMail(mailOptions, function(err) {
        req.flash('success', 'A mail has been sent to ' + user.email + ' with further instructions about the process.');
        //res.render("forgot",{msg:"An email has been sent to "+user.email+ ' with further instructions about the process.'});
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.render("signup",{msg:'An email has been sent with further instructions about the process.'});
    res.redirect('/forgot');
  });
});


app.get('/reset/:token', function(req, res) {
  User.findOne({ PassresetToken: req.params.token, PassresetExpire: { $gt: Date.now() } }, function(err, user) {  //make sure token is greater than current date
  
if(err) {return res.render("reset",{msg:"Error occured please try again"});}       // Error handling
  
    if (!user) {
      req.flash('error', 'Password reset token is either invalid or expired. Please try again!');
      return res.redirect('/forgot');
    }
   
    res.render('reset', {token:req.params.token});
  });
});


// entering the new password
app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
        //find a user with that token
      User.findOne({ PassresetToken: req.params.token, PassresetExpire: { $gt: Date.now() } }, function(err, user) {
          
      if(err) {return res.render("reset",{msg:"Error occured please try again"});}        // Error Handling
          
        if (!user) {
          req.flash('error', 'Password reset token is either invalid or expired. Please try again!');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
              
            if(err) {console.log('Password not updated error: '+req.body.password+''+err);return res.render("reset",{msg:"Error occured please try again"});}        // Error handling
              
            user.PassresetToken  = undefined;
            user.PassresetExpire  = undefined;
            // updating the user in database
            user.save(function(err) {
                
             if(err) {console.log('user not saved');return res.render("reset",{msg:"Error occured please try again"});}      //Error Handling
                
              //req.logIn(user, function(err) {
                //done(err, user);
              //});
              done(err,user);
            });
          });
        } else {
            req.flash("error", "Passwords in both fields are different.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var mtport  = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'campezteam@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'campezteam@gmail.com',
        subject: 'CampEZ account password changed',
        text: 'Hello,\n\n' +
         'This is a confirmation mail that the password for your CampEZ account ' + user.email + ' has just been changed. You can login now with your new password.\n'+
          'Happy Camping!!\n'
      };
      mtport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
      
    if(err) {return res.render("reset",{msg:"Error occured please try again"});}        // Error Handling
    res.render("signin",{msg:'Your password has been successfully changed.'});
    res.redirect('/signin');          // Redirecting to camplist page
  });
});


app.post("/deletecamp/:campid",checkUserCampground, function(req, res) {
  Camps.findByIdAndRemove(req.params.campid, {useFindAndModify: false}, function(err, campground) {
   
     if(err){
            console.log(err);
        } else {
           
               Camps.find({}, function(err,camplist){
      if(err){
          console.log(err);
      } else {
         res.render("camplist",{camplist:camplist,success:campground.name + ' deleted!'});
      }
   });
        }
    
    });
  });
  
  
  app.post("/deletecomment/:commentid/:campid",checkUserCampground, function(req, res) {
  Comment.findByIdAndRemove(req.params.commentid, {useFindAndModify: false}, function(err, comment) {
   
     if(err){
            console.log(err);
        } else {
           
               Camps.findById(req.params.campid).populate("comments").exec(function(err,camp){

      if(err){
          let maplink = "https://maps.googleapis.com/maps/api/js?key="+process.env.GEOCODER_PUBLIC_API_KEY+"&callback=initMap";
           res.render("campinfo",{camp:camp, maplink:maplink});
       } else {
          let maplink = "https://maps.googleapis.com/maps/api/js?key="+process.env.GEOCODER_PUBLIC_API_KEY+"&callback=initMap";
          res.render("campinfo",{camp:camp, maplink:maplink});
       }
   });
        }
    
    })
  });