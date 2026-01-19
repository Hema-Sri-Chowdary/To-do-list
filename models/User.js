const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationOTP: {
        type: String,
        select: false
    },
    verificationOTPExpire: {
        type: Date,
        select: false
    },
    resetPasswordOTP: {
        type: String,
        select: false
    },
    resetPasswordExpire: {
        type: Date,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to generate OTP
userSchema.methods.generateResetOTP = function () {
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Hash OTP before saving
    this.resetPasswordOTP = bcrypt.hashSync(otp, 10);

    // Set expiry to 10 minutes
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return otp; // Return plain OTP to send via email
};

// Method toverify Reset OTP
userSchema.methods.verifyResetOTP = async function (candidateOTP) {
    // Check if OTP has expired
    if (Date.now() > this.resetPasswordExpire) {
        return false;
    }

    try {
        return await bcrypt.compare(candidateOTP, this.resetPasswordOTP);
    } catch (error) {
        return false;
    }
};

// Method to generate Verification OTP
userSchema.methods.generateVerificationOTP = function () {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    this.verificationOTP = bcrypt.hashSync(otp, 10);
    this.verificationOTPExpire = Date.now() + 10 * 60 * 1000;
    return otp;
};

// Method to verify Verification OTP
userSchema.methods.verifyVerificationOTP = async function (candidateOTP) {
    if (Date.now() > this.verificationOTPExpire) {
        return false;
    }
    try {
        return await bcrypt.compare(candidateOTP, this.verificationOTP);
    } catch (error) {
        return false;
    }
};

module.exports = mongoose.model('User', userSchema);
