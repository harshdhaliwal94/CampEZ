const app=require('../app'),
chai=require('chai'),
chaiHttp=require('chai-http'),
expect=chai.expect;
chai.use(chaiHttp);
const sinon = require('sinon');
var sandbox = sinon.sandbox.create();
var mongoose = require('mongoose');

var User = mongoose.model("User", app.UserSchema);
var Emailtoken = mongoose.model("Emailtoken",app.EmailtokenSchema);
var Camps = mongoose.model("Camps",app.cgschema);
var Comment = mongoose.model("Comment", app.commentSchema);


const url='https://chandra-mouli-moulicc.c9users.io',
    requester=chai.request.agent(url);
    

//add a dummy user before any tests
before(function(done){
    //console.log('Before all test ran');
    User.deleteOne({username:'testuser'},function(err,del){});
    var testingUser= new User({username:'testuser',email:'fakeemail4testing@nomail.com',isAdminType:true,isEmailVerified:true});
    User.register(testingUser, '123', function(err, user){
        done();
    });
});
    

describe("1. Test for get started button in landing page",function(){
    it("should contain 'Get Started!' button",function(done){
        requester
        .get('/home')
        .end(function(err,res){
            //expect(res).to.have.status(200);
            expect(res.text).to.contain("Get Started");
            done();
        })

    })
})

   
describe("2. Signup functionality ",function(){
    let randomuser={
          username:Math.random().toString(36).substring(7),
          email:Math.random().toString(36).substring(7)+"@gmail.com",
          password:"123"
      };
      
    
   it('onclick of signup button it should redirect to signup page ',function(done){
      requester
      .get("/signup")
      .end(function(err,res){

        expect(res.text).to.contain("Sign Up");
        done();
      })

   })

    it('After submitting signup form it should not register if user already exists',function(done){


       User.findOne({username:'testuser'}, function(err, user){
       if(!user){
           chai.assert.fail("test user not found in DB");
       }
        requester
       .post("/adduser")
       .type('form')
       .send({username:user.username,email:user.email,password:"123"})
       .end(function(err,res){
        expect(res.text).to.contain("User already exists");
        done();
      });
      });

   });

     it('After submitting signup form it if everything is good user must be registered',function(done){
      requester
        .post("/adduser")
        .type('form')
        .send({username:randomuser.username,email:randomuser.email,password:"123"})
        .end(function(err,res){
        expect(res).to.not.have.status(500);
        expect(res.text).to.contain("A verification email has been sent");
        done();
      })


   })


it('should not allow user to signin if email is not verified',function(done){
     requester
    .post('/checksignin')
    .type('form')
    .send({
        _method: 'POST',
        username: randomuser.username,
        password: randomuser.password
        })
    .end(function(err,res){
        expect(res.text).to.contain('Your Email is not Verified');
        done();
    })
   })
   
it('should display a form for resending of email verification token if the user didnt recieve the email',function(done){
      requester
      .get('/resendtoken')
      .end(function(err, res){
         expect(res.text).to.contain('Resend Verification Email');
         done();
      });
   });
   
it('should resend a verification email to user with a new token generated',function(done){
       requester
       .post('/resendtoken')
       .type('form')
       .send({
        _method: 'POST',
        email: randomuser.email
        })
        .end(function(err,res){
            expect(res.text).to.contain('A verification email has been sent to '+randomuser.email);
            done();
        });
   });
   
it('After the user clicks verification link redirect to login and display:email verified',function(done){
       User.findOne({username:randomuser.username},function(err,user){
           if(!user){
               console.log('no user with randomeuser.username');
           }
            Emailtoken.findOne({_userId:user._id},function(err,emailtoken){
                requester
                .get("/confirmation")
                .query({q:emailtoken.token})
                .end(function(err,res){
                    expect(res.text).to.contain("The account has been verified. Please log in.");
                done();
                })
            });
       });
   })
   
   it('After email verification should allow user to login',function(done){
     requester
    .post('/checksignin')
    .type('form')
    .send({
        _method: 'POST',
        username: randomuser.username,
        password: randomuser.password,

        })
    .end(function(err,res){
        expect(res.text).to.contain(randomuser.username);
        done();
    })
   })
   
   it('should log user out upon clicking logout',function(done){
       requester
       .get("/signout")
       .end(function(err,res){
           expect(res.text).to.not.include(randomuser.username);
           done();
       })
   })
   
   it("should contain 'Forgot Password!' text",function(done){
       requester
       .get('/signin')
       .end(function(err,res){
           //expect(res).to.have.status(200);
           expect(res.text).to.contain("Forgot Password");
           done();
       })
   })

   it('On clicking Forgot password link it should redirect to forgot page ',function(done){
     requester
     .get("/forgot")
     .end(function(err,res){
       expect(res.text).to.contain("Reset Password");
       done();
     })
  })
  
  it("should send an email to a registered user to reset password",function(done){
       requester
       .post('/forgot')
   .type('form')
   .send({
   _method: 'POST',
   email: randomuser.email
 })
 .end(function(err,res){
           User.find({email:randomuser.email},function(err,user){
           expect(res.text).to.contain("An email has been sent with further instructions about the process");
           })
           done();
   })
})
  
  
  it("should redirect to enter new password",function(done){
      User.findOne({username:randomuser.username}, function(err,user){
          let token = user.PassresetToken;
          requester
          .get('/reset/'+user.PassresetToken)
          .end(function(err,res){
              expect(res.text).to.contain('Update Password');
              done();
          })
      });
  });
  
  it("should update the newly entered password",function(done){
      User.findOne({username:randomuser.username}, function(err,user){
          let token = user.PassresetToken;
          requester
          .post('/reset/'+user.PassresetToken)
          .type('form')
          .send({
            _method: 'POST',
            password: '1234',
            confirm: '1234'
          })
          .end(function(err,res){
              expect(res.text).to.contain('Log In');
              done();
          })
      });
  });
  
  it('should allow user to login with new password',function(done){
     requester
    .post('/checksignin')
    .type('form')
    .send({
        _method: 'POST',
        username: randomuser.username,
        password: '1234'
        })
    .end(function(err,res){
        expect(res.text).to.contain(randomuser.username);
        done();
    })
   })
  
   
    after(function(done){
        //console.log('after 2. signup test ran');
        User.findOne({username:randomuser.username},function(err,user){
           if(!user){
               console.log('no user with randomeuser.username');
           }
            Emailtoken.deleteOne({_userId:user._id},function(err,del){
                User.deleteOne({username:randomuser.username},function(err,del){
                    done();
                    });
                });
            });
      });
 
})



