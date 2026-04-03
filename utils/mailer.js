require("dotenv").config();
const nodemailer = require("nodemailer");

/* ================= TRANSPORT SETUP ================= */
const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS   // Gmail App Password use karein
    }
});

/* ================= VERIFY CONNECTION ================= */
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log("✅ Mail server is ready to send emails");
    } catch (err) {
        console.error("❌ Mail Configuration Error:", err.message);
    }
};

/* ================= EXPORTED SENDMAIL FUNCTION ================= */
const sendMail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`, 
            to,
            subject,
            html
        });
        return info;
    } catch (err) {
        console.error("❌ Nodemailer Error:", err.message);
        throw err;
    }
};

module.exports = {
    sendMail,
    verifyConnection
};