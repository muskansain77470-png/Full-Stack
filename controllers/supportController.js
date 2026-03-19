const Support = require("../models/Support");

// Page render karne ke liye
exports.getSupportPage = (req, res) => {
    res.render("support", { user: req.user || null });
};

// Message save karne ke liye
exports.submitSupportForm = async (req, res) => {
    try {
        const { fullName, orderId, subject, message } = req.body;
        
        const newTicket = new Support({
            fullName,
            orderId,
            subject,
            message,
            user: req.user ? req.user._id : null
        });

        await newTicket.save();
        
        // Success response (aap alert ya redirect kar sakte hain)
        res.status(200).json({ success: true, message: "Message saved!" });
    } catch (err) {
        console.error("Support Error:", err);
        res.status(500).json({ success: false, message: "Something Wrong." });
    }
};