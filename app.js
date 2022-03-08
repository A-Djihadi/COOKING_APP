const express = require("express");
const app = express();
const dotenv = require("dotenv").config();

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const randToken = require("rand-token");
const nodemailer = require("nodemailer");

const session = require("express-session");
const passport = require("passport");
const passportLocalStrategy = require("passport-local-mongoose");

//MODELS
const User = require("./models/user.js");
const Reset = require("./models/reset.js");
const Receipe = require("./models/receipe.js");
const Ingredient = require("./models/ingredient.js");
const Schedule = require("./models/schedule.js");
const Favorite = require("./models/favorite.js");



// initialisation de passport Session
app.use(session({
    secret: "mySecret",
    resave: false,
    saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());


//mongoose connect
mongoose.connect(process.env.mongo_url,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});


//initialisation de passport
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//EJS
app.set("view engine","ejs");

//PUBLIC FOLDER
app.use(express.static("public"));

//BODY PARSER
app.use(bodyParser.urlencoded({extended :false}));


//

const methodOverride = require("method-override");
const flash = require("connect-flash");
const ingredient = require("./models/ingredient.js");

app.use(flash());
app.use(methodOverride('_method'));

app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
})


//---------------------------------GET-----------------------------------//


app.get("/",(req,res)=>{
    res.render("index");
});

app.get("/signup",(req,res)=>{
    res.render("signup");
});

app.get("/login",(req,res)=>{
    res.render("login")
});

app.get("/dashboard",isLoggedIn,(req,res)=>{ // isloggedin pas trés propre car déclaration plus loin
    console.log(req.user)
    res.render("dashboard");

});

app.get("/logout",(req,res)=>{
    req.logout();
    req.flash("success","Your are now deconnected")
    res.redirect("/login");
});


app.get("/forgot",(req,res)=>{
    res.render("forgot");
});

//--------- LEVEL 2 --------//

app.get("/reset/:token",(req,res)=>{
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    },(err,obj)=>{
        if(err){
        req.flash("error","Token expired")
        res.redirect("/login");
        }else{
            res.render("reset",{token: req.params.token});
        }
    });
});

app.get("/dashboard/favourites",isLoggedIn,(req,res)=>{
    Favorite.find({user: req.user.id},(err,favorite)=>{
        if(err){throw err};
        res.render("favourites",{favorite: favorite});
    });
    
})

app.get("/dashboard/myreceipes/",(req,res)=>{
    Receipe.find({user:req.user.id},(err,receipe)=>{
        if(err){throw err};
        res.render("receipe",{receipe: receipe})
    });
});

app.get("/dashboard/newreceipe",(req,res)=>{
    res.render("newreceipe");
});

app.get("/dashboard/myreceipes/:id",(req,res)=>{
    Receipe.findOne({_id:req.params.id,user:req.user.id},(err,receipeFound)=>{
        if(err){throw err}
        else{
            Ingredient.find({
                user:req.user.id,
                receipe:req.params.id
            },(err,ingredientFound)=>{
                if(err){throw err}
                else{
                    res.render("ingredients",{
                        ingredient: ingredientFound,
                        receipe: receipeFound
                    });
                }
            })
        };
    })
});


app.get("/dashboard/myreceipes/:id/newingredient",(req,res)=>{
    Receipe.findById({_id:req.params.id},(err,found)=>{
        if(err){throw err}
        else{
            res.render("newingredient",{receipe: found});
        }
    })

});

app.get("/dashboard/favourites/newfavourite",isLoggedIn,(req,res)=>{
    res.render("newfavourite");
});

app.get("/dashboard/schedule",isLoggedIn,(req,res)=>{
    Schedule.find({user: req.user.id},(err,schedule)=>{
        if(err){throw err};
        res.render("schedule",{schedule: schedule});
    });   
});

app.get("/dashboard/schedule/newschedule",isLoggedIn,(req,res)=>{
    res.render("newschedule");
});

