const express = require('express');
const authControllers = require('../controllers/authControllers');
const movieControllers = require('../controllers/movieControllers');


const router = express.Router();


router.route('/popular').get(movieControllers.getPopularMovies);
router.route('/search').get(movieControllers.searchMovies);
router.route('/reviews/:movieId').get(movieControllers.getReviews);
router.route('/trailer/:id').get(movieControllers.getTrailers);
router.route('/movie/:id').get(movieControllers.getSingleMovie);
router.route('/save-review/:movieId').patch(authControllers.protect, movieControllers.saveReview);
router.route('/toggle-review-like/:reviewId').patch(authControllers.protect, movieControllers.toggleReviewLike);
router.route('/update-review/:username/:reviewId').patch(authControllers.protect, authControllers.restrictToUser, movieControllers.updateReview);
router.route('/delete-review/:username/:reviewId').delete(authControllers.protect, authControllers.restrictToUser, movieControllers.deleteReview);
router.route('/save-liked-movies/:movieId').patch(authControllers.protect, movieControllers.saveLikedMovies);


module.exports = router;