const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: true,
        trim: true 
    },
    orderId: { 
        type: String,
        trim: true 
    }, 
    subject: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    // Reference to the User model
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    }, 
    // Status tracking for admin management
    status: {
        type: String,
        enum: ['open', 'in-progress', 'resolved'],
        default: 'open'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model("Support", supportSchema);