describe("3. Test to add new camp ground",function(){
    //before((done) => {
    //     sinon.stub(app,'isSignedIn').yields(true);
    //     this.isSignedIn.returns(true);
    //     done();
    //});
    
    it("should not allow add new campground if user not logged in",function(done){
        
        requester
        .get("/addcamp")     
        .end(function(err,res){
             //expect(res).to.have.status(200);
             expect(res.text).to.contain("Log In");
             done();

            })
    })
    
    it("should log in a user so that a camp ground can be added", function(done){
        requester
        .post("/checksignin")
        .type('form')
        .send({
            _method: 'POST',
            username: 'testuser',
            password: '123'
           })
         .end(function(err,res){
             expect(res.text).to.contain('testuser');
             done();
         })
    })
 
    it("should allow logged in user to add camp ground to database", function(done){
    requester
     .post('/addcamptodb')
     .type('form')
     .send({
     _method: 'POST',
     name: 'Test Camp',
     image: 'https://cdn.shopify.com/s/files/1/2468/4011/products/campsite_1_600x.png?v=1524622915',
     desc: 'beautiful place',
     address: 'Victoria Park, Kitchener',
     tel: '2444785643',
     fax: '22356',
     email: 'fakeemail4testing@gmail.ccom'
    })
    .end(function(err,res){
        expect(res).to.have.status(200);
        expect(res.text).to.contain('Test Camp');
        done();
    })
})

it('should log user out upon clicking logout',function(done){
       requester
       .get("/signout")
       .end(function(err,res){
           expect(res.text).to.not.include('testuser');
           done();
       })
   })
   
   after(function(done){
       //console.log('after add db test ran');
        Camps.deleteOne({name:'Test Camp'},function(err,del){
            done();
        });
    });

})

// Admin role and comments: Nidhin and Chandra

