const { sendMail } = require("./mailer"); // mailer utility se sendMail function liya

/**
 * OTP send karne ka main function
 * Isko authController.js mein use karenge
 */
const sendOTP = async (email, otpCode) => {
    try {
        const mailOptions = {
            to: email,
            subject: "OTP Verification - FullStack Cafe",
            html: `
                <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
                  <div style="margin: 50px auto; width: 70%; padding: 20px 0">
                    <div style="border-bottom: 1px solid #eee">
                      <a href="" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600">FullStack Cafe</a>
                    </div>
                    <p style="font-size: 1.1em">Hi,</p>
                    <p>Thank you for choosing FullStack Cafe. Use the following OTP to complete your registration. OTP is valid for 10 minutes.</p>
                    <h2 style="background: #00466a; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">${otpCode}</h2>
                    <p style="font-size: 0.9em;">Regards,<br />FullStack Cafe Team</p>
                  </div>
                </div>
            `
        };

        const info = await sendMail(mailOptions);
        console.log(`✅ OTP Email sent to ${email}`);
        return info;

    } catch (err) {
        console.error("❌ sendOTP Function Error:", err.message);
        throw new Error("Failed to send OTP email.");
    }
};

module.exports = sendOTP;