const LocalStrategy = require('passport-local').Strategy;
const {pool} = require('./dbConfig');
const bcrypt = require('bcrypt');

function initialize (passport) {

const authenticateUser = (email, password, done)  => {

    pool.query(
        //Gets emails
        `SELECT * FROM users WHERE email = $1`, [email], (err, i) => {
            if(err) {
                throw err;
            }

            console.log(i.rows);

            if (i.rows.length > 0) {
                const user = i.rows[0];

                if (!user.verified) {
                    return done(null, false, { message: 'Please verify your account first.' });
                }
                
                //Login checkers.
                //Must bcrypt compare or else passwords are not recognized.
                bcrypt.compare(password, user.password, (err, isMatch)=> {
                    if(err) {
                        throw err;
                    }

                    if (isMatch) {
                        return done(null, user);
                    }

                    else {
                        return done(null, false, {message: "Password is not correct"});
                    }
                });

            } else {
                return done(null, false,{message: "Email is not registered."})
            }
        }
    )
}

//Attributes that passport will save
    passport.use(new LocalStrategy ({
        usernameField: 'email',
        passwordField: "password"
    }, authenticateUser));

    //Stores user id and session cookie
    passport.serializeUser((user, done)=> done(null, user.id));

    //Uses id to obtain database details.
    passport.deserializeUser((id, done) => {
        pool.query(
            `SELECT * FROM users WHERE id = $1`, [id], (err, i) => {
                if (err) {
                    throw err;
                }

                return done(null, i.rows[0]);
            }
        );
    })
}

module.exports = initialize;