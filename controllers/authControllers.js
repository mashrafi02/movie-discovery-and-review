const jwt = require('jsonwebtoken');
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const globalErrorHandler = require('../utils/globalErrorHandler');
const sendEmail = require('../utils/mailService');
const crypto = require('crypto');
const User = require('../models/userModel')


exports.signToken = (id) => {
    return jwt.sign({id: id}, process.env.SECRET_KEY, {
        expiresIn: process.env.LOGIN_EXPIRES
    })
}


const sendCookie = (token, res) => {
    const options = {
        maxAge : process.env.LOGIN_EXPIRES,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }

    if(process.env.NODE_ENV == 'production'){
        options.secure = true
    }

    res.cookie('jwt', token, options)
}


exports.protect = asyncErrorHandler( async (req,res,next) => {
    const headerToken = req.cookies.jwt
    // const headerToken = req.headers.authorization; this for bearer token
    // let token;
    // if(headerToken && headerToken.startsWith('Bearer')) token = headerToken.split(' ')[1];

    const verifyToken = await jwt.verify(headerToken, process.env.SECRET_KEY);
    const user = await User.findById(verifyToken.id);

    if(!user) return next(new globalErrorHandler('The user does not exist with the given token', 401));

    const isPasswordChnaged = await user.isPasswordChnaged(verifyToken.iat);
    if(isPasswordChnaged) return next(new globalErrorHandler('Invalid Token. Your password was changed', 401));

    req.user = user;
    next()
})


exports.restrictToUser = (req, res, next) => {
    if (!req.user) return next(new globalErrorHandler('Not Logged in'), 401);

    if (req.user.username !== req.params.username) return next(new globalErrorHandler('You are not allowed to access this profile',403))

    next();
};


exports.signup = asyncErrorHandler( async (req, res, next) => {
    const newUser = await User.create(req.body);
    const user = await User.findOne({_id:newUser._id})

    const token = this.signToken(newUser._id);
    sendCookie(token,res);
    
    res.status(201).json({
        status:'succes',
        data : {
            // token,
            user
        }
    })
})


exports.login = asyncErrorHandler( async (req, res, next) => {
    const {email,password} = req.body;

    if(!email || !password) return next(new globalErrorHandler('please enter email and password to login', 400));

    const user = await User.findOne({email}).select('+password');

    if (!user || !(await user.comparePassword(password))) return next(new globalErrorHandler('email or password is invalid', 400));

    const userData = await User.findOne({email});

    const token = this.signToken(user._id);

    sendCookie(token, res)

    res.status(200).json({
        status:'success',
        data: {
            // token,
            userData
        }
    })
})


// exports.logout = asyncErrorHandler( async (req, res, next) => {
//     // Clear the JWT cookie
//     const options = {
//         maxAge: 10 * 1000,
//         httpOnly: true,
//     }

//     if(process.env.NODE_ENV == 'production'){
//         options.secure = true,
//         options.sameSite = 'Strict'
//     }

//     res.cookie('jwt', 'loggedout', options);

//     res.status(200).json({
//         status: 'success',
//         message: 'You have been logged out!'
//     });
// });


exports.logout = asyncErrorHandler(async (req, res, next) => {
    res.cookie("jwt", "", {
      maxAge: 0, // expire immediately
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
  
    res.status(200).json({
      status: "success",
      message: "You have been logged out!",
    });
  });
  


exports.forgotPassword = asyncErrorHandler( async (req,res,next) => {
    const email = req.body.email;
    if(!email) return next(new globalErrorHandler('Please Enter your email', 400));

    const user = await User.findOne({email});
    if(!user) return next(new globalErrorHandler("We can't find the user with the given email", 404));

    const resetPassTokenPlain = await user.createResetPasswordToken();
    await user.save({validateBeforeSave : false})

    try{
        const requestURL = `${process.env.CLIENT_URL}/reset-password/${resetPassTokenPlain}`;

        const subject = 'Password reset request recieved from movie discovery and review'
        const message = `Please click on this url to reset your password\n\nThis link will only valid for 5 minutes from now!!!`

        await sendEmail({
            email:user.email,
            requestURL,
            subject,
            message
        })

        res.status(200).json({
            status:'success',
            message:'Password request url has been sent'
        })
    }
    catch(error){
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpires = undefined;

        await user.save({validateBeforeSave : false});

        return next(new globalErrorHandler('Something went wrong. Please try again later', 500))
    }
})


exports.resetPassword = asyncErrorHandler (async (req, res, next) => {
    const reqToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({resetPasswordToken:reqToken, resetPasswordTokenExpires: {$gt:Date.now()}});

    if(!user) return next(new globalErrorHandler('Invalid Token or token has expired. Try again',400));

    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;
    user.passwordChangedAt = Date.now();

    await user.save();

    const token = this.signToken(user._id);
    sendCookie(token, res);

    res.status(200).json({
        status:'success',
        data : {
            // token
            message:'Your passowrd is reset'
        }
    })
})