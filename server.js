const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const nodemailer = require('nodemailer');
const {v4: uuidv4} = require("uuid");
const passport = require("passport");
const initializePassport = require("./passportConfig");
const otpGenerator = require("otp-generator");
const fs = require('fs');

const key = fs.readFileSync('./mkcert/localhost-key.pem');
const cert = fs.readFileSync('./mkcert/localhost.pem');
const https = require('https');
const server = https.createServer({key, cert}, app)

//Brings in pool library from dbConfig.
const {pool} = require("./dbConfig");

//Ports and general rendering.
const PORT = process.env.PORT || 4000;
app.set("view engine", "ejs");
require("dotenv").config();

app.use(express.urlencoded({extended: false}));

//middleware, encrypt, resaves and prevents no values being saved
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
});


//Specific page renders.
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/users/register", (req, res) => {
    res.render("register");
});

app.get("/users/login", (req, res) => {
    res.render("login");
});

app.get("/users/dashboard", notauthenticated, (req, res) => {
    res.render("dashboard");
});

app.get("/users/verify-otp", (req, res) => {
    res.render("verify-otp");
});

app.post("/users/register", async (req, res) => {
    let { name, email, password, password2 } = req.body;
    console.log({ name, email, password, password2 });
    let errmsg = [];

    // Basic validation checks.
    if (!name || !email || !password || !password2) {
        errmsg.push({ message: "Please enter all fields" });
    }

    if (password !== password2) {
        errmsg.push({ message: "Passwords do not match." });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        errmsg.push({ message: "Invalid email address." });
    }

    if (password.length < 8) {
        errmsg.push({ message: "Password must be at least 8 characters long." });
    }

    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
        errmsg.push({
            message: "Password must contain at least one letter and one digit.",
        });
    }

    // If we get errors, pass errors array.
    if (errmsg.length > 0) {
        res.render("register", { errmsg });
    } else {
        // Our form validation has passed.

        // Hashing password and salting.
        const salt = await bcrypt.genSalt(10);
        hash = await bcrypt.hash(password, salt);
        console.log(hash);

        // Email verification token.
        const token = uuidv4();

        // Adds variables into array to see if database works.
        pool.query(`SELECT * FROM users WHERE email = $1`, [email], (err, i) => {
            if (err) {
                throw err;
            } else {
                console.log(i.rows);

                // Checks if email has already been registered.
                if (i.rows.length > 0) {
                    errmsg.push({ message: "Email has already been registered." });
                    res.render("register", { errmsg });
                } else {
                    pool.query(
                        `INSERT INTO users (name, email, password, token) VALUES ($1, $2, $3, $4) RETURNING id, email, password, token`,
                        [name, email, hash, token],
                        (err, i) => {
                            if (err) {
                                throw err;
                            } else {
                                console.log(i.rows);
                                req.flash(
                                    "success_msg",
                                    "You have been registered, check your email for the verification link!"
                                );
                            }

                            // Registration link.
                            const user = i.rows[0];
                            const link = `http://localhost:4000/users/verify/${user.token}`;

                            // The information that our email will hold (and errors if it doesn't transport properly).
                            const mailinfo = {
                                from: process.env.AUTH_EMAIL,
                                to: email,
                                subject: "Account Verification Link",
                                html: `Your verification link: <a href="${link}">${link}</a>`,
                            };

                            transporter.sendMail(mailinfo, (err) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    res.redirect("/users/login");
                                }
                            });
                        }
                    );
                }
            }
        });
    }
});


app.get("/users/verify/:token", async (req, res) => {
    const token = req.params.token;

    try {
        await pool.query(`UPDATE users SET verified = true WHERE token = $1`, [token]);
        res.redirect("/users/dashboard");
    }

    catch (err) {
        console.log(err);
    }
})

app.post("/users/login", passport.authenticate("local", {
    failureRedirect: "/users/login",
    failureFlash: true
}),

async (req, res) => {
   
    try {
        const {email} = req.body;
        const otp = otpGenerator.generate(6);
        await pool.query(`UPDATE users SET otp = $1 WHERE email = $2`, [otp, email]);
    
        const mailinfo = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "OTP Code",
            html: `Your OTP: ${otp}`,
        }
        
        transporter.sendMail(mailinfo, (err) =>{
            if (err) {
                console.log(err);
            }

            else {
                res.redirect("/users/verify-otp");
            }
        });

    }

    catch (err) {
        console.log(err);
    }
}
)

app.post("/users/verify-otp", async (req, res) => {

    const {email, otp} = req.body;

    try {

        const i = await pool.query(`SELECT * FROM users WHERE email = $1 and otp = $2`, [email, otp]);

        if (i.rows.length[0] === 0) {

            req.flash("error", "Invalid OTP");
            res.redirect("/users/login");
        }
    
        else {

            await pool.query(`UPDATE users SET otp = NULL WHERE email = $1`, [email]);
            res.redirect("/users/dashboard");
        }
    }

    catch(err) {
        console.log(err);
    }
});


app.get('/users/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
        }
        req.flash('success_msg', 'You have logged out');
        res.redirect('/users/login');
    });
});


function notauthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/users/login');
}


server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})