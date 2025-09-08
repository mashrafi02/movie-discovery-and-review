const axios = require('axios');
const User = require('../models/userModel');
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const globalErrorHandler = require('../utils/globalErrorHandler');
const {nanoid} = require('nanoid');


exports.getPopularMovies = asyncErrorHandler(async (req, res, next) => {

    const movieQuery = {...req.query}
    const keyToExclude = ['fileds', 'limit'];
    keyToExclude.forEach(el => delete movieQuery[el]);

    const page = movieQuery.page || 1;

    const params = {
        include_adult: false,
        include_video: false,
        page,
        sort_by: 'popularity.desc',
        api_key: process.env.TMDB_API_KEY,
    };

    if (movieQuery.language) params.with_original_language = movieQuery.language;
    if (movieQuery.genres) params.with_genres = movieQuery.genres;

    const response = await axios.get('https://api.themoviedb.org/3/discover/movie',{ params });

    const { results: movies, total_pages, total_results } = response.data;

    if (!movies || movies.length === 0) return next(new globalErrorHandler('No movies Found', 404));

    res.status(200).json({
        status: 'success',
        page: Number(page),
        total_pages,
        total_results,
        data: { 
            length: movies.length,
            movies,
        }
    });

})


exports.searchMovies = asyncErrorHandler(async (req, res, next) => {
    const { name, language, genres, sortBy } = req.query;

    if (!name) {
        return next(new globalErrorHandler('Movie name is required', 400));
    }

    const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
        params: {
        api_key: process.env.TMDB_API_KEY,
        query: name,
        language: language || 'en-US'
        }
    });

    let movies = response.data.results;

    if (genres) {
        const genreIds = genres.split(',').map(Number);
        movies = movies.filter(m => m.genre_ids.some(id => genreIds.includes(id)));
    }

    if (sortBy) {
        movies = movies.sort((a, b) => {
        if (sortBy === 'popularity.desc') return b.popularity - a.popularity;
        if (sortBy === 'popularity.asc') return a.popularity - b.popularity;
        if (sortBy === 'vote_average.desc') return b.vote_average - a.vote_average;
        if (sortBy === 'vote_average.asc') return a.vote_average - b.vote_average;
        if (sortBy === 'release_date.desc') return new Date(b.release_date) - new Date(a.release_date);
        if (sortBy === 'release_date.asc') return new Date(a.release_date) - new Date(b.release_date);
        return 0;
        });
    }else{
        movies = movies.sort((a,b) => b.popularity - a.popularity);
    }

    if (!movies || movies.length === 0) {
        return next(new AppError('No movies found', 404));
    }

    res.status(200).json({
        status: 'success',
        results: movies.length,
        data: {
            movies
        }
    });
});


exports.getSingleMovie = asyncErrorHandler ( async (req, res, next) => {
    const { id: movieId } = req.params;
  
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}`,
      {
        params: { api_key: process.env.TMDB_API_KEY },
      }
    );

    const movie = response.data

    res.status(200).json({
        status: "success",
        data: {
            movie
        },
        });
})


exports.getTrailers = asyncErrorHandler(async (req, res, next) => {
    const { id: movieId } = req.params;
  
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${movieId}/videos`,
      {
        params: { api_key: process.env.TMDB_API_KEY },
      }
    );
  
    const videos = response.data.results;
  
    if (!videos || videos.length === 0) return next(new globalErrorHandler("No trailers found", 404));
  
    const trailers = videos.filter(
      (video) => video.type === "Trailer" && video.site === "YouTube"
    );
  
    if (trailers.length === 0) return next(new globalErrorHandler("No trailers found", 404));
  
    const groupedTrailers = {};
    trailers.forEach((trailer) => {
      // only add if the language is not already set
        if (!groupedTrailers[trailer.iso_639_1]) {
            groupedTrailers[trailer.iso_639_1] = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
    });
  
    res.status(200).json({
      status: "success",
      data: {
        trailers: groupedTrailers,
      },
    });
});


exports.saveReview = asyncErrorHandler(async (req, res, next) => {
    const movieId = Number(req.params.movieId);
    const user = await User.findById(req.user._id);

    let reviewId;
    let exists = true;

    while (exists) {
        reviewId = nanoid(8);
        exists = user.reviews.some(rev => rev.reviewId === reviewId);
    }

    user.reviews.push({
        movieId,
        reviewId,
        review: req.body.review,
        movieName: req.body.movieName,
        username: user.username
    });

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: "Your review was saved!",
        reviewId
    });
});


