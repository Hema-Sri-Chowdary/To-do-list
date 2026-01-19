const { body, validationResult } = require('express-validator');

/**
 * Validation middleware wrapper
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for errors
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        // Format errors
        const formattedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors
        });
    };
};

/**
 * Signup validation rules
 */
const signupValidation = validate([
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1 })
        .withMessage('Name cannot be empty')
]);

/**
 * Login validation rules
 */
const loginValidation = validate([
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
]);

/**
 * Forgot password validation rules
 */
const forgotPasswordValidation = validate([
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
]);

/**
 * Verify OTP validation rules
 */
const verifyOTPValidation = validate([
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('otp')
        .isLength({ min: 4, max: 4 })
        .withMessage('OTP must be 4 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers')
]);

/**
 * Reset password validation rules
 */
const resetPasswordValidation = validate([
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('otp')
        .isLength({ min: 4, max: 4 })
        .withMessage('OTP must be 4 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
]);

/**
 * Task validation rules
 */
const taskValidation = validate([
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Task name is required')
        .isLength({ min: 1, max: 200 })
        .withMessage('Task name must be between 1 and 200 characters'),
    body('time')
        .notEmpty()
        .withMessage('Task time is required')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Time must be in HH:MM format'),
    body('date')
        .notEmpty()
        .withMessage('Task date is required')
        .isISO8601()
        .withMessage('Date must be in valid format (YYYY-MM-DD)'),
    body('progress')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Progress must be between 0 and 100'),
    body('completed')
        .optional()
        .isBoolean()
        .withMessage('Completed must be a boolean'),
    body('icon')
        .optional()
        .trim(),
    body('color')
        .optional()
        .isIn(['purple', 'blue', 'orange', 'green', 'pink'])
        .withMessage('Color must be one of: purple, blue, orange, green, pink')
]);

/**
 * Task update validation rules (all fields optional)
 */
const taskUpdateValidation = validate([
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Task name must be between 1 and 200 characters'),
    body('time')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Time must be in HH:MM format'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be in valid format (YYYY-MM-DD)'),
    body('progress')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Progress must be between 0 and 100'),
    body('completed')
        .optional()
        .isBoolean()
        .withMessage('Completed must be a boolean'),
    body('icon')
        .optional()
        .trim(),
    body('color')
        .optional()
        .isIn(['purple', 'blue', 'orange', 'green', 'pink'])
        .withMessage('Color must be one of: purple, blue, orange, green, pink')
]);

module.exports = {
    signupValidation,
    loginValidation,
    forgotPasswordValidation,
    verifyOTPValidation,
    resetPasswordValidation,
    taskValidation,
    taskUpdateValidation
};
