const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const config = require('../config/config');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
});

/**
 * @route   POST /api/payment/create-order
 * @desc    Create a razorpay order for premium subscription
 * @access  Private
 */
router.post('/create-order', protect, async (req, res) => {
    try {
        const options = {
            amount: 9900, // 99 INR in paise
            currency: 'INR',
            receipt: `receipt_order_${req.user._id}`,
        };
        
        const order = await razorpay.orders.create(options);
        
        if (!order) {
            return res.status(500).json({ success: false, message: 'Could not create order' });
        }
        
        res.status(200).json({ 
            success: true, 
            order,
            key_id: config.razorpay.keyId
        });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

/**
 * @route   POST /api/payment/verify
 * @desc    Verify razorpay payment
 * @access  Private
 */
router.post('/verify', protect, async (req, res) => {
    try {
        const { razorpayInstanceOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        
        // Creating our own signature to verify
        const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(`${razorpayInstanceOrderId}|${razorpayPaymentId}`);
        const digest = shasum.digest('hex');
        
        if (digest !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Transaction not legit!' });
        }
        
        // Upgrade user to Premium
        const user = await User.findById(req.user._id);
        user.isPremium = true;
        await user.save();
        
        res.status(200).json({
            success: true,
            message: 'Payment successfully verified',
            data: {
                isPremium: true
            }
        });
    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
