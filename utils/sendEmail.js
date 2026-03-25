const nodemailer = require('nodemailer');

// 1. Create the transporter ONCE outside the function to reuse the connection pool
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // Ensure these match your .env file names exactly
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS // Must be the 16-character App Password
    },
    pool: true, // keeps the connection open
    maxConnections: 5,
    maxMessages: 100,
    tls: {
        // Bypasses local network/certificate blocks
        rejectUnauthorized: false
    }
});

/**
 * Sends an OTP email to the specified user
 * @param {string} email - Recipient email address
 * @param {string} otp - The 6-digit verification code
 */
const sendOTP = async (email, otp) => {
    try {
        // 2. Verify connection configuration before attempting to send
        await transporter.verify();

        const mailOptions = {
            from: `"FullStack Café" <${process.env.EMAIL_USER}>`,
            to: email.toLowerCase().trim(),
            subject: 'Verify Your FullStack Café Account',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #0f172a; padding: 30px; text-align: center; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">FullStack Café</h1>
                    </div>
                    <div style="padding: 40px; text-align: center; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #475569; margin-bottom: 24px;">To finish setting up your account, please enter the following code:</p>
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; display: inline-block;">
                            <h2 style="font-size: 36px; letter-spacing: 12px; color: #0f172a; margin: 0; font-family: monospace;">${otp}</h2>
                        </div>
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">This code is valid for <b>10 minutes</b>. If you didn't request this, you can safely ignore this email.</p>
                    </div>
                    <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="font-size: 11px; color: #64748b; margin: 0;">&copy; 2026 FullStack Café Management System</p>
                    </div>
                </div>
            `
        };

        // 3. Send the email
        await transporter.sendMail(mailOptions);
        console.log(`✉️ OTP sent successfully to: ${email}`);
        return true;

    } catch (error) {
        // 4. Detailed error logging to fix connection issues
        console.error("❌ Nodemailer Error Details:");
        console.error("- Message:", error.message);
        console.error("- Code:", error.code);
        
        if (error.code === 'EAUTH') {
            console.error("👉 FIX: Check your App Password in the .env file.");
        }
        return false;
    }
};

module.exports = sendOTP;