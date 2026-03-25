const Support = require("../models/Support");
const nodemailer = require("nodemailer");

// 1. Configure Email Transporter
// NOTE: Use an "App Password" if you are using Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// 2. Render the Support Page
exports.getSupportPage = (req, res) => {
    res.render("support", { 
        user: req.user || null,
        title: "Support | FullStack Cafe" 
    });
};

// 3. Submit Form, Save to DB, and Send Admin Email
exports.submitSupportForm = async (req, res) => {
    try {
        const { fullName, orderId, subject, message } = req.body;

        // Save Ticket to Database
        const newTicket = new Support({
            fullName,
            orderId,
            subject,
            message,
            user: req.user ? req.user._id : null
        });

        await newTicket.save();

        // Prepare Email for Admin
        const mailOptions = {
            from: `"FullStack Cafe Alert" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `🚨 New Support Ticket: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 15px; padding: 20px;">
                    <h2 style="color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Support Request</h2>
                    <p><strong>Customer Name:</strong> ${fullName}</p>
                    <p><strong>Order ID:</strong> ${orderId || 'Not Provided'}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 10px; margin-top: 15px;">
                        <p style="margin: 0; color: #475569;"><strong>Message:</strong></p>
                        <p style="margin-top: 5px; color: #1e293b; line-height: 1.5;">${message}</p>
                    </div>
                    <div style="margin-top: 20px;">
                        <a href="http://localhost:3000/admin/dashboard" 
                           style="background-color: #0f172a; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                           Open Admin Dashboard
                        </a>
                    </div>
                </div>
            `
        };

        // Send the email (Asynchronous)
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Nodemailer Error:", error.message);
            } else {
                console.log("Admin Notification Sent: " + info.response);
            }
        });

        // Send JSON response back to your AJAX frontend
        res.status(200).json({ 
            success: true, 
            message: "Your message has been received. We will contact you soon!" 
        });

    } catch (err) {
        console.error("Support Submission Error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again later." 
        });
    }
};