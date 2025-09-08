const asyncErrorHandler = require('../utils/asyncErrorHandler');
const globalErrorHandler = require('../utils/globalErrorHandler');
const User = require('../models/userModel');
const authController = require('../controllers/authControllers');
const path = require('path');
const fs = require('fs');


const sendCookie = (token, res) => {
    const options = {
        maxAge : process.env.LOGIN_EXPIRES,
        httpOnly: true,
        sameSite: 'lax'
    }

    if(process.env.NODE_ENV == 'production'){
        options.secure = true
    }

    res.cookie('jwt', token, options)
}


exports.filterReqBody = (reqBody, ...filteredFields) =>{
    const filterBodyObj = {};
    Object.keys(reqBody).forEach(field => {
        if(filteredFields.includes(field)){
            filterBodyObj[field] = reqBody[field]
        }
    })
    return filterBodyObj
}


exports.getTopReviewers = asyncErrorHandler(async (req, res, next) => {

    const limit = Number(req.query.limit);

    const users = await User.aggregate([
        
        { $unwind: "$reviews" },

        { $group: {
            _id: "$_id",
            name: { $first: "$name" },
            username: { $first: "$username" },
            avatar: { $first: "$avatar"},
            country: { $first: "$country" },
            profession: { $first: "$profession" },
            totalLikes: { $sum: "$reviews.likeCount" },
            reviews: { $push: "$reviews" } 
        }},

        { $addFields: {
            bestLikedReview: { 
                $first: { 
                    $sortArray: { 
                        input: "$reviews", 
                        sortBy: { likeCount: -1 } 
                    } 
                } 
            }
        }},

        { $project: { reviews: 0 } },

        { $match: {totalLikes: {$gte:1}}},

        { $sort: { totalLikes: -1 } },

        { $limit: limit || 10 }
    ]);

    res.status(200).json({
        status:'success',
        length: users.length,
        data: {
            users
        }
    })
})


exports.getLikedMovies = asyncErrorHandler( async(req, res, next) => {
    const userData = await User.findById(req.user._id)
                                            .select('likedMovies')
                                

    res.status(200).json({
        status:'success',
        data:{
            likedMovies:userData.likedMovies
        }
    })

})


exports.getUserProfile = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findOne({username : req.params.username});

    if (!user) return next(new globalErrorHandler('User not found', 404));

    res.status(200).json({
        status:'success',
        data: {
            user
        }
    })
})


exports.getMe = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) return next(new globalErrorHandler('User not found', 404));

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});


exports.getUserProfilePublic = asyncErrorHandler( async (req,res,next) => {
    const user = await User.findOne({username : req.params.username})
                                                .select('name')
                                                .select('age')
                                                .select('avatar')
                                                .select('reviews')
                                                .select('country')
                                                .select('profession')

    if (!user) return next(new globalErrorHandler('User not found', 404));

    res.status(200).json({
        status:'success',
        data: {
            user
        }
    })
})


exports.getAvatars = asyncErrorHandler(async (req, res, next) => {
    const avatarDir = path.join(__dirname, '../avatars');
    const files = fs.readdirSync(avatarDir); // e.g. ["avatar1.png", "avatar2.png"]
  
    res.status(200).json({
      status: 'success',
      avatars: files.map(file => `/avatars/${file}`)
    });
  });


exports.updateMe = asyncErrorHandler( async (req, res, next) => {
    if( req.body.password || req.body.confirmPassword){
        return next(new globalErrorHandler('you can not change your password at this endpoint',400))
    }

    const filteredReqBody = this.filterReqBody(req.body, 'name','email','gender','avatar','age','country','profession');

    await User.findByIdAndUpdate(req.user._id, filteredReqBody, {runValidators:true, new: true});

    res.status(200).json({
        status:'success',
        message: 'Changes saved!',
        user : req.user
    })
})


exports.updatePassword = asyncErrorHandler( async (req, res, next) => {
    const user = await User.findById({_id: req.user._id}).select('+password');
    const currentPassword = req.body.currentPassword;

    if(!(await user.comparePassword(currentPassword))){
        return next(new globalErrorHandler('Incorrect current password', 400))
    }

    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordChangedAt = Date.now();

    await user.save();

    const token = authController.signToken(user._id);
    sendCookie(token, res)

    res.status(200).json({
        status:'success',
        data : {
            message: 'your password has been updated'
        }
    })

})



exports.deleteMe = asyncErrorHandler( async (req, res, next) => {
    const user = await User.findById({_id: req.user._id});
    user.active = false;
    await user.save({validateBeforeSave : false});

    res.status(204).json({
        status:'success',
        data:null
    })
})