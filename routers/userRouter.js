const express = require('express');
const authController = require('../controllers/authControllers');
const userController = require('../controllers/userControllers')

const router = express.Router();


router.route('/top-reviewers').get(userController.getTopReviewers);
router.route('/liked-movies/:username').get(authController.protect, authController.restrictToUser, userController.getLikedMovies);
router.route('/me').get(authController.protect, userController.getMe);
router.route('/getAvatars').get(authController.protect, userController.getAvatars);
router.route('/update-me').patch(authController.protect, userController.updateMe);
router.route('/delete-me').delete(authController.protect, userController.deleteMe);
router.route('/update-password').patch(authController.protect, userController.updatePassword);
router.route('/public-profile/:username').get(userController.getUserProfilePublic);
router.route('/:username').get(authController.protect, authController.restrictToUser, userController.getUserProfile)


module.exports = router;