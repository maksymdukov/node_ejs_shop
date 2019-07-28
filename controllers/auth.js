const User = require('../models/user');
const bcryptjs = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransporter = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator/check');

const transporter = nodemailer.createTransport(sendgridTransporter({
    auth: {
        api_key: process.env.MAILER
    }
}));

exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: req.flash('error'),
        oldInput: {
            email: "",
            password: ""
        },
        validationErrors: []
    });
};

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: req.flash('error'),
        oldInput: {
            email: "",
            password: "",
            confirmPassword: ""
        },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
    const errors = validationResult(req);
    const email = req.body.email;
    const password = req.body.password;
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        });
    }
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password',
                    oldInput: {
                        email: email,
                        password: password
                    },
                    validationErrors: [{ param: 'email' }, { param: 'password' }]
                });
            }
            bcryptjs.compare(password, user.password)
                .then(doMatch => {
                    if (!doMatch) {
                        return res.status(422).render('auth/login', {
                            path: '/login',
                            pageTitle: 'Login',
                            errorMessage: 'Invalid email or password',
                            oldInput: {
                                email: email,
                                password: password
                            },
                            validationErrors: [{ param: 'email' }, { param: 'password' }]
                        });
                    }
                    req.session.isLoggedIn = true;
                    req.session.user = user;
                    return req.session.save(err => {
                        console.log(err);
                        res.redirect('/');
                    });

                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = '500';
                    next(error);
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });

};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    console.log(errors.array());
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            validationErrors: errors.array()
        });
    }
    bcryptjs.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email,
                password: hashedPassword,
                cart: { items: [] }
            });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
            return transporter.sendMail({
                from: 'max@shop.com',
                to: 'maxopowerful@gmail.com',
                subject: 'Successfully registered',
                html: '<h1>Successfully registered</h1>'
            })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset',
        errorMessage: req.flash('error')
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            req.flash('error', 'Internal error');
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account found with this email');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                transporter.sendMail({
                    to: req.body.email,
                    from: 'shop@mail.com',
                    subject: 'Reset password',
                    html: `
                        <p>You've requested password reset.</p>
                        <p>Click the link below to reset your password</p>
                        <a href="${process.env.BASE_URL}/reset/${token}">Reset Password</a>
                    `
                }).then().catch()
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = '500';
                next(error);
            });
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetTokenExpiration: {
            $gt: Date.now()
        }
    })
        .then(user => {
            if (!user) {
                return res.redirect('/')
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: req.flash('error'),
                userId: user._id,
                token: token
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
};

exports.postNewPassword = (req, res, next) => {
    let resetUser;
    const userId = req.body.userId;
    const password = req.body.password;
    const passwordToken = req.body.token;
    User.findOne({
        _id: userId,
        resetToken: passwordToken,
        resetTokenExpiration: {
            $gt: Date.now()
        }
    })
        .then(user => {
            resetUser = user;
            return bcryptjs.hash(password, 12)
        })
        .then(hashedPassword => {
            user.resetToken = undefined;
            user.resetTokenExpiration = undefined;
            resetUser.password = hashedPassword;
            return resetUser.save();
        })
        .then(result => {
            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = '500';
            next(error);
        });
}