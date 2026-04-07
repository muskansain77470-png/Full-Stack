require("dotenv").config();
const nodemailer = require("nodemailer");

/* ================= TRANSPORT SETUP ================= */
const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS   // Ensure this is your 16-character App Password
    }
});

/* ================= SEND OTP FUNCTION ================= */
const sendOTP = async (email, otp) => {
    try {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #333; text-align: center;">FullStack Café Verification</h2>
                <p>Hello,</p>
                <p>Your One-Time Password (OTP) for account verification is:</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #d9534f;">
                    ${otp}
                </div>
                <p>This code is valid for 10 minutes. Please do not share this with anyone.</p>
                <p>Regards,<br>Team FullStack Café</p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`, 
            to: email,
            subject: "Your Verification Code - FullStack Cafe",
            html: htmlContent
        });
        
        console.log("📨 OTP Sent successfully to:", email);
        return info;
    } catch (err) {
        console.error("❌ Nodemailer Error:", err.message);
        throw err;
    }
};

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Mail Server Error:", error.message);
    } else {
        console.log("✅ Mail Server is ready to send messages");
    }
});

module.exports = sendOTP;