describe("4. Test to verify admin privileges",function(){
    let randomuser={
          username:Math.random().toString(36).substring(7),
          email:Math.random().toString(36).substring(7)+"@gmail.com",
          password:"123"
      };
      //var testingUser= new User({username:'testuser',email:'fakeemail4testing@nomail.com',isAdminType:false,isEmailVerified:true});
          let randomuserAdmin={
          username:Math.random().toString(36).substring(7),
          email:Math.random().toString(36).substring(7)+"@gmail.com",
          password:"123",
          adminCode:"ece651admin"
      };
      
      it('User should not be allowed to register as admin without correct admin code - Step 1: Register user as non-admin',function(done){
      requester
        .post("/adduser")
        .type('form')
        .send({username:randomuser.username,email:randomuser.email,password:"123",adminCode:"WrongAdminCode"})
        .end(function(err,res){
        expect(res).to.not.have.status(500);
        expect(res.text).to.contain("A verification email has been sent");
        //User.remove({username:randomuser.username})
        done();
      })


   })
   
   it('User should not be allowed to register as admin without correct admin code - Step 2: Verify user is not registered as admin',function(done){
       User.findOne({username:randomuser.username},function(err,user){
           if(!user){
               console.log('no user with randomeuser.username');
           }
           //console.log(user)
            Emailtoken.findOne({_userId:user._id},function(err,emailtoken){
                requester
                .get("/confirmation")
                .query({q:emailtoken.token})
                .end(function(err,res){
                    expect(user.isAdminType).to.deep.equal(false);
                    
                done();
                })
            });
       });
   })
   


   
   
   
   it('User should be allowed to register as admin with correct admin code - Step 1: Register user as Admin with correct admin code',function(done){

      requester
        .post("/adduser")
        .type('form')
        .send({username:randomuserAdmin.username,email:randomuserAdmin.email,password:"123",adminCode:randomuserAdmin.adminCode})
        .end(function(err,res){
        expect(res).to.not.have.status(500);
        expect(res.text).to.contain("A verification email has been sent");
        done();
      })


   })
   
   it('User should be allowed to register as admin with correct admin code - Step 2: Verify user is registered as admin',function(done){
       User.findOne({username:randomuserAdmin.username},function(err,user){
           if(!user){
               console.log('no user with randomeuser.username');
           }
           else{
               expect(user.isAdminType).to.deep.equal(true);
               done();
               
           }

       });
   })


it("Admin should be allowed to delete any campground - Step 1: Login as normal user(non-admin)", function(done){
        requester
        .post("/checksignin")
        .type('form')
        .send({
            _method: 'POST',
            username: randomuser.username,
            password: '123'
           })
         .end(function(err,res){
             expect(res.text).to.contain(randomuser.username);
             done();
         })
    })
 
    it("Admin should be allowed to delete any campground - Step 2: Add campground to database", function(done){
    requester
     .post('/addcamptodb')
     .type('form')
     .send({
     _method: 'POST',
     name: 'Test Campground',
     image: 'https://cdn.shopify.com/s/files/1/2468/4011/products/campsite_1_600x.png?v=1524622915',
     desc: 'beautiful place',
     address: '625 Westmount Rd N, Waterloo',
     tel: '2444785643',
     fax: '22356',
     email: 'fakeemail4testing@gmail.ccom'
    })
    .end(function(err,res){
        expect(res).to.have.status(200);
        expect(res.text).to.contain('Test Campground');
        done();
    })
})

it('Admin should be allowed to delete any campground - Step 3: Logout normal user(non-admin)',function(done){
       requester
       .get("/signout")
       .end(function(err,res){
           expect(res.text).to.not.include(randomuser.username);
           done();
       })
   })
//console.log("hello");
 it("Admin should be allowed to delete any campground - Step 4: Stub Admin email verification(to facilitate admin login)", function(done){
     
      User.findOne({username:randomuserAdmin.username},function(err,user){
           if(!user){
               console.log('no user with randomeuser.username');
           }
            Emailtoken.findOne({_userId:user._id},function(err,emailtoken){
                requester
                .get("/confirmation")
                .query({q:emailtoken.token})
                .end(function(err,res){
                    expect(res.text).to.contain("The account has been verified. Please log in.");
                done();
                })
            });
       });
     
     
       
    })
    
it("Admin should be allowed to delete any campground - Step 5: Login as Admin", function(done){
     //console.log(randomuserAdmin.password);
        requester
        .post("/checksignin")
        .type('form')
        .send({
            _method: 'POST',
            username: randomuserAdmin.username,
            password: randomuserAdmin.password
           })
         .end(function(err,res){
             expect(res.text).to.contain('Admin');
             done();
         })
       
    })
    
    
    
    
    it("Admin should be allowed to delete any campground - Step 6: Delete the campground added by the user", function(done){
     //console.log(randomuserAdmin.password);
     Camps.findOne({name:"Test Campground"},function(err,camp){
     //console.log(camp);
     requester
        .post("/deletecamp/"+camp._id)
        .end(function(err,res){
             expect(res.text).to.contain('Test Campground deleted!');
             done();
        })
  
         
     })
 
    })
    
    it('Step 7: should Logout user',function(done){
       requester
       .get("/signout")
       .end(function(err,res){
           expect(res.text).to.not.include(randomuserAdmin.username);
           done();
       })
   })
    

     after(function(done){
        //console.log('after 2. signup test ran');
        User.findOne({username:randomuser.username},function(err,user){
           if(!user){
               console.log('no user with randomeuser.username');
           }
            Emailtoken.deleteOne({_userId:user._id},function(err,del){
                User.deleteOne({username:randomuser.username},function(err,del){
                    User.findOne({username:randomuserAdmin.username},function(err,user){
                        if(!user){
                            console.log('no user with randomeuser.username');
                        }
                        Emailtoken.deleteOne({_userId:user._id},function(err,del){
                            User.deleteOne({username:randomuserAdmin.username},function(err,del){
                                Camps.deleteOne({name:'Test Campground'},function(err,del){
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
     });
});

describe("5. Test to verify Comments functionality",function(){
    var randomuser={
          username:Math.random().toString(36).substring(7),
          email:Math.random().toString(36).substring(7)+"@gmail.com",
          isEmailVerified:true,
          isAdminType:false
          };
    before(function(done){
        User.register(randomuser, '123', function(err, user){
            done();
        });
    });
      
      
      it("Add new comment - Step 1: Login as normal user(non-admin)", function(done){
        requester
        .post("/checksignin")
        .type('form')
        .send({
            _method: 'POST',
            username: randomuser.username,
            password: '123'
           })
         .end(function(err,res){
             expect(res.text).to.contain(randomuser.username);
             done();
         })
    })


    it("Add comment to DB - Step 2: Add test campground to database", function(done){
    requester
     .post('/addcamptodb')
     .type('form')
     .send({
     _method: 'POST',
     name: 'Test Campground',
     image: 'https://cdn.shopify.com/s/files/1/2468/4011/products/campsite_1_600x.png?v=1524622915',
     desc: 'beautiful place',
     address: '625 Westmount Rd N, Waterloo',
     tel: '2444785643',
     fax: '22356',
     email: 'fakeemail4testing@gmail.ccom'
    })
    .end(function(err,res){
        expect(res).to.have.status(200);
        expect(res.text).to.contain('Test Campground');
        done();
    })
})




    it("Add Comment - Step 3: Added a comment to test campground", function(done){
        Camps.findOne({name:"Test Campground"},function(err,camp){
            //console.log(camp);
         requester
         .post("/comments/add/"+camp._id)
        .type('form')
        .send({
            _method: 'POST',
            comment: {author: randomuser.username, text:"Test comment 1 added"}
            //password: '123'
           })
         .end(function(err,res){
             expect(res.text).to.contain('Test comment 1 added');
             done();
         })
    })  
})

it("Add Comment - Step 4: Added another comment to test campground", function(done){
        Camps.findOne({name:"Test Campground"},function(err,camp){
            //console.log(camp);
         requester
         .post("/comments/add/"+camp._id)
        .type('form')
        .send({
            _method: 'POST',
            comment: {author: randomuser.username,text:"Test comment 2 added"}
            //password: '123'
           })
         .end(function(err,res){
             expect(res.text).to.contain('Test comment 2 added');
             done();
         })
    })  
})

it('Delete comment - Step 5: should allow logged in user to delete their comment',function(done){
    Camps.findOne({name:"Test Campground"},function(err,camp){
        Comment.findOne({_id:camp.comments[0]},function(err,comment){
        requester
        .post("/deletecomment/"+comment._id+"/"+camp._id)
        .end(function(err,res){
              expect(res.text).to.not.contain('Test comment 1 added');
               done();
            })  
                
        })
        
    })
    
});
    
    it('Admin delete comment - Step 6: should Logout normal user(non-admin)',function(done){
       requester
       .get("/signout")
       .end(function(err,res){
           expect(res.text).to.not.include(randomuser.username);
           done();
       })
   })

    it("Delete comment - Step 7: Admin Login", function(done){
        requester
        .post("/checksignin")
        .type('form')
        .send({
            _method: 'POST',
            username: 'testuser',
            password: '123'
           })
         .end(function(err,res){
             expect(res.text).to.contain('testuser');
             done();
         })
    })
    


     it("Delete Comment - Step 8: Admin should be able to delete comment", function(done){
        Camps.findOne({name:"Test Campground"},function(err,camp){
            Comment.findOne({_id:camp.comments[1]},function(err,comment){
            requester
            .post("/deletecomment/"+comment._id+"/"+camp._id)
            .end(function(err,res){
                expect(res.text).to.not.contain('Test comment 2 added');
                done();
                })  
            })
        }) 
    })
    
    it('Step 7: should Logout user',function(done){
       requester
       .get("/signout")
       .end(function(err,res){
           expect(res.text).to.not.include('testuser');
           done();
       })
   })
    
    
    after(function(done){
        User.findOne({username:randomuser.username},function(err,user){
            if(!user){
                console.log('no user with randomeuser.username');
            }
            Emailtoken.deleteOne({_userId:user._id},function(err,del){
                User.deleteOne({username:randomuser.username},function(err,del){
                    Camps.deleteOne({name:'Test Campground'},function(err,del){
                    done();
                    });
                });
            });
        });
    });
      
});


after(function(done){
    //console.log('after all test ran');
    User.deleteOne({username:'testuser'},function(err,del){
        done();
    });
});



describe("4. Password testing",function(){
    let randomuser={
          username:Math.random().toString(36).substring(7),
          email:Math.random().toString(36).substring(7)+"@gmail.com",
          password:"123"
      };
      
      it("should contain 'Forgot Password!' text",function(done){ 
        requester 
        .get('/signin') 
        .end(function(err,res){ 
            //expect(res).to.have.status(200); 
            expect(res.text).to.contain("Forgot Password"); 
            done(); 
        }) 
    }) 
    
    it('On clicking Forgot password link it should redirect to forgot page ',function(done){ 
      requester 
      .get("/forgot") 
      .end(function(err,res){ 
        expect(res.text).to.contain("Forgot Password"); 
        done(); 
      }) 
   }) 
   
   it('to see if more info link is present in camplist page ',function(done){ 
      requester 
      .get("/camplist") 
      .end(function(err,res){ 
        expect(res.text).to.contain("More Info"); 
        done(); 
      }) 
  })
  
  
  it('should go to campinfo link after clicking more info ',function(done){ 
      requester 
      .get("/camplist") 
      .end(function(err,res){ 
        expect(res.text).to.contain("Contact"); 
        done(); 
      }) 
  }) 
 
 it('it should register a random user to check next test of password reset functionality',function(done){
      requester
        .post("/adduser")
        .type('form')
        .send({username:randomuser.username,email:randomuser.email,password:"123"})
        .end(function(err,res){
        expect(res).to.not.have.status(500);
        expect(res.text).to.contain("A verification email has been sent");
        //User.remove({username:randomuser.username})
        done();
      })


   })
 
  
   it("should send an email to a registered user to reset password",function(done){ 
        requester 
        .post('/forgot') 
    .type('form') 
    .send({ 
    _method: 'POST', 
    email: randomuser.email 
  }) 
  .end(function(err,res){ 
            User.find({email:randomuser.email},function(err,user){ 
            expect(res.text).to.contain("An email has been sent with further instructions about the process."); 
            }) 
            done(); 
    }) 
}) 

})