exports.updateReview = asyncErrorHandler(async (req, res, next) => {
    const reviewId = req.params.reviewId;
    const { review } = req.body;
  
    if (!review || review.trim().length === 0) {
      return next(new globalErrorHandler("Review text cannot be empty", 400));
    }
  
    const user = await User.findById(req.user._id);
  
    // Find the review by ID
    const existingReview = user.reviews.find(r => r.reviewId === reviewId);
  
    if (!existingReview) {
      return next(new globalErrorHandler("Review not found", 404));
    }
  
    // Update the review content
    existingReview.review = review;
  
    await user.save({ validateBeforeSave: false });
  
    res.status(200).json({
      status: "success",
      message: "Review updated successfully",
    });
  });
  


exports.toggleReviewLike = asyncErrorHandler(async (req, res, next) => {
    const {reviewId}= req.params;

    const {movieId,movieName,review,reviewerUsername} = req.body;
    
    const user = await User.findById(req.user._id);
    
    const alreadyLiked = user.likedReviews?.some(rev => rev.reviewId === reviewId);

    let increment;
    if (alreadyLiked) {
        // unlike
        user.likedReviews = user.likedReviews.filter(rev => rev.reviewId !== reviewId);
        increment = -1;
    } else {
        // like
        user.likedReviews.push({ reviewId, movieId:Number(movieId), movieName, review, reviewerUsername});
        increment = 1;
    }

    await user.save({ validateBeforeSave: false });
  
    const updatedUser = await User.findOneAndUpdate(
        { "reviews.reviewId": reviewId },
        { $inc: { "reviews.$.likeCount": increment } },
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: "Review not found" });
      }
  
      const updatedReview = updatedUser.reviews.find(r => r.reviewId === reviewId);
  
      // Prevent negative likeCount
      if (updatedReview.likeCount < 0) {
        updatedReview.likeCount = 0;
        await updatedUser.save({ validateBeforeSave: false });
      }

    res.status(200).json({
        status: "success",
        message: alreadyLiked ? "Review unliked" : "Review liked",
    });
});


exports.deleteReview = asyncErrorHandler(async (req, res, next) => {
    const reviewId = req.params.reviewId;
    const user = await User.findById(req.user._id);
  
    // Find the review by reviewId
    const existingReview = user.reviews.find(r => r.reviewId === reviewId);
  
    if (!existingReview) {
      return next(new globalErrorHandler("The review is already deleted or not found", 404));
    }
  
    // Remove it
    user.reviews = user.reviews.filter(r => r.reviewId !== reviewId);
  
    await user.save({ validateBeforeSave: false });
  
    res.status(204).json({
      status: "success",
      data: null,
    });
  });
  


exports.saveLikedMovies = asyncErrorHandler(async (req, res, next) => {
    const movieId = Number(req.params.movieId);
    const {movieName, moviePoster} = req.body;

    const user = await User.findById(req.user._id);

    const likedBefore = user.likedMovies.find(movie => movie.movieId === movieId);

    if (likedBefore){
        user.likedMovies = user.likedMovies.filter(movie => movie.movieId !== movieId);
    }else{
        user.likedMovies.push({movieId, movieName, moviePoster})
    }

    await user.save({validateBeforeSave:false});
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    })
})

exports.getReviews = asyncErrorHandler(async (req, res, next) => {
    const movieId = Number(req.params.movieId);

    const reviews = await User.aggregate([
        { $unwind: "$reviews" },
        { $match: { "reviews.movieId": movieId } },
        { $sort: { "reviews.createdAt": -1 } },
        {
            $project: {
                _id: 0,
                movieId: "$reviews.movieId",
                reviewId: "$reviews.reviewId",
                review: "$reviews.review",
                username: "$reviews.username",
                likeCount: "$reviews.likeCount",
                createdAt: "$reviews.createdAt",
                name: 1,
                avatar: 1,
                country: 1,
                profession: 1
            }
        }
    ]);

    res.status(200).json({
        status: "success",
        count: reviews.length,
        reviews
    });
});