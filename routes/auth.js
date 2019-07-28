const express = require('express');
const { check, body } = require('express-validator/check');
const User = require('../models/user');
const authController = require('../controllers/auth');
const bcryptjs = require('bcryptjs');

const router = express.Router();


router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
    [
        check('email', 'Invalid email or password')
            .isEmail()
            .normalizeEmail(),
        check('password', 'Invalid email or password')
            .isAlphanumeric()
            .isLength({ min: 5 })
            .trim()
    ],
    authController.postLogin);

router.post('/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            .custom((value, { req, location, path }) => {
                // if (value === 'test@test.com') {
                //     throw new Error('This email is forbidden!')
                // }
                // return true;
                return User.findOne({ email: value })
                    .then(userDoc => {
                        if (userDoc) {
                            return Promise.reject('This email is taken. Please, choose another one.')
                        }
                    })
            })
            .normalizeEmail(),
        body(
            'password',
            'Please enter a password with only number and text and at least 5 charachters.'
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
        check('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error("The passwords don't match");
                }
                return true;
            })
            .trim()
    ],
    authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;