const { sendMail } = require("./sendEmail"); // importing the core mailer

/**
 * 1. Generate a secure 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 2. Send OTP Email Logic
 * This function generates the OTP, sends the mail, and returns the OTP 
 * so you can save it in your database/session.
 */
const sendOtp = async (email) => {
    try {
        const otp = generateOtp();

        // Email HTML Template for CareSync / Hospital Management
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 15px; max-width: 500px;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">🏥 CareSync Hospital System</h2>
                <p style="color: #475569; font-size: 16px;">Hello,</p>
                <p style="color: #475569; font-size: 16px;">Your One-Time Password (OTP) for account verification is:</p>
                
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0;">
                    <h1 style="color: #2563eb; letter-spacing: 5px; font-size: 32px; margin: 0;">${otp}</h1>
                </div>

                <p style="color: #64748b; font-size: 14px;">This code is valid for <strong>5 minutes</strong>. For security reasons, do not share this code with anyone.</p>
                <br/>
                <hr style="border: 0; border-top: 1px solid #f1f5f9;" />
                <p style="color: #94a3b8; font-size: 12px;">If you did not request this verification, please ignore this email.</p>
            </div>
        `;

        // ✅ FIXED: Changed sendEmail to sendMail to match the import above
        await sendMail({
            to: email,
            subject: "Verification Code - Hospital Management",
            html: html
        });

        console.log(`✅ OTP sent to ${email}: ${otp}`);

        // Return the OTP string so your controller can store it (e.g., in a User model or Redis)
        return otp;

    } catch (error) {
        console.error("❌ Error sending OTP:", error.message);
        throw error;
    }
};

module.exports = { sendOtp };