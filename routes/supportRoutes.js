const express = require("express");
const router = express.Router();
const Support = require("../models/Support"); // Ensure this file exists in models/

// GET: Render Support Page
// URL: localhost:3000/support
router.get("/", (req, res) => {
    res.render("support", { 
        title: "Support Help Center" 
    });
});

// POST: Save Ticket to Database
// URL: localhost:3000/support/api/send
router.post("/api/send", async (req, res) => {
    try {
        const { name, orderId, subject, message } = req.body;

        const newTicket = new Support({
            fullName: name,
            orderId: orderId,
            subject: subject,
            message: message,
            // Attach user ID if logged in (from extractUser middleware)
            user: req.user ? req.user._id : null 
        });

        await newTicket.save();

        res.status(200).json({ 
            success: true, 
            message: "Your message has been sent successfully!" 
        });
    } catch (err) {
        console.error("Support API Error:", err.message);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error. Please try again later." 
        });
    }
});

module.exports = router;