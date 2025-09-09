const express = require('express');
const helmet = require('helmet');
const path = require('path')
// const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const morgan = require('morgan');
const {xss} = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const movieRouter = require('./routers/movieRouter')
const authRouter = require('./routers/authRouter');
const userRouter = require('./routers/userRouter');
const globalErrorHandler = require('./utils/globalErrorHandler');
const globalErrorController = require('./controllers/globalErrorController');

const limiter = rateLimit({
    max: 1000,
    windowMs: 60 * 60 * 1000,
    message: 'We have recieved too many request from you. Please try again after 1 hour'
  })

const app = express();
app.use('/avatars', express.static(path.join(__dirname, 'avatars')));


app.use(helmet());
app.use(cors({ origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_VERCEL], credentials: true }));
app.use(express.json({limit:'10kb'}));
app.use(cookieParser());
// app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(compression());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));


// endpoints
app.use('/api', limiter);
app.use('/api/v1/movies', movieRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);


app.use((req,res,next) => {
    const err = new globalErrorHandler(`Can't find ${req.originalUrl} on the server!`, 404);
    next(err)
})


app.use(globalErrorController);

module.exports = app;
