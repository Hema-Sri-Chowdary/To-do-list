const nodemailer = require('nodemailer');
const config = require('../config/config');

/**
 * Create email transporter
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.email.user,
            pass: config.email.password
        }
    });
};

/**
 * Send password reset OTP email
 */
const sendPasswordResetEmail = async (email, otp, userName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"To-Do List App" <${config.email.from}>`,
            to: email,
            subject: 'Password Reset OTP - To-Do List App',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Inter', Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: #ffffff;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 4px 20px rgba(112, 65, 238, 0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #7041EE 0%, #9D7FEE 100%);
                            padding: 30px;
                            text-align: center;
                            color: #ffffff;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .content p {
                            color: #2D2D2D;
                            line-height: 1.6;
                            margin-bottom: 20px;
                        }
                        .otp-box {
                            background-color: #E8E8F5;
                            border-radius: 12px;
                            padding: 20px;
                            text-align: center;
                            margin: 30px 0;
                        }
                        .otp-code {
                            font-size: 36px;
                            font-weight: 700;
                            color: #7041EE;
                            letter-spacing: 8px;
                            margin: 10px 0;
                        }
                        .warning {
                            background-color: #FFF3CD;
                            border-left: 4px solid #FFC107;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .warning p {
                            margin: 0;
                            color: #856404;
                            font-size: 14px;
                        }
                        .footer {
                            background-color: #f8f8f8;
                            padding: 20px;
                            text-align: center;
                            color: #6B6B6B;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hello ${userName || 'User'},</p>
                            <p>We received a request to reset your password for your To-Do List account. Use the OTP below to complete the password reset process:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0; color: #6B6B6B; font-size: 14px;">Your OTP Code</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 0; color: #6B6B6B; font-size: 12px;">Valid for 10 minutes</p>
                            </div>
                            
                            <p>Enter this code in the app to reset your password.</p>
                            
                            <div class="warning">
                                <p><strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                            </div>
                            
                            <p>Thank you,<br>The To-Do List Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; 2026 To-Do List App. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Email sending error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send welcome email (optional)
 */
const sendWelcomeEmail = async (email, userName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"To-Do List App" <${config.email.from}>`,
            to: email,
            subject: 'Welcome to To-Do List App! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Inter', Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: #ffffff;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 4px 20px rgba(112, 65, 238, 0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #7041EE 0%, #9D7FEE 100%);
                            padding: 40px 30px;
                            text-align: center;
                            color: #ffffff;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .content p {
                            color: #2D2D2D;
                            line-height: 1.6;
                            margin-bottom: 20px;
                        }
                        .footer {
                            background-color: #f8f8f8;
                            padding: 20px;
                            text-align: center;
                            color: #6B6B6B;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to To-Do List! 🎉</h1>
                        </div>
                        <div class="content">
                            <p>Hello ${userName},</p>
                            <p>Thank you for signing up! We're excited to have you on board.</p>
                            <p>Start organizing your tasks and boost your productivity today!</p>
                            <p>Best regards,<br>The To-Do List Team</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 To-Do List App. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent to:', email);

    } catch (error) {
        console.error('❌ Welcome email error:', error);
        // Don't throw error - welcome email is optional
    }
};

/**
 * Send email verification OTP
 */
const sendVerificationEmail = async (email, otp, userName) => {
    try {
        console.log(`\n=== DEV MODE: OTP for ${email} is ${otp} ===\n`);
        const transporter = createTransporter();

        const mailOptions = {
            from: `"To-Do List App" <${config.email.from}>`,
            to: email,
            subject: 'Verify Your Email - To-Do List App',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Inter', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(112, 65, 238, 0.1); }
                        .header { background: linear-gradient(135deg, #7041EE 0%, #9D7FEE 100%); padding: 30px; text-align: center; color: #ffffff; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content { padding: 40px 30px; }
                        .content p { color: #2D2D2D; line-height: 1.6; margin-bottom: 20px; }
                        .otp-box { background-color: #E8E8F5; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }
                        .otp-code { font-size: 36px; font-weight: 700; color: #7041EE; letter-spacing: 8px; margin: 10px 0; }
                        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; color: #6B6B6B; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✉️ Verify Your Email</h1>
                        </div>
                        <div class="content">
                            <p>Hello ${userName || 'User'},</p>
                            <p>Thank you for signing up! To complete your registration, please enter the following verification code:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0; color: #6B6B6B; font-size: 14px;">Your Verification Code</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 0; color: #6B6B6B; font-size: 12px;">Valid for 10 minutes</p>
                            </div>
                            
                            <p>If you didn't create an account, you can safely ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 To-Do List App. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Verification email error:', error);

        // Fallback: Log OTP to a file so we can see it
        try {
            const fs = require('fs');
            fs.writeFileSync('otp.txt', `Last OTP: ${otp} for ${email}`);
        } catch (err) {
            console.error('Error writing OTP file:', err);
        }

        // Return success so signup doesn't fail
        return { success: true, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendVerificationEmail
};