// ======================================================================//
//---------------------------------POST----------------------------------//
// ======================================================================//
app.post("/signup",(req,res)=>{
    const newUser = new User({
        username: req.body.username
    });

    User.register(newUser,req.body.password,(err,user)=>{
        if(err){
            req.flash("error",err);
            res.render("signup");
        }else{
            passport.authenticate("local")(req,res,()=>{
                req.flash("success","Your are now sign up")
                res.redirect("/");
            });
        };

    });

// THIS COMMENT SECTION CAN BE AN ALTERNATIVE
    //------------depricated from passeport---------///
    // const saltRound = 10;
    // bcrypt.hash(req.body.password,saltRound,(err,hash)=>{
    //     const user ={
    //         username: req.body.username,
    //         password: hash  //Mdp hashed
    //     };

    //     User.create(user,(err)=>{
    //         if(err){throw err};
    //         res.render("index");
    //     });

    // });
});



app.post("/login",(req,res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    passport.authenticate('local', function(err, user) {
        if (err) { return next(err); }
        if (!user) { 
            req.flash("error","Don't find user or wrong password")
            return res.redirect('/login'); }
        req.logIn(user, function(err) {
          if (err) { return next(err); }
          return res.redirect('/dashboard');
        });
      })(req, res);



// THIS COMMENT SECTION CAN BE AN ALTERNATIVE
    // req.login(user,(err)=>{
    //     if(err){throw err}
    //     else{
    //         passport.authenticate('local', { successRedirect: '/',
    //         failureRedirect: '/login',
    //         failureFlash: true })
    //     };
    // });

    // User.findOne({username: req.body.username},(err,foundUser)=>{
    //     if(err){throw err};
    //     if(foundUser){
    //         //--------- depricated from bcrypt-----------///
    //         // if(foundUser.password == req.body.password){
    //         //     res.render("index");
    //         // }

    //         //--------depricated from passeport-------------//
    //         // bcrypt.compare(req.body.password,foundUser.password,(err,result)=>{
    //         //     if(result){
    //         //         console.log("Tu es connecté!");
    //         //         res.render("index");
    //         //     }else{
    //         //         console.log("Tu n'est pas connecté");
    //         //         res.render("index");
    //         //     }
    //         // })

    //         // }else{
    //         //     res.send("Tu n'existe pas ");
    //         // }
    //  });
});


app.post("/forgot",(req,res)=>{
    User.findOne({username : req.body.username},(err,userFound)=>{
        if(err){res.redirect("/login");throw err;}
        else{
            const token = randToken.generate(16);
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000
            });
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.email_send,
                    pass: process.env.PWD
                }
            });
            const mailOptions = {
                from: process.env.email_send,
                to: req.body.username,
                subject: 'link to rese your password',
                text:'click on this link to reset your password: http://localhost:3000/reset/'+token
            }
            console.log("le mail est prêt a être envoyé");

            transporter.sendMail(mailOptions,(err,response)=>{
                if(err){
                    throw err;
                }else{
                    req.flash("success","An email was send to your email")
                    res.redirect("/login");
                }

            })

        }
    });
});

//-----------LEVEL 2---------------//

app.post("/reset/:token",(req,res)=>{
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    },(err,obj)=>{
        if(err){
        req.flash("error","Token expired");
        res.redirect("/login");
        }else{
            if(req.body.password==req.body.password2){
                User.findOne({username: obj.username },(err,user)=>{
                    if(err){throw err};
                    user.setPassword(req.body.password,(err)=>{
                        if(err){throw err};
                        user.save();
                        const updatedReset = {
                            resetPasswordToken: null,
                            resetPasswordExpires: null
                        }
                        Reset.findOneAndUpdate({resetPasswordToken : 
                        req.params.token},updatedReset,(err,obj)=>{
                            if(err){throw err};
                            req.flash("success","Your password was changed successfully")
                            res.redirect("/login");
                        });

                });
                })
            }else{
                req.flash("error","Password don't matched.");
                res.render("reset",{token: req.params.token});
                
            }
        }

    })
});



