const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { nanoid } = require('nanoid');


const userSchema = mongoose.Schema({
    name : {
        type : String,
        required : [true, 'Please Enter your name'],
        minlength : [4, 'Lenght of name cannot be less than 4 characters!'],
        maxlength : [40, 'Length of name cannot be greater than 40 characters!']
    },
    username : {
        type : String,
        unique : true
    },
    email : {
        type : String,
        required : [true, 'Please Enter your Email'],
        unique : true,
        lowercase : true,
        validate : {
            validator : (value) => validator.isEmail(value),
            message : 'Please provide a valid email!'
        }
    },
    emailVerified : {
        type : Boolean,
        default : false,
    },
    avatar : {
        type : String,
        default : 'default_avatar.png'
    },
    age: {
        type: Number,
        required : [true, 'age is a required field'],
        min: [14, "age must be at least 14 years"],
        max: [100, "age cannot be greater than 100 years"]
    },
    gender : {
        type : String,
        enum : {
            values : ['male','female','other'],
            message : 'this gender does not exist in the world!'
        },
    },
    profession:{
        type: String,
        enum: {
            values : ["Doctor","Engineer","Teacher","Student","Film Director","Producer","Actor","Screenwriter","Cinematographer","Editor","Movie Critic","Movie Analyst","Animator","Composer","Sound Designer","Artist","Business","Others"],
            message : "This profession does not exist here"
        },
    },
    country: {
        type: String,
        default: 'Not provided'
    },
    role : {
        type : String,
        enum : {
            values: ['user','admin'],
            message: 'The role does not exist here'
        },
        default : 'user',
        select : false
    },
    password: {
        type : String,
        required : [true, 'password is required'],
        minlength: [8, "password cannot be less than 8 characters"],
        select: false
    },
    confirmPassword : {
        type : String,
        required : [true, 'Please confirm your password'],
        validate : {
            validator : function(value){
                return this.password === value;
            },
            message : 'Incorrect match!'
        }
    },
    active : {
        type: Boolean,
        default: true,
        select: false
    },
    reviews : [
        {   
            reviewId: {
                type : String,
                unique : true
            },
            movieId : Number,
            movieName : {
                type : String,
                default: "Not Provided"
            },
            review: String,
            username: String,
            likeCount: {
                type : Number,
                default : 0
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    likedMovies : [
            {
            movieId : {
                type : Number,
            },
            movieName : {
                type: String,
                default: 'Not Provided'
            },
            moviePoster : {
                type: String,
                default: 'Not Provided'
            }
        }
    ],
    likedReviews : [
        {
            reviewId: {
                type : String,
            },
            movieId: {
                type : Number,
            },
            movieName: {
                type : String,
                default : 'Not Provided'
            },
            review: {
                type : String,
                default : 'Not Provided'
            },
            reviewerUsername : {
                type : String,
                default : 'Not Provided'
            }
        }
    ],
    passwordChangedAt : {
        type:Date,
        select:false,
    },

    resetPasswordToken : {
        type:String,
        select:false,
    },
    resetPasswordTokenExpires : {
        type: Date,
        select: false,
    }
},{timestamps:true});


userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();

    if (this.isNew) {
        let username;
        let exists = true;

        while (exists) {
            username = `user_${nanoid(8)}`;
            const user = await this.constructor.findOne({ username });
            if (!user) exists = false;
        }

        this.username = username;
    }

    this.password = await bcrypt.hash(this.password, 12);

    this.confirmPassword = undefined;

    next();
})

userSchema.pre(/^find/, function(next){
    this.find({active: {$ne : false}})
    next()
})


userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password)
}


userSchema.methods.createResetPasswordToken = async function (){
    const resetToken = crypto.randomBytes(32).toString('hex');
    const encryptResetToken =  crypto.createHash('sha256').update(resetToken).digest('hex');

    this.resetPasswordToken = encryptResetToken;
    this.resetPasswordTokenExpires = Date.now() + 5 * 60 * 1000;

    return resetToken;
}

userSchema.methods.isPasswordChnaged = async function (JWTTimestamp) {
    let passwordChangedAt = this.passwordChangedAt;
    if(passwordChangedAt){
        passwordChangedAt = parseInt(passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < passwordChangedAt
    }
    return false
}


const User = mongoose.model('Clients', userSchema);


module.exports = User;