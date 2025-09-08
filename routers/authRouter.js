const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');


router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/logout').get(authController.protect, authController.logout);
router.route('/forgot-password').post(authController.forgotPassword);
router.route('/reset-password/:token').patch(authController.resetPassword);


module.exports = router;