app.post("/dashboard/newreceipe",(req,res)=>{
    const newReceipe = {
        name: req.body.receipe,
        image: req.body.logo,
        user: req.user.id
    }

    Receipe.create(newReceipe,(err,newReceipe)=>{
        if(err){throw err}
        else{
            req.flash("success","New recipe added");
            res.redirect("/dashboard/myreceipes");
        }
    })
})




app.post("/dashboard/myreceipes/:id",(req,res)=>{
    const newIngredient={
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    ingredient.create(newIngredient,(err,newIngredient)=>{
        if(err){throw err}
        else{
            req.flash("success","Your ingredient has been added !");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }
    })
});

app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn,(req,res)=>{
    Receipe.findOne({user: req.user.id,_id: req.params.id},(err,receipeFound)=>{
        if(err){throw err};
        ingredient.findOne({
            _id: req.params.ingredientid,
            receipe: req.params.id
        },(err,ingredientFound)=>{
            if(err){throw err};
            res.render("edit",{
                ingredient: ingredientFound,
                receipe: receipeFound
            });
        });
    })
});



app.post("/dashboard/favourites",isLoggedIn,(req,res)=>{
    const newfavourite= {
        image: req.body.image,
        title: req.body.title,
        description: req.body.description,
        user: req.user.id
    };
    Favorite.create(newfavourite,(err,newFavourite)=>{
        if(err){throw err};
        req.flash("success","You added a new Fav");
        res.redirect("/dashboard/favourites");
    });
});

app.post("/dashboard/schedule",isLoggedIn,(req,res)=>{
    const newSchedule= {
        recipeName: req.body.receipename,
        scheduleDate: req.body.scheduleDate,
        user: req.user.id,
        time: req.body.time
    };
    Schedule.create(newSchedule,(err,newSchedule)=>{
        if(err){throw err};
        req.flash("success","you just added a new schedule");
        res.redirect("/dashboard/schedule");
    })
});


// ======================================================================//
//---------------------------------DELETE--------------------------------//
// ======================================================================//

app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,(req,res)=>{
    ingredient.deleteOne({_id:req.params.ingredientid},(err)=>{
        if(err){throw err};
        req.flash("success","Your ingredient has been deleted");
        res.redirect("/dashboard/myreceipes/"+req.params.id);
    })
});


app.delete("/dashboard/myreceipes/:id",isLoggedIn,(req,res)=>{
    Receipe.deleteOne({_id:req.params.id},(err)=>{
        if(err){throw err};
        req.flash("success","Your receipe has been deleted");
        res.redirect("/dashboard/myreceipes");
    })
});

app.delete("/dashboard/favourites/:id",isLoggedIn,(req,res)=>{
    Favorite.deleteOne({_id: req.params.id},(err)=>{
        if(err){throw err};
        req.flash("success","Your fav has been deleted");
        res.redirect("/dashboard/favourites");
    });
});

app.delete("/dashboard/schedule/:id",isLoggedIn,(req,res)=>{
    Schedule.deleteOne({_id: req.params.id},(err)=>{
        if(err){throw err};
        req.flash("success","Your schedule has been deleted");
        res.redirect("/dashboard/schedule");
    })
})

// ======================================================================//
//---------------------------------PUT-----------------------------------//
// ======================================================================//


app.put("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,(req,res)=>{
    const ingredientUpdated = {
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.findByIdAndUpdate({_id: req.params.ingredientid}, ingredientUpdated,(err,updatedIngredient)=>{
        if(err){throw err}
        req.flash("success","Successfully updated your ingredient");
        res.redirect("/dashboard/myreceipes/"+req.params.id);
    })
});


// permet de checker la connecton de notre utilisateur
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next(); // permet de passer à la fonction suivante
    }else{
        req.flash("error","Please loggin first")
        res.redirect("/login");
    };
};




app.listen(3000,(req,res)=>{
    console.log("Everthing is Ok");
});