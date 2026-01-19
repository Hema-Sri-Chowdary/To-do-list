const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendPasswordResetEmail, sendWelcomeEmail, sendVerificationEmail } = require('../utils/email');
const {
    signupValidation,
    loginValidation,
    forgotPasswordValidation,
    verifyOTPValidation,
    resetPasswordValidation
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', signupValidation, async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        const name = req.body.name || email.split('@')[0].toUpperCase();

        const user = await User.create({
            email,
            password,
            name,
            isVerified: false // Explicitly false
        });

        // Generate verification OTP
        const otp = user.generateVerificationOTP();
        await user.save();

        // Send verification email
        const emailResult = await sendVerificationEmail(email, otp, name);

        if (!emailResult.success) {
            // If email fails, delete user to allow retry
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({
                success: false,
                message: 'Error sending verification email. Please check your email address and try again.'
            });
        }

        res.status(201).json({
            success: true,
            message: 'User registered. Please check your email for the verification code.',
            data: {
                email: user.email,
                isVerified: false
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP and return token
 * @access  Public
 */
router.post('/verify-email', verifyOTPValidation, async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email }).select('+verificationOTP +verificationOTPExpire');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'User already verified' });
        }

        const isValid = await user.verifyVerificationOTP(otp);

        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Verify user and clear OTP fields
        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpire = undefined;
        await user.save();

        // Generate token and login user
        const token = generateToken(user._id);

        // Send welcome email after successful verification
        sendWelcomeEmail(email, user.name).catch(console.error);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying email',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check verification status
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified. Please verify your email.',
                // Optionally return a flag so frontend knows to show OTP screen
                data: { needsVerification: true, email: user.email }
            });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send OTP for password reset
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, an OTP has been sent'
            });
        }

        // Generate OTP
        const otp = user.generateResetOTP();
        await user.save();

        // Send email
        const emailResult = await sendPasswordResetEmail(email, otp, user.name);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Error sending email. Please try again later.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Valid for 10 minutes.',
            data: {
                email: email
            }
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing request',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP (optional endpoint for frontend validation)
 * @access  Public
 */
router.post('/verify-otp', verifyOTPValidation, async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find user with OTP fields
        const user = await User.findOne({ email }).select('+resetPasswordOTP +resetPasswordExpire');

        if (!user || !user.resetPasswordOTP) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Verify OTP
        const isValid = await user.verifyResetOTP(otp);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying OTP',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Find user with OTP fields
        const user = await User.findOne({ email }).select('+resetPasswordOTP +resetPasswordExpire');

        if (!user || !user.resetPasswordOTP) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Verify OTP
        const isValid = await user.verifyResetOTP(otp);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Update password
        user.password = newPassword;
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
});

// Google OAuth routes commented out until credentials are configured
// Uncomment these routes after setting up Google OAuth credentials in .env

/*
const passport = require('../config/passport');

router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false
    })
);

router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: process.env.FRONTEND_URL || 'http://localhost:5500'
    }),
    (req, res) => {
        try {
            const token = generateToken(req.user._id);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
            res.redirect(`${frontendUrl}?token=${token}&email=${req.user.email}&name=${req.user.name}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect(process.env.FRONTEND_URL || 'http://localhost:5500');
        }
    }
);
*/

const { protect } = require('../middleware/auth');

/**
 * @route   DELETE /api/auth/delete
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/delete', protect, async (req, res) => {
    try {
        // Delete user
        await User.findByIdAndDelete(req.user.id);

        // Note: If you have a Task model, you should also delete tasks here
        // await Task.deleteMany({ user: req.user.id });

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account',
            error: error.message
        });
    }
});

module.exports = router;
