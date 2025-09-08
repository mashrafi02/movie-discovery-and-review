const globalErrorHandler = require('../utils/globalErrorHandler')

const devErrors = (res,error) => {
    res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message,
        stackTrace: error.stack,
        error: error
    });
}


const castErrorHandler = (err) => {
    return new globalErrorHandler(`Invalid value (${err.value}) for ${err.path}!`, 404)
}

const duplicateKeyErrorHandler = (err) => {
    return new globalErrorHandler('There is already an account with the email', 400)
}

const regexStringErrorHandler = (err) => {
    return new globalErrorHandler('Please enter user names', 400)
}

const validationErrorHandler = (err) => {
    const errors = Object.values(err.errors).map(val => val.message);
    const errorMessage = errors.join('. ');

    return new globalErrorHandler(`Invalid input data:  ${errorMessage}`, 400)
}

const tokenExpiredErrorHandler = (err) => {
    return new globalErrorHandler('token has been expired. Log in again!', 401)
}

const jsonwebtokenErrorHandler = (err) => {
    return new globalErrorHandler('invalid token!', 401)
}

const prodErrors = (res,error) => {
    if(error.isOperational){
        res.status(error.statusCode).json({
            status: error.statusCode,
            message: error.message
        });
    }else{
        res.status(500).json({
            status: 'fail',
            message: 'something went wrong. please try again later'
        })
    }
}


module.exports = (error, req, res, next) => {
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';
    
    if(process.env.NODE_ENV === 'development'){
        devErrors(res, error)
    }else if(process.env.NODE_ENV === 'production'){
        if(error.name === 'CastError'){
            error = castErrorHandler(error)
        }else if(error.code === 11000){
            error = duplicateKeyErrorHandler(error)
        }else if(error.code === 2){
            error = regexStringErrorHandler(error)
        }else if(error.name === 'ValidationError'){
            error = validationErrorHandler(error)
        }else if(error.name === 'TokenExpiredError'){
            error = tokenExpiredErrorHandler(error)
        }else if(error.name === 'JsonWebTokenError'){
            error = jsonwebtokenErrorHandler(error)
        }
        prodErrors(res,error)
    